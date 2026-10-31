use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::auth::AuthState;

// Entradas de historial que se conservan por usuario y conexión
const HISTORY_KEEP: i64 = 500;

/// Guarda una ejecución en el historial y recorta las entradas más antiguas
pub async fn record(
    auth: &AuthState,
    user_id: String,
    project_id: String,
    sql: String,
    duration_ms: i64,
    rows: Option<i64>,
    error: Option<String>,
) {
    let db = auth.db.clone();
    let _ = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        let inserted = conn.execute(
            "INSERT INTO query_history (user_id, project_id, sql, duration_ms, rows, error)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![user_id, project_id, sql, duration_ms, rows, error],
        );
        if inserted.is_ok() {
            let _ = conn.execute(
                "DELETE FROM query_history
                 WHERE user_id = ?1 AND project_id = ?2
                   AND id NOT IN (
                       SELECT id FROM query_history
                       WHERE user_id = ?1 AND project_id = ?2
                       ORDER BY id DESC LIMIT ?3
                   )",
                rusqlite::params![user_id, project_id, HISTORY_KEEP],
            );
        }
    })
    .await;
}

// ── Historial ────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct HistoryQuery {
    pub limit: Option<i64>,
}

pub async fn list_history(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Query(q): Query<HistoryQuery>,
) -> impl IntoResponse {
    let user_id = auth.request_user_id(&headers).await;
    let limit   = q.limit.unwrap_or(100).clamp(1, HISTORY_KEEP);
    let db      = auth.db.clone();

    let rows = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, sql, duration_ms, rows, error, created_at
             FROM query_history
             WHERE user_id = ?1 AND project_id = ?2
             ORDER BY id DESC LIMIT ?3",
        ).unwrap();
        stmt.query_map(rusqlite::params![user_id, id, limit], |r| Ok(json!({
            "id":          r.get::<_, i64>(0)?,
            "sql":         r.get::<_, String>(1)?,
            "duration_ms": r.get::<_, i64>(2)?,
            "rows":        r.get::<_, Option<i64>>(3)?,
            "error":       r.get::<_, Option<String>>(4)?,
            "created_at":  r.get::<_, i64>(5)?,
        })))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect::<Vec<Value>>()
    })
    .await
    .unwrap_or_default();

    (StatusCode::OK, Json(json!({ "history": rows })))
}

pub async fn clear_history(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let user_id = auth.request_user_id(&headers).await;
    let db      = auth.db.clone();

    let ok = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.execute(
            "DELETE FROM query_history WHERE user_id = ?1 AND project_id = ?2",
            rusqlite::params![user_id, id],
        ).is_ok()
    })
    .await
    .unwrap_or(false);

    if ok {
        (StatusCode::OK, Json(json!({ "ok": true })))
    } else {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Failed to clear history" })))
    }
}

// ── Consultas guardadas ──────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct SavedQueryRequest {
    pub name: String,
    pub sql:  String,
}

pub async fn list_saved_queries(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let user_id = auth.request_user_id(&headers).await;
    let db      = auth.db.clone();

    let rows = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, sql, created_at, updated_at
             FROM saved_queries
             WHERE user_id = ?1 AND project_id = ?2
             ORDER BY name COLLATE NOCASE",
        ).unwrap();
        stmt.query_map(rusqlite::params![user_id, id], |r| Ok(json!({
            "id":         r.get::<_, String>(0)?,
            "name":       r.get::<_, String>(1)?,
            "sql":        r.get::<_, String>(2)?,
            "created_at": r.get::<_, i64>(3)?,
            "updated_at": r.get::<_, i64>(4)?,
        })))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect::<Vec<Value>>()
    })
    .await
    .unwrap_or_default();

    (StatusCode::OK, Json(json!({ "queries": rows })))
}

pub async fn create_saved_query(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Json(body): Json<SavedQueryRequest>,
) -> impl IntoResponse {
    let name = body.name.trim().to_string();
    if name.is_empty() || body.sql.trim().is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({ "error": "name and sql are required" })));
    }

    let user_id  = auth.request_user_id(&headers).await;
    let query_id = uuid::Uuid::new_v4().to_string();
    let qid      = query_id.clone();
    let db       = auth.db.clone();

    let ok = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.execute(
            "INSERT INTO saved_queries (id, user_id, project_id, name, sql) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![qid, user_id, id, name, body.sql],
        ).is_ok()
    })
    .await
    .unwrap_or(false);

    if ok {
        (StatusCode::OK, Json(json!({ "id": query_id, "ok": true })))
    } else {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Failed to save query" })))
    }
}

pub async fn update_saved_query(
    State(auth): State<AuthState>,
    Path((id, query_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(body): Json<SavedQueryRequest>,
) -> impl IntoResponse {
    let name = body.name.trim().to_string();
    if name.is_empty() || body.sql.trim().is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({ "error": "name and sql are required" })));
    }

    let user_id = auth.request_user_id(&headers).await;
    let db      = auth.db.clone();

    let ok = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.execute(
            "UPDATE saved_queries SET name = ?1, sql = ?2, updated_at = unixepoch()
             WHERE id = ?3 AND user_id = ?4 AND project_id = ?5",
            rusqlite::params![name, body.sql, query_id, user_id, id],
        ).map(|n| n > 0).unwrap_or(false)
    })
    .await
    .unwrap_or(false);

    if ok {
        (StatusCode::OK, Json(json!({ "ok": true })))
    } else {
        (StatusCode::NOT_FOUND, Json(json!({ "error": "Saved query not found" })))
    }
}

pub async fn delete_saved_query(
    State(auth): State<AuthState>,
    Path((id, query_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let user_id = auth.request_user_id(&headers).await;
    let db      = auth.db.clone();

    let ok = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.execute(
            "DELETE FROM saved_queries WHERE id = ?1 AND user_id = ?2 AND project_id = ?3",
            rusqlite::params![query_id, user_id, id],
        ).map(|n| n > 0).unwrap_or(false)
    })
    .await
    .unwrap_or(false);

    if ok {
        (StatusCode::OK, Json(json!({ "ok": true })))
    } else {
        (StatusCode::NOT_FOUND, Json(json!({ "error": "Saved query not found" })))
    }
}
