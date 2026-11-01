# Desktop app

The desktop app is a Tauri 2 shell around the same axum server and React SPA as the browser binary. It lives in its own crate, `desktop/`, with its own `Cargo.lock`. There is no Cargo workspace at the repo root.

## Architecture

```
postgre-hub-desktop (one process)
├── tauri (tokio runtime = tauri::async_runtime)
│   └── backend::serve(listener on 127.0.0.1:P, ServerConfig { desktop: Some(..) })
│         ├── /api/*            same API as the browser binary
│         ├── /api/auth/desktop one-time launch token -> session cookie -> 302 /
│         ├── /api/desktop/save native "Save as" dialog (tauri-plugin-dialog)
│         └── /*                SPA embedded in the backend (frontend/dist)
└── WebviewWindow "main" -> http://127.0.0.1:P/api/auth/desktop?token=...
```

Startup (`desktop/src/main.rs`, `setup()`):

1. `data_dir = app_data_dir()` (`com.towerforge.postgrehub`).
2. `server::bind_persisted_port`: binds `127.0.0.1:<port from data_dir/desktop.json>`, retrying for about 1.5 s (this covers a relaunch after an update). If the port is taken it binds `127.0.0.1:0` and saves the new port. It never binds `0.0.0.0`. A stable port keeps the webview origin stable, and with it `localStorage` (theme, panels, SQL tabs) and the session cookie.
3. `server::launch_token`: 256 random bits from the OS generator (`getrandom`). The backend redeems the token once, in constant time.
4. `tauri::async_runtime::spawn(backend::serve(..))`, with a `oneshot` shutdown. On `RunEvent::Exit` the app signals shutdown and waits up to 3 s so the port is released.
5. The window opens on the token URL. `on_navigation` only allows the local origin (`http://127.0.0.1:P` or `http://localhost:P`). Other `http`, `https` and `mailto` links open in the system browser through tauri-plugin-opener, and any other scheme is blocked. `on_new_window` never opens a webview window.
6. If anything fails (data dir, port, SQLite), a native error dialog is shown and the app exits with code 1. There is no panic.

Plugins, in registration order: `single-instance` (first, so a second launch only focuses the existing window and never opens the same SQLite twice), `window-state`, `dialog`, `opener`, and `updater` (only when configured, see below).

The menu defines App (macOS) or File, Edit, and Window. The predefined Edit items are required on macOS: without them ⌘C, ⌘V, ⌘X, ⌘A and ⌘Z do not reach the webview.

### What stays the same for the browser binary

- `backend/` remains a lib + bin crate. The `backend` binary still binds `0.0.0.0:8080` and reads `DATA_DIR` from the environment, and it does not depend on Tauri, WebKitGTK or WebView2.
- `make package-all`, `package-one`, `build-backend`, `install.sh` and the Docker image are unchanged. `.dockerignore` excludes `desktop/`.
- Desktop artifacts are named `postgre-hub-desktop-<os>-<arch>.<ext>` and do not collide with the `install.sh` patterns.

### Security notes

- **CSP** (`app.security.csp` = `default-src 'none'; style-src 'unsafe-inline'`): it only applies to content Tauri serves itself, which here is just `desktop/placeholder/`. The SPA is served by axum over HTTP, so Tauri injects nothing into it. A CSP for the SPA has to be sent as a header by the backend.
- **Capabilities** (`desktop/capabilities/main.json`): deliberately empty. The window loads `http://127.0.0.1:P`, which counts as remote content for Tauri. No `remote.urls` is declared, so the page has no IPC access at all. Plugins are used only from Rust.
- **Devtools** are enabled only in debug builds.
- **`build.frontendDist`** points to `desktop/placeholder/` (an empty page), so the SPA is not embedded twice.
- **rustls**: the backend installs `ring` as the process-wide provider. tauri-plugin-updater 2.14 uses `reqwest/rustls-no-provider` plus `rustls/ring`, so `aws-lc-rs` is not in the graph (check with `cargo tree --manifest-path desktop/Cargo.toml -i aws-lc-rs`, which must report no match). Recheck this after bumping the updater or reqwest.

## Building locally

Requirements: Rust stable, Node 24 + pnpm 10, and the Tauri CLI (`cargo install tauri-cli --version "^2" --locked`). On Linux you also need `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`.

These targets run on the host, not in Docker. This is an exception to the Docker rule because the app is a GUI and needs the system webview.

| Command | What it does |
|---|---|
| `make desktop-dev` | `cargo tauri dev`: debug window with devtools. Builds `frontend/dist` first if it is missing (rust-embed reads it from disk in debug builds, so after a `pnpm build` a reload is enough) |
| `make desktop-build` | `make build-frontend` + `cargo tauri build`: bundles in `desktop/target/release/bundle/` (`.app` + `.dmg` on macOS, `.msi` + NSIS `.exe` on Windows, `.deb`/`.rpm`/`.AppImage` on Linux). Needs no keys and does not sign |
| `make desktop-open` | Opens the release `.app` built by `desktop-build` (macOS only). It uses the app's real data directory |
| `make package-desktop` | Copies the bundles for the current version to `dist/postgre-hub-desktop-<os>-<arch>.<ext>`, plus `.sig` files if present |
| `make package-desktop-macos` | Builds and copies the bundles for every triple in `MACOS_TARGETS` (Apple Silicon and Intel). The frontend is built once |
| `make checksums` | `dist/checksums.txt` with tarballs, zips and desktop bundles. Updater `.sig` files go to `dist/checksums-sig.txt` |

Use `DESKTOP_TARGET=x86_64-apple-darwin` to build another macOS architecture, and `DESKTOP_BUILD_ARGS="--bundles dmg"` to pass extra flags. Windows and Linux bundles need native runners: use CI.

Lint and format only the desktop crate: `cargo clippy --manifest-path desktop/Cargo.toml` and `cargo fmt --manifest-path desktop/Cargo.toml`. Do not run `make fmt`, because the backend is not rustfmt-formatted.

**Debug data dir override:** debug builds read `POSTGRE_HUB_DESKTOP_DATA_DIR` to use a throwaway data directory, for example `POSTGRE_HUB_DESKTOP_DATA_DIR=/tmp/ph-test make desktop-dev`. Release builds ignore it.

**Version:** `tauri.conf.json` reads `"version": "../frontend/package.json"`. Tauri 2 does not accept a `Cargo.toml` as the version source. `make set-version` already updates `frontend/package.json`, so the desktop version follows it. The version in `desktop/Cargo.toml` (`0.0.0`) is not used.

**Icons:** generated with `cargo tauri icon frontend/public/favicon.svg -o desktop/icons` (the mobile folders are deleted afterwards). Re-run it when the logo changes.

## CI

There are two workflows, following the same model as the other Towerforge repos:

- **`.github/workflows/ci.yml`** runs on every push to `dev` and `main` and on pull requests. It builds the frontend (which also runs ESLint), runs `cargo clippy -D warnings` and `cargo test` for the backend against a PostgreSQL service container (so the SQL export test runs too), and runs `cargo fmt --check` and `cargo clippy -D warnings` for `desktop/`. It runs natively rather than through `make check`, which would rebuild the Docker images on every run.
- **`.github/workflows/release.yml`** runs on `v*` tags (the ones `make release` pushes) and publishes the GitHub release with everything in it. Nothing is uploaded by hand.

`release.yml` runs these jobs:

1. `version`: fails right away if the tag does not match `backend/Cargo.toml` and `frontend/package.json`.
2. `frontend`: builds `frontend/dist` once and shares it with the other jobs as an artifact.
3. `binaries`: the ten browser binaries that `install.sh` and the README list. They use the same Makefile targets as a local build (`make _package-<family>-binaries <FAMILY>_TARGETS=<triple>`): `cross` for Linux and Windows, rustup on `macos-latest` for macOS.
4. `desktop`: the Tauri bundles, each on a native runner: macOS aarch64 and x86_64 (both on `macos-latest`), `ubuntu-22.04`, `ubuntu-22.04-arm` (public repos only) and `windows-latest`. It runs `tauri build` and then `make package-desktop`.
5. `publish`: runs `make checksums`, writes `latest.json` if there are updater signatures, and publishes the release (not a draft) with notes generated from the commits.

Without secrets it still succeeds and produces unsigned bundles. macOS bundles are ad-hoc signed, so Gatekeeper offers "Open anyway" instead of "damaged". Each signing feature switches on by itself once its secrets exist.

### Updater (minisign)

The updater stays inert until it is configured:

- The plugin is registered only if the merged config has a non-empty `plugins.updater.pubkey`.
- That section lives in `desktop/tauri.updater.conf.json` (together with `createUpdaterArtifacts: true` and the endpoint `https://github.com/towerforge/postgre-hub/releases/latest/download/latest.json`).
- CI adds the file with `--config tauri.updater.conf.json` only when `TAURI_SIGNING_PRIVATE_KEY` exists. A local `cargo tauri build` never includes it.

To enable it:

```bash
# 1. Generate the key pair. Keep the private key and its password safe: if you
#    lose them, existing installs can never be updated again.
cargo tauri signer generate -w ~/.tauri/postgre-hub.key

# 2. Paste the public key (the full contents of ~/.tauri/postgre-hub.key.pub)
#    into "pubkey" in desktop/tauri.updater.conf.json and commit it.

# 3. Create the GitHub secrets (Settings -> Secrets and variables -> Actions):
gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/postgre-hub.key
gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD   # prompts; skip if the key has no password
```

The `publish` job writes `latest.json` from the `.sig` files: `.app.tar.gz` on macOS, `.AppImage` on Linux and the NSIS `.exe` on Windows. The release is published only after every platform has finished, so the endpoint never serves a partial manifest.

### macOS signing and notarization

You need an Apple Developer account (99 USD/year), a "Developer ID Application" certificate exported as `.p12`, and an App Store Connect API key (Users and Access -> Integrations -> Keys).

| Secret | Value |
|---|---|
| `APPLE_CERTIFICATE` | `base64 -i certificate.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | password of the `.p12` |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Towerforge (TEAMID)` |
| `APPLE_API_ISSUER` | Issuer ID shown above the keys table |
| `APPLE_API_KEY` | Key ID |
| `APPLE_API_PRIVATE_KEY` | contents of `AuthKey_<KEYID>.p8`. CI writes it to a file and exports `APPLE_API_KEY_PATH` |

With only the first three secrets, the app is signed but not notarized.

### Windows signing (Azure Artifact Signing)

You need an Azure Artifact Signing account with a certificate profile, and an App Registration with the signer role on it.

| Kind | Name | Value |
|---|---|---|
| secret | `AZURE_CLIENT_ID` | App Registration client ID |
| secret | `AZURE_CLIENT_SECRET` | App Registration client secret |
| secret | `AZURE_TENANT_ID` | Directory tenant ID |
| variable | `AZURE_SIGNING_ENDPOINT` | e.g. `https://weu.codesigning.azure.net` |
| variable | `AZURE_SIGNING_ACCOUNT` | Artifact Signing account name |
| variable | `AZURE_SIGNING_PROFILE` | certificate profile name |

When all six are set, CI installs `artifact-signing-cli` and adds `bundle.windows.signCommand` through an extra `--config`.

## Known limits

- No desktop build for musl, armv7, i686 or Windows `-gnu`: those keep using the browser binary.
- The AppImage is large (70+ MB) and needs glibc from Ubuntu 22.04 / Debian 12 or newer.
- Three different webviews (WKWebView, WebView2, WebKitGTK): QA each platform.
- If the saved port is taken by another program at launch, the app moves to a new port, and the webview starts with empty `localStorage` for the new origin.
- The SPA loads its fonts from Google Fonts, so without network access it falls back to system fonts.
