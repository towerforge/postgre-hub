<h1 align="center">Postgre Hub</h1>

<p align="center">
  A self-hosted PostgreSQL admin dashboard — manage connections, run queries, browse schemas and tunnel through SSH, all from a single binary.
</p>

<br />

---

## Overview

Postgre Hub runs as a single binary and serves a browser dashboard. No external services, no cloud, no agents — your saved connections and credentials live in a local SQLite file you control.

| Area | What you get |
|---|---|
| **Connections** | Store any number of PostgreSQL endpoints with host, port, database, user, password and SSL mode. One-click connect from the dashboard, with connection testing built in. Each connection can be marked read-only and given a query timeout |
| **SSH tunnels** | Define reusable SSH tunnel profiles (password or private-key) and attach them to any connection. Tunnels are dialed transparently on demand |
| **SQL editor** | CodeMirror-based query editor with multiple tabs, autocompletion of schemas, tables and columns, `EXPLAIN` and a live sessions view. Running queries can be cancelled |
| **History and saved queries** | Every run is kept per user and connection on the server, and any tab can be saved under a name |
| **Results** | Spreadsheet-style grid with inline editing (previewed as SQL before it runs) and download as CSV or JSON |
| **Schema browser** | Browse tables, columns, types, sequences and routines for the active database, plus an entity-relationship diagram built from the foreign keys |
| **Export / import** | Export any set of schemas to a plain `.sql` file and import `.sql` files back, choosing what to include from a dialog |
| **Users** | Multi-user access with username + password auth. Sessions stored server-side, configurable lifetime |

## Working with a connection

**Running and cancelling.** Run the editor with **Run** or `⌘⏎` / `Ctrl+⏎`. While a query runs, the button turns into **Stop**, which cancels it on the server with `pg_cancel_backend`. Closing the tab or losing the connection also cancels it, so an abandoned query does not keep running.

**Query timeout.** Set *Query timeout* (seconds, `0` = no limit) in the connection form. It applies to queries and `EXPLAIN` run from the editor, not to export or import.

**Read-only connections.** Turn on *Read-only* in the connection form and every transaction of that connection starts as `READ ONLY`: writes and imports fail with the PostgreSQL error, the result grid cannot be edited and the status bar shows a *read-only* badge. This is a safety net against mistakes, not access control — a user can still run `BEGIN READ WRITE`. For a hard guarantee, connect with a database role that has no write privileges.

**History and saved queries.** The bottom panel (*History* in the status bar) has two tabs. *History* lists your last runs on this connection with time, duration, rows and errors; the server keeps the latest 500 per user and connection. *Saved* holds named queries: rename a tab (double-click it) and press the save icon; saving again updates it. Both are private to each user.

**Autocompletion.** Schema, table and column names (with their types) are suggested as you type, and table aliases are resolved (`o.` after `FROM orders o` lists the columns of `orders`). The list is loaded when the connection opens and refreshed after an import.

**Downloading results.** **CSV** and **JSON** in the results footer download every row of the current result. CSV opens in Excel as UTF-8. In JSON, integers, floats, booleans and `json`/`jsonb` keep their types; `numeric` stays a string so no precision is lost.

**ER diagram.** **Diagram** at the bottom of the schema sidebar draws the tables of a schema (or all of them) with their primary keys, foreign keys and column types, and an arrow for each foreign key. Tables can be dragged, and double-clicking one opens it in a new tab.

## Export and import

Both actions live at the bottom of the schema sidebar of an open connection. Files are always plain SQL.

**Export** opens a dialog where you pick:

- **Schemas** — all of them are selected by default; system schemas are never listed.
- **What to include** — structure (types, sequences, tables, constraints, indexes), data, functions and procedures, views (including materialized views), triggers and extensions. Everything except extensions is on by default.
- **Drop schemas before recreating them** — adds `DROP SCHEMA … CASCADE` at the top of the file. Importing such a file deletes everything in those schemas on the target database first.

The file is laid out so it can be replayed without dependency errors: tables are created first, then functions, then column defaults, data, constraints, indexes, foreign keys, views and finally triggers. Statements that cannot be written as `IF NOT EXISTS` are wrapped so they are skipped when the object already exists, which means a file can be imported over a database that already contains part of it. Sequence and identity counters are restored to their exported values.

**Import** accepts a `.sql` file — one exported by Postgre Hub or written by hand — shows its first lines and runs it against the open connection **in a single transaction**: if any statement fails, nothing is applied and the PostgreSQL error is shown. The schema sidebar reloads when it finishes.

Limits to keep in mind:

- The dump is built in memory, so very large tables make the export slow and the file big. For multi-gigabyte databases use `pg_dump`.
- Domains, grants/ownership and comments are not exported.
- A view that depends on another view created later may fail on import.
- Uploads are limited to 512 MB. Behind a reverse proxy, raise its body size limit as well (see below).
- A hand-written file that contains its own `COMMIT` ends the transaction at that point.

## Requirements

- A network-reachable PostgreSQL instance (any 12+ version)
- Linux x86_64 / ARM64 / ARMv7 / i686, macOS Intel / Apple Silicon, or Windows x86_64 / i686

## Installation

#### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/towerforge/postgre-hub/main/install.sh | sh
```

Installs to `/usr/local/bin` when run as root, otherwise to `~/.local/bin`. Override with `POSTGRE_HUB_INSTALL_DIR=/your/path`.

#### Windows

1. Download the matching `.zip` from the [releases page](https://github.com/towerforge/postgre-hub/releases/latest) (see the table below).
2. Extract it anywhere — e.g. `C:\Program Files\postgre-hub\`.
3. Run `postgre-hub.exe` from that folder, or add the folder to your `PATH` to invoke it from any terminal.

#### Manual download

Pre-built binaries are available on the [releases page](https://github.com/towerforge/postgre-hub/releases/latest).

**Linux**

| Platform | Asset |
|---|---|
| x86_64 (glibc) | `postgre-hub-linux-x86_64.tar.gz` |
| x86_64 (static) | `postgre-hub-linux-x86_64-musl.tar.gz` |
| ARM64 (glibc) | `postgre-hub-linux-aarch64.tar.gz` |
| ARM64 (static) | `postgre-hub-linux-aarch64-musl.tar.gz` |
| ARMv7 | `postgre-hub-linux-armv7.tar.gz` |
| i686 | `postgre-hub-linux-i686.tar.gz` |

**macOS**

| Platform | Asset |
|---|---|
| Intel | `postgre-hub-macos-x86_64.tar.gz` |
| Apple Silicon | `postgre-hub-macos-aarch64.tar.gz` |

**Windows**

| Platform | Asset |
|---|---|
| x86_64 | `postgre-hub-windows-x86_64.zip` |
| i686 | `postgre-hub-windows-i686.zip` |

## Usage

```
postgre-hub [OPTIONS]

OPTIONS:
  -p, --port <PORT>   Port to bind to (default: 8080)
      --dev           Disable auth middleware — for local development only
```

Open [http://localhost:8080](http://localhost:8080). On first launch you will be asked to create the first user.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATA_DIR` | `.` | Directory where `postgre-hub.db` is stored |
| `SESSION_DURATION_HOURS` | `24` | Session lifetime in hours |
| `SECURE_COOKIES` | `false` | Set to `true` to add the `Secure` flag to session cookies. Enable when running behind an HTTPS reverse proxy |

## Behind a reverse proxy

Postgre Hub does not terminate TLS itself. Put a reverse proxy (nginx, Caddy, Traefik…) in front of it when exposing the app outside `localhost`.

<details>
<summary>nginx</summary>

```nginx
location / {
    proxy_pass         http://127.0.0.1:8080;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Real-IP         $remote_addr;

    # Allow importing large .sql files (nginx defaults to 1 MB)
    client_max_body_size 512m;
}
```

</details>

<details>
<summary>Caddy</summary>

```caddy
your.domain.tld {
    reverse_proxy 127.0.0.1:8080
}
```

</details>

Once behind HTTPS, set `SECURE_COOKIES=true` so session cookies carry the `Secure` flag.

## Development

Everything runs through the Makefile and Docker Compose: `make up` starts the API with hot reload, the Vite dev server and a sandbox PostgreSQL; `make check` runs clippy and ESLint; `make fmt` runs rustfmt and Prettier.

The frontend is React 19 in plain JavaScript (no TypeScript). See [docs/frontend.md](docs/frontend.md) for its structure, routing and conventions.

The frontend is built from a shared component kit. See [docs/ui-components.md](docs/ui-components.md) for the components, sizing rules and page patterns before adding UI.

## License

[MIT](LICENSE)
