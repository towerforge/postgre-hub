//! Modo escritorio: solo se activa cuando `ServerConfig.desktop` es `Some`.
//!
//! - `GET /api/auth/desktop?token=` canjea el token de arranque por una sesión.
//! - Un middleware rechaza cualquier `Host` que no sea el loopback esperado
//!   (defensa frente a DNS rebinding: el puerto local es accesible para
//!   cualquier web que el usuario abra en su navegador).
//! - `POST /api/desktop/save` pide la ruta con el diálogo nativo (hook que
//!   inyecta el crate desktop) y escribe el fichero desde el servidor, porque
//!   las descargas por blob no son fiables en todos los webviews.

use std::future::Future;
use std::path::PathBuf;
use std::pin::Pin;
use std::sync::Arc;

use axum::{
    body::Body,
    extract::{Query, Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde::Deserialize;
use serde_json::json;

use crate::auth::AuthState;

/// Lo que el servidor pide al diálogo de guardado.
#[derive(Debug, Clone)]
pub struct SaveRequest {
    /// Nombre de fichero sugerido, sin carpetas (p. ej. `ventas_20261101.csv`).
    pub suggested_name: String,
}

/// Futuro que devuelve la ruta elegida, `None` si el usuario cancela, o un error.
pub type SaveFileFuture = Pin<Box<dyn Future<Output = Result<Option<PathBuf>, String>> + Send>>;

/// Hook del diálogo nativo de guardado.
pub type SaveFileHook = Arc<dyn Fn(SaveRequest) -> SaveFileFuture + Send + Sync>;

/// Configuración del modo escritorio que inyecta el crate desktop.
#[derive(Clone)]
pub struct DesktopConfig {
    /// Token de un solo uso para entrar sin contraseña al arrancar.
    pub launch_token: String,
    /// Puerto del listener; solo se aceptan `Host: 127.0.0.1:<p>` y `localhost:<p>`.
    pub allowed_port: u16,
    /// Diálogo nativo de guardado.
    pub save_file:    SaveFileHook,
}

impl DesktopConfig {
    /// Construye la config a partir de un diálogo **bloqueante** (p. ej.
    /// `blocking_save_file` de tauri-plugin-dialog): lo ejecuta en
    /// `spawn_blocking` para no bloquear los hilos de tokio.
    pub fn with_blocking_dialog<F>(launch_token: String, allowed_port: u16, dialog: F) -> Self
    where
        F: Fn(SaveRequest) -> Result<Option<PathBuf>, String> + Send + Sync + 'static,
    {
        let dialog = Arc::new(dialog);
        let save_file: SaveFileHook = Arc::new(move |req| {
            let dialog = dialog.clone();
            Box::pin(async move {
                tokio::task::spawn_blocking(move || dialog(req))
                    .await
                    .map_err(|e| format!("save dialog task failed: {e}"))?
            })
        });
        Self { launch_token, allowed_port, save_file }
    }
}

/// Estado interno del modo escritorio, compartido vía `AuthState`.
pub struct DesktopState {
    /// `None` en cuanto se ha canjeado: un solo uso.
    launch_token:     std::sync::Mutex<Option<String>>,
    allowed_port:     u16,
    pub(crate) save_file: SaveFileHook,
}

impl DesktopState {
    pub fn new(cfg: &DesktopConfig) -> Self {
        Self {
            launch_token: std::sync::Mutex::new(Some(cfg.launch_token.clone())),
            allowed_port: cfg.allowed_port,
            save_file:    cfg.save_file.clone(),
        }
    }

    /// Compara y consume el token. Un token incorrecto no consume el bueno.
    fn redeem(&self, candidate: &str) -> bool {
        let mut slot = self.launch_token.lock().unwrap();
        let ok = matches!(slot.as_deref(), Some(t) if !t.is_empty() && constant_time_eq(t.as_bytes(), candidate.as_bytes()));
        if ok { *slot = None; }
        ok
    }

    fn host_allowed(&self, host: &str) -> bool {
        let p = self.allowed_port;
        host == format!("127.0.0.1:{p}") || host == format!("localhost:{p}")
    }
}

/// Comparación en tiempo constante respecto al contenido (la longitud sí se
/// filtra, pero el token es aleatorio y de longitud fija).
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() { return false; }
    a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

fn json_error(status: StatusCode, msg: &str) -> Response {
    (status, Json(json!({ "error": msg }))).into_response()
}

// ── Middleware de Host ────────────────────────────────────────────────────────

pub async fn require_local_host(
    State(auth): State<AuthState>,
    request: Request,
    next: Next,
) -> Response {
    let Some(desktop) = auth.desktop.as_ref() else {
        return next.run(request).await;
    };
    let host = request
        .headers()
        .get(header::HOST)
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");
    if desktop.host_allowed(host) {
        next.run(request).await
    } else {
        json_error(StatusCode::FORBIDDEN, "Host not allowed")
    }
}

// ── Login por token de arranque ───────────────────────────────────────────────

#[derive(Deserialize)]
pub struct DesktopLoginQuery {
    #[serde(default)]
    token: String,
}

pub async fn desktop_login(
    State(auth): State<AuthState>,
    Query(q): Query<DesktopLoginQuery>,
) -> Response {
    let Some(desktop) = auth.desktop.as_ref() else {
        return json_error(StatusCode::NOT_FOUND, "Not found");
    };
    if !desktop.redeem(&q.token) {
        return json_error(StatusCode::FORBIDDEN, "Invalid or already used desktop token");
    }

    let redirect = |cookie: Option<String>| {
        let mut b = Response::builder()
            .status(StatusCode::FOUND)
            .header(header::LOCATION, "/");
        if let Some(c) = cookie { b = b.header(header::SET_COOKIE, c); }
        b.body(Body::empty()).unwrap()
    };

    // Sin usuarios todavía: a "/" sin sesión, donde verá el alta con contraseña.
    let db = auth.db.clone();
    let first_user = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.query_row(
            "SELECT id FROM users ORDER BY created_at, rowid LIMIT 1",
            [],
            |r| r.get::<_, String>(0),
        )
        .ok()
    })
    .await
    .unwrap_or(None);

    match first_user {
        Some(user_id) => {
            let token   = auth.create_session_for(user_id).await;
            let max_age = auth.session_duration.as_secs();
            redirect(Some(auth.session_cookie(&token, max_age)))
        }
        None => redirect(None),
    }
}

// ── Guardar fichero con diálogo nativo ────────────────────────────────────────

#[derive(Deserialize)]
pub struct SaveBody {
    /// Nombre sugerido. Obligatorio con `content`; con `export` es opcional.
    #[serde(default)]
    filename: Option<String>,
    /// Modo (a): contenido de texto generado en el cliente (CSV, JSON...).
    #[serde(default)]
    content:  Option<String>,
    /// Modo (b): export SQL que el servidor regenera con dump.rs.
    #[serde(default)]
    export:   Option<SaveExport>,
}

#[derive(Deserialize)]
pub struct SaveExport {
    project_id: String,
    #[serde(flatten)]
    request:    crate::database::ExportRequest,
}

/// Se queda solo con el nombre final: el diálogo decide la carpeta.
fn sanitize_filename(name: &str) -> String {
    let base = name.rsplit(['/', '\\']).next().unwrap_or("").trim();
    if base.is_empty() || base == "." || base == ".." { "export".into() } else { base.to_string() }
}

pub async fn desktop_save(
    State(auth): State<AuthState>,
    Json(body): Json<SaveBody>,
) -> Response {
    let Some(desktop) = auth.desktop.as_ref() else {
        return json_error(StatusCode::NOT_FOUND, "Not found");
    };

    let (contents, suggested) = match (body.content, body.export) {
        (Some(_), Some(_)) => {
            return json_error(StatusCode::BAD_REQUEST, "Send either content or export, not both");
        }
        (Some(content), None) => {
            let Some(name) = body.filename.as_deref().filter(|n| !n.trim().is_empty()) else {
                return json_error(StatusCode::BAD_REQUEST, "filename is required");
            };
            (content, sanitize_filename(name))
        }
        (None, Some(export)) => {
            match crate::database::generate_dump(&auth, &export.project_id, &export.request).await {
                Ok((sql, default_name)) => {
                    let name = body.filename.as_deref().filter(|n| !n.trim().is_empty())
                        .map(sanitize_filename)
                        .unwrap_or(default_name);
                    (sql, name)
                }
                Err(e) => return json_error(StatusCode::BAD_REQUEST, &e),
            }
        }
        (None, None) => {
            return json_error(StatusCode::BAD_REQUEST, "Send content or export");
        }
    };

    let chosen = match (desktop.save_file)(SaveRequest { suggested_name: suggested }).await {
        Ok(p)  => p,
        Err(e) => return json_error(StatusCode::INTERNAL_SERVER_ERROR, &format!("Save dialog failed: {e}")),
    };
    let Some(path) = chosen else {
        return Json(json!({ "saved": false })).into_response();
    };

    match tokio::fs::write(&path, contents.as_bytes()).await {
        Ok(()) => Json(json!({ "saved": true, "path": path.to_string_lossy() })).into_response(),
        Err(e) => json_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("Cannot write {}: {e}", path.display()),
        ),
    }
}
