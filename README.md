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
| **Connections** | Store any number of PostgreSQL endpoints with host, port, database, user, password and SSL mode. One-click connect from the dashboard, with connection testing built in |
| **SSH tunnels** | Define reusable SSH tunnel profiles (password or private-key) and attach them to any connection. Tunnels are dialed transparently on demand |
| **SQL editor** | CodeMirror-based query editor with syntax highlighting, multiple tabs, `EXPLAIN` and a live sessions view |
| **Schema browser** | Browse tables, columns, types, sequences and routines for the active database, with table-data viewer and pagination |
| **Dump / restore** | Export a connection to a SQL dump or import one back, directly from the UI |
| **Users** | Multi-user access with username + password auth. Sessions stored server-side, configurable lifetime |

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

## License

[MIT](LICENSE)
