//! Arranque del backend axum dentro del proceso de escritorio.
//!
//! - Escucha siempre en 127.0.0.1 (nunca 0.0.0.0): las credenciales de las
//!   conexiones viven en claro en la SQLite y no deben quedar expuestas a la red.
//! - El puerto se guarda en `<data_dir>/desktop.json` y se reutiliza en el
//!   siguiente arranque. Así el origen `http://127.0.0.1:<p>` es estable y el
//!   webview conserva su `localStorage` (tema, paneles, pestañas SQL) y la cookie.

use std::net::{Ipv4Addr, SocketAddr, TcpListener as StdListener};
use std::path::{Path, PathBuf};
use std::time::Duration;

use serde::{Deserialize, Serialize};

/// Fichero de estado del escritorio dentro del data_dir.
const STATE_FILE: &str = "desktop.json";

/// Intentos de recuperar el puerto guardado antes de pedir uno nuevo. Cubre el
/// relanzamiento tras una actualización, cuando el proceso anterior aún está
/// liberando el socket.
const SAVED_PORT_ATTEMPTS: u32 = 10;
const SAVED_PORT_RETRY: Duration = Duration::from_millis(150);

#[derive(Debug, Default, Serialize, Deserialize)]
struct DesktopState {
    #[serde(default)]
    port: Option<u16>,
}

fn read_state(data_dir: &Path) -> DesktopState {
    std::fs::read_to_string(data_dir.join(STATE_FILE))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn write_state(data_dir: &Path, state: &DesktopState) -> Result<(), String> {
    let path = data_dir.join(STATE_FILE);
    let json = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| format!("cannot write {}: {e}", path.display()))
}

fn bind_loopback(port: u16) -> std::io::Result<StdListener> {
    StdListener::bind(SocketAddr::from((Ipv4Addr::LOCALHOST, port)))
}

/// Abre el listener en loopback: el puerto guardado si está libre o, si no, uno
/// nuevo que se persiste. Devuelve el listener (no bloqueante, listo para tokio).
pub fn bind_persisted_port(data_dir: &Path) -> Result<StdListener, String> {
    std::fs::create_dir_all(data_dir)
        .map_err(|e| format!("cannot create data directory {}: {e}", data_dir.display()))?;

    let mut state = read_state(data_dir);
    let mut listener = None;

    if let Some(saved) = state.port.filter(|p| *p != 0) {
        for attempt in 0..SAVED_PORT_ATTEMPTS {
            match bind_loopback(saved) {
                Ok(l) => {
                    listener = Some(l);
                    break;
                }
                Err(_) if attempt + 1 < SAVED_PORT_ATTEMPTS => std::thread::sleep(SAVED_PORT_RETRY),
                Err(e) => {
                    eprintln!("[desktop] saved port {saved} unavailable ({e}), picking a new one")
                }
            }
        }
    }

    let listener = match listener {
        Some(l) => l,
        None => bind_loopback(0).map_err(|e| format!("cannot bind 127.0.0.1: {e}"))?,
    };

    let port = listener
        .local_addr()
        .map_err(|e| format!("cannot read listener address: {e}"))?
        .port();
    if state.port != Some(port) {
        state.port = Some(port);
        write_state(data_dir, &state)?;
    }

    listener
        .set_nonblocking(true)
        .map_err(|e| format!("cannot configure listener: {e}"))?;
    Ok(listener)
}

/// Token de arranque: 256 bits del generador del sistema, en hexadecimal.
pub fn launch_token() -> Result<String, String> {
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes).map_err(|e| format!("cannot generate launch token: {e}"))?;
    Ok(bytes.iter().map(|b| format!("{b:02x}")).collect())
}

/// Carpeta de datos. En builds de depuración se puede forzar con
/// `POSTGRE_HUB_DESKTOP_DATA_DIR` para probar sin tocar los datos reales; en
/// release la variable se ignora.
pub fn resolve_data_dir(default: PathBuf) -> PathBuf {
    #[cfg(debug_assertions)]
    if let Some(dir) = std::env::var_os("POSTGRE_HUB_DESKTOP_DATA_DIR").filter(|v| !v.is_empty()) {
        return PathBuf::from(dir);
    }
    default
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("ph-desktop-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        dir
    }

    #[test]
    fn reuses_saved_port_and_moves_when_busy() {
        let dir = temp_dir("port");
        let first = bind_persisted_port(&dir).unwrap();
        let port = first.local_addr().unwrap().port();
        assert!(first.local_addr().unwrap().ip().is_loopback());
        drop(first);

        // Libre: se reutiliza.
        let again = bind_persisted_port(&dir).unwrap();
        assert_eq!(again.local_addr().unwrap().port(), port);

        // Ocupado: se elige otro y se guarda.
        let other = bind_persisted_port(&dir).unwrap();
        let new_port = other.local_addr().unwrap().port();
        assert_ne!(new_port, port);
        assert_eq!(read_state(&dir).port, Some(new_port));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn token_is_256_bits_hex() {
        let a = launch_token().unwrap();
        let b = launch_token().unwrap();
        assert_eq!(a.len(), 64);
        assert!(a.chars().all(|c| c.is_ascii_hexdigit()));
        assert_ne!(a, b);
    }
}
