use rusqlite::{Connection, Result};
use std::path::Path;

pub fn open(data_dir: &Path) -> Result<Connection> {
    let _ = std::fs::create_dir_all(data_dir);
    let conn = Connection::open(data_dir.join("postgre-hub.db"))?;
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

    // Migration: drop legacy security tables that are no longer used
    for sql in [
        "DROP TABLE IF EXISTS login_attempts",
        "DROP TABLE IF EXISTS login_events",
        "DROP TABLE IF EXISTS settings",
    ] {
        let _ = conn.execute(sql, []);
    }

    // Migration: add SSH/SSL columns to existing installs (ignored if already present)
    for sql in [
        "ALTER TABLE projects ADD COLUMN ssl_ca          TEXT    NOT NULL DEFAULT ''",
        "ALTER TABLE projects ADD COLUMN ssl_client_cert TEXT    NOT NULL DEFAULT ''",
        "ALTER TABLE projects ADD COLUMN ssl_client_key  TEXT    NOT NULL DEFAULT ''",
        "ALTER TABLE projects ADD COLUMN ssh_enabled     INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE projects ADD COLUMN ssh_host        TEXT    NOT NULL DEFAULT ''",
        "ALTER TABLE projects ADD COLUMN ssh_port        INTEGER NOT NULL DEFAULT 22",
        "ALTER TABLE projects ADD COLUMN ssh_user        TEXT    NOT NULL DEFAULT ''",
        "ALTER TABLE projects ADD COLUMN ssh_password    TEXT    NOT NULL DEFAULT ''",
        "ALTER TABLE projects ADD COLUMN ssh_private_key TEXT    NOT NULL DEFAULT ''",
        "ALTER TABLE projects ADD COLUMN ssh_tunnel_id   TEXT    REFERENCES ssh_tunnels(id)",
        "ALTER TABLE projects ADD COLUMN color           TEXT    NOT NULL DEFAULT ''",
        "ALTER TABLE projects ADD COLUMN read_only       INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE projects ADD COLUMN query_timeout   INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE projects ADD COLUMN environment     TEXT    NOT NULL DEFAULT ''",
    ] {
        let _ = conn.execute(sql, []);
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

    Ok(conn)
}
