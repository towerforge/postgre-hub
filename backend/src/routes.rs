use axum::{
    routing::{get, post, put},
    Router,
    http::StatusCode,
    extract::Path,
    response::{IntoResponse, Response},
    body::Body,
    Json,
};
use tower_http::cors::{CorsLayer, Any};
use axum::http::HeaderValue;
use serde_json::json;
use mime_guess;

use crate::auth::{AuthState, middleware::require_auth, routes as auth_routes};
use crate::users::{list_users, create_user, delete_user, update_user};
use crate::database::{
    list_projects, create_project, get_project, update_project, delete_project,
    test_connection, list_tables, list_types, list_sequences, list_routines,
    get_table_data, get_table_schema, run_query, build_changes,
    get_sessions, explain_query,
    export_dump, import_dump,
    list_tunnels, create_tunnel, update_tunnel, delete_tunnel, test_tunnel,
};

pub fn create_router(dev_mode: bool, port: u16) -> Router {
    use axum::http::Method;

    let auth_state = AuthState::new();

    let cors = if dev_mode {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
            .allow_headers(Any)
    } else {
        let origins = [
            format!("http://localhost:{}", port),
            format!("http://127.0.0.1:{}", port),
        ]
        .into_iter()
        .filter_map(|o| o.parse::<HeaderValue>().ok())
        .collect::<Vec<_>>();

        CorsLayer::new()
            .allow_origin(origins)
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
            .allow_headers(Any)
    };

    // Public auth routes — no session required
    let auth_router = Router::new()
        .route("/api/auth/status", get(auth_routes::status))
        .route("/api/auth/setup",  post(auth_routes::setup))
        .route("/api/auth/login",  post(auth_routes::login))
        .route("/api/auth/logout", post(auth_routes::logout))
        .with_state(auth_state.clone());

    // Protected API routes
    let api_routes = Router::new()
        // Auth: current-user info + own credential changes
        .route("/api/auth/me",          get(auth_routes::me))
        .route("/api/auth/credentials", put(auth_routes::update_credentials))
        // User management
        .route("/users",        get(list_users).post(create_user).delete(delete_user))
        .route("/users/update", put(update_user))
        // Projects (PostgreSQL connections)
        .route("/api/projects",     get(list_projects).post(create_project))
        .route("/api/projects/{id}", get(get_project).put(update_project).delete(delete_project))
        .route("/api/projects/{id}/test",   post(test_connection))
        .route("/api/projects/{id}/tables",    get(list_tables))
        .route("/api/projects/{id}/types",     get(list_types))
        .route("/api/projects/{id}/sequences", get(list_sequences))
        .route("/api/projects/{id}/routines",  get(list_routines))
        .route("/api/projects/{id}/tables/{table}",        get(get_table_data))
        .route("/api/projects/{id}/tables/{table}/schema", get(get_table_schema))
        .route("/api/projects/{id}/query",                 post(run_query))
        .route("/api/projects/{id}/query/explain",         post(explain_query))
        .route("/api/projects/{id}/build-changes",         post(build_changes))
        .route("/api/projects/{id}/sessions",              get(get_sessions))
        .route("/api/projects/{id}/export",                get(export_dump))
        .route("/api/projects/{id}/import",                post(import_dump))
        // SSH Tunnels
        .route("/api/tunnels",      get(list_tunnels).post(create_tunnel))
        .route("/api/tunnels/{id}",       put(update_tunnel).delete(delete_tunnel))
        .route("/api/tunnels/{id}/test",  post(test_tunnel))
        // Version
        .route("/version", get(version))
        .with_state(auth_state.clone());

    let api_router = if dev_mode {
        api_routes
    } else {
        api_routes.layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            require_auth,
        ))
    };

    let mut router = Router::new()
        .merge(auth_router)
        .merge(api_router)
        .layer(cors);

    if !dev_mode {
        router = router
            .route("/", get(|| async { static_handler(Path("".into())).await }))
            .route("/{*path}", get(static_handler));
    }

    router
}

async fn version() -> impl IntoResponse {
    const VERSION: &str = env!("CARGO_PKG_VERSION");
    (StatusCode::OK, Json(json!({ "version": VERSION })))
}

pub async fn static_handler(Path(path): Path<String>) -> impl IntoResponse {
    let mut lookup_path = if path.is_empty() {
        "index.html".to_string()
    } else {
        path.clone()
    };

    if !lookup_path.contains('.') {
        lookup_path = "index.html".to_string();
    }

    match super::Assets::get(&lookup_path) {
        Some(content) => {
            let mime  = mime_guess::from_path(&lookup_path).first_or_octet_stream();
            let bytes = content.data.into_owned();
            Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", mime.as_ref())
                .body(Body::from(bytes))
                .unwrap()
        }
        None => Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Body::from(format!("404 - Not found: {}", lookup_path)))
            .unwrap(),
    }
}
