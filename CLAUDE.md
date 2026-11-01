# postgre-hub

Backend Rust (un solo crate, axum, rusqlite + tokio-postgres) y frontend React 19 en JavaScript
plano. Antes de tocar nada: `README.md`, `docs/frontend.md`, `docs/ui-components.md` y el
`Makefile` (`make help`). Mandan sobre las fichas genéricas de Rust y React.

## Agentes especializados

Las instrucciones de trabajo se delegan a los agentes de `.claude/agents/`, no se hacen en la
sesión principal:

| Agente | Apartado | Toca |
|---|---|---|
| `database` | Esquema SQLite y migraciones (`backend/src/db.rs`), índices, SQL rusqlite, SQL de catálogo/dump contra PostgreSQL, rendimiento | Solo lo relacionado con la BD |
| `backend` | Endpoints `/api`, handlers, auth y sesiones, usuarios, túneles SSH, TLS, export/import | `backend/` |
| `frontend` | Páginas, rutas, estado, contextos, hooks, `services/` | `frontend/` sin CSS ni kit |
| `visual` | CSS Modules, tokens `--om-*`, kit `components/ui`, maquetación, acabado; verifica en Chrome | `frontend/` sin lógica |

- Una instrucción de un solo apartado va directa a su agente.
- Si toca varios, se reparte **en serie y en este orden**: database → backend → frontend →
  visual. Cada agente recibe en su prompt el informe del anterior (cambios de esquema, contrato
  de los endpoints, pantallas y estados a revisar). Se saltan los apartados que no hagan falta.
- Cada agente verifica su trabajo antes de terminar (ver su fichero). La sesión principal revisa
  el informe y no da nada por bueno sin la salida de esas verificaciones.
- Tras cambios de `frontend` o `visual`, pasa `react-structure-checker` sobre lo tocado.
- Los commits los hace la sesión principal al final, en `dev`, con Conventional Commits en
  castellano. Los agentes no commitean.

## Trampas

- `make check` es `cargo check` + `cargo clippy` + ESLint. **No hay tests** en el repo.
- El backend no está formateado con rustfmt: `make fmt` lo reescribiría entero. Para el
  frontend, solo `docker compose run --rm --no-deps frontend pnpm fmt`.
- No hay `make migrate`: las migraciones de SQLite se aplican en `db::open()` al arrancar.
- Dev: frontend `localhost:4300`, API `localhost:4301` (modo `--dev`: sin middleware de auth, pero el frontend
  sigue enseñando el login porque `/api/auth/status` dice `authenticated:false`), PostgreSQL de
  pruebas en `localhost:4302` (desde la app: host `sandbox`, puerto 5432, `postgres`/`postgres`).
