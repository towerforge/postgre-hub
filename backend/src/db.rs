use rusqlite::{Connection, OptionalExtension, Result};
use std::path::Path;
use std::time::Duration;

// Espera máxima ante un bloqueo de otra conexión antes de devolver SQLITE_BUSY.
// rusqlite ya trae 5 s por defecto; se fija aquí para no depender de ello.
const BUSY_TIMEOUT: Duration = Duration::from_millis(5000);

/// Abre (y crea si hace falta) `postgre-hub.db` dentro de `data_dir` y aplica
/// el esquema y las migraciones. `data_dir` puede ser cualquier ruta, con
/// espacios o aún inexistente. El error es un texto listo para mostrar.
pub fn open(data_dir: &Path) -> std::result::Result<Connection, String> {
    std::fs::create_dir_all(data_dir).map_err(|e| {
        format!("cannot create data directory {}: {e}", data_dir.display())
    })?;
    let db_path = data_dir.join("postgre-hub.db");
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("cannot open database {}: {e}", db_path.display()))?;
    migrate(&conn)
        .map_err(|e| format!("cannot initialise database {}: {e}", db_path.display()))?;
    Ok(conn)
}

/// Comprueba si `table` tiene la columna `column`. `table` es siempre un
/// literal de este fichero, nunca un valor de usuario.
fn has_column(conn: &Connection, table: &str, column: &str) -> Result<bool> {
    conn.query_row(
        &format!("SELECT 1 FROM pragma_table_info('{table}') WHERE name = ?1"),
        [column],
        |_| Ok(()),
    )
    .optional()
    .map(|found| found.is_some())
}

fn migrate(conn: &Connection) -> Result<()> {
    // Antes de los PRAGMA: cambiar a WAL también necesita el bloqueo.
    conn.busy_timeout(BUSY_TIMEOUT)?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous  = NORMAL;
         PRAGMA foreign_keys = ON;

         CREATE TABLE IF NOT EXISTS users (
             id            TEXT PRIMARY KEY,
             username      TEXT UNIQUE NOT NULL COLLATE NOCASE,
             password_hash TEXT NOT NULL,
             created_at    INTEGER NOT NULL DEFAULT (unixepoch())
         );

         CREATE TABLE IF NOT EXISTS ssh_tunnels (
             id           TEXT    PRIMARY KEY,
             name         TEXT    NOT NULL,
             host         TEXT    NOT NULL,
             port         INTEGER NOT NULL DEFAULT 22,
             username     TEXT    NOT NULL,
             auth_type    TEXT    NOT NULL DEFAULT 'password',
             password     TEXT    NOT NULL DEFAULT '',
             private_key  TEXT    NOT NULL DEFAULT '',
             created_at   INTEGER NOT NULL DEFAULT (unixepoch())
         );

         CREATE TABLE IF NOT EXISTS projects (
             id               TEXT    PRIMARY KEY,
             name             TEXT    NOT NULL,
             host             TEXT    NOT NULL,
             port             INTEGER NOT NULL DEFAULT 5432,
             database         TEXT    NOT NULL,
             username         TEXT    NOT NULL,
             password         TEXT    NOT NULL DEFAULT '',
             ssl_mode         TEXT    NOT NULL DEFAULT 'prefer',
             ssl_ca           TEXT    NOT NULL DEFAULT '',
             ssl_client_cert  TEXT    NOT NULL DEFAULT '',
             ssl_client_key   TEXT    NOT NULL DEFAULT '',
             ssh_enabled      INTEGER NOT NULL DEFAULT 0,
             ssh_host         TEXT    NOT NULL DEFAULT '',
             ssh_port         INTEGER NOT NULL DEFAULT 22,
             ssh_user         TEXT    NOT NULL DEFAULT '',
             ssh_password     TEXT    NOT NULL DEFAULT '',
             ssh_private_key  TEXT    NOT NULL DEFAULT '',
             color            TEXT    NOT NULL DEFAULT '',
             created_at       INTEGER NOT NULL DEFAULT (unixepoch())
         );",
    )?;

    // Migración: tablas de seguridad legado que ya no se usan. IF EXISTS ya
    // las hace idempotentes, así que cualquier error aquí es real.
    conn.execute_batch(
        "DROP TABLE IF EXISTS login_attempts;
         DROP TABLE IF EXISTS login_events;
         DROP TABLE IF EXISTS settings;",
    )?;

    // Migración: columnas añadidas a projects en versiones posteriores. Solo se
    // lanza el ALTER si falta la columna, para no tapar errores reales.
    for (column, definition) in [
        ("ssl_ca",          "TEXT    NOT NULL DEFAULT ''"),
        ("ssl_client_cert", "TEXT    NOT NULL DEFAULT ''"),
        ("ssl_client_key",  "TEXT    NOT NULL DEFAULT ''"),
        ("ssh_enabled",     "INTEGER NOT NULL DEFAULT 0"),
        ("ssh_host",        "TEXT    NOT NULL DEFAULT ''"),
        ("ssh_port",        "INTEGER NOT NULL DEFAULT 22"),
        ("ssh_user",        "TEXT    NOT NULL DEFAULT ''"),
        ("ssh_password",    "TEXT    NOT NULL DEFAULT ''"),
        ("ssh_private_key", "TEXT    NOT NULL DEFAULT ''"),
        ("ssh_tunnel_id",   "TEXT    REFERENCES ssh_tunnels(id)"),
        ("color",           "TEXT    NOT NULL DEFAULT ''"),
        ("read_only",       "INTEGER NOT NULL DEFAULT 0"),
        ("query_timeout",   "INTEGER NOT NULL DEFAULT 0"),
        ("environment",     "TEXT    NOT NULL DEFAULT ''"),
    ] {
        if !has_column(conn, "projects", column)? {
            // El relleno a 15 reproduce el texto exacto de los ALTER antiguos,
            // que SQLite guarda en sqlite_master: el .schema no cambia.
            conn.execute(&format!("ALTER TABLE projects ADD COLUMN {column:<15} {definition}"), [])?;
        }
    }

    // Historial y consultas guardadas, por usuario y conexión. user_id no lleva
    // FK porque en modo --dev no hay sesión y se usa un id fijo.
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS query_history (
             id           INTEGER PRIMARY KEY AUTOINCREMENT,
             user_id      TEXT    NOT NULL,
             project_id   TEXT    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
             sql          TEXT    NOT NULL,
             duration_ms  INTEGER NOT NULL DEFAULT 0,
             rows         INTEGER,
             error        TEXT,
             created_at   INTEGER NOT NULL DEFAULT (unixepoch())
         );
         CREATE INDEX IF NOT EXISTS query_history_user_project
             ON query_history (user_id, project_id, id DESC);

         CREATE TABLE IF NOT EXISTS saved_queries (
             id           TEXT    PRIMARY KEY,
             user_id      TEXT    NOT NULL,
             project_id   TEXT    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
             name         TEXT    NOT NULL,
             sql          TEXT    NOT NULL,
             created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
             updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
         );
         CREATE INDEX IF NOT EXISTS saved_queries_user_project
             ON saved_queries (user_id, project_id);",
    )?;

    Ok(())
}
