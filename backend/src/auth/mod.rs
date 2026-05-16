use std::collections::HashMap;
use std::path::PathBuf;
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
}

impl AuthState {
    pub fn new() -> Self {
        let data_dir = std::env::var("DATA_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("."));

        let session_hours: u64 = std::env::var("SESSION_DURATION_HOURS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(24);

        let secure_cookies = std::env::var("SECURE_COOKIES")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(false);

        let conn       = crate::db::open(&data_dir).expect("Failed to open database");
        let setup_done = Self::check_setup_done(&conn);

        Self {
            sessions:         Arc::new(Mutex::new(HashMap::new())),
            session_duration: Duration::from_secs(session_hours * 3600),
            db:               Arc::new(std::sync::Mutex::new(conn)),
            setup_done:       Arc::new(AtomicBool::new(setup_done)),
            secure_cookies,
        }
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
