//! Pruebas del modo escritorio arrancando `backend::serve` en 127.0.0.1:0.
//!
//! El cliente HTTP es mínimo (HTTP/1.1 sobre TcpStream con `Connection: close`)
//! para no añadir dependencias de desarrollo. La prueba del export SQL solo se
//! ejecuta si PH_TEST_PG_HOST apunta a un PostgreSQL (p. ej. `sandbox`).

use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use backend::{DesktopConfig, SaveRequest, ServerConfig};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::oneshot;

const TOKEN: &str = "0123456789abcdef0123456789abcdef";

struct Resp {
    status:  u16,
    headers: Vec<(String, String)>,
    body:    String,
}

impl Resp {
    fn header(&self, name: &str) -> Option<&str> {
        self.headers.iter().find(|(k, _)| k.eq_ignore_ascii_case(name)).map(|(_, v)| v.as_str())
    }
    fn json(&self) -> serde_json::Value {
        serde_json::from_str(&self.body).unwrap_or_else(|_| panic!("not JSON: {}", self.body))
    }
    /// `pg_admin_session=<token>` sacado del Set-Cookie.
    fn session_cookie(&self) -> Option<String> {
        self.header("set-cookie").and_then(|c| c.split(';').next()).map(str::to_string)
    }
}

async fn request(
    port:   u16,
    host:   &str,
    method: &str,
    path:   &str,
    cookie: Option<&str>,
    body:   Option<&serde_json::Value>,
) -> Resp {
    let mut stream = TcpStream::connect(("127.0.0.1", port)).await.unwrap();
    let payload = body.map(|b| b.to_string()).unwrap_or_default();
    let mut req = format!("{method} {path} HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n");
    if let Some(c) = cookie { req.push_str(&format!("Cookie: {c}\r\n")); }
    if body.is_some() {
        req.push_str(&format!("Content-Type: application/json\r\nContent-Length: {}\r\n", payload.len()));
    }
    req.push_str("\r\n");
    req.push_str(&payload);
    stream.write_all(req.as_bytes()).await.unwrap();

    let mut raw = Vec::new();
    stream.read_to_end(&mut raw).await.unwrap();
    let raw = String::from_utf8_lossy(&raw).into_owned();
    let (head, body) = raw.split_once("\r\n\r\n").unwrap_or((&raw, ""));
    let mut lines = head.lines();
    let status = lines.next().unwrap().split_whitespace().nth(1).unwrap().parse().unwrap();
    let headers = lines
        .filter_map(|l| l.split_once(':'))
        .map(|(k, v)| (k.trim().to_string(), v.trim().to_string()))
        .collect::<Vec<_>>();
    // Respuestas troceadas (chunked): basta con quitar los tamaños de trozo.
    let body = if headers.iter().any(|(k, v)| k.eq_ignore_ascii_case("transfer-encoding") && v == "chunked") {
        dechunk(body)
    } else {
        body.to_string()
    };
    Resp { status, headers, body }
}

fn dechunk(mut s: &str) -> String {
    let mut out = String::new();
    while let Some((size, rest)) = s.split_once("\r\n") {
        let n = usize::from_str_radix(size.trim(), 16).unwrap_or(0);
        if n == 0 { break; }
        out.push_str(&rest[..n]);
        s = rest[n..].trim_start_matches("\r\n");
    }
    out
}

fn temp_dir(tag: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("ph_test_{tag}_{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

/// Servidor de escritorio cuyo diálogo guarda en `out_dir/<nombre>` o cancela
/// si el nombre sugerido empieza por "cancel". Devuelve también el registro de
/// nombres que recibió el hook.
struct Server {
    port:     u16,
    host:     String,
    calls:    Arc<Mutex<Vec<String>>>,
    out_dir:  PathBuf,
    stop:     oneshot::Sender<()>,
    handle:   tokio::task::JoinHandle<Result<(), String>>,
}

async fn start(desktop: bool) -> Server {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port     = listener.local_addr().unwrap().port();
    let data_dir = temp_dir("data");
    let out_dir  = temp_dir("out");
    let calls    = Arc::new(Mutex::new(Vec::new()));

    let desktop_cfg = desktop.then(|| {
        let calls   = calls.clone();
        let out_dir = out_dir.clone();
        // Diálogo bloqueante, como el de tauri-plugin-dialog.
        DesktopConfig::with_blocking_dialog(TOKEN.into(), port, move |req: SaveRequest| {
            calls.lock().unwrap().push(req.suggested_name.clone());
            if req.suggested_name.starts_with("cancel") { return Ok(None); }
            Ok(Some(out_dir.join(&req.suggested_name)))
        })
    });

    let cfg = ServerConfig {
        data_dir,
        dev:            false,
        session_hours:  24,
        secure_cookies: false,
        desktop:        desktop_cfg,
    };
    let (stop, rx) = oneshot::channel::<()>();
    let handle = tokio::spawn(backend::serve(listener, cfg, async { let _ = rx.await; }));
    Server { port, host: format!("127.0.0.1:{port}"), calls, out_dir, stop, handle }
}

impl Server {
    async fn get(&self, path: &str, cookie: Option<&str>) -> Resp {
        request(self.port, &self.host, "GET", path, cookie, None).await
    }
    async fn post(&self, path: &str, cookie: Option<&str>, body: serde_json::Value) -> Resp {
        request(self.port, &self.host, "POST", path, cookie, Some(&body)).await
    }
    async fn setup_user(&self) -> String {
        let r = self.post("/api/auth/setup", None, serde_json::json!({
            "username": "admin", "password": "secret123", "confirm_password": "secret123",
        })).await;
        assert_eq!(r.status, 200, "{}", r.body);
        r.session_cookie().unwrap()
    }
    async fn shutdown(self) {
        let _ = self.stop.send(());
        let result = self.handle.await.unwrap();
        assert_eq!(result, Ok(()), "serve should end cleanly on shutdown");
    }
}

#[tokio::test]
async fn desktop_token_host_status_and_save() {
    let s = start(true).await;

    // status: modo escritorio y sin usuarios todavía
    let st = s.get("/api/auth/status", None).await.json();
    assert_eq!(st["desktop"], true);
    assert_eq!(st["setup_required"], true);

    // Host ajeno (DNS rebinding) → 403, tanto en la API como en la SPA
    for path in ["/api/auth/status", "/"] {
        let r = request(s.port, &format!("evil.example:{}", s.port), "GET", path, None, None).await;
        assert_eq!(r.status, 403, "{path}");
    }
    let r = request(s.port, "127.0.0.1:1", "GET", "/api/auth/status", None, None).await;
    assert_eq!(r.status, 403, "otro puerto");
    // localhost:<puerto> sí vale
    let r = request(s.port, &format!("localhost:{}", s.port), "GET", "/api/auth/status", None, None).await;
    assert_eq!(r.status, 200);

    s.setup_user().await;

    // token incorrecto → 403 y no consume el bueno
    let r = s.get("/api/auth/desktop?token=nope", None).await;
    assert_eq!(r.status, 403);
    let r = s.get("/api/auth/desktop", None).await;
    assert_eq!(r.status, 403);

    // token correcto → 302 a "/" con cookie de sesión
    let r = s.get(&format!("/api/auth/desktop?token={TOKEN}"), None).await;
    assert_eq!(r.status, 302);
    assert_eq!(r.header("location"), Some("/"));
    let cookie = r.session_cookie().expect("session cookie");
    assert!(cookie.starts_with("pg_admin_session="));
    assert!(r.header("set-cookie").unwrap().contains("HttpOnly"));

    let me = s.get("/api/auth/me", Some(&cookie)).await;
    assert_eq!(me.status, 200);
    assert_eq!(me.json()["username"], "admin");

    // token reutilizado → rechazado
    let r = s.get(&format!("/api/auth/desktop?token={TOKEN}"), None).await;
    assert_eq!(r.status, 403);
    assert!(r.session_cookie().is_none());

    // save sin sesión → 401
    let r = s.post("/api/desktop/save", None, serde_json::json!({ "filename": "a.csv", "content": "x" })).await;
    assert_eq!(r.status, 401);

    // save modo (a): contenido del cliente; el nombre se queda sin carpetas
    let r = s.post("/api/desktop/save", Some(&cookie), serde_json::json!({
        "filename": "../../etc/ventas.csv", "content": "id,name\n1,ñandú\n",
    })).await;
    assert_eq!(r.status, 200, "{}", r.body);
    let j = r.json();
    assert_eq!(j["saved"], true);
    let path = PathBuf::from(j["path"].as_str().unwrap());
    assert_eq!(path, s.out_dir.join("ventas.csv"));
    assert_eq!(std::fs::read_to_string(&path).unwrap(), "id,name\n1,ñandú\n");

    // usuario cancela → saved:false sin path
    let r = s.post("/api/desktop/save", Some(&cookie), serde_json::json!({ "filename": "cancel.json", "content": "{}" })).await;
    assert_eq!(r.status, 200);
    assert_eq!(r.json(), serde_json::json!({ "saved": false }));

    // cuerpos inválidos → 400 sin llamar al hook
    let r = s.post("/api/desktop/save", Some(&cookie), serde_json::json!({ "content": "x" })).await;
    assert_eq!(r.status, 400);
    assert!(r.json()["error"].is_string());
    let r = s.post("/api/desktop/save", Some(&cookie), serde_json::json!({})).await;
    assert_eq!(r.status, 400);

    assert_eq!(*s.calls.lock().unwrap(), vec!["ventas.csv".to_string(), "cancel.json".to_string()]);

    // logout → la cookie deja de valer (luego verá el login normal)
    let r = s.post("/api/auth/logout", Some(&cookie), serde_json::json!({})).await;
    assert_eq!(r.status, 200);
    let me = s.get("/api/auth/me", Some(&cookie)).await;
    assert_eq!(me.status, 401);

    s.shutdown().await;
}

#[tokio::test]
async fn desktop_token_without_users_redirects_without_session() {
    let s = start(true).await;
    let r = s.get(&format!("/api/auth/desktop?token={TOKEN}"), None).await;
    assert_eq!(r.status, 302);
    assert_eq!(r.header("location"), Some("/"));
    assert!(r.session_cookie().is_none());
    // de un solo uso también aquí
    let r = s.get(&format!("/api/auth/desktop?token={TOKEN}"), None).await;
    assert_eq!(r.status, 403);
    s.shutdown().await;
}

#[tokio::test]
async fn browser_mode_has_no_desktop_features() {
    let s = start(false).await;
    let st = s.get("/api/auth/status", None).await.json();
    assert_eq!(st["desktop"], false);
    // sin filtro de Host
    let r = request(s.port, "evil.example", "GET", "/api/auth/status", None, None).await;
    assert_eq!(r.status, 200);
    // /api/auth/desktop no existe: cae en la SPA como cualquier otra ruta
    let r = s.get(&format!("/api/auth/desktop?token={TOKEN}"), None).await;
    assert_ne!(r.status, 302);
    assert!(r.session_cookie().is_none());
    let cookie = s.setup_user().await;
    let r = s.post("/api/desktop/save", Some(&cookie), serde_json::json!({ "filename": "a.csv", "content": "x" })).await;
    assert_eq!(r.status, 404);
    s.shutdown().await;
}

#[tokio::test]
async fn desktop_rejects_wrong_port_and_dev() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port     = listener.local_addr().unwrap().port();
    let mk = |allowed_port, dev| ServerConfig {
        data_dir:       temp_dir("data"),
        dev,
        session_hours:  24,
        secure_cookies: false,
        desktop:        Some(DesktopConfig::with_blocking_dialog(TOKEN.into(), allowed_port, |_| Ok(None))),
    };
    let err = backend::serve(listener, mk(port.wrapping_add(1), false), async {}).await.unwrap_err();
    assert!(err.contains("allowed_port"), "{err}");

    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port     = listener.local_addr().unwrap().port();
    let err = backend::serve(listener, mk(port, true), async {}).await.unwrap_err();
    assert!(err.contains("dev"), "{err}");
}

#[tokio::test]
async fn data_dir_error_is_returned_not_panicked() {
    // Un fichero donde debería ir la carpeta de datos
    let file = temp_dir("bad").join("not-a-dir");
    std::fs::write(&file, "x").unwrap();
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let cfg = ServerConfig {
        data_dir: file.join("sub"), dev: false, session_hours: 24, secure_cookies: false, desktop: None,
    };
    let err = backend::serve(listener, cfg, async {}).await.unwrap_err();
    assert!(err.contains("cannot create data directory"), "{err}");
}

#[tokio::test]
async fn desktop_save_sql_export() {
    let Ok(pg_host) = std::env::var("PH_TEST_PG_HOST") else {
        eprintln!("PH_TEST_PG_HOST no definido: se omite la prueba del export SQL");
        return;
    };
    let s = start(true).await;
    s.setup_user().await;
    let r = s.get(&format!("/api/auth/desktop?token={TOKEN}"), None).await;
    let cookie = r.session_cookie().unwrap();

    let r = s.post("/api/projects", Some(&cookie), serde_json::json!({
        "name": "sandbox", "host": pg_host, "port": 5432, "database": "sandbox",
        "username": "postgres", "password": "postgres",
    })).await;
    assert_eq!(r.status, 200, "{}", r.body);
    let project_id = r.json()["id"].as_str().unwrap().to_string();

    let r = s.post("/api/desktop/save", Some(&cookie), serde_json::json!({
        "export": { "project_id": project_id, "schemas": ["public"], "data": false },
    })).await;
    assert_eq!(r.status, 200, "{}", r.body);
    let j = r.json();
    assert_eq!(j["saved"], true);
    let path = PathBuf::from(j["path"].as_str().unwrap());
    let name = path.file_name().unwrap().to_string_lossy().into_owned();
    assert!(name.starts_with("sandbox_") && name.ends_with(".sql"), "{name}");
    let sql = std::fs::read_to_string(&path).unwrap();
    assert!(sql.starts_with("-- postgre-hub dump"), "{}", &sql[..sql.len().min(200)]);

    // export sin schemas → 400 con el mensaje de dump.rs
    let r = s.post("/api/desktop/save", Some(&cookie), serde_json::json!({
        "export": { "project_id": project_id, "schemas": [] },
    })).await;
    assert_eq!(r.status, 400);
    assert_eq!(r.json()["error"], "Select at least one schema.");

    s.shutdown().await;
}
