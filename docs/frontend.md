# Frontend

React 19 in plain JavaScript (no TypeScript), built with Vite. In production the Rust binary embeds the build (`frontend/dist`) and serves it next to the API from the same origin.

## Commands

Run them through the Makefile, which uses Docker Compose:

| Command | What it does |
|---|---|
| `make up` | API with hot reload, Vite dev server on `localhost:4300` and a sandbox PostgreSQL |
| `make check` | clippy for the backend and ESLint for the frontend (`pnpm check`). There are no frontend tests |
| `make fmt` | rustfmt and Prettier (`pnpm fmt`) |

`pnpm build` runs ESLint before `vite build`, so a lint error stops the release build.

Formatting is Prettier with 2 spaces, semicolons, double quotes and a 100-column line (`frontend/.prettierrc`).

## Folders

Everything lives in `frontend/src`, and only these folders exist:

| Folder | Contents |
|---|---|
| `pages/` | Routes (see [Routing](#routing)). Pieces that belong to one screen sit next to it with a `_` prefix |
| `services/` | API calls, one file per domain. All of them go through `services/http.js` |
| `lib/` | Pure JavaScript helpers: no React, no network |
| `components/` | Domain components shared by several screens (`connections-shell.jsx`, `main-layout.jsx`, `auth-view.jsx`) |
| `components/ui/` | The generic kit, exported from `components/ui/index.js`. See [ui-components.md](ui-components.md) |
| `contexts/` | One React context per file, with its provider and hook (`auth-context.jsx` → `AuthProvider` + `useAuth`) |
| `css/` | CSS Modules. `css/ui/<name>.module.css` belongs to one kit component; `css/<name>.module.css` to a domain or a shared component. Global styles and the `--om-*` tokens live in `index.css` |

At the root of `src/` there are only `main.jsx` (mounts the app), `app.jsx` (providers and router) and `index.css`.

## Routing

Routes come from the files in `src/pages` (`vite-plugin-pages`, imported in `app.jsx` as `~react-pages`). Every page is loaded as its own chunk, and all of them render inside `MainLayout`.

| File | Route |
|---|---|
| `pages/index.jsx` | `/` → redirects to `/connections` |
| `pages/connections/index.jsx` | `/connections` — the list of saved connections |
| `pages/connections/[id].jsx` | `/connections/:id` — the SQL editor of one connection |
| `pages/ssh-tunnels.jsx` | `/ssh-tunnels` |
| `pages/account.jsx`, `users.jsx`, `appearance.jsx` | `/account`, `/users`, `/appearance` |
| `pages/dev.jsx` | `/dev` — the UI kit catalog. In production it redirects to `/connections` |
| `pages/login.jsx`, `security.jsx`, `settings/*` | Old URLs kept as redirects so saved links keep working |

Files and folders that start with `_` are **not** routes: they are the code of the screen next to them (`pages/connections/_sql-editor.jsx`, `pages/_dev-forms.jsx`). If two screens need the same piece, it moves to `components/`.

Without a session, every URL shows the sign-in screen (or the first-user setup on a fresh install); there is no `/login` page.

## Domains

Each domain has one English name, and that name is repeated in every layer, so searching for it finds everything:

| Domain | Service | Screen | Other |
|---|---|---|---|
| `connections` | `services/connections.js` | `pages/connections/` | `components/connections-shell.jsx`, `css/connections.module.css` |
| `ssh-tunnels` | `services/ssh-tunnels.js` | `pages/ssh-tunnels.jsx` | |
| `users` | `services/users.js` | `pages/users.jsx` | |
| `account` | `services/account.js` | `pages/account.jsx` | |
| `auth` | `services/auth.js` | — | `contexts/auth-context.jsx`, `components/auth-view.jsx`, `css/auth.module.css` |

The API still calls connections *projects* (`/api/projects`); the frontend calls them *connections* everywhere, and `services/connections.js` is the only place that knows the API name.

`services/releases.js` checks GitHub for a newer release for the About dialog.

## The HTTP client

`services/http.js` is the only file that calls `fetch`. It exposes `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiDownload` (for the SQL export) and `apiUpload` (for the import), all relative to `/api`. Screens never call these helpers directly; they call the function of their domain's service.

- The session is an HttpOnly cookie set by the backend, so the client stores no token.
- Errors are thrown as `Error` with the API's message (`{ "error": "…" }`) in `err.message`.
- A `401` outside `/api/auth/*` means the session expired, and the page reloads to the sign-in screen.
- `externalGet` is the single exception to the relative base: it is used only for the public GitHub releases API.

Every backend endpoint lives under `/api`. In development, Vite proxies `/api` to the backend (`VITE_API_PROXY` or `BACKEND_PORT`).

## Code conventions

- **File names** are kebab-case and in English. `.jsx` if the file contains JSX, `.js` otherwise.
- **Identifiers** are in English: `PascalCase` components, `camelCase` functions and variables, `UPPER_SNAKE_CASE` module constants, `use` prefix for hooks.
- **Functions** are arrow functions, with named exports. `export default` is only used where a tool requires it: pages, `app.jsx` and config files.
- **Imports** use the `@/` alias instead of `../`. Kit components are imported from `@/components/ui`; inside the kit they import each other by relative file (`./button`).
- **Comments** are in Spanish and explain why, not what. Every file starts with a header comment, before the imports, saying what the file is and why it exists. Small kit components (50 lines or fewer, no hooks) may skip it. Non-trivial exported functions get a one-line `/** … */`.
- **Size:** a file must not pass 1000 lines. From 600 lines, split it into pieces next to it (`_*.jsx` in a page).
- **Styles:** a kit component only uses its own `css/ui/<name>.module.css`. When two components share a look, compose the classes with `composes:` instead of importing another component's module.
