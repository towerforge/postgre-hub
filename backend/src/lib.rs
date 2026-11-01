//! Postgre Hub como librería: el binario de navegador (`src/main.rs`) y la app de
//! escritorio (crate `desktop/`) arrancan el mismo servidor con [`serve`].

use rust_embed::RustEmbed;
use std::future::Future;
use std::net::SocketAddr;
use std::path::PathBuf;
use tokio::net::TcpListener;

mod routes;
pub mod db;
pub mod auth;
pub mod database;
pub mod users;
pub mod desktop;

pub use desktop::{DesktopConfig, SaveFileFuture, SaveFileHook, SaveRequest};

#[derive(RustEmbed)]
#[folder = "../frontend/dist/"]
pub(crate) struct Assets;

/// Configuración del servidor. El binario de navegador la construye con
/// [`ServerConfig::from_env`]; el escritorio la rellena a mano.
#[derive(Clone)]
pub struct ServerConfig {
    /// Carpeta donde vive `postgre-hub.db` (se crea si no existe).
    pub data_dir:       PathBuf,
    /// Modo desarrollo: sin auth en `/api/*`, CORS abierto y sin servir la SPA.
    pub dev:            bool,
    /// Duración de la sesión en horas.
    pub session_hours:  u64,
    /// Añade `Secure` a la cookie de sesión (solo tiene sentido detrás de HTTPS).
    pub secure_cookies: bool,
    /// `Some` activa el modo escritorio. El binario de navegador lo deja en `None`.
    pub desktop:        Option<DesktopConfig>,
}

impl ServerConfig {
    /// Lee DATA_DIR (por defecto "."), SESSION_DURATION_HOURS (24) y
    /// SECURE_COOKIES ("true"/"1"), igual que hacía antes `AuthState::new`.
    pub fn from_env() -> Self {
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

        Self { data_dir, dev: false, session_hours, secure_cookies, desktop: None }
    }
}

/// Instala `ring` como proveedor de rustls. Idempotente: si otro componente
/// del proceso (Tauri, reqwest...) ya instaló uno, se respeta y no hay panic.
pub fn install_crypto_provider() {
    let _ = rustls::crypto::ring::default_provider().install_default();
}

/// Sirve la API y la SPA sobre `listener` hasta que `shutdown` se complete.
///
/// Abre la SQLite de `cfg.data_dir`; cualquier fallo de arranque se devuelve
/// como texto en vez de hacer panic. En modo escritorio `allowed_port` tiene
/// que coincidir con el puerto real del listener y `dev` no se admite.
pub async fn serve(
    listener: TcpListener,
    cfg:      ServerConfig,
    shutdown: impl Future<Output = ()> + Send + 'static,
) -> Result<(), String> {
    install_crypto_provider();

    let port = listener
        .local_addr()
        .map_err(|e| format!("cannot read listener address: {e}"))?
        .port();

    if let Some(desktop) = &cfg.desktop {
        // --dev quita la auth y no sirve la SPA: nunca en escritorio.
        if cfg.dev {
            return Err("desktop mode cannot run in dev mode".into());
        }
        if desktop.allowed_port != port {
            return Err(format!(
                "desktop allowed_port {} does not match listener port {port}",
                desktop.allowed_port
            ));
        }
    }

    let app = routes::create_router(&cfg, port)?;
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(shutdown)
        .await
        .map_err(|e| format!("server error: {e}"))
}
