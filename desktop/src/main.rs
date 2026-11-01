//! Postgre Hub de escritorio: el backend axum corre dentro de este proceso,
//! escuchando en 127.0.0.1, y una ventana Tauri carga la SPA que sirve axum.
//! No se embebe la SPA en Tauri ni se expone IPC a la página.

// Sin consola en Windows en release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod menu;
mod server;
mod updater;

use std::sync::Mutex;
use std::time::Duration;

use backend::{DesktopConfig, ServerConfig};
use tauri::async_runtime::JoinHandle;
use tauri::webview::NewWindowResponse;
use tauri::{AppHandle, Manager, RunEvent, Runtime, Url, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
use tauri_plugin_opener::OpenerExt;
use tokio::sync::oneshot;

const MAIN_WINDOW: &str = "main";
const WINDOW_TITLE: &str = "Postgre Hub";
/// Tiempo máximo esperando a que axum cierre al salir.
const SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(3);

/// Servidor en marcha: canal de apagado y tarea, para pararlo al salir.
#[derive(Default)]
struct ServerHandle {
    shutdown: Mutex<Option<oneshot::Sender<()>>>,
    task: Mutex<Option<JoinHandle<()>>>,
}

/// Para axum y espera (con límite) a que suelte el puerto. Idempotente.
pub(crate) fn stop_server<R: Runtime>(app: &AppHandle<R>) {
    let Some(state) = app.try_state::<ServerHandle>() else {
        return;
    };
    if let Some(tx) = state.shutdown.lock().unwrap().take() {
        let _ = tx.send(());
    }
    if let Some(task) = state.task.lock().unwrap().take() {
        tauri::async_runtime::block_on(async {
            let _ = tokio::time::timeout(SHUTDOWN_TIMEOUT, task).await;
        });
    }
}

/// Error fatal de arranque: diálogo nativo y salida limpia, sin panic.
fn fatal<R: Runtime>(app: &AppHandle<R>, message: String) {
    eprintln!("[desktop] fatal: {message}");
    let handle = app.clone();
    app.dialog()
        .message(format!("Postgre Hub could not start.\n\n{message}"))
        .title(WINDOW_TITLE)
        .kind(MessageDialogKind::Error)
        .show(move |_| handle.exit(1));
}

/// Solo el origen local del backend se carga dentro de la ventana.
fn is_local_origin(url: &Url, port: u16) -> bool {
    url.scheme() == "http"
        && matches!(url.host_str(), Some("127.0.0.1") | Some("localhost"))
        && url.port() == Some(port)
}

/// Abre en el navegador del sistema los enlaces externos admitidos.
fn open_external<R: Runtime>(app: &AppHandle<R>, url: &Url) {
    if matches!(url.scheme(), "http" | "https" | "mailto") {
        if let Err(e) = app.opener().open_url(url.as_str(), None::<&str>) {
            eprintln!("[desktop] cannot open {url}: {e}");
        }
    } else {
        eprintln!("[desktop] blocked navigation to {url}");
    }
}

fn setup<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let default_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("cannot resolve the data directory: {e}"))?;
    let data_dir = server::resolve_data_dir(default_dir);

    let std_listener = server::bind_persisted_port(&data_dir)?;
    let port = std_listener.local_addr().map_err(|e| e.to_string())?.port();
    let token = server::launch_token()?;

    // Diálogo de guardado nativo; el backend lo ejecuta en spawn_blocking.
    let dialog_app = app.clone();
    let desktop = DesktopConfig::with_blocking_dialog(token.clone(), port, move |req| {
        let mut builder = dialog_app.dialog().file().set_file_name(req.suggested_name);
        if let Some(window) = dialog_app.get_webview_window(MAIN_WINDOW) {
            builder = builder.set_parent(&window);
        }
        match builder.blocking_save_file() {
            None => Ok(None),
            Some(path) => path.into_path().map(Some).map_err(|e| e.to_string()),
        }
    });

    let mut cfg = ServerConfig::from_env();
    cfg.data_dir = data_dir;
    cfg.dev = false;
    cfg.secure_cookies = false;
    cfg.desktop = Some(desktop);

    // tokio::net::TcpListener::from_std necesita el reactor de tokio.
    let listener =
        tauri::async_runtime::block_on(async { tokio::net::TcpListener::from_std(std_listener) })
            .map_err(|e| format!("cannot start listener: {e}"))?;

    let (tx, rx) = oneshot::channel::<()>();
    let error_app = app.clone();
    let task = tauri::async_runtime::spawn(async move {
        let shutdown = async {
            let _ = rx.await;
        };
        if let Err(e) = backend::serve(listener, cfg, shutdown).await {
            fatal(&error_app, e);
        }
    });
    let handle = app.state::<ServerHandle>();
    *handle.shutdown.lock().unwrap() = Some(tx);
    *handle.task.lock().unwrap() = Some(task);

    let start_url: Url = format!("http://127.0.0.1:{port}/api/auth/desktop?token={token}")
        .parse()
        .map_err(|e| format!("invalid start URL: {e}"))?;

    let nav_app = app.clone();
    let popup_app = app.clone();
    WebviewWindowBuilder::new(app, MAIN_WINDOW, WebviewUrl::External(start_url))
        .title(WINDOW_TITLE)
        .inner_size(1280.0, 820.0)
        .min_inner_size(960.0, 600.0)
        .center()
        .devtools(cfg!(debug_assertions))
        .on_navigation(move |url| {
            if is_local_origin(url, port) || url.scheme() == "about" {
                true
            } else {
                open_external(&nav_app, url);
                false
            }
        })
        .on_new_window(move |url, _features| {
            // Nunca se abren ventanas nuevas: lo externo va al navegador.
            if !is_local_origin(&url, port) {
                open_external(&popup_app, &url);
            }
            NewWindowResponse::Deny
        })
        .build()
        .map_err(|e| format!("cannot create the window: {e}"))?;

    if updater::is_configured(app.config()) {
        updater::spawn_check(app.clone());
    }
    Ok(())
}

fn main() {
    let context = tauri::generate_context!();
    let updater_enabled = updater::is_configured(context.config());

    let mut builder = tauri::Builder::default()
        // Primero: una segunda instancia no debe abrir la misma SQLite.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init());

    if updater_enabled {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    let app = builder
        .manage(ServerHandle::default())
        .menu(menu::build)
        .setup(|app| {
            if let Err(e) = setup(app.handle()) {
                fatal(app.handle(), e);
            }
            Ok(())
        })
        .build(context);

    let app = match app {
        Ok(app) => app,
        Err(e) => {
            eprintln!("[desktop] cannot initialise the application: {e}");
            std::process::exit(1);
        }
    };

    app.run(|app, event| {
        if let RunEvent::Exit = event {
            stop_server(app);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn local_origin_filter() {
        let ok = |s: &str| is_local_origin(&s.parse().unwrap(), 4567);
        assert!(ok("http://127.0.0.1:4567/"));
        assert!(ok("http://localhost:4567/connections/1"));
        assert!(!ok("http://127.0.0.1:4568/"));
        assert!(!ok("https://127.0.0.1:4567/"));
        assert!(!ok("http://evil.example:4567/"));
        assert!(!ok("http://127.0.0.1.evil.example:4567/"));
    }
}
