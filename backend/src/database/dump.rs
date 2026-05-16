use axum::{
    body::Body,
    extract::{Path, State},
    http::{StatusCode, header},
    response::{IntoResponse, Response},
    Json,
};
use chrono::Utc;
use serde_json::json;
use tokio_postgres::SimpleQueryMessage;

use crate::auth::AuthState;
use super::query::connect;

// ── Export ────────────────────────────────────────────────────────────────────

pub async fn export_dump(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
) -> Response<Body> {
    let client = match connect(&auth, &id).await {
        Ok(c) => c,
        Err(e) => {
            return Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(format!(r#"{{"error":"{e}"}}"#)))
                .unwrap();
        }
    };

    let mut out = String::with_capacity(64 * 1024);
    let now = Utc::now().format("%Y-%m-%d %H:%M:%S UTC");

    out.push_str(&format!(
        "-- postgre-hub dump\n\
         -- Generated: {now}\n\
         -- https://github.com/towerforge/postgre-hub\n\n\
         SET statement_timeout = 0;\n\
         SET lock_timeout = 0;\n\
         SET client_encoding = 'UTF8';\n\
         SET standard_conforming_strings = on;\n\
         SET check_function_bodies = false;\n\
         SET client_min_messages = warning;\n\
         SET row_security = off;\n\n"
    ));

    // ── Extensions ───────────────────────────────────────────────────────────
    if let Ok(rows) = client.query(
        "SELECT e.extname, n.nspname \
         FROM pg_extension e \
         JOIN pg_namespace n ON n.oid = e.extnamespace \
         WHERE e.extname <> 'plpgsql' \
         ORDER BY e.extname",
        &[],
    ).await {
        if !rows.is_empty() {
            out.push_str("-- Extensions\n");
            for r in &rows {
                let name: &str = r.get(0);
                let schema: &str = r.get(1);
                out.push_str(&format!(
                    "CREATE EXTENSION IF NOT EXISTS \"{name}\" WITH SCHEMA \"{schema}\";\n"
                ));
            }
            out.push('\n');
        }
    }

    // ── Schemas (non-public) ─────────────────────────────────────────────────
    if let Ok(rows) = client.query(
        "SELECT nspname FROM pg_namespace \
         WHERE nspname NOT IN ('public','pg_catalog','information_schema','pg_toast') \
           AND nspname NOT LIKE 'pg_%' \
         ORDER BY nspname",
        &[],
    ).await {
        if !rows.is_empty() {
            out.push_str("-- Schemas\n");
            for r in &rows {
                let name: &str = r.get(0);
                out.push_str(&format!("CREATE SCHEMA IF NOT EXISTS \"{name}\";\n"));
            }
            out.push('\n');
        }
    }

    // ── Enum types ───────────────────────────────────────────────────────────
    if let Ok(rows) = client.query(
        "SELECT n.nspname, t.typname, \
                array_to_string(array_agg(e.enumlabel ORDER BY e.enumsortorder), chr(1)) \
         FROM pg_type t \
         JOIN pg_namespace n ON n.oid = t.typnamespace \
         JOIN pg_enum e ON e.enumtypid = t.oid \
         WHERE t.typtype = 'e' \
           AND n.nspname NOT IN ('pg_catalog','information_schema') \
         GROUP BY n.nspname, t.typname, t.oid \
         ORDER BY n.nspname, t.typname",
        &[],
    ).await {
        if !rows.is_empty() {
            out.push_str("-- Enum types\n");
            for r in &rows {
                let schema: &str = r.get(0);
                let name: &str = r.get(1);
                let raw: &str = r.get(2);
                let values: Vec<String> = raw
                    .split('\x01')
                    .map(|v| format!("'{}'", v.replace('\'', "''")))
                    .collect();
                out.push_str(&format!(
                    "CREATE TYPE \"{schema}\".\"{name}\" AS ENUM ({});\n",
                    values.join(", ")
                ));
            }
            out.push('\n');
        }
    }

    // ── Composite types ──────────────────────────────────────────────────────
    if let Ok(rows) = client.query(
        "SELECT n.nspname, t.typname, \
                array_to_string( \
                    array_agg(a.attname || ' ' || pg_catalog.format_type(a.atttypid, a.atttypmod) \
                              ORDER BY a.attnum), \
                    chr(1)) \
         FROM pg_type t \
         JOIN pg_namespace n ON n.oid = t.typnamespace \
         JOIN pg_class c ON c.oid = t.typrelid \
         JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped \
         WHERE t.typtype = 'c' \
           AND c.relkind = 'c' \
           AND n.nspname NOT IN ('pg_catalog','information_schema') \
         GROUP BY n.nspname, t.typname \
         ORDER BY n.nspname, t.typname",
        &[],
    ).await {
        if !rows.is_empty() {
            out.push_str("-- Composite types\n");
            for r in &rows {
                let schema: &str = r.get(0);
                let name: &str = r.get(1);
                let raw: &str = r.get(2);
                let cols: Vec<&str> = raw.split('\x01').collect();
                out.push_str(&format!(
                    "CREATE TYPE \"{schema}\".\"{name}\" AS (\n    {}\n);\n",
                    cols.join(",\n    ")
                ));
            }
            out.push('\n');
        }
    }

    // ── Sequences ────────────────────────────────────────────────────────────
    if let Ok(rows) = client.query(
        "SELECT sequence_schema, sequence_name, data_type, \
                start_value, minimum_value, maximum_value, increment, cycle_option \
         FROM information_schema.sequences \
         WHERE sequence_schema NOT IN ('pg_catalog','information_schema') \
         ORDER BY sequence_schema, sequence_name",
        &[],
    ).await {
        if !rows.is_empty() {
            out.push_str("-- Sequences\n");
            for r in &rows {
                let schema: &str = r.get(0);
                let name: &str = r.get(1);
                let dtype: &str = r.get(2);
                let start: &str = r.get(3);
                let min: &str = r.get(4);
                let max: &str = r.get(5);
                let inc: &str = r.get(6);
                let cycle: bool = r.get::<_, &str>(7) == "YES";
                out.push_str(&format!(
                    "CREATE SEQUENCE IF NOT EXISTS \"{schema}\".\"{name}\"\n    \
                     AS {dtype} START WITH {start} INCREMENT BY {inc}\n    \
                     MINVALUE {min} MAXVALUE {max} {};\n",
                    if cycle { "CYCLE" } else { "NO CYCLE" }
                ));
            }
            out.push('\n');
        }
    }

    // ── Tables ───────────────────────────────────────────────────────────────
    let tables = match client.query(
        "SELECT table_schema, table_name \
         FROM information_schema.tables \
         WHERE table_type = 'BASE TABLE' \
           AND table_schema NOT IN ('pg_catalog','information_schema') \
         ORDER BY table_schema, table_name",
        &[],
    ).await {
        Ok(r) => r,
        Err(_) => vec![],
    };

    if !tables.is_empty() {
        out.push_str("-- Tables\n");
        for t in &tables {
            let schema: &str = t.get(0);
            let tname: &str = t.get(1);

            let cols = match client.query(
                "SELECT a.attname, \
                        pg_catalog.format_type(a.atttypid, a.atttypmod), \
                        a.attnotnull, \
                        pg_catalog.pg_get_expr(d.adbin, d.adrelid) \
                 FROM pg_catalog.pg_attribute a \
                 LEFT JOIN pg_catalog.pg_attrdef d \
                     ON d.adrelid = a.attrelid AND d.adnum = a.attnum \
                 JOIN pg_catalog.pg_class c ON c.oid = a.attrelid \
                 JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace \
                 WHERE n.nspname = $1 AND c.relname = $2 \
                   AND a.attnum > 0 AND NOT a.attisdropped \
                 ORDER BY a.attnum",
                &[&schema, &tname],
            ).await {
                Ok(r) => r,
                Err(_) => continue,
            };

            let pk_cols: Vec<String> = client.query(
                "SELECT kcu.column_name \
                 FROM information_schema.table_constraints tc \
                 JOIN information_schema.key_column_usage kcu \
                     ON kcu.constraint_name = tc.constraint_name \
                     AND kcu.table_schema = tc.table_schema \
                 WHERE tc.table_schema = $1 AND tc.table_name = $2 \
                   AND tc.constraint_type = 'PRIMARY KEY' \
                 ORDER BY kcu.ordinal_position",
                &[&schema, &tname],
            ).await.unwrap_or_default()
            .iter().map(|r| r.get::<_, String>(0)).collect();

            out.push_str(&format!(
                "CREATE TABLE IF NOT EXISTS \"{schema}\".\"{tname}\" (\n"
            ));

            let mut col_defs: Vec<String> = cols.iter().map(|c| {
                let col_name: &str = c.get(0);
                let col_type: &str = c.get(1);
                let not_null: bool = c.get(2);
                let default: Option<&str> = c.get(3);
                let mut def = format!("    \"{col_name}\" {col_type}");
                if let Some(d) = default {
                    def.push_str(&format!(" DEFAULT {d}"));
                }
                if not_null { def.push_str(" NOT NULL"); }
                def
            }).collect();

            if !pk_cols.is_empty() {
                let quoted: Vec<String> = pk_cols.iter().map(|c| format!("\"{c}\"")).collect();
                col_defs.push(format!("    PRIMARY KEY ({})", quoted.join(", ")));
            }

            out.push_str(&col_defs.join(",\n"));
            out.push_str("\n);\n");
        }
        out.push('\n');
    }

    // ── Data ─────────────────────────────────────────────────────────────────
    if !tables.is_empty() {
        out.push_str("-- Data\n");
        for t in &tables {
            let schema: &str = t.get(0);
            let tname: &str = t.get(1);

            let data_sql = format!(r#"SELECT * FROM "{schema}"."{tname}""#);
            let messages = match client.simple_query(&data_sql).await {
                Ok(m) => m,
                Err(_) => continue,
            };

            let mut col_names: Vec<String> = vec![];
            let mut row_strs: Vec<String> = vec![];

            for msg in &messages {
                if let SimpleQueryMessage::Row(row) = msg {
                    if col_names.is_empty() {
                        col_names = row.columns().iter().map(|c| c.name().to_string()).collect();
                    }
                    let vals: Vec<String> = (0..col_names.len())
                        .map(|i| match row.get(i) {
                            None    => "NULL".to_string(),
                            Some(v) => format!("'{}'", v.replace('\'', "''")),
                        })
                        .collect();
                    row_strs.push(format!("    ({})", vals.join(", ")));
                }
            }

            if row_strs.is_empty() { continue; }

            let col_list: Vec<String> = col_names.iter().map(|c| format!("\"{c}\"")).collect();
            // Batch into 500-row chunks to avoid huge single statements
            for chunk in row_strs.chunks(500) {
                out.push_str(&format!(
                    "INSERT INTO \"{schema}\".\"{tname}\" ({})\nVALUES\n",
                    col_list.join(", ")
                ));
                out.push_str(&chunk.join(",\n"));
                out.push_str("\nON CONFLICT DO NOTHING;\n");
            }
            out.push('\n');
        }
    }

    // ── Indexes (non-PK) ─────────────────────────────────────────────────────
    if let Ok(rows) = client.query(
        "SELECT indexdef \
         FROM pg_indexes \
         WHERE schemaname NOT IN ('pg_catalog','information_schema') \
           AND indexname NOT IN ( \
               SELECT constraint_name \
               FROM information_schema.table_constraints \
               WHERE constraint_type = 'PRIMARY KEY' \
           ) \
         ORDER BY schemaname, tablename, indexname",
        &[],
    ).await {
        if !rows.is_empty() {
            out.push_str("-- Indexes\n");
            for r in &rows {
                let def: &str = r.get(0);
                out.push_str(&format!("{def};\n"));
            }
            out.push('\n');
        }
    }

    // ── Foreign keys ─────────────────────────────────────────────────────────
    if let Ok(rows) = client.query(
        "SELECT tc.table_schema, tc.table_name, tc.constraint_name, \
                string_agg(kcu.column_name, ',' ORDER BY kcu.ordinal_position), \
                ccu.table_schema, ccu.table_name, \
                string_agg(ccu.column_name, ',' ORDER BY kcu.ordinal_position), \
                rc.delete_rule, rc.update_rule \
         FROM information_schema.table_constraints tc \
         JOIN information_schema.key_column_usage kcu \
             ON kcu.constraint_name = tc.constraint_name \
             AND kcu.table_schema = tc.table_schema \
             AND kcu.table_name = tc.table_name \
         JOIN information_schema.constraint_column_usage ccu \
             ON ccu.constraint_name = tc.constraint_name \
         JOIN information_schema.referential_constraints rc \
             ON rc.constraint_name = tc.constraint_name \
         WHERE tc.constraint_type = 'FOREIGN KEY' \
           AND tc.table_schema NOT IN ('pg_catalog','information_schema') \
         GROUP BY tc.table_schema, tc.table_name, tc.constraint_name, \
                  ccu.table_schema, ccu.table_name, rc.delete_rule, rc.update_rule \
         ORDER BY tc.table_schema, tc.table_name",
        &[],
    ).await {
        if !rows.is_empty() {
            out.push_str("-- Foreign keys\n");
            for r in &rows {
                let schema: &str = r.get(0);
                let table: &str = r.get(1);
                let cname: &str = r.get(2);
                let cols: &str = r.get(3);
                let rschema: &str = r.get(4);
                let rtable: &str = r.get(5);
                let rcols: &str = r.get(6);
                let del: &str = r.get(7);
                let upd: &str = r.get(8);

                let cq: Vec<String> = cols.split(',').map(|c| format!("\"{c}\"")).collect();
                let rq: Vec<String> = rcols.split(',').map(|c| format!("\"{c}\"")).collect();
                out.push_str(&format!(
                    "ALTER TABLE ONLY \"{schema}\".\"{table}\" \
                     ADD CONSTRAINT \"{cname}\" FOREIGN KEY ({}) \
                     REFERENCES \"{rschema}\".\"{rtable}\" ({}) \
                     ON UPDATE {upd} ON DELETE {del};\n",
                    cq.join(", "),
                    rq.join(", "),
                ));
            }
            out.push('\n');
        }
    }

    // ── Functions & Procedures ───────────────────────────────────────────────
    if let Ok(rows) = client.query(
        "SELECT pg_get_functiondef(p.oid) \
         FROM pg_proc p \
         JOIN pg_namespace n ON n.oid = p.pronamespace \
         WHERE n.nspname NOT IN ('pg_catalog','information_schema') \
           AND p.prokind IN ('f', 'p') \
         ORDER BY n.nspname, p.proname",
        &[],
    ).await {
        if !rows.is_empty() {
            out.push_str("-- Functions and Procedures\n");
            for r in &rows {
                let def: &str = r.get(0);
                out.push_str(def);
                if !def.ends_with('\n') { out.push('\n'); }
                out.push_str(";\n\n");
            }
        }
    }

    // ── Triggers ─────────────────────────────────────────────────────────────
    if let Ok(rows) = client.query(
        "SELECT pg_get_triggerdef(t.oid) \
         FROM pg_trigger t \
         JOIN pg_class c ON c.oid = t.tgrelid \
         JOIN pg_namespace n ON n.oid = c.relnamespace \
         WHERE NOT t.tgisinternal \
           AND n.nspname NOT IN ('pg_catalog','information_schema') \
         ORDER BY n.nspname, c.relname, t.tgname",
        &[],
    ).await {
        if !rows.is_empty() {
            out.push_str("-- Triggers\n");
            for r in &rows {
                let def: &str = r.get(0);
                out.push_str(def);
                out.push_str(";\n");
            }
            out.push('\n');
        }
    }

    // ── Sequence current values ──────────────────────────────────────────────
    if let Ok(rows) = client.query(
        "SELECT schemaname, sequencename, last_value \
         FROM pg_sequences \
         WHERE schemaname NOT IN ('pg_catalog','information_schema') \
           AND last_value IS NOT NULL \
         ORDER BY schemaname, sequencename",
        &[],
    ).await {
        if !rows.is_empty() {
            out.push_str("-- Sequence current values\n");
            for r in &rows {
                let schema: &str = r.get(0);
                let name: &str = r.get(1);
                let val: i64 = r.get(2);
                out.push_str(&format!(
                    "SELECT setval('\"{schema}\".\"{name}\"', {val}, true);\n"
                ));
            }
            out.push('\n');
        }
    }

    out.push_str("-- End of dump\n");

    let db_name: String = client
        .query_one("SELECT current_database()", &[])
        .await
        .map(|r| r.get::<_, String>(0))
        .unwrap_or_else(|_| "dump".to_string());

    let filename = format!(
        "{db_name}_{}.sql",
        Utc::now().format("%Y%m%d_%H%M%S")
    );

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/octet-stream")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{filename}\""),
        )
        .body(Body::from(out))
        .unwrap()
}

// ── Import ────────────────────────────────────────────────────────────────────

pub async fn import_dump(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
    mut multipart: axum::extract::Multipart,
) -> impl IntoResponse {
    let mut sql_content = String::new();

    loop {
        match multipart.next_field().await {
            Ok(Some(field)) => {
                if matches!(field.name(), Some("file") | None) {
                    sql_content = match field.text().await {
                        Ok(t) => t,
                        Err(e) => {
                            return (
                                StatusCode::BAD_REQUEST,
                                Json(json!({ "error": format!("Failed to read file: {e}") })),
                            )
                        }
                    };
                    break;
                }
            }
            Ok(None) => break,
            Err(e) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "error": format!("Multipart error: {e}") })),
                )
            }
        }
    }

    let sql = sql_content.trim().to_string();
    if sql.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "No SQL content found in the uploaded file." })),
        );
    }

    let client = match connect(&auth, &id).await {
        Ok(c) => c,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e }))),
    };

    match client.simple_query(&sql).await {
        Ok(msgs) => {
            let statements: usize = msgs
                .iter()
                .filter(|m| matches!(m, SimpleQueryMessage::CommandComplete(_)))
                .count();
            (
                StatusCode::OK,
                Json(json!({ "ok": true, "statements": statements })),
            )
        }
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}
