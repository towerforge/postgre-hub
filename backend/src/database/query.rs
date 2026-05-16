use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::Arc;
use tokio_postgres::NoTls;

use crate::auth::AuthState;

// ── SSH helpers ───────────────────────────────────────────────────────────────

use crate::database::tunnels::materialize_key;

fn free_local_port() -> Result<u16, String> {
    std::net::TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Cannot bind local port: {e}"))?
        .local_addr()
        .map(|a| a.port())
        .map_err(|e| format!("Local addr: {e}"))
}

// ── SSH tunnel ────────────────────────────────────────────────────────────────

fn start_ssh_tunnel(
    ssh_host: &str,
    ssh_port: u16,
    ssh_user: &str,
    ssh_password: &str,
    ssh_private_key: &str,
    pg_host: String,
    pg_port: u16,
) -> Result<u16, String> {

    if !ssh_private_key.is_empty() {
        // Use system `ssh` — handles ALL key formats (Ed25519, OpenSSH, RSA PEM…)
        use std::io::Read;
        let (key_path, key_guard) = materialize_key(ssh_private_key)?;
        let local_port = free_local_port()?;

        let askpass_script = if !ssh_password.is_empty() {
            let path = std::env::temp_dir().join(format!("ph_askpass_{}.sh", uuid::Uuid::new_v4()));
            let content = format!("#!/bin/sh\necho '{}'\n", ssh_password.replace('\'', "'\\''"));
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
                "-N",
                "-o", "StrictHostKeyChecking=no",
                "-o", "UserKnownHostsFile=/dev/null",
                "-o", "ExitOnForwardFailure=yes",
                "-o", "ConnectTimeout=15",
                "-o", "PasswordAuthentication=no",
                "-L", &format!("127.0.0.1:{local_port}:{pg_host}:{pg_port}"),
                "-i", &key_path,
                "-p", &ssh_port.to_string(),
                &format!("{ssh_user}@{ssh_host}"),
            ])
            .stdin(std::process::Stdio::null())
            .stderr(std::process::Stdio::piped());

        if let Some(ref script) = askpass_script {
            cmd.env("SSH_ASKPASS", script)
               .env("SSH_ASKPASS_REQUIRE", "force")
               .env("DISPLAY", "");
        }

        let mut child = cmd.spawn()
            .map_err(|e| format!("Cannot run ssh command: {e}"))?;

        // Poll until the local forward port is actually listening, or the child
        // exits, or we hit the overall timeout. A fixed `sleep(1s)` races with
        // ssh auth on slow links and returns before the tunnel is up.
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(20);
        let mut tunnel_ready = false;
        while std::time::Instant::now() < deadline {
            match child.try_wait() {
                Ok(Some(status)) => {
                    let mut stderr = String::new();
                    if let Some(mut e) = child.stderr.take() {
                        let _ = e.read_to_string(&mut stderr);
                    }
                    if let Some(script) = askpass_script {
                        let _ = std::fs::remove_file(script);
                    }
                    return Err(format!(
                        "SSH tunnel exited ({}): {}",
                        status.code().unwrap_or(-1),
                        stderr.lines().find(|l| !l.trim().is_empty()).unwrap_or("unknown error")
                    ));
                }
                Err(e) => {
                    if let Some(script) = askpass_script {
                        let _ = std::fs::remove_file(script);
                    }
                    return Err(format!("SSH process error: {e}"));
                }
                Ok(None) => {}
            }
            if std::net::TcpStream::connect_timeout(
                &format!("127.0.0.1:{local_port}").parse().unwrap(),
                std::time::Duration::from_millis(200),
            ).is_ok() {
                tunnel_ready = true;
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }

        if let Some(script) = askpass_script {
            let _ = std::fs::remove_file(script);
        }

        if !tunnel_ready {
            let _ = child.kill();
            return Err("SSH tunnel did not become ready within 20s".to_string());
        }

        std::thread::spawn(move || {
            let _guard = key_guard; // hold temp key alive for the tunnel's lifetime
            let _ = child.wait();
        });
        Ok(local_port)

    } else {
        // Password auth: use libssh2
        use std::net::TcpListener;

        let tcp = std::net::TcpStream::connect(format!("{ssh_host}:{ssh_port}"))
            .map_err(|e| format!("SSH connect: {e}"))?;
        let mut session = ssh2::Session::new()
            .map_err(|e| format!("SSH session: {e}"))?;
        session.set_tcp_stream(tcp);
        session.handshake()
            .map_err(|e| format!("SSH handshake: {e}"))?;
        session.userauth_password(ssh_user, ssh_password)
            .map_err(|e| format!("SSH password auth: {e}"))?;

        if !session.authenticated() {
            return Err("SSH authentication failed".to_string());
        }

        let listener = TcpListener::bind("127.0.0.1:0")
            .map_err(|e| format!("Local listener: {e}"))?;
        let local_port = listener.local_addr()
            .map_err(|e| format!("Local addr: {e}"))?.port();

        std::thread::spawn(move || {
            let Ok((local_stream, _)) = listener.accept() else { return };
            let Ok(channel) = session.channel_direct_tcpip(&pg_host, pg_port, None) else { return };
            bridge(local_stream, channel, session);
        });

        Ok(local_port)
    }
}

fn bridge(
    mut local: std::net::TcpStream,
    mut channel: ssh2::Channel,
    session: ssh2::Session,
) {
    use std::io::{ErrorKind, Read, Write};

    local.set_nonblocking(true).ok();

    let mut buf = vec![0u8; 16384];
    loop {
        let mut did_work = false;

        // local → SSH channel
        match local.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => {
                session.set_blocking(true);
                if channel.write_all(&buf[..n]).is_err() {
                    break;
                }
                session.set_blocking(false);
                did_work = true;
            }
            Err(e) if e.kind() == ErrorKind::WouldBlock => {}
            Err(_) => break,
        }

        // SSH channel → local
        session.set_blocking(false);
        match channel.read(&mut buf) {
            Ok(0) if channel.eof() => break,
            Ok(n) if n > 0 => {
                session.set_blocking(true);
                local.set_nonblocking(false).ok();
                if local.write_all(&buf[..n]).is_err() {
                    break;
                }
                local.set_nonblocking(true).ok();
                did_work = true;
            }
            Ok(_) => {
                session.set_blocking(true);
            }
            Err(e) if e.kind() == ErrorKind::WouldBlock => {
                session.set_blocking(true);
            }
            Err(_) => break,
        }

        if !did_work {
            std::thread::sleep(std::time::Duration::from_micros(500));
        }
    }

    session.set_blocking(true);
    let _ = channel.close();
    let _ = channel.wait_close();
}

// ── TLS (rustls) ──────────────────────────────────────────────────────────────

#[derive(Debug)]
struct SkipServerVerify;

impl rustls::client::danger::ServerCertVerifier for SkipServerVerify {
    fn verify_server_cert(
        &self,
        _end_entity: &rustls::pki_types::CertificateDer<'_>,
        _intermediates: &[rustls::pki_types::CertificateDer<'_>],
        _server_name: &rustls::pki_types::ServerName<'_>,
        _ocsp_response: &[u8],
        _now: rustls::pki_types::UnixTime,
    ) -> Result<rustls::client::danger::ServerCertVerified, rustls::Error> {
        Ok(rustls::client::danger::ServerCertVerified::assertion())
    }

    fn verify_tls12_signature(
        &self,
        _message: &[u8],
        _cert: &rustls::pki_types::CertificateDer<'_>,
        _dss: &rustls::DigitallySignedStruct,
    ) -> Result<rustls::client::danger::HandshakeSignatureValid, rustls::Error> {
        Ok(rustls::client::danger::HandshakeSignatureValid::assertion())
    }

    fn verify_tls13_signature(
        &self,
        _message: &[u8],
        _cert: &rustls::pki_types::CertificateDer<'_>,
        _dss: &rustls::DigitallySignedStruct,
    ) -> Result<rustls::client::danger::HandshakeSignatureValid, rustls::Error> {
        Ok(rustls::client::danger::HandshakeSignatureValid::assertion())
    }

    fn supported_verify_schemes(&self) -> Vec<rustls::SignatureScheme> {
        vec![
            rustls::SignatureScheme::RSA_PKCS1_SHA256,
            rustls::SignatureScheme::RSA_PKCS1_SHA384,
            rustls::SignatureScheme::RSA_PKCS1_SHA512,
            rustls::SignatureScheme::ECDSA_NISTP256_SHA256,
            rustls::SignatureScheme::ECDSA_NISTP384_SHA384,
            rustls::SignatureScheme::ECDSA_NISTP521_SHA512,
            rustls::SignatureScheme::RSA_PSS_SHA256,
            rustls::SignatureScheme::RSA_PSS_SHA384,
            rustls::SignatureScheme::RSA_PSS_SHA512,
            rustls::SignatureScheme::ED25519,
        ]
    }
}

fn build_tls(
    ssl_mode: &str,
    ssl_ca: &str,
    ssl_client_cert: &str,
    ssl_client_key: &str,
) -> Result<tokio_postgres_rustls::MakeRustlsConnect, String> {
    use rustls::ClientConfig;
    use rustls_pemfile::{certs, private_key};

    // "require" with no CA → skip certificate verification entirely
    if ssl_mode == "require" && ssl_ca.is_empty() {
        let config = ClientConfig::builder()
            .dangerous()
            .with_custom_certificate_verifier(Arc::new(SkipServerVerify))
            .with_no_client_auth();
        return Ok(tokio_postgres_rustls::MakeRustlsConnect::new(config));
    }

    // Build root store
    let mut root_store = rustls::RootCertStore::empty();
    if !ssl_ca.is_empty() {
        for cert in certs(&mut ssl_ca.as_bytes()).filter_map(|c| c.ok()) {
            root_store.add(cert).map_err(|e| format!("Invalid CA cert: {e}"))?;
        }
    } else {
        root_store.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
    }

    let builder = ClientConfig::builder().with_root_certificates(root_store);

    let config = if !ssl_client_cert.is_empty() && !ssl_client_key.is_empty() {
        let chain = certs(&mut ssl_client_cert.as_bytes())
            .filter_map(|c| c.ok())
            .collect::<Vec<_>>();
        let key = private_key(&mut ssl_client_key.as_bytes())
            .map_err(|e| format!("Invalid client key: {e}"))?
            .ok_or("No private key found in ssl_client_key")?;
        builder
            .with_client_auth_cert(chain, key)
            .map_err(|e| format!("Client cert/key: {e}"))?
    } else {
        builder.with_no_client_auth()
    };

    Ok(tokio_postgres_rustls::MakeRustlsConnect::new(config))
}

// tokio_postgres::Error::to_string() only yields a generic line like
// "error connecting to server"; the real cause (e.g. "password authentication
// failed") lives in the source chain.
fn pg_err(e: tokio_postgres::Error) -> String {
    let mut msg = e.to_string();
    let mut src: &dyn std::error::Error = &e;
    while let Some(cause) = src.source() {
        msg.push_str(": ");
        msg.push_str(&cause.to_string());
        src = cause;
    }
    msg
}

// ── Connection helper ─────────────────────────────────────────────────────────

pub async fn connect(auth: &AuthState, project_id: &str) -> Result<tokio_postgres::Client, String> {
    use super::tunnels::get_tunnel_params;

    let db = auth.db.clone();
    let id = project_id.to_string();

    #[allow(clippy::type_complexity)]
    let params: Option<(String, i64, String, String, String, String, String, String, String, bool, String, i64, String, String, String, Option<String>)> =
        tokio::task::spawn_blocking(move || {
            let conn = db.lock().unwrap();
            conn.query_row(
                "SELECT host, port, database, username, password, ssl_mode,
                         ssl_ca, ssl_client_cert, ssl_client_key,
                         ssh_enabled, ssh_host, ssh_port, ssh_user,
                         ssh_password, ssh_private_key,
                         ssh_tunnel_id
                  FROM projects WHERE id = ?1",
                [&id],
                |r| Ok((
                    r.get::<_, String>(0)?,          // host
                    r.get::<_, i64>(1)?,              // port
                    r.get::<_, String>(2)?,          // database
                    r.get::<_, String>(3)?,          // username
                    r.get::<_, String>(4)?,          // password
                    r.get::<_, String>(5)?,          // ssl_mode
                    r.get::<_, String>(6)?,          // ssl_ca
                    r.get::<_, String>(7)?,          // ssl_client_cert
                    r.get::<_, String>(8)?,          // ssl_client_key
                    r.get::<_, i64>(9)? != 0,        // ssh_enabled
                    r.get::<_, String>(10)?,         // ssh_host
                    r.get::<_, i64>(11)?,             // ssh_port
                    r.get::<_, String>(12)?,         // ssh_user
                    r.get::<_, String>(13)?,         // ssh_password
                    r.get::<_, String>(14)?,         // ssh_private_key
                    r.get::<_, Option<String>>(15)?, // ssh_tunnel_id
                )),
            ).ok()
        })
        .await
        .unwrap_or(None);

    let (
        host, port, database, username, password, ssl_mode,
        ssl_ca, ssl_client_cert, ssl_client_key,
        mut ssh_enabled, mut ssh_host, mut ssh_port, mut ssh_user,
        mut ssh_password, mut ssh_private_key,
        ssh_tunnel_id,
    ) = params.ok_or("Project not found")?;

    // If a named tunnel is assigned, override inline SSH fields with tunnel config
    if let Some(ref tid) = ssh_tunnel_id {
        let tid2 = tid.clone();
        let db2  = auth.db.clone();
        if let Some(t) = tokio::task::spawn_blocking(move || {
            let conn = db2.lock().unwrap();
            get_tunnel_params(&conn, &tid2)
        }).await.unwrap_or(None) {
            ssh_enabled     = true;
            ssh_host        = t.host;
            ssh_port        = t.port as i64;
            ssh_user        = t.username;
            ssh_password    = t.password;
            ssh_private_key = t.private_key;
        }
    }

    // Determine connection endpoint (direct or through SSH tunnel)
    let (conn_host, conn_port) = if ssh_enabled && !ssh_host.is_empty() {
        let sh = ssh_host.clone();
        let sp = ssh_port as u16;
        let su = ssh_user.clone();
        let spw = ssh_password.clone();
        let sk = ssh_private_key.clone();
        let ph = host.clone();
        let pp = port as u16;

        let local_port = tokio::task::spawn_blocking(move || {
            start_ssh_tunnel(&sh, sp, &su, &spw, &sk, ph, pp)
        })
        .await
        .map_err(|e| e.to_string())??;

        ("127.0.0.1".to_string(), local_port as i64)
    } else {
        (host.clone(), port)
    };

    // Build connection config via the typed API so values with spaces,
    // quotes, backslashes or '=' in the password don't break key-value parsing.
    let mut cfg = tokio_postgres::Config::new();
    cfg.host(&conn_host)
        .port(conn_port as u16)
        .dbname(&database)
        .user(&username)
        .password(&password);

    if ssl_mode == "disable" {
        let (client, connection) = cfg.connect(NoTls).await.map_err(pg_err)?;
        tokio::spawn(async move { let _ = connection.await; });
        return Ok(client);
    }

    // "prefer" / "allow": try TLS (no cert verification), fall back to NoTls
    if ssl_mode == "prefer" || ssl_mode == "allow" {
        use rustls::ClientConfig;
        let config = ClientConfig::builder()
            .dangerous()
            .with_custom_certificate_verifier(Arc::new(SkipServerVerify))
            .with_no_client_auth();
        let tls = tokio_postgres_rustls::MakeRustlsConnect::new(config);
        match cfg.connect(tls).await {
            Ok((client, connection)) => {
                tokio::spawn(async move { let _ = connection.await; });
                return Ok(client);
            }
            Err(_) => {
                let (client, connection) = cfg.connect(NoTls).await.map_err(pg_err)?;
                tokio::spawn(async move { let _ = connection.await; });
                return Ok(client);
            }
        }
    }

    let tls = build_tls(&ssl_mode, &ssl_ca, &ssl_client_cert, &ssl_client_key)?;
    let (client, connection) = cfg.connect(tls).await.map_err(pg_err)?;
    tokio::spawn(async move { let _ = connection.await; });
    Ok(client)
}

// ── Sanitise identifier (prevent SQL injection via table/schema names) ─────────

fn sanitize_ident(s: &str) -> String {
    s.chars()
        .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
        .collect()
}

// ── Handlers ─────────────────────────────────────────────────────────────────

pub async fn test_connection(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match connect(&auth, &id).await {
        Ok(client) => match client.query_one("SELECT version()", &[]).await {
            Ok(row) => {
                let version: String = row.get(0);
                (StatusCode::OK, Json(json!({ "ok": true, "version": version })))
            }
            Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "ok": false, "error": e.to_string() }))),
        },
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "ok": false, "error": e }))),
    }
}

pub async fn list_tables(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let client = match connect(&auth, &id).await {
        Ok(c)  => c,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e }))),
    };

    match client
        .query(
            "SELECT t.table_schema, t.table_name, t.table_type, \
                    CASE WHEN t.table_type = 'BASE TABLE' \
                         THEN pg_total_relation_size(quote_ident(t.table_schema)||'.'||quote_ident(t.table_name)) \
                         ELSE NULL END AS size_bytes, \
                    CASE WHEN t.table_type = 'BASE TABLE' \
                         THEN COALESCE( \
                            (SELECT c.reltuples::bigint FROM pg_class c \
                             JOIN pg_namespace n ON n.oid = c.relnamespace \
                             WHERE n.nspname = t.table_schema AND c.relname = t.table_name), \
                            0) \
                         ELSE NULL END AS row_count \
             FROM information_schema.tables t \
             WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema') \
             ORDER BY t.table_schema, t.table_name",
            &[],
        )
        .await
    {
        Ok(rows) => {
            let tables: Vec<Value> = rows.iter().map(|r| json!({
                "schema":     r.get::<_, String>(0),
                "name":       r.get::<_, String>(1),
                "type":       r.get::<_, String>(2),
                "size_bytes": r.get::<_, Option<i64>>(3),
                "row_count":  r.get::<_, Option<i64>>(4),
            })).collect();
            (StatusCode::OK, Json(json!({ "tables": tables })))
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))),
    }
}

#[derive(Deserialize)]
pub struct TableQuery {
    pub limit:  Option<i64>,
    pub offset: Option<i64>,
    pub schema: Option<String>,
}

pub async fn get_table_data(
    State(auth): State<AuthState>,
    Path((id, table)): Path<(String, String)>,
    Query(q): Query<TableQuery>,
) -> impl IntoResponse {
    let client = match connect(&auth, &id).await {
        Ok(c)  => c,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e }))),
    };

    let limit       = q.limit.unwrap_or(100).clamp(1, 1000);
    let offset      = q.offset.unwrap_or(0).max(0);
    let schema      = q.schema.as_deref().unwrap_or("public");
    let safe_table  = sanitize_ident(&table);
    let safe_schema = sanitize_ident(schema);

    let count_sql = format!(r#"SELECT COUNT(*) FROM "{safe_schema}"."{safe_table}""#);
    let total: i64 = match client.query_one(&count_sql, &[]).await {
        Ok(row) => row.get(0),
        Err(e)  => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))),
    };

    let sql = format!(
        r#"SELECT row_to_json(t)::text FROM (SELECT * FROM "{safe_schema}"."{safe_table}" LIMIT {limit} OFFSET {offset}) t"#
    );

    match client.query(&sql, &[]).await {
        Ok(rows) => {
            let data: Vec<Value> = rows.iter().map(|row| {
                let json_str: String = row.get(0);
                serde_json::from_str(&json_str).unwrap_or(Value::Null)
            }).collect();
            (StatusCode::OK, Json(json!({ "data": data, "total": total, "limit": limit, "offset": offset })))
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))),
    }
}

pub async fn get_table_schema(
    State(auth): State<AuthState>,
    Path((id, table)): Path<(String, String)>,
    Query(q): Query<TableQuery>,
) -> impl IntoResponse {
    let client = match connect(&auth, &id).await {
        Ok(c)  => c,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e }))),
    };

    let schema = q.schema.as_deref().unwrap_or("public").to_string();

    match client
        .query(
            "SELECT column_name, data_type, is_nullable, column_default \
             FROM information_schema.columns \
             WHERE table_schema = $1 AND table_name = $2 \
             ORDER BY ordinal_position",
            &[&schema, &table],
        )
        .await
    {
        Ok(rows) => {
            let columns: Vec<Value> = rows.iter().map(|r| json!({
                "name":     r.get::<_, String>(0),
                "type":     r.get::<_, String>(1),
                "nullable": r.get::<_, String>(2) == "YES",
                "default":  r.get::<_, Option<String>>(3),
            })).collect();
            (StatusCode::OK, Json(json!({ "columns": columns })))
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))),
    }
}

pub async fn list_types(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let client = match connect(&auth, &id).await {
        Ok(c)  => c,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e }))),
    };

    match client
        .query(
            "SELECT n.nspname, t.typname, t.typtype::text, \
                    string_agg(e.enumlabel, '|' ORDER BY e.enumsortorder) \
             FROM pg_type t \
             JOIN pg_namespace n ON n.oid = t.typnamespace \
             LEFT JOIN pg_enum e ON e.enumtypid = t.oid \
             WHERE t.typtype IN ('e', 'd', 'c') \
               AND n.nspname NOT IN ('pg_catalog', 'information_schema') \
               AND t.typname NOT LIKE '\\_%' \
             GROUP BY n.nspname, t.typname, t.typtype \
             ORDER BY n.nspname, t.typname",
            &[],
        )
        .await
    {
        Ok(rows) => {
            let types: Vec<Value> = rows.iter().map(|r| {
                let kind_code = r.get::<_, String>(2);
                let kind = match kind_code.as_str() {
                    "e" => "enum",
                    "d" => "domain",
                    "c" => "composite",
                    _   => "other",
                };
                let values: Option<Vec<String>> = r
                    .get::<_, Option<String>>(3)
                    .map(|s| s.split('|').map(|item| item.to_string()).collect());
                json!({ "schema": r.get::<_, String>(0), "name": r.get::<_, String>(1), "kind": kind, "values": values })
            }).collect();
            (StatusCode::OK, Json(json!({ "types": types })))
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))),
    }
}

#[derive(serde::Deserialize)]
pub struct RunQueryRequest {
    pub sql: String,
}

pub async fn run_query(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
    Json(body): Json<RunQueryRequest>,
) -> impl IntoResponse {
    let sql = body.sql.trim().to_string();
    if sql.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({ "error": "SQL is empty" })));
    }

    let client = match connect(&auth, &id).await {
        Ok(c)  => c,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e }))),
    };

    let upper = sql.trim_start().to_uppercase();
    let started = std::time::Instant::now();

    if upper.starts_with("SELECT") || upper.starts_with("WITH") || upper.starts_with("TABLE") {
        use tokio_postgres::SimpleQueryMessage;

        // Prepare first to learn the column types (simple_query only gives names).
        let col_types: Vec<(String, String)> = match client.prepare(&sql).await {
            Ok(stmt) => stmt.columns().iter()
                .map(|c| (c.name().to_string(), c.type_().name().to_string()))
                .collect(),
            Err(_) => vec![],
        };

        match client.simple_query(&sql).await {
            Ok(messages) => {
                let mut names: Vec<String> = vec![];
                let mut data: Vec<Vec<Value>> = vec![];
                for msg in messages {
                    if let SimpleQueryMessage::Row(row) = msg {
                        if names.is_empty() {
                            names = row.columns().iter().map(|c| c.name().to_string()).collect();
                        }
                        let vals: Vec<Value> = (0..names.len())
                            .map(|i| match row.get(i) {
                                Some(v) => Value::String(v.to_string()),
                                None    => Value::Null,
                            })
                            .collect();
                        data.push(vals);
                    }
                }
                if names.is_empty() && !col_types.is_empty() {
                    names = col_types.iter().map(|(n, _)| n.clone()).collect();
                }

                // Merge names + types into [{name, type}, …]
                let type_by_name: std::collections::HashMap<_, _> = col_types.iter()
                    .map(|(n, t)| (n.clone(), t.clone())).collect();
                let columns: Vec<Value> = names.iter().map(|n| json!({
                    "name": n,
                    "type": type_by_name.get(n).cloned().unwrap_or_default(),
                })).collect();

                let duration_ms = started.elapsed().as_millis() as u64;
                let total = data.len();
                (StatusCode::OK, Json(json!({
                    "columns": columns,
                    "rows": data,
                    "total": total,
                    "duration_ms": duration_ms,
                })))
            }
            Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))),
        }
    } else {
        match client.execute(&sql, &[]).await {
            Ok(n)  => {
                let duration_ms = started.elapsed().as_millis() as u64;
                (StatusCode::OK, Json(json!({ "affected": n, "duration_ms": duration_ms })))
            }
            Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))),
        }
    }
}

pub async fn list_sequences(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let client = match connect(&auth, &id).await {
        Ok(c)  => c,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e }))),
    };

    match client
        .query(
            "SELECT sequence_schema, sequence_name, data_type, \
                    start_value, minimum_value, maximum_value, increment, cycle_option \
             FROM information_schema.sequences \
             WHERE sequence_schema NOT IN ('pg_catalog', 'information_schema') \
             ORDER BY sequence_schema, sequence_name",
            &[],
        )
        .await
    {
        Ok(rows) => {
            let seqs: Vec<Value> = rows.iter().map(|r| json!({
                "schema":    r.get::<_, String>(0),
                "name":      r.get::<_, String>(1),
                "data_type": r.get::<_, String>(2),
                "start":     r.get::<_, String>(3),
                "min":       r.get::<_, String>(4),
                "max":       r.get::<_, String>(5),
                "increment": r.get::<_, String>(6),
                "cycle":     r.get::<_, String>(7) == "YES",
            })).collect();
            (StatusCode::OK, Json(json!({ "sequences": seqs })))
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))),
    }
}

pub async fn list_routines(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let client = match connect(&auth, &id).await {
        Ok(c)  => c,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e }))),
    };

    match client
        .query(
            "SELECT routine_schema, routine_name, routine_type, data_type, \
                    external_language \
             FROM information_schema.routines \
             WHERE routine_schema NOT IN ('pg_catalog', 'information_schema') \
             ORDER BY routine_schema, routine_type, routine_name",
            &[],
        )
        .await
    {
        Ok(rows) => {
            let routines: Vec<Value> = rows.iter().map(|r| json!({
                "schema":   r.get::<_, String>(0),
                "name":     r.get::<_, String>(1),
                "kind":     r.get::<_, String>(2).to_lowercase(),
                "returns":  r.get::<_, Option<String>>(3),
                "language": r.get::<_, Option<String>>(4),
            })).collect();
            (StatusCode::OK, Json(json!({ "routines": routines })))
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))),
    }
}

pub async fn get_sessions(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let client = match connect(&auth, &id).await {
        Ok(c)  => c,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e }))),
    };

    match client
        .query(
            "SELECT pid, usename, application_name, client_addr::text, state, \
                    wait_event_type, wait_event, query, \
                    EXTRACT(EPOCH FROM (now() - query_start))::float8 \
             FROM pg_stat_activity \
             WHERE pid <> pg_backend_pid() \
               AND datname = current_database() \
             ORDER BY CASE state \
               WHEN 'active' THEN 0 \
               WHEN 'idle in transaction' THEN 1 \
               ELSE 2 END, \
               EXTRACT(EPOCH FROM (now() - query_start)) DESC NULLS LAST",
            &[],
        )
        .await
    {
        Ok(rows) => {
            let sessions: Vec<Value> = rows
                .iter()
                .map(|r| json!({
                    "pid":             r.get::<_, i32>(0),
                    "user":            r.get::<_, Option<String>>(1).unwrap_or_default(),
                    "app":             r.get::<_, Option<String>>(2).unwrap_or_default(),
                    "client":          r.get::<_, Option<String>>(3).unwrap_or_default(),
                    "state":           r.get::<_, Option<String>>(4).unwrap_or_default(),
                    "wait_event_type": r.get::<_, Option<String>>(5).unwrap_or_default(),
                    "wait_event":      r.get::<_, Option<String>>(6).unwrap_or_default(),
                    "query":           r.get::<_, Option<String>>(7).unwrap_or_default(),
                    "duration_s":      r.get::<_, Option<f64>>(8).unwrap_or(0.0),
                }))
                .collect();
            (StatusCode::OK, Json(json!({ "sessions": sessions })))
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))),
    }
}

pub async fn explain_query(
    State(auth): State<AuthState>,
    Path(id): Path<String>,
    Json(body): Json<RunQueryRequest>,
) -> impl IntoResponse {
    let sql = body.sql.trim().trim_end_matches(';').to_string();
    if sql.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({ "error": "SQL is empty" })));
    }

    let client = match connect(&auth, &id).await {
        Ok(c)  => c,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({ "error": e }))),
    };

    let explain_sql = format!("EXPLAIN (FORMAT JSON) {sql}");
    match client.query_one(&explain_sql, &[]).await {
        Ok(row) => {
            let plan_str: String = row.get(0);
            let plan: Value = serde_json::from_str(&plan_str).unwrap_or(Value::Null);
            (StatusCode::OK, Json(json!({ "plan": plan })))
        }
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))),
    }
}
