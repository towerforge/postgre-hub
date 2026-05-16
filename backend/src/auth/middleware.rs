use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

use super::{routes::extract_session_cookie, AuthState};

pub async fn require_auth(
    State(auth): State<AuthState>,
    request: Request,
    next: Next,
) -> Response {
    if let Some(token) = extract_session_cookie(request.headers()) {
        if auth.is_session_valid(&token).await {
            return next.run(request).await;
        }
    }

    (
        StatusCode::UNAUTHORIZED,
        Json(json!({ "error": "Unauthorized" })),
    )
        .into_response()
}
