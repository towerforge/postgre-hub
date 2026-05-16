# Postgre Hub — Docker deployment

A self-hosted PostgreSQL admin dashboard — manage connections, run queries, browse schemas and tunnel through SSH from a single binary.

- Multiple PostgreSQL connections with a saved-credentials store
- Built-in SQL editor (CodeMirror) with EXPLAIN, history and sessions view
- Schema browser: tables, columns, types, sequences, routines
- Table data viewer with pagination
- Reusable SSH tunnel definitions (password / private-key auth)
- Export and import SQL dumps per connection
- Multi-user access (username + password, sessions)
- Single binary, no runtime dependencies
- Supports `amd64` and `arm64`

## Quick start

```bash
docker run -d \
  --name postgre-hub \
  --restart unless-stopped \
  -p 8080:8080 \
  -v postgre-hub-data:/data \
  -e DATA_DIR=/data \
  towerforge/postgre-hub:latest
```

Open [http://localhost:8080](http://localhost:8080). On first visit you will be prompted to create the first user.

## Docker Compose

```yaml
services:
  postgre-hub:
    image: towerforge/postgre-hub:latest
    container_name: postgre-hub
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - postgre-hub-data:/data
    environment:
      - DATA_DIR=/data

volumes:
  postgre-hub-data:
```

## Users & sessions

On first launch a setup screen lets you create the initial user (username + password, minimum 8 characters). Additional users can be added from **Users**. All users have the same access level.

Sessions remain valid for **24 hours** by default. Adjust with `SESSION_DURATION_HOURS`:

```yaml
environment:
  - DATA_DIR=/data
  - SESSION_DURATION_HOURS=12
```

All app data — users, saved connections and SSH tunnels — is stored in a single SQLite database (`$DATA_DIR/pg-admin.db`). Mount a named volume at `DATA_DIR` so it survives container updates.

### Persistence behaviour

| Situation | Data kept? |
|---|---|
| `docker restart postgre-hub` | ✅ Yes |
| `docker stop` + `docker start` | ✅ Yes |
| `docker-compose restart` | ✅ Yes |
| `docker-compose pull` + `up -d` (recreates container) | ✅ Yes — if volume is mounted |
| `docker rm` + `docker run` without volume | ❌ No — setup required again |

## Custom port

```bash
docker run -d \
  --name postgre-hub \
  --restart unless-stopped \
  -p 9090:8080 \
  -v postgre-hub-data:/data \
  -e DATA_DIR=/data \
  towerforge/postgre-hub:latest
```

Then open [http://localhost:9090](http://localhost:9090).

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATA_DIR` | `.` | Directory where `pg-admin.db` is stored |
| `SESSION_DURATION_HOURS` | `24` | Session lifetime in hours |
| `SECURE_COOKIES` | `false` | Set to `true` to add the `Secure` flag to session cookies. Enable when running behind an HTTPS reverse proxy |

## Notes

- Stored database passwords and SSH credentials are kept in the local SQLite file — protect `$DATA_DIR/pg-admin.db` accordingly
- The container does **not** need access to the Docker socket — Postgre Hub only talks to PostgreSQL endpoints you configure
- Run it on a private network or behind an authenticating reverse proxy; the app does not enforce TLS itself

## Source

[github.com/towerforge/postgre-hub](https://github.com/towerforge/postgre-hub)
