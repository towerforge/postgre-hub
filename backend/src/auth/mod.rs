use std::collections::HashMap;
use std::sync::Arc;
use std::sync::atomic::AtomicBool;
use std::time::{Duration, SystemTime};
use tokio::sync::Mutex;

pub mod middleware;
pub mod routes;

// ── AuthState ────────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct AuthState {
    pub sessions:         Arc<Mutex<HashMap<String, (String, SystemTime)>>>,
    pub session_duration: Duration,
    pub db:               Arc<std::sync::Mutex<rusqlite::Connection>>,
    pub setup_done:       Arc<AtomicBool>,
    pub secure_cookies:   bool,
    /// Consultas en curso: query_id del cliente → (conexión, pid del backend)
    pub running_queries:  Arc<std::sync::Mutex<HashMap<String, (String, i32)>>>,
    /// Solo `Some` en la app de escritorio.
    pub desktop:          Option<Arc<crate::desktop::DesktopState>>,
}

impl AuthState {
    /// Abre la SQLite de `cfg.data_dir`. Devuelve el error (ruta incluida) en
    /// vez de hacer panic: el escritorio lo muestra y el binario sale con 1.
    pub fn new(cfg: &crate::ServerConfig) -> Result<Self, String> {
        let conn       = crate::db::open(&cfg.data_dir)?;
        let setup_done = Self::check_setup_done(&conn);

        Ok(Self {
            sessions:         Arc::new(Mutex::new(HashMap::new())),
            session_duration: Duration::from_secs(cfg.session_hours * 3600),
            db:               Arc::new(std::sync::Mutex::new(conn)),
            setup_done:       Arc::new(AtomicBool::new(setup_done)),
            secure_cookies:   cfg.secure_cookies,
            running_queries:  Arc::new(std::sync::Mutex::new(HashMap::new())),
            desktop:          cfg.desktop.as_ref().map(|d| Arc::new(crate::desktop::DesktopState::new(d))),
        })
    }

    fn check_setup_done(conn: &rusqlite::Connection) -> bool {
        conn.query_row("SELECT COUNT(*) FROM users", [], |r| r.get::<_, i64>(0))
            .unwrap_or(0) > 0
    }

    // ── Session management ────────────────────────────────────────────────────

    pub async fn create_session_for(&self, user_id: String) -> String {
        let token  = uuid::Uuid::new_v4().to_string();
        let expiry = SystemTime::now() + self.session_duration;
        self.sessions.lock().await.insert(token.clone(), (user_id, expiry));
        token
    }

    pub async fn get_session_user_id(&self, token: &str) -> Option<String> {
        let mut sessions = self.sessions.lock().await;
        match sessions.get(token) {
            Some((user_id, expiry)) if SystemTime::now() < *expiry => Some(user_id.clone()),
            Some(_) => { sessions.remove(token); None }
            None => None,
        }
    }

    pub async fn is_session_valid(&self, token: &str) -> bool {
        self.get_session_user_id(token).await.is_some()
    }

    /// Usuario de la petición. En modo --dev no hay sesión obligatoria y el
    /// historial y las consultas guardadas se agrupan bajo un usuario fijo.
    pub async fn request_user_id(&self, headers: &axum::http::HeaderMap) -> String {
        match routes::extract_session_cookie(headers) {
            Some(token) => self.get_session_user_id(&token).await.unwrap_or_else(|| "dev".into()),
            None        => "dev".into(),
        }
    }

    pub async fn remove_session(&self, token: &str) {
        self.sessions.lock().await.remove(token);
    }

    // ── Cookie helpers ────────────────────────────────────────────────────────

    pub fn session_cookie(&self, token: &str, max_age: u64) -> String {
        let secure = if self.secure_cookies { "; Secure" } else { "" };
        format!(
            "pg_admin_session={}; HttpOnly; SameSite=Lax; Max-Age={}; Path=/{}",
            token, max_age, secure
        )
    }
}
