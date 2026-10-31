use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::{json, Value};
use std::collections::BTreeMap;

use crate::auth::AuthState;
use super::query::connect;

// Schemas internos que no se muestran (el _ de LIKE es comodín: se escapa)
const SYSTEM_SCHEMAS: &str =
    "n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') AND n.nspname NOT LIKE 'pg\\_%'";

/// Tablas, vistas y columnas de todos los schemas de usuario, con claves
/// primarias y foráneas. Alimenta el autocompletado del editor y el diagrama ER.
pub async fn get_structure(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let client = match connect(&auth, &id).await {
        Ok(c)  => c,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e }))),
    };

    // Columnas de tablas, tablas particionadas, vistas y vistas materializadas.
    // Las particiones hijas se omiten: duplicarían la tabla padre.
    let columns_sql = format!(
        "SELECT n.nspname::text, c.relname::text, c.relkind::text,
                a.attname::text, format_type(a.atttypid, a.atttypmod), NOT a.attnotnull,
                COALESCE(a.attnum = ANY(pk.conkey), false)
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
         LEFT JOIN pg_constraint pk ON pk.conrelid = c.oid AND pk.contype = 'p'
         WHERE c.relkind IN ('r', 'p', 'v', 'm')
           AND NOT c.relispartition
           AND {SYSTEM_SCHEMAS}
         ORDER BY n.nspname, c.relname, a.attnum"
    );

    let fks_sql = format!(
        "SELECT con.conname::text,
                n.nspname::text, c.relname::text,
                fn.nspname::text, fc.relname::text,
                ARRAY(SELECT a.attname::text
                      FROM unnest(con.conkey) WITH ORDINALITY k(num, ord)
                      JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.num
                      ORDER BY k.ord),
                ARRAY(SELECT a.attname::text
                      FROM unnest(con.confkey) WITH ORDINALITY k(num, ord)
                      JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = k.num
                      ORDER BY k.ord)
         FROM pg_constraint con
         JOIN pg_class c      ON c.oid  = con.conrelid
         JOIN pg_namespace n  ON n.oid  = c.relnamespace
         JOIN pg_class fc     ON fc.oid = con.confrelid
         JOIN pg_namespace fn ON fn.oid = fc.relnamespace
         WHERE con.contype = 'f'
           AND NOT c.relispartition
           AND {SYSTEM_SCHEMAS}
         ORDER BY n.nspname, c.relname, con.conname"
    );

    let column_rows = match client.query(&columns_sql, &[]).await {
        Ok(r)  => r,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))),
    };
    let fk_rows = match client.query(&fks_sql, &[]).await {
        Ok(r)  => r,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))),
    };

    // Agrupa las columnas por tabla conservando el orden de la consulta
    let mut tables: BTreeMap<(String, String), (String, Vec<Value>)> = BTreeMap::new();
    for r in &column_rows {
        let key  = (r.get::<_, String>(0), r.get::<_, String>(1));
        let kind = match r.get::<_, String>(2).as_str() {
            "v" => "view",
            "m" => "materialized_view",
            _   => "table",
        };
        tables
            .entry(key)
            .or_insert_with(|| (kind.to_string(), vec![]))
            .1
            .push(json!({
                "name":     r.get::<_, String>(3),
                "type":     r.get::<_, String>(4),
                "nullable": r.get::<_, bool>(5),
                "pk":       r.get::<_, bool>(6),
            }));
    }

    let tables: Vec<Value> = tables
        .into_iter()
        .map(|((schema, name), (kind, columns))| json!({
            "schema": schema, "name": name, "kind": kind, "columns": columns,
        }))
        .collect();

    let relations: Vec<Value> = fk_rows.iter().map(|r| json!({
        "name":         r.get::<_, String>(0),
        "from_schema":  r.get::<_, String>(1),
        "from_table":   r.get::<_, String>(2),
        "to_schema":    r.get::<_, String>(3),
        "to_table":     r.get::<_, String>(4),
        "from_columns": r.get::<_, Vec<String>>(5),
        "to_columns":   r.get::<_, Vec<String>>(6),
    })).collect();

    (StatusCode::OK, Json(json!({ "tables": tables, "relations": relations })))
}
