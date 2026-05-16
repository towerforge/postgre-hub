use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;

use crate::auth::{routes::extract_session_cookie, AuthState};

// ── Guards ────────────────────────────────────────────────────────────────────

/// Returns the `user_id` for any authenticated session.
macro_rules! require_session {
    ($auth:expr, $headers:expr) => {{
        let token = match extract_session_cookie(&$headers) {
            Some(t) => t,
            None => return (StatusCode::UNAUTHORIZED, Json(json!({ "error": "Unauthorized" }))),
        };
        match $auth.get_session_user_id(&token).await {
            Some(id) => id,
            None => return (StatusCode::UNAUTHORIZED, Json(json!({ "error": "Unauthorized" }))),
        }
    }};
}

// ── List ──────────────────────────────────────────────────────────────────────

pub async fn list_users(
    State(auth): State<AuthState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let _caller = require_session!(auth, headers);

    let db = auth.db.clone();
    let users = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        let mut stmt = conn
            .prepare(
                "SELECT id, username, created_at FROM users ORDER BY created_at ASC",
            )
            .unwrap();
        stmt.query_map([], |r| {
            Ok(json!({
                "id":         r.get::<_, String>(0)?,
                "username":   r.get::<_, String>(1)?,
                "created_at": r.get::<_, i64>(2)?,
            }))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>()
    })
    .await
    .unwrap_or_default();

    (StatusCode::OK, Json(json!(users)))
}

// ── Create ────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CreateUserRequest {
    username: String,
    password: String,
}

pub async fn create_user(
    State(auth): State<AuthState>,
    headers: HeaderMap,
    Json(body): Json<CreateUserRequest>,
) -> impl IntoResponse {
    let _caller = require_session!(auth, headers);

    let username = body.username.trim().to_string();
    if username.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({ "error": "Username is required" })));
    }
    if body.password.len() < 8 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Password must be at least 8 characters" })),
        );
    }

    let hash = match bcrypt::hash(&body.password, bcrypt::DEFAULT_COST) {
        Ok(h)  => h,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Failed to hash password" }))),
    };

    let id  = uuid::Uuid::new_v4().to_string();
    let id2 = id.clone();
    let db  = auth.db.clone();
    let result = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.execute(
            "INSERT INTO users (id, username, password_hash) VALUES (?1, ?2, ?3)",
            [&id2, &username, &hash],
        )
    })
    .await
    .unwrap_or(Err(rusqlite::Error::InvalidQuery));

    match result {
        Ok(_) => (StatusCode::OK, Json(json!({ "id": id }))),
        Err(rusqlite::Error::SqliteFailure(e, _))
            if e.code == rusqlite::ErrorCode::ConstraintViolation =>
        {
            (StatusCode::CONFLICT, Json(json!({ "error": "Username already exists" })))
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Failed to create user" }))),
    }
}

// ── Delete ────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct UserIdQuery {
    pub id: String,
}

pub async fn delete_user(
    State(auth): State<AuthState>,
    headers: HeaderMap,
    Query(q): Query<UserIdQuery>,
) -> impl IntoResponse {
    let caller_id = require_session!(auth, headers);

    if q.id == caller_id {
        return (StatusCode::BAD_REQUEST, Json(json!({ "error": "Cannot delete your own account" })));
    }

    let db  = auth.db.clone();
    let uid = q.id.clone();
    let deleted = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.execute("DELETE FROM users WHERE id = ?1", [&uid])
            .map(|n| n > 0)
            .unwrap_or(false)
    })
    .await
    .unwrap_or(false);

    if deleted {
        (StatusCode::OK, Json(json!({ "ok": true })))
    } else {
        (StatusCode::NOT_FOUND, Json(json!({ "error": "User not found" })))
    }
}

// ── Update (reset password) ───────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct UpdateUserRequest {
    new_password: Option<String>,
}

pub async fn update_user(
    State(auth): State<AuthState>,
    headers: HeaderMap,
    Query(q): Query<UserIdQuery>,
    Json(body): Json<UpdateUserRequest>,
) -> impl IntoResponse {
    let _caller = require_session!(auth, headers);

    let pw = match &body.new_password {
        Some(p) if !p.is_empty() => p.clone(),
        _ => return (StatusCode::BAD_REQUEST, Json(json!({ "error": "new_password is required" }))),
    };

    if pw.len() < 8 {
        return (StatusCode::BAD_REQUEST, Json(json!({ "error": "Password must be at least 8 characters" })));
    }

    let hash = match bcrypt::hash(&pw, bcrypt::DEFAULT_COST) {
        Ok(h)  => h,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Failed to hash password" }))),
    };

    let db  = auth.db.clone();
    let uid = q.id.clone();
    let ok = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.execute("UPDATE users SET password_hash = ?1 WHERE id = ?2", [&hash, &uid])
            .map(|n| n > 0)
            .unwrap_or(false)
    })
    .await
    .unwrap_or(false);

    if ok {
        (StatusCode::OK, Json(json!({ "ok": true })))
    } else {
        (StatusCode::NOT_FOUND, Json(json!({ "error": "User not found" })))
    }
}
