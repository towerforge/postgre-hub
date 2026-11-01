use axum::{
    body::Body,
    extract::{Multipart, Path, State},
    http::{StatusCode, header},
    response::{IntoResponse, Response},
    Json,
};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;
use tokio_postgres::{Client, SimpleQueryMessage};

use crate::auth::AuthState;
use super::query::connect;

// Schemas internos que nunca se exportan (el _ de LIKE es comodín: se escapa)
const SYSTEM_SCHEMAS: &str =
    "n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname NOT LIKE 'pg\\_%'";

/// Identificador entre comillas dobles, escapando las que contenga
fn qi(name: &str) -> String {
    format!("\"{}\"", name.replace('"', "\"\""))
}

/// Envuelve una sentencia para que no falle si el objeto ya existe
fn if_missing(stmt: &str) -> String {
    format!(
        "DO $pgh$ BEGIN\n    {stmt};\nEXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;\nEND $pgh$;\n"
    )
}

fn json_error(status: StatusCode, msg: impl Into<String>) -> Response<Body> {
    (status, Json(json!({ "error": msg.into() }))).into_response()
}

/// Mensaje de error de Postgres con detalle y pista cuando los hay
fn db_error(e: &tokio_postgres::Error) -> String {
    match e.as_db_error() {
        Some(db) => {
            let mut msg = db.message().to_string();
            if let Some(d) = db.detail() { msg.push_str(&format!("\nDetail: {d}")); }
            if let Some(h) = db.hint()   { msg.push_str(&format!("\nHint: {h}")); }
            if let Some(w) = db.where_() { msg.push_str(&format!("\nWhere: {w}")); }
            msg
        }
        None => e.to_string(),
    }
}

// ── Schemas disponibles ───────────────────────────────────────────────────────

pub async fn list_schemas(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
) -> Response<Body> {
    let client = match connect(&auth, &id).await {
        Ok(c) => c,
        Err(e) => return json_error(StatusCode::BAD_REQUEST, e),
    };

    let sql = format!(
        "SELECT n.nspname,
                (SELECT count(*) FROM pg_class c WHERE c.relnamespace = n.oid AND c.relkind IN ('r','p'))::int8,
                (SELECT count(*) FROM pg_class c WHERE c.relnamespace = n.oid AND c.relkind IN ('v','m'))::int8,
                (SELECT count(*) FROM pg_proc p WHERE p.pronamespace = n.oid AND p.prokind IN ('f','p'))::int8
         FROM pg_namespace n
         WHERE {SYSTEM_SCHEMAS}
         ORDER BY n.nspname = 'public' DESC, n.nspname"
    );

    match client.query(&sql, &[]).await {
        Ok(rows) => {
            let schemas: Vec<_> = rows.iter().map(|r| json!({
                "name":     r.get::<_, String>(0),
                "tables":   r.get::<_, i64>(1),
                "views":    r.get::<_, i64>(2),
                "routines": r.get::<_, i64>(3),
            })).collect();
            let database: String = client
                .query_one("SELECT current_database()", &[])
                .await
                .map(|r| r.get(0))
                .unwrap_or_default();
            Json(json!({ "database": database, "schemas": schemas })).into_response()
        }
        Err(e) => json_error(StatusCode::BAD_REQUEST, db_error(&e)),
    }
}

// ── Export ────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct ExportRequest {
    schemas: Vec<String>,
    #[serde(default = "yes")] structure:  bool,
    #[serde(default = "yes")] data:       bool,
    #[serde(default = "yes")] routines:   bool,
    #[serde(default = "yes")] views:      bool,
    #[serde(default = "yes")] triggers:   bool,
    #[serde(default)]         extensions: bool,
    /// DROP SCHEMA ... CASCADE antes de recrear
    #[serde(default)]         drop:       bool,
}

fn yes() -> bool { true }

pub async fn export_dump(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
    Json(req): Json<ExportRequest>,
) -> Response<Body> {
    let (sql, filename) = match generate_dump(&auth, &id, &req).await {
        Ok(r)  => r,
        Err(e) => return json_error(StatusCode::BAD_REQUEST, e),
    };

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/sql; charset=utf-8")
        .header(header::CONTENT_DISPOSITION, format!("attachment; filename=\"{filename}\""))
        .body(Body::from(sql))
        .unwrap()
}

/// Genera el dump y el nombre de fichero por defecto (`<base>_<fecha>.sql`).
/// Lo comparten la descarga del navegador y el guardado nativo de escritorio.
pub(crate) async fn generate_dump(
    auth: &AuthState,
    id:   &str,
    req:  &ExportRequest,
) -> Result<(String, String), String> {
    if req.schemas.is_empty() {
        return Err("Select at least one schema.".into());
    }
    let client = connect(auth, id).await?;

    let sql = build_dump(&client, req).await.map_err(|e| db_error(&e))?;

    let db_name: String = client
        .query_one("SELECT current_database()", &[])
        .await
        .map(|r| r.get(0))
        .unwrap_or_else(|_| "dump".to_string());
    let filename = format!("{db_name}_{}.sql", Utc::now().format("%Y%m%d_%H%M%S"));
    Ok((sql, filename))
}

/// Genera el SQL en un orden que se puede volver a ejecutar sin dependencias rotas:
/// tablas sin defaults → funciones → defaults → datos → restricciones → índices → FKs → vistas → triggers
async fn build_dump(client: &Client, req: &ExportRequest) -> Result<String, tokio_postgres::Error> {
    let s = &req.schemas;
    let mut out = String::with_capacity(64 * 1024);
    let now = Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
    let quoted: Vec<String> = s.iter().map(|x| qi(x)).collect();

    out.push_str(&format!(
        "-- postgre-hub dump\n\
         -- Generated: {now}\n\
         -- Schemas: {}\n\n\
         SET statement_timeout = 0;\n\
         SET lock_timeout = 0;\n\
         SET client_encoding = 'UTF8';\n\
         SET standard_conforming_strings = on;\n\
         SET check_function_bodies = false;\n\
         SET client_min_messages = warning;\n\
         SET row_security = off;\n\n",
        quoted.join(", ")
    ));

    // ── Schemas ──────────────────────────────────────────────────────────────
    if req.structure {
        if req.drop {
            out.push_str("-- Drop schemas\n");
            for q in &quoted { out.push_str(&format!("DROP SCHEMA IF EXISTS {q} CASCADE;\n")); }
            out.push('\n');
        }
        out.push_str("-- Schemas\n");
        for q in &quoted { out.push_str(&format!("CREATE SCHEMA IF NOT EXISTS {q};\n")); }
        out.push('\n');
    }

    // ── Extensions ───────────────────────────────────────────────────────────
    if req.extensions {
        let rows = client.query(
            "SELECT e.extname, n.nspname FROM pg_extension e
             JOIN pg_namespace n ON n.oid = e.extnamespace
             WHERE e.extname <> 'plpgsql' AND n.nspname = ANY($1)
             ORDER BY e.extname",
            &[s],
        ).await?;
        if !rows.is_empty() {
            out.push_str("-- Extensions\n");
            for r in &rows {
                out.push_str(&format!(
                    "CREATE EXTENSION IF NOT EXISTS {} WITH SCHEMA {};\n",
                    qi(r.get(0)), qi(r.get(1))
                ));
            }
            out.push('\n');
        }
    }

    // Tablas de los schemas elegidos (también para exportar solo datos)
    let tables = client.query(
        "SELECT n.nspname, c.relname, c.oid FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE c.relkind IN ('r','p') AND n.nspname = ANY($1)
           AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e')
         ORDER BY n.nspname, c.relname",
        &[s],
    ).await?;

    if req.structure {
        // ── Types ────────────────────────────────────────────────────────────
        let enums = client.query(
            "SELECT n.nspname, t.typname,
                    array_agg(e.enumlabel ORDER BY e.enumsortorder)
             FROM pg_type t
             JOIN pg_namespace n ON n.oid = t.typnamespace
             JOIN pg_enum e ON e.enumtypid = t.oid
             WHERE n.nspname = ANY($1)
               AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = t.oid AND d.deptype = 'e')
             GROUP BY n.nspname, t.typname
             ORDER BY n.nspname, t.typname",
            &[s],
        ).await?;
        let composites = client.query(
            "SELECT n.nspname, t.typname,
                    array_agg(quote_ident(a.attname) || ' ' || format_type(a.atttypid, a.atttypmod) ORDER BY a.attnum)
             FROM pg_type t
             JOIN pg_namespace n ON n.oid = t.typnamespace
             JOIN pg_class c ON c.oid = t.typrelid AND c.relkind = 'c'
             JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
             WHERE t.typtype = 'c' AND n.nspname = ANY($1)
               AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = t.oid AND d.deptype = 'e')
             GROUP BY n.nspname, t.typname
             ORDER BY n.nspname, t.typname",
            &[s],
        ).await?;
        if !enums.is_empty() || !composites.is_empty() {
            out.push_str("-- Types\n");
            for r in &enums {
                let values: Vec<String> = r.get::<_, Vec<String>>(2)
                    .iter().map(|v| format!("'{}'", v.replace('\'', "''"))).collect();
                out.push_str(&if_missing(&format!(
                    "CREATE TYPE {}.{} AS ENUM ({})", qi(r.get(0)), qi(r.get(1)), values.join(", ")
                )));
            }
            for r in &composites {
                out.push_str(&if_missing(&format!(
                    "CREATE TYPE {}.{} AS ({})", qi(r.get(0)), qi(r.get(1)), r.get::<_, Vec<String>>(2).join(", ")
                )));
            }
            out.push('\n');
        }

        // ── Sequences ────────────────────────────────────────────────────────
        let seqs = client.query(
            "SELECT schemaname, sequencename, data_type::text,
                    start_value, min_value, max_value, increment_by, cycle
             FROM pg_sequences ps WHERE schemaname = ANY($1) AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = format('%I.%I', ps.schemaname, ps.sequencename)::regclass AND d.deptype = 'i')
             ORDER BY schemaname, sequencename",
            &[s],
        ).await?;
        if !seqs.is_empty() {
            out.push_str("-- Sequences\n");
            for r in &seqs {
                out.push_str(&format!(
                    "CREATE SEQUENCE IF NOT EXISTS {}.{} AS {} START WITH {} INCREMENT BY {} MINVALUE {} MAXVALUE {} {};\n",
                    qi(r.get(0)), qi(r.get(1)), r.get::<_, String>(2),
                    r.get::<_, i64>(3), r.get::<_, i64>(6), r.get::<_, i64>(4), r.get::<_, i64>(5),
                    if r.get::<_, bool>(7) { "CYCLE" } else { "NO CYCLE" }
                ));
            }
            out.push('\n');
        }

        // ── Tables (sin defaults; se añaden después de las funciones) ────────
        if !tables.is_empty() {
            out.push_str("-- Tables\n");
            for t in &tables {
                let (schema, name, oid): (&str, &str, u32) = (t.get(0), t.get(1), t.get(2));
                let cols = client.query(
                    "SELECT quote_ident(a.attname), format_type(a.atttypid, a.atttypmod), a.attnotnull,
                            a.attidentity::text, a.attgenerated::text, pg_get_expr(d.adbin, d.adrelid)
                     FROM pg_attribute a
                     LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
                     WHERE a.attrelid = $1 AND a.attnum > 0 AND NOT a.attisdropped
                     ORDER BY a.attnum",
                    &[&oid],
                ).await?;
                let mut defs: Vec<String> = cols.iter().map(|c| {
                    let mut def = format!("    {} {}", c.get::<_, String>(0), c.get::<_, String>(1));
                    match c.get::<_, String>(3).as_str() {
                        "a" => def.push_str(" GENERATED ALWAYS AS IDENTITY"),
                        "d" => def.push_str(" GENERATED BY DEFAULT AS IDENTITY"),
                        _ => {}
                    }
                    if let ("s", Some(expr)) = (c.get::<_, String>(4).as_str(), c.get::<_, Option<String>>(5)) {
                        def.push_str(&format!(" GENERATED ALWAYS AS ({expr}) STORED"));
                    }
                    if c.get::<_, bool>(2) { def.push_str(" NOT NULL"); }
                    def
                }).collect();
                if let Ok(pk) = client.query_one(
                    "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = $1 AND contype = 'p'",
                    &[&oid],
                ).await {
                    defs.push(format!("    {}", pk.get::<_, String>(0)));
                }
                out.push_str(&format!(
                    "CREATE TABLE IF NOT EXISTS {}.{} (\n{}\n);\n",
                    qi(schema), qi(name), defs.join(",\n")
                ));
            }
            out.push('\n');

            // Secuencias que pertenecen a una columna (serial)
            let owned = client.query(
                "SELECT sn.nspname, s.relname, tn.nspname, t.relname, a.attname
                 FROM pg_depend d
                 JOIN pg_class s ON s.oid = d.objid AND s.relkind = 'S'
                 JOIN pg_namespace sn ON sn.oid = s.relnamespace
                 JOIN pg_class t ON t.oid = d.refobjid
                 JOIN pg_namespace tn ON tn.oid = t.relnamespace
                 JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
                 WHERE d.deptype = 'a' AND sn.nspname = ANY($1) AND tn.nspname = ANY($1)",
                &[s],
            ).await?;
            if !owned.is_empty() {
                out.push_str("-- Sequence ownership\n");
                for r in &owned {
                    out.push_str(&format!(
                        "ALTER SEQUENCE {}.{} OWNED BY {}.{}.{};\n",
                        qi(r.get(0)), qi(r.get(1)), qi(r.get(2)), qi(r.get(3)), qi(r.get(4))
                    ));
                }
                out.push('\n');
            }
        }
    }

    // ── Functions & procedures ───────────────────────────────────────────────
    if req.routines {
        let rows = client.query(
            "SELECT pg_get_functiondef(p.oid) FROM pg_proc p
             JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = ANY($1) AND p.prokind IN ('f','p')
               AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
             ORDER BY n.nspname, p.proname, p.oid",
            &[s],
        ).await?;
        if !rows.is_empty() {
            out.push_str("-- Functions and procedures\n");
            for r in &rows {
                let def: String = r.get(0);
                out.push_str(def.trim_end());
                out.push_str(";\n\n");
            }
        }
    }

    // ── Column defaults ──────────────────────────────────────────────────────
    if req.structure {
        let rows = client.query(
            "SELECT n.nspname, c.relname, a.attname, pg_get_expr(d.adbin, d.adrelid)
             FROM pg_attrdef d
             JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
             JOIN pg_class c ON c.oid = d.adrelid AND c.relkind IN ('r','p')
             JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = ANY($1) AND a.attgenerated = ''
             ORDER BY n.nspname, c.relname, a.attnum",
            &[s],
        ).await?;
        if !rows.is_empty() {
            out.push_str("-- Column defaults\n");
            for r in &rows {
                out.push_str(&format!(
                    "ALTER TABLE {}.{} ALTER COLUMN {} SET DEFAULT {};\n",
                    qi(r.get(0)), qi(r.get(1)), qi(r.get(2)), r.get::<_, String>(3)
                ));
            }
            out.push('\n');
        }
    }

    // ── Data ─────────────────────────────────────────────────────────────────
    if req.data && !tables.is_empty() {
        out.push_str("-- Data\n");
        for t in &tables {
            let (schema, name, oid): (&str, &str, u32) = (t.get(0), t.get(1), t.get(2));
            // Las columnas generadas no admiten valores
            let cols = client.query(
                "SELECT a.attname, a.attidentity = 'a' FROM pg_attribute a
                 WHERE a.attrelid = $1 AND a.attnum > 0 AND NOT a.attisdropped AND a.attgenerated = ''
                 ORDER BY a.attnum",
                &[&oid],
            ).await?;
            if cols.is_empty() { continue; }
            let col_list: Vec<String> = cols.iter().map(|c| qi(c.get(0))).collect();
            let overriding = if cols.iter().any(|c| c.get::<_, bool>(1)) { " OVERRIDING SYSTEM VALUE" } else { "" };

            let select = format!("SELECT {} FROM {}.{}", col_list.join(", "), qi(schema), qi(name));
            let mut rows: Vec<String> = vec![];
            for msg in client.simple_query(&select).await? {
                if let SimpleQueryMessage::Row(row) = msg {
                    let vals: Vec<String> = (0..col_list.len()).map(|i| match row.get(i) {
                        None    => "NULL".to_string(),
                        Some(v) => format!("'{}'", v.replace('\'', "''")),
                    }).collect();
                    rows.push(format!("    ({})", vals.join(", ")));
                }
            }
            // Lotes de 500 filas para no generar sentencias enormes
            for chunk in rows.chunks(500) {
                out.push_str(&format!(
                    "INSERT INTO {}.{} ({}){overriding}\nVALUES\n{}\nON CONFLICT DO NOTHING;\n",
                    qi(schema), qi(name), col_list.join(", "), chunk.join(",\n")
                ));
            }
            if !rows.is_empty() { out.push('\n'); }
        }

        // Las de identidad se recrean con la tabla y pueden cambiar de nombre:
        // se localizan con pg_get_serial_sequence
        let seqs = client.query(
            "SELECT format('%I.%I', ps.schemaname, ps.sequencename), ps.last_value, tn.nspname, t.relname, a.attname
             FROM pg_sequences ps
             LEFT JOIN pg_depend d ON d.objid = format('%I.%I', ps.schemaname, ps.sequencename)::regclass AND d.deptype = 'i'
             LEFT JOIN pg_class t ON t.oid = d.refobjid
             LEFT JOIN pg_namespace tn ON tn.oid = t.relnamespace
             LEFT JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
             WHERE ps.schemaname = ANY($1) AND ps.last_value IS NOT NULL
             ORDER BY ps.schemaname, ps.sequencename",
            &[s],
        ).await?;
        if !seqs.is_empty() {
            out.push_str("-- Sequence values\n");
            for r in &seqs {
                let target = match r.get::<_, Option<&str>>(4) {
                    Some(col) => format!(
                        "pg_get_serial_sequence('{}', '{}')",
                        format!("{}.{}", qi(r.get(2)), qi(r.get(3))).replace('\'', "''"),
                        col.replace('\'', "''")
                    ),
                    None => format!("'{}'", r.get::<_, String>(0).replace('\'', "''")),
                };
                out.push_str(&format!("SELECT setval({target}, {}, true);\n", r.get::<_, i64>(1)));
            }
            out.push('\n');
        }
    }

    if req.structure {
        // ── Constraints (unique, check, exclusion) ───────────────────────────
        let rows = client.query(
            "SELECT n.nspname, c.relname, k.conname, pg_get_constraintdef(k.oid)
             FROM pg_constraint k
             JOIN pg_class c ON c.oid = k.conrelid
             JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE k.contype IN ('u','c','x') AND n.nspname = ANY($1) AND k.conislocal
             ORDER BY n.nspname, c.relname, k.conname",
            &[s],
        ).await?;
        if !rows.is_empty() {
            out.push_str("-- Constraints\n");
            for r in &rows {
                out.push_str(&if_missing(&format!(
                    "ALTER TABLE {}.{} ADD CONSTRAINT {} {}",
                    qi(r.get(0)), qi(r.get(1)), qi(r.get(2)), r.get::<_, String>(3)
                )));
            }
            out.push('\n');
        }

        // ── Indexes (los que no respaldan una restricción) ───────────────────
        let rows = client.query(
            "SELECT pg_get_indexdef(i.indexrelid)
             FROM pg_index i
             JOIN pg_class c ON c.oid = i.indrelid
             JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = ANY($1)
               AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conindid = i.indexrelid)
             ORDER BY n.nspname, c.relname",
            &[s],
        ).await?;
        if !rows.is_empty() {
            out.push_str("-- Indexes\n");
            for r in &rows {
                let def: String = r.get(0);
                let def = def
                    .replacen("CREATE UNIQUE INDEX ", "CREATE UNIQUE INDEX IF NOT EXISTS ", 1)
                    .replacen("CREATE INDEX ", "CREATE INDEX IF NOT EXISTS ", 1);
                out.push_str(&format!("{def};\n"));
            }
            out.push('\n');
        }

        // ── Foreign keys ─────────────────────────────────────────────────────
        let rows = client.query(
            "SELECT n.nspname, c.relname, k.conname, pg_get_constraintdef(k.oid)
             FROM pg_constraint k
             JOIN pg_class c ON c.oid = k.conrelid
             JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE k.contype = 'f' AND n.nspname = ANY($1) AND k.conislocal
             ORDER BY n.nspname, c.relname, k.conname",
            &[s],
        ).await?;
        if !rows.is_empty() {
            out.push_str("-- Foreign keys\n");
            for r in &rows {
                out.push_str(&if_missing(&format!(
                    "ALTER TABLE {}.{} ADD CONSTRAINT {} {}",
                    qi(r.get(0)), qi(r.get(1)), qi(r.get(2)), r.get::<_, String>(3)
                )));
            }
            out.push('\n');
        }
    }

    // ── Views (por oid: las que dependen de otras suelen ser posteriores) ────
    if req.views {
        let rows = client.query(
            "SELECT n.nspname, c.relname, c.relkind::text, pg_get_viewdef(c.oid, true)
             FROM pg_class c
             JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE c.relkind IN ('v','m') AND n.nspname = ANY($1)
               AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e')
             ORDER BY c.oid",
            &[s],
        ).await?;
        if !rows.is_empty() {
            out.push_str("-- Views\n");
            for r in &rows {
                let (schema, name, kind, def): (&str, &str, String, String) = (r.get(0), r.get(1), r.get(2), r.get(3));
                let def = def.trim_end().trim_end_matches(';');
                if kind == "m" {
                    out.push_str(&format!(
                        "CREATE MATERIALIZED VIEW IF NOT EXISTS {}.{} AS\n{def}\nWITH {}DATA;\n",
                        qi(schema), qi(name), if req.data { "" } else { "NO " }
                    ));
                } else {
                    out.push_str(&format!("CREATE OR REPLACE VIEW {}.{} AS\n{def};\n", qi(schema), qi(name)));
                }
            }
            out.push('\n');
        }
    }

    // ── Triggers ─────────────────────────────────────────────────────────────
    if req.triggers {
        let rows = client.query(
            "SELECT pg_get_triggerdef(t.oid) FROM pg_trigger t
             JOIN pg_class c ON c.oid = t.tgrelid
             JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE NOT t.tgisinternal AND n.nspname = ANY($1)
             ORDER BY n.nspname, c.relname, t.tgname",
            &[s],
        ).await?;
        if !rows.is_empty() {
            out.push_str("-- Triggers\n");
            for r in &rows {
                out.push_str(&if_missing(r.get::<_, &str>(0)));
            }
            out.push('\n');
        }
    }

    out.push_str("-- End of dump\n");
    Ok(out)
}

// ── Import ────────────────────────────────────────────────────────────────────

pub async fn import_dump(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
    mut multipart: Multipart,
) -> Response<Body> {
    let mut sql = String::new();
    loop {
        match multipart.next_field().await {
            Ok(Some(field)) if field.name() == Some("file") => {
                sql = match field.text().await {
                    Ok(t) => t,
                    Err(e) => return json_error(StatusCode::BAD_REQUEST, format!("Failed to read file: {e}")),
                };
                break;
            }
            Ok(Some(_)) => continue,
            Ok(None) => break,
            Err(e) => return json_error(StatusCode::BAD_REQUEST, format!("Upload error: {e}")),
        }
    }

    let sql = sql.trim();
    if sql.is_empty() {
        return json_error(StatusCode::BAD_REQUEST, "The file is empty.");
    }

    let client = match connect(&auth, &id).await {
        Ok(c) => c,
        Err(e) => return json_error(StatusCode::BAD_REQUEST, e),
    };

    // Una sola transacción: si una sentencia falla no se aplica nada
    let wrapped = format!("BEGIN;\n{sql}\n;\nCOMMIT;");
    match client.simple_query(&wrapped).await {
        Ok(msgs) => {
            // Descuenta BEGIN y COMMIT
            let statements = msgs.iter()
                .filter(|m| matches!(m, SimpleQueryMessage::CommandComplete(_)))
                .count()
                .saturating_sub(2);
            Json(json!({ "ok": true, "statements": statements })).into_response()
        }
        Err(e) => {
            let _ = client.simple_query("ROLLBACK").await;
            json_error(StatusCode::BAD_REQUEST, db_error(&e))
        }
    }
}
