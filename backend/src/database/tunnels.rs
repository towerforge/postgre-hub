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
    if let Some(rest) = path.strip_prefix("~/") {
        let home = std::env::var("HOME").unwrap_or_default();
        format!("{home}/{rest}")
    } else {
        path.to_string()
    }
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
            let askpass_script = if !params.password.is_empty() {
                let path = std::env::temp_dir().join(format!("ph_askpass_{}.sh", uuid::Uuid::new_v4()));
                let content = format!("#!/bin/sh\necho '{}'\n", params.password.replace('\'', "'\\''"));
                std::fs::write(&path, content).ok();
                #[cfg(unix)] {
                    use std::os::unix::fs::PermissionsExt;
                    let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o700));
                }
                Some(path)
            } else {
                None
            };

            let mut cmd = std::process::Command::new("ssh");
            cmd.args([
                    "-o", "ConnectTimeout=15",
                    "-o", "StrictHostKeyChecking=no",
                    "-o", "UserKnownHostsFile=/dev/null",
                    "-o", "PasswordAuthentication=no",
                    "-o", "IdentitiesOnly=yes",
                    "-i", &key_path,
                    "-p", &params.port.to_string(),
                    &target,
                    "true",
                ]);

            if let Some(ref script) = askpass_script {
                cmd.env("SSH_ASKPASS", script)
                   .env("SSH_ASKPASS_REQUIRE", "force")
                   .env("DISPLAY", "")
                   .stdin(std::process::Stdio::null());
            }

            let output = cmd.output().map_err(|e| format!("Cannot run ssh: {e}"))?;

            if let Some(script) = askpass_script {
                let _ = std::fs::remove_file(script);
            }

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
