use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::auth::AuthState;

#[derive(Serialize, Deserialize)]
pub struct Project {
    pub id:              String,
    pub name:            String,
    pub host:            String,
    pub port:            i64,
    pub database:        String,
    pub username:        String,
    pub ssl_mode:        String,
    pub ssl_ca:          String,
    pub ssl_client_cert: String,
    pub ssh_enabled:     bool,
    pub ssh_host:        String,
    pub ssh_port:        i64,
    pub ssh_user:        String,
    pub ssh_key_set:     bool,
    pub ssh_tunnel_id:   Option<String>,
    pub color:           String,
    pub created_at:      i64,
}

#[derive(Deserialize)]
pub struct ProjectRequest {
    pub name:             String,
    pub host:             String,
    pub port:             Option<i64>,
    pub database:         String,
    pub username:         String,
    pub password:         Option<String>,
    pub ssl_mode:         Option<String>,
    pub ssl_ca:           Option<String>,
    pub ssl_client_cert:  Option<String>,
    pub ssl_client_key:   Option<String>,
    pub ssh_enabled:      Option<bool>,
    pub ssh_host:         Option<String>,
    pub ssh_port:         Option<i64>,
    pub ssh_user:         Option<String>,
    pub ssh_password:     Option<String>,
    pub ssh_private_key:  Option<String>,
    pub ssh_tunnel_id:    Option<String>,
    pub color:            Option<String>,
}

const SELECT_COLS: &str =
    "id, name, host, port, database, username, ssl_mode, ssl_ca, ssl_client_cert, \
     ssh_enabled, ssh_host, ssh_port, ssh_user, \
     (ssh_private_key <> '') AS ssh_key_set, \
     ssh_tunnel_id, color, created_at";

fn map_project(r: &rusqlite::Row<'_>) -> rusqlite::Result<Project> {
    Ok(Project {
        id:              r.get(0)?,
        name:            r.get(1)?,
        host:            r.get(2)?,
        port:            r.get(3)?,
        database:        r.get(4)?,
        username:        r.get(5)?,
        ssl_mode:        r.get(6)?,
        ssl_ca:          r.get(7)?,
        ssl_client_cert: r.get(8)?,
        ssh_enabled:     r.get::<_, i64>(9)? != 0,
        ssh_host:        r.get(10)?,
        ssh_port:        r.get(11)?,
        ssh_user:        r.get(12)?,
        ssh_key_set:     r.get::<_, i64>(13)? != 0,
        ssh_tunnel_id:   r.get(14)?,
        color:           r.get(15)?,
        created_at:      r.get(16)?,
    })
}

pub async fn list_projects(State(auth): State<AuthState>) -> impl IntoResponse {
    let db = auth.db.clone();
    let rows = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        let mut stmt = conn.prepare(
            &format!("SELECT {SELECT_COLS} FROM projects ORDER BY created_at DESC")
        ).unwrap();
        stmt.query_map([], map_project)
            .unwrap()
            .filter_map(|r| r.ok())
            .collect::<Vec<_>>()
    })
    .await
    .unwrap_or_default();

    (StatusCode::OK, Json(json!({ "projects": rows })))
}

pub async fn get_project(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = auth.db.clone();
    let row = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.query_row(
            &format!("SELECT {SELECT_COLS} FROM projects WHERE id = ?1"),
            [&id],
            map_project,
        ).ok()
    })
    .await
    .unwrap_or(None);

    match row {
        Some(p) => (StatusCode::OK, Json(json!(p))),
        None    => (StatusCode::NOT_FOUND, Json(json!({ "error": "Project not found" }))),
    }
}

pub async fn create_project(
    State(auth): State<AuthState>,
    Json(body): Json<ProjectRequest>,
) -> impl IntoResponse {
    let id       = uuid::Uuid::new_v4().to_string();
    let id2      = id.clone();
    let db       = auth.db.clone();
    let port     = body.port.unwrap_or(5432);
    let ssl_mode = body.ssl_mode.unwrap_or_else(|| "prefer".to_string());

    let ok = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.execute(
            "INSERT INTO projects (
                id, name, host, port, database, username, password,
                ssl_mode, ssl_ca, ssl_client_cert, ssl_client_key,
                ssh_enabled, ssh_host, ssh_port, ssh_user, ssh_password, ssh_private_key,
                ssh_tunnel_id, color
             ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19)",
            rusqlite::params![
                id2,
                body.name,
                body.host,
                port,
                body.database,
                body.username,
                body.password.unwrap_or_default(),
                ssl_mode,
                body.ssl_ca.unwrap_or_default(),
                body.ssl_client_cert.unwrap_or_default(),
                body.ssl_client_key.unwrap_or_default(),
                body.ssh_enabled.unwrap_or(false) as i64,
                body.ssh_host.unwrap_or_default(),
                body.ssh_port.unwrap_or(22),
                body.ssh_user.unwrap_or_default(),
                body.ssh_password.unwrap_or_default(),
                body.ssh_private_key.unwrap_or_default(),
                body.ssh_tunnel_id,
                body.color.unwrap_or_default(),
            ],
        ).is_ok()
    })
    .await
    .unwrap_or(false);

    if ok {
        (StatusCode::OK, Json(json!({ "id": id, "ok": true })))
    } else {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Failed to create project" })))
    }
}

pub async fn update_project(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
    Json(body): Json<ProjectRequest>,
) -> impl IntoResponse {
    let db       = auth.db.clone();
    let port     = body.port.unwrap_or(5432);
    let ssl_mode = body.ssl_mode.unwrap_or_else(|| "prefer".to_string());

    let ok = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();

        // Always update non-secret fields
        let r = conn.execute(
            "UPDATE projects SET
                name=?1, host=?2, port=?3, database=?4, username=?5,
                ssl_mode=?6, ssl_ca=?7, ssl_client_cert=?8,
                ssh_enabled=?9, ssh_host=?10, ssh_port=?11, ssh_user=?12,
                ssh_tunnel_id=?13, color=?14
             WHERE id=?15",
            rusqlite::params![
                body.name, body.host, port, body.database, body.username,
                ssl_mode,
                body.ssl_ca.unwrap_or_default(),
                body.ssl_client_cert.unwrap_or_default(),
                body.ssh_enabled.unwrap_or(false) as i64,
                body.ssh_host.unwrap_or_default(),
                body.ssh_port.unwrap_or(22),
                body.ssh_user.unwrap_or_default(),
                body.ssh_tunnel_id,
                body.color.unwrap_or_default(),
                id.clone(),
            ],
        ).map(|n| n > 0).unwrap_or(false);

        if !r { return false; }

        // Conditionally update secrets (only when non-empty)
        for (col, val) in [
            ("password",        body.password),
            ("ssl_client_key",  body.ssl_client_key),
            ("ssh_password",    body.ssh_password),
            ("ssh_private_key", body.ssh_private_key),
        ] {
            if let Some(v) = val.filter(|s| !s.is_empty()) {
                let sql = format!("UPDATE projects SET {col}=?1 WHERE id=?2");
                let _ = conn.execute(&sql, rusqlite::params![v, id.clone()]);
            }
        }

        true
    })
    .await
    .unwrap_or(false);

    if ok {
        (StatusCode::OK, Json(json!({ "ok": true })))
    } else {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Failed to update project" })))
    }
}

pub async fn delete_project(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = auth.db.clone();
    let ok = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.execute("DELETE FROM projects WHERE id = ?1", [&id])
            .map(|n| n > 0)
            .unwrap_or(false)
    })
    .await
    .unwrap_or(false);

    if ok {
        (StatusCode::OK, Json(json!({ "ok": true })))
    } else {
        (StatusCode::NOT_FOUND, Json(json!({ "error": "Project not found" })))
    }
}
