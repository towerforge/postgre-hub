use std::sync::atomic::Ordering;
use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;

use super::AuthState;

pub fn extract_session_cookie(headers: &HeaderMap) -> Option<String> {
    headers
        .get("cookie")?
        .to_str()
        .ok()
        .and_then(|cookies| {
            cookies
                .split(';')
                .find(|c| c.trim().starts_with("pg_admin_session="))
                .and_then(|c| c.trim().strip_prefix("pg_admin_session="))
                .map(|v| v.to_string())
        })
}

// ── Status ───────────────────────────────────────────────────────────────────

pub async fn status(
    State(auth): State<AuthState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let setup_required = !auth.setup_done.load(Ordering::Relaxed);

    let authenticated = if setup_required {
        false
    } else if let Some(token) = extract_session_cookie(&headers) {
        auth.is_session_valid(&token).await
    } else {
        false
    };

    Json(json!({
        "setup_required": setup_required,
        "authenticated":  authenticated,
    }))
}

// ── Me (current user info) ────────────────────────────────────────────────────

pub async fn me(
    State(auth): State<AuthState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let token = match extract_session_cookie(&headers) {
        Some(t) => t,
        None => return (StatusCode::UNAUTHORIZED, Json(json!({ "error": "Unauthorized" }))),
    };
    let user_id = match auth.get_session_user_id(&token).await {
        Some(id) => id,
        None => return (StatusCode::UNAUTHORIZED, Json(json!({ "error": "Unauthorized" }))),
    };

    let db = auth.db.clone();
    match tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.query_row(
            "SELECT id, username FROM users WHERE id = ?1",
            [&user_id],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)),
        )
    })
    .await
    {
        Ok(Ok((id, username))) => (
            StatusCode::OK,
            Json(json!({ "id": id, "username": username })),
        ),
        _ => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Failed to load user" }))),
    }
}

// ── Setup (first run) ─────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct SetupRequest {
    username:         String,
    password:         String,
    confirm_password: String,
}

pub async fn setup(
    State(auth): State<AuthState>,
    Json(body): Json<SetupRequest>,
) -> impl IntoResponse {
    if auth.setup_done.load(Ordering::Relaxed) {
        return (
            StatusCode::BAD_REQUEST,
            HeaderMap::new(),
            Json(json!({ "error": "Already configured" })),
        );
    }

    let username = body.username.trim().to_string();
    if username.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            HeaderMap::new(),
            Json(json!({ "error": "Username is required" })),
        );
    }
    if body.password != body.confirm_password {
        return (
            StatusCode::BAD_REQUEST,
            HeaderMap::new(),
            Json(json!({ "error": "Passwords do not match" })),
        );
    }
    if body.password.len() < 8 {
        return (
            StatusCode::BAD_REQUEST,
            HeaderMap::new(),
            Json(json!({ "error": "Password must be at least 8 characters" })),
        );
    }

    let hash = match bcrypt::hash(&body.password, bcrypt::DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            HeaderMap::new(),
            Json(json!({ "error": "Failed to hash password" })),
        ),
    };

    let id  = uuid::Uuid::new_v4().to_string();
    let db  = auth.db.clone();
    let id2 = id.clone();
    let ok  = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.execute(
            "INSERT INTO users (id, username, password_hash) VALUES (?1, ?2, ?3)",
            [&id2, &username, &hash],
        ).is_ok()
    })
    .await
    .unwrap_or(false);

    if !ok {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            HeaderMap::new(),
            Json(json!({ "error": "Failed to create user" })),
        );
    }

    auth.setup_done.store(true, Ordering::Relaxed);
    let token   = auth.create_session_for(id).await;
    let max_age = auth.session_duration.as_secs();
    let mut headers = HeaderMap::new();
    headers.insert("Set-Cookie", auth.session_cookie(&token, max_age).parse().unwrap());
    (StatusCode::OK, headers, Json(json!({ "ok": true })))
}

// ── Login ─────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct LoginRequest {
    username: String,
    password: String,
}

pub async fn login(
    State(auth): State<AuthState>,
    Json(body): Json<LoginRequest>,
) -> impl IntoResponse {
    let username = body.username.trim().to_lowercase();
    let db       = auth.db.clone();
    let uname2   = username.clone();
    let row: Option<(String, String)> = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.query_row(
            "SELECT id, password_hash FROM users WHERE lower(username) = ?1",
            [&uname2],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)),
        )
        .ok()
    })
    .await
    .unwrap_or(None);

    let (user_id, hash) = match row {
        Some(r) => r,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                HeaderMap::new(),
                Json(json!({ "error": "Invalid username or password" })),
            );
        }
    };

    match bcrypt::verify(&body.password, &hash) {
        Ok(true) => {
            let token   = auth.create_session_for(user_id).await;
            let max_age = auth.session_duration.as_secs();
            let mut headers = HeaderMap::new();
            headers.insert("Set-Cookie", auth.session_cookie(&token, max_age).parse().unwrap());
            (StatusCode::OK, headers, Json(json!({ "ok": true })))
        }
        Ok(false) => (
            StatusCode::UNAUTHORIZED,
            HeaderMap::new(),
            Json(json!({ "error": "Invalid username or password" })),
        ),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            HeaderMap::new(),
            Json(json!({ "error": "Authentication error" })),
        ),
    }
}

// ── Logout ────────────────────────────────────────────────────────────────────

pub async fn logout(
    State(auth): State<AuthState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    if let Some(token) = extract_session_cookie(&headers) {
        auth.remove_session(&token).await;
    }

    let mut response_headers = HeaderMap::new();
    response_headers.insert(
        "Set-Cookie",
        "pg_admin_session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/"
            .parse()
            .unwrap(),
    );

    (StatusCode::OK, response_headers, Json(json!({ "ok": true })))
}

// ── Update own credentials ────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct UpdateCredentialsRequest {
    current_password:     String,
    new_username:         Option<String>,
    new_password:         Option<String>,
    confirm_new_password: Option<String>,
}

pub async fn update_credentials(
    State(auth): State<AuthState>,
    headers: HeaderMap,
    Json(body): Json<UpdateCredentialsRequest>,
) -> impl IntoResponse {
    let token = match extract_session_cookie(&headers) {
        Some(t) => t,
        None => return (StatusCode::UNAUTHORIZED, Json(json!({ "error": "Unauthorized" }))),
    };
    let user_id = match auth.get_session_user_id(&token).await {
        Some(id) => id,
        None => return (StatusCode::UNAUTHORIZED, Json(json!({ "error": "Unauthorized" }))),
    };

    // Load current hash
    let db   = auth.db.clone();
    let uid2 = user_id.clone();
    let row: Option<(String, String)> = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.query_row(
            "SELECT username, password_hash FROM users WHERE id = ?1",
            [&uid2],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)),
        )
        .ok()
    })
    .await
    .unwrap_or(None);

    let (current_username, hash) = match row {
        Some(r) => r,
        None => return (StatusCode::NOT_FOUND, Json(json!({ "error": "User not found" }))),
    };

    // Verify current password
    match bcrypt::verify(&body.current_password, &hash) {
        Ok(true)  => {}
        Ok(false) => return (StatusCode::UNAUTHORIZED, Json(json!({ "error": "Current password is incorrect" }))),
        Err(_)    => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Authentication error" }))),
    }

    let new_username = body.new_username
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(&current_username)
        .to_string();

    let new_hash = if let Some(new_pw) = &body.new_password {
        if new_pw.is_empty() {
            hash.clone()
        } else {
            let confirm = body.confirm_new_password.as_deref().unwrap_or("");
            if new_pw != confirm {
                return (StatusCode::BAD_REQUEST, Json(json!({ "error": "New passwords do not match" })));
            }
            if new_pw.len() < 8 {
                return (StatusCode::BAD_REQUEST, Json(json!({ "error": "Password must be at least 8 characters" })));
            }
            match bcrypt::hash(new_pw, bcrypt::DEFAULT_COST) {
                Ok(h) => h,
                Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Failed to hash password" }))),
            }
        }
    } else {
        hash.clone()
    };

    let db = auth.db.clone();
    let ok = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.execute(
            "UPDATE users SET username = ?1, password_hash = ?2 WHERE id = ?3",
            [&new_username, &new_hash, &user_id],
        ).is_ok()
    })
    .await
    .unwrap_or(false);

    if ok {
        (StatusCode::OK, Json(json!({ "ok": true })))
    } else {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Failed to update credentials" })))
    }
}
