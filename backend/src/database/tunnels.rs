use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::auth::AuthState;

#[derive(Serialize, Deserialize)]
pub struct SshTunnel {
    pub id:          String,
    pub name:        String,
    pub host:        String,
    pub port:        i64,
    pub username:    String,
    pub auth_type:   String,
    pub private_key: String,
    pub created_at:  i64,
}

#[derive(Deserialize)]
pub struct TunnelRequest {
    pub name:        String,
    pub host:        String,
    pub port:        Option<i64>,
    pub username:    String,
    pub auth_type:   Option<String>,
    pub password:    Option<String>,
    pub private_key: Option<String>,
}

pub async fn list_tunnels(State(auth): State<AuthState>) -> impl IntoResponse {
    let db = auth.db.clone();
    let rows = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        let mut stmt = conn
            .prepare(
                "SELECT id, name, host, port, username, auth_type, private_key, created_at \
                 FROM ssh_tunnels ORDER BY created_at DESC",
            )
            .unwrap();
        stmt.query_map([], |r| {
            Ok(SshTunnel {
                id:          r.get(0)?,
                name:        r.get(1)?,
                host:        r.get(2)?,
                port:        r.get(3)?,
                username:    r.get(4)?,
                auth_type:   r.get(5)?,
                private_key: r.get(6)?,
                created_at:  r.get(7)?,
            })
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>()
    })
    .await
    .unwrap_or_default();

    (StatusCode::OK, Json(json!({ "tunnels": rows })))
}

pub async fn create_tunnel(
    State(auth): State<AuthState>,
    Json(body): Json<TunnelRequest>,
) -> impl IntoResponse {
    if body.name.trim().is_empty() || body.host.trim().is_empty() || body.username.trim().is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({ "error": "name, host and username are required" })));
    }
    let id  = uuid::Uuid::new_v4().to_string();
    let id2 = id.clone();
    let db  = auth.db.clone();
    let ok  = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        conn.execute(
            "INSERT INTO ssh_tunnels (id, name, host, port, username, auth_type, password, private_key)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
            rusqlite::params![
                id2,
                body.name.trim(),
                body.host.trim(),
                body.port.unwrap_or(22),
                body.username.trim(),
                body.auth_type.as_deref().unwrap_or("password"),
                body.password.unwrap_or_default(),
                body.private_key.unwrap_or_default(),
            ],
        ).is_ok()
    })
    .await
    .unwrap_or(false);

    if ok {
        (StatusCode::OK, Json(json!({ "id": id, "ok": true })))
    } else {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": "Failed to create tunnel" })))
    }
}

pub async fn update_tunnel(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
    Json(body): Json<TunnelRequest>,
) -> impl IntoResponse {
    let db = auth.db.clone();
    let ok = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        let r = conn.execute(
            "UPDATE ssh_tunnels SET name=?1, host=?2, port=?3, username=?4, auth_type=?5 WHERE id=?6",
            rusqlite::params![
                body.name.trim(),
                body.host.trim(),
                body.port.unwrap_or(22),
                body.username.trim(),
                body.auth_type.as_deref().unwrap_or("password"),
                id.clone(),
            ],
        ).map(|n| n > 0).unwrap_or(false);

        if !r { return false; }

        for (col, val) in [("password", body.password), ("private_key", body.private_key)] {
            if let Some(v) = val.filter(|s| !s.is_empty()) {
                let sql = format!("UPDATE ssh_tunnels SET {col}=?1 WHERE id=?2");
                let _ = conn.execute(&sql, rusqlite::params![v, id.clone()]);
            }
        }
        true
    })
    .await
    .unwrap_or(false);

    if ok {
        (StatusCode::OK, Json(json!({ "ok": true })))
    } else {
        (StatusCode::NOT_FOUND, Json(json!({ "error": "Tunnel not found" })))
    }
}

fn expand_tilde(path: &str) -> String {
    let rest = path.strip_prefix("~/").or_else(|| path.strip_prefix("~\\"));
    match (rest, home_dir()) {
        (Some(rest), Some(home)) => home.join(rest).to_string_lossy().into_owned(),
        _ => path.to_string(),
    }
}

/// Carpeta personal: HOME en Unix (y en Git Bash/MSYS), USERPROFILE en Windows.
fn home_dir() -> Option<std::path::PathBuf> {
    ["HOME", "USERPROFILE"]
        .iter()
        .filter_map(std::env::var_os)
        .find(|v| !v.is_empty())
        .map(std::path::PathBuf::from)
}

// ── Lanzamiento de `ssh` del sistema ─────────────────────────────────────────

/// Fichero nulo para `UserKnownHostsFile` (`/dev/null` no existe en Windows).
pub(super) const NULL_DEVICE: &str = if cfg!(windows) { "NUL" } else { "/dev/null" };

/// `ssh` del sistema. En Windows se lanza sin consola: la app de escritorio no
/// tiene una y cada proceso abriría su propia ventana negra.
pub(super) fn ssh_command() -> std::process::Command {
    #[allow(unused_mut)]
    let mut cmd = std::process::Command::new("ssh");
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

/// SSH_ASKPASS temporal para la passphrase de la clave. La passphrase va en un
/// fichero de datos aparte y el script solo lo vuelca, así que el secreto nunca
/// forma parte del código que interpreta el shell (con un `echo` incrustado,
/// un salto de línea o un metacarácter en la passphrase se ejecutaría como
/// comando). Los dos ficheros viven en un directorio temporal propio con
/// nombres aleatorios, y el guard borra el directorio entero al soltarse.
/// En Unix el script es un `.sh`; en Windows un `.cmd`, que Win32-OpenSSH
/// puede ejecutar como askpass (sin verificar en Windows real).
pub(super) struct Askpass {
    dir:    std::path::PathBuf,
    script: std::path::PathBuf,
}

impl Drop for Askpass {
    fn drop(&mut self) { let _ = std::fs::remove_dir_all(&self.dir); }
}

impl Askpass {
    /// `Ok(None)` si no hay passphrase. Falla si la passphrase no es válida o si
    /// no se pueden crear los ficheros; lo ya creado se borra igualmente.
    pub(super) fn write(secret: &str) -> Result<Option<Self>, String> {
        if secret.is_empty() { return Ok(None); }
        validate_passphrase(secret)?;

        let dir = std::env::temp_dir().join(format!("ph_askpass_{}", uuid::Uuid::new_v4()));
        #[allow(unused_mut)]
        let mut builder = std::fs::DirBuilder::new();
        #[cfg(unix)] {
            use std::os::unix::fs::DirBuilderExt;
            builder.mode(0o700);
        }
        // `create` falla si ya existe: nadie puede habernos preparado el directorio.
        builder.create(&dir).map_err(|e| format!("Cannot create askpass directory: {e}"))?;

        let ext         = if cfg!(windows) { "cmd" } else { "sh" };
        let secret_name = format!("{}.secret", uuid::Uuid::new_v4());
        let script      = dir.join(format!("{}.{ext}", uuid::Uuid::new_v4()));
        // A partir de aquí el guard existe: cualquier `?` borra lo que haya.
        let guard       = Self { dir, script };
        let secret_path = guard.dir.join(&secret_name);

        // Sin salto de línea final: el script imprime exactamente la passphrase.
        write_new_file(&secret_path, secret.as_bytes(), 0o600)
            .map_err(|e| format!("Cannot write askpass secret: {e}"))?;

        #[cfg(not(windows))]
        let content = unix_askpass_script(&secret_path);
        #[cfg(windows)]
        let content = windows_askpass_script(&secret_name);
        write_new_file(&guard.script, content.as_bytes(), 0o700)
            .map_err(|e| format!("Cannot write askpass script: {e}"))?;

        Ok(Some(guard))
    }

    pub(super) fn apply(&self, cmd: &mut std::process::Command) {
        cmd.env("SSH_ASKPASS", &self.script)
           .env("SSH_ASKPASS_REQUIRE", "force")
           .env("DISPLAY", "");
    }
}

/// ssh solo lee una línea del askpass: una passphrase con saltos de línea o NUL
/// no se podría introducir de todos modos.
fn validate_passphrase(secret: &str) -> Result<(), String> {
    if secret.contains(['\r', '\n', '\0']) {
        return Err("SSH key passphrase cannot contain line breaks or NUL characters".to_string());
    }
    Ok(())
}

/// Crea el fichero (falla si ya existe) con los permisos indicados desde el
/// primer momento en Unix, sin ventana en la que otro usuario pueda leerlo.
fn write_new_file(path: &std::path::Path, data: &[u8], #[allow(unused_variables)] mode: u32) -> std::io::Result<()> {
    use std::io::Write;
    let mut opts = std::fs::OpenOptions::new();
    opts.write(true).create_new(true);
    #[cfg(unix)] {
        use std::os::unix::fs::OpenOptionsExt;
        opts.mode(mode);
    }
    opts.open(path)?.write_all(data)
}

/// Script de Unix: `cat` del fichero de secreto. La ruta (que no es secreta) va
/// entre comillas simples, escapando las que pudiera contener `TMPDIR`.
#[cfg(any(not(windows), test))]
fn unix_askpass_script(secret_path: &std::path::Path) -> String {
    let quoted = secret_path.to_string_lossy().replace('\'', "'\\''");
    format!("#!/bin/sh\nexec cat -- '{quoted}'\n")
}

/// Script de Windows: `type` del fichero de secreto, que está junto al script
/// (`%~dp0` incluye la barra final). El nombre es un uuid: sin caracteres
/// especiales para cmd, y la ruta del directorio no se incrusta.
#[cfg(any(windows, test))]
fn windows_askpass_script(secret_name: &str) -> String {
    format!("@echo off\r\ntype \"%~dp0{secret_name}\"\r\n")
}

pub struct TempKeyFile(pub std::path::PathBuf);
impl Drop for TempKeyFile {
    fn drop(&mut self) { let _ = std::fs::remove_file(&self.0); }
}

// Returns (key_path_to_use, guard_that_cleans_up_temp_file_if_any).
// If `private_key` starts with `-----BEGIN`, it is treated as PEM content and
// materialized to a temp file with 0600 perms. Otherwise it is treated as a
// filesystem path (with ~ expansion).
pub fn materialize_key(private_key: &str) -> Result<(String, Option<TempKeyFile>), String> {
    let trimmed = private_key.trim_start();

    // Reject public keys (ssh-rsa / ssh-ed25519 / ecdsa-sha2-... AAAA...) up-front —
    // otherwise they'd fall through to expand_tilde and ssh would treat the whole
    // blob as a path.
    if trimmed.starts_with("ssh-") || trimmed.starts_with("ecdsa-sha2-") {
        return Err("This looks like a public key (.pub). Load the private key file instead (e.g. ~/.ssh/id_rsa, not id_rsa.pub).".to_string());
    }

    // PEM content → write to a temp file with 0600 and return that path.
    if trimmed.starts_with("-----BEGIN") {
        let path = std::env::temp_dir().join(format!("ph_key_{}", uuid::Uuid::new_v4()));
        let mut content = private_key.to_string();
        if !content.ends_with('\n') { content.push('\n'); }
        std::fs::write(&path, content).map_err(|e| format!("Cannot write key file: {e}"))?;
        #[cfg(unix)] {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600))
                .map_err(|e| format!("Cannot chmod key file: {e}"))?;
        }
        return Ok((path.to_string_lossy().into_owned(), Some(TempKeyFile(path))));
    }

    // Multi-line but not a recognized key header → almost certainly bad content,
    // not a path. Fail early instead of letting ssh choke on a giant argument.
    if private_key.contains('\n') {
        return Err("Unrecognized private key content. Expected it to start with '-----BEGIN …PRIVATE KEY-----'.".to_string());
    }

    // Single-line value → treat as a filesystem path (with ~ expansion).
    Ok((expand_tilde(private_key), None))
}

pub async fn test_tunnel(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = auth.db.clone();
    let result = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        let params = get_tunnel_params(&conn, &id)
            .ok_or_else(|| "Tunnel not found".to_string())?;

        if !params.private_key.is_empty() {
            // Use system `ssh` — handles Ed25519, OpenSSH format, RSA PEM, etc.
            let (key_path, _key_guard) = materialize_key(&params.private_key)?;
            let target   = format!("{}@{}", params.username, params.host);

            // Build command, optionally injecting passphrase via SSH_ASKPASS
            let askpass = Askpass::write(&params.password)?;

            let known_hosts = format!("UserKnownHostsFile={NULL_DEVICE}");
            let mut cmd = ssh_command();
            cmd.args([
                    "-o", "ConnectTimeout=15",
                    "-o", "StrictHostKeyChecking=no",
                    "-o", &known_hosts,
                    "-o", "PasswordAuthentication=no",
                    "-o", "IdentitiesOnly=yes",
                    "-i", &key_path,
                    "-p", &params.port.to_string(),
                    &target,
                    "true",
                ]);

            if let Some(ref script) = askpass {
                script.apply(&mut cmd);
                cmd.stdin(std::process::Stdio::null());
            }

            let output = cmd.output().map_err(|e| format!("Cannot run ssh: {e}"))?;
            drop(askpass);

            if output.status.success() {
                Ok(format!("Connected to {target}"))
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let msg = stderr.lines()
                    .find(|l| !l.trim().is_empty() && !l.starts_with("Warning:") && !l.starts_with("debug"))
                    .unwrap_or("Authentication failed")
                    .trim()
                    .to_string();
                Err(msg)
            }
        } else {
            // Password auth: libssh2
            let tcp = std::net::TcpStream::connect(format!("{}:{}", params.host, params.port))
                .map_err(|e| format!("TCP connect: {e}"))?;
            let mut session = ssh2::Session::new()
                .map_err(|e| format!("SSH session: {e}"))?;
            session.set_tcp_stream(tcp);
            session.handshake().map_err(|e| format!("SSH handshake: {e}"))?;
            session.userauth_password(&params.username, &params.password)
                .map_err(|e| format!("SSH password auth: {e}"))?;
            if !session.authenticated() {
                return Err("SSH authentication failed".to_string());
            }
            Ok(format!("Connected to {}@{}:{}", params.username, params.host, params.port))
        }
    })
    .await
    .unwrap_or_else(|e| Err(format!("Task error: {e}")));

    match result {
        Ok(msg) => (StatusCode::OK, Json(json!({ "ok": true,  "message": msg }))),
        Err(e)  => (StatusCode::OK, Json(json!({ "ok": false, "error": e }))),
    }
}

pub async fn delete_tunnel(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = auth.db.clone();
    let ok = tokio::task::spawn_blocking(move || {
        let conn = db.lock().unwrap();
        // Unlink from projects first
        let _ = conn.execute(
            "UPDATE projects SET ssh_tunnel_id=NULL WHERE ssh_tunnel_id=?1",
            [&id],
        );
        conn.execute("DELETE FROM ssh_tunnels WHERE id=?1", [&id])
            .map(|n| n > 0)
            .unwrap_or(false)
    })
    .await
    .unwrap_or(false);

    if ok {
        (StatusCode::OK, Json(json!({ "ok": true })))
    } else {
        (StatusCode::NOT_FOUND, Json(json!({ "error": "Tunnel not found" })))
    }
}

// Called from query.rs to resolve a tunnel's connection params
pub struct TunnelParams {
    pub host:        String,
    pub port:        u16,
    pub username:    String,
    pub password:    String,
    pub private_key: String,
}

pub fn get_tunnel_params(conn: &rusqlite::Connection, tunnel_id: &str) -> Option<TunnelParams> {
    conn.query_row(
        "SELECT host, port, username, password, private_key FROM ssh_tunnels WHERE id=?1",
        [tunnel_id],
        |r| Ok(TunnelParams {
            host:        r.get(0)?,
            port:        r.get::<_, i64>(1)? as u16,
            username:    r.get(2)?,
            password:    r.get(3)?,
            private_key: r.get(4)?,
        }),
    ).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_control_characters() {
        for bad in ["a\nb", "a\rb", "a\0b", "pass\n", "\r\n"] {
            let err = Askpass::write(bad).err().expect("passphrase should be rejected");
            assert!(err.contains("line breaks or NUL"), "{err}");
        }
    }

    #[test]
    fn empty_passphrase_needs_no_askpass() {
        assert!(Askpass::write("").unwrap().is_none());
    }

    #[test]
    fn scripts_do_not_embed_the_secret() {
        let unix = unix_askpass_script(std::path::Path::new("/tmp/ph_askpass_x/it's.secret"));
        assert_eq!(unix, "#!/bin/sh\nexec cat -- '/tmp/ph_askpass_x/it'\\''s.secret'\n");

        let win = windows_askpass_script("0b6e.secret");
        assert_eq!(win, "@echo off\r\ntype \"%~dp00b6e.secret\"\r\n");
    }

    #[cfg(unix)]
    #[test]
    fn script_prints_exact_passphrase_and_is_cleaned_up() {
        use std::os::unix::fs::PermissionsExt;

        let secret = "p'a\"s$s `x` %PATH% ^&|<> !! \\ ñ";
        let guard  = Askpass::write(secret).unwrap().unwrap();
        let dir    = guard.dir.clone();

        let script = std::fs::read_to_string(&guard.script).unwrap();
        assert!(!script.contains(secret));

        let mode = |p: &std::path::Path| std::fs::metadata(p).unwrap().permissions().mode() & 0o777;
        assert_eq!(mode(&dir), 0o700);
        assert_eq!(mode(&guard.script), 0o700);
        let secret_file = std::fs::read_dir(&dir).unwrap()
            .map(|e| e.unwrap().path())
            .find(|p| p.extension().is_some_and(|e| e == "secret"))
            .unwrap();
        assert_eq!(mode(&secret_file), 0o600);

        let out = std::process::Command::new(&guard.script).output().unwrap();
        assert!(out.status.success());
        assert_eq!(out.stdout, secret.as_bytes());

        drop(guard);
        assert!(!dir.exists());
    }
}
