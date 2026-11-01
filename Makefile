SHELL := /bin/bash

# ---------------------------------------------------------------------------
# Project
# ---------------------------------------------------------------------------

APP_NAME     ?= postgre-hub
BACKEND_DIR  := backend
FRONTEND_DIR := frontend
PORT         ?= 8080

# Permite usar `docker-compose` (v1) si no esta disponible el plugin `docker compose`.
COMPOSE ?= docker compose

RESET := \033[0m
BOLD  := \033[1m
DIM   := \033[2m
GREEN := \033[0;32m
RED   := \033[0;31m

# Badges de servicio
B_DB    := \033[1;37;48;5;25m  db   \033[0m
B_API   := \033[1;37;48;5;208m api  \033[0m
B_FRONT := \033[1;30;48;5;35m front \033[0m

# URLs de desarrollo (puertos publicados en docker-compose.override.yml)
URL_FRONT := http://localhost:4300
URL_API   := http://localhost:4301
URL_DB    := postgres://postgres:postgres@localhost:4302/sandbox

VERSION     ?= $(shell sed -n 's/^version = "\(.*\)"/\1/p' $(BACKEND_DIR)/Cargo.toml | head -n1)
VERSION_TAG ?= v$(VERSION)

HOST_OS   := $(shell uname -s | tr '[:upper:]' '[:lower:]')
HOST_ARCH := $(shell uname -m)

# ---------------------------------------------------------------------------
# Build target — set CARGO_TARGET to a Rust triple to cross-compile
# ---------------------------------------------------------------------------

CARGO_TARGET ?=

BACKEND_BIN := $(strip $(if $(CARGO_TARGET),\
	$(BACKEND_DIR)/target/$(CARGO_TARGET)/release/backend$(if $(findstring windows,$(CARGO_TARGET)),.exe,),\
	$(BACKEND_DIR)/target/release/backend))

PLATFORM ?= $(strip $(if $(CARGO_TARGET),\
	$(if $(findstring apple-darwin,$(CARGO_TARGET)),macos,\
	$(if $(findstring windows,$(CARGO_TARGET)),windows,linux)),\
	$(if $(filter darwin,$(HOST_OS)),macos,linux)))

TARGET_ARCH := $(if $(CARGO_TARGET),$(word 1,$(subst -, ,$(CARGO_TARGET))),$(HOST_ARCH))

# ---------------------------------------------------------------------------
# Artifacts — e.g. postgre-hub-linux-x86_64.tar.gz / postgre-hub-windows-x86_64.zip
# ---------------------------------------------------------------------------

ARCHIVE_EXT = $(if $(filter windows,$(PLATFORM)),.zip,.tar.gz)

ARTIFACT_BASENAME   ?= postgre-hub
ARTIFACT_ARCH       ?= $(TARGET_ARCH)
DIST_DIR            ?= dist
ARTIFACT            ?= $(ARTIFACT_BASENAME)-$(ARTIFACT_ARCH)$(ARCHIVE_EXT)
ARTIFACT_VERSIONED  := $(ARTIFACT_BASENAME)-$(PLATFORM)-$(ARTIFACT_ARCH)$(ARCHIVE_EXT)

# Set to 1 to also write an unversioned copy of each artifact
ENABLE_LATEST_ASSET ?= 0

# ---------------------------------------------------------------------------
# Cross-compilation
#   Linux targets → built inside Docker via 'cross' (Docker must be running)
#   macOS targets → built natively via rustup (no Docker required)
#
#   Install cross once: cargo install cross --git https://github.com/cross-rs/cross
# ---------------------------------------------------------------------------

CARGO_CMD ?= cargo

LINUX_TARGETS ?= \
	x86_64-unknown-linux-gnu \
	x86_64-unknown-linux-musl \
	aarch64-unknown-linux-gnu \
	aarch64-unknown-linux-musl \
	armv7-unknown-linux-gnueabihf \
	i686-unknown-linux-gnu

MACOS_TARGETS ?= \
	x86_64-apple-darwin \
	aarch64-apple-darwin

WINDOWS_TARGETS ?= \
	x86_64-pc-windows-gnu \
	i686-pc-windows-gnu

# ---------------------------------------------------------------------------
# Phony targets
# ---------------------------------------------------------------------------

.PHONY: help version \
        start up dev down stop logs ps status images check fmt clean \
        install-frontend build-frontend build-backend build run release set-version \
        package package-one \
        package-all package-all-linux package-all-macos package-all-windows \
        _package-linux-binaries _package-macos-binaries _package-windows-binaries \
        checksums rust-targets clean-target dist-clean \
        desktop-dev desktop-build desktop-open package-desktop package-desktop-macos

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------

help:
	@echo "Postgres Hub — available targets"
	@echo ""
	@echo "  Desarrollo (Docker Compose)"
	@echo "    make start / make up / make dev   Construye y levanta la pila (API, Vite, PostgreSQL de pruebas)"
	@echo "    make down                     Para y elimina los contenedores (conserva volumenes)"
	@echo "    make stop                     Detiene los contenedores sin eliminarlos"
	@echo "    make logs [S=servicio]        Sigue los logs (todos o uno: app, frontend, sandbox)"
	@echo "    make ps / make status         Estado de los servicios"
	@echo "    make images                   Construye las imagenes Docker"
	@echo "    make check                    cargo check + clippy y eslint, dentro de los contenedores"
	@echo "    make fmt                      cargo fmt dentro del contenedor"
	@echo "    make clean                    Para todo y elimina volumenes (datos de dev incluidos)"
	@echo ""
	@echo "  Building"
	@echo "    make build                    Build frontend + backend for the host"
	@echo "    make build-frontend           Build frontend only"
	@echo "    make build-backend            Build backend only"
	@echo "    make run                      Run the built backend binary"
	@echo ""
	@echo "  Release"
	@echo "    make release                  Bump + merge + tag siguiendo dev → beta → main"
	@echo ""
	@echo "  Packaging"
	@echo "    make package                  Build and package for the host (or CARGO_TARGET)"
	@echo "    make package-all              Package all Linux + macOS + Windows targets"
	@echo "    make package-all-linux        Package all Linux targets (cross + Docker)"
	@echo "    make package-all-macos        Package all macOS targets (rustup). Binario de navegador, no la app de escritorio"
	@echo "    make package-all-windows      Package all Windows targets (cross + Docker)"
	@echo ""
	@echo "  Desktop (Tauri, en el host: es una GUI, excepcion a la regla de Docker)"
	@echo "    make desktop-dev              Lanza la app de escritorio en modo debug (cargo tauri dev, con devtools)"
	@echo "                                  Datos aparte: POSTGRE_HUB_DESKTOP_DATA_DIR=/tmp/ph-test make desktop-dev"
	@echo "    make desktop-build            Compila el frontend y genera los bundles nativos (.app/.dmg, .msi/.exe, .deb/.rpm/.AppImage)"
	@echo "    make desktop-open             Abre la .app de release para probarla (macOS; antes: make desktop-build)"
	@echo "    make package-desktop          Copia los bundles a dist/postgre-hub-desktop-<os>-<arch>.<ext>"
	@echo "    make package-desktop-macos    Genera y copia a dist/ los bundles de todas las arquitecturas macOS (MACOS_TARGETS)"
	@echo ""
	@echo "  Utilities"
	@echo "    make version                  Show current version (flags drift between Cargo.toml and package.json)"
	@echo "    make set-version x.y.z        Propagate a new semver version to backend & frontend"
	@echo "    make rust-targets             List all targets used by package-all-*"
	@echo "    make install-frontend         Install frontend dependencies"
	@echo "    make checksums                Generate SHA256 checksums for dist artifacts"
	@echo "    make clean-target             Remove host backend build artifacts (cargo clean)"
	@echo "    make dist-clean               Remove the dist directory"
	@echo ""
	@echo "  Variables"
	@echo "    PORT=<port>                   Port for make run (default: 8080)"
	@echo "    VERSION=<x.y.z>              Override the version from Cargo.toml"
	@echo "    DIST_DIR=<dir>               Output directory for artifacts (default: dist)"
	@echo "    CARGO_TARGET=<triple>        Rust target triple (e.g. aarch64-apple-darwin)"
	@echo "    LINUX_TARGETS=\"...\"         Space-separated triples for package-all-linux"
	@echo "    MACOS_TARGETS=\"...\"         Space-separated triples for package-all-macos / package-desktop-macos"
	@echo "    WINDOWS_TARGETS=\"...\"       Space-separated triples for package-all-windows"
	@echo "    ENABLE_LATEST_ASSET=1        Also write an unversioned copy of each artifact"
	@echo "    ARTIFACT_BASENAME=<name>     Artifact filename prefix (default: postgre-hub)"
	@echo "    DESKTOP_TARGET=<triple>      Rust triple for desktop-build / package-desktop (default: host)"
	@echo "    DESKTOP_BUILD_ARGS=\"...\"     Extra args for cargo tauri build (e.g. --bundles dmg)"

# ---------------------------------------------------------------------------
# Version
# ---------------------------------------------------------------------------
#   make version              Show current version (and flag drift between
#                             backend/Cargo.toml and frontend/package.json)
#   make set-version x.y.z    Propagate a new semver version to both files
#                             (also accepts the legacy form: NEW=x.y.z)

FRONT_VERSION := $(shell sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' $(FRONTEND_DIR)/package.json | head -n1)

# Accept a bare positional argument:  make set-version 1.0.0
# Without this Make would treat "1.0.0" as another target.
ifeq (set-version,$(firstword $(MAKECMDGOALS)))
  SET_VERSION_POS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
  ifneq ($(SET_VERSION_POS),)
    # Swallow the positional words so Make doesn't try to build them as targets.
    $(eval $(SET_VERSION_POS):;@:)
    NEW ?= $(firstword $(SET_VERSION_POS))
  endif
endif

version:
	@printf "\n  $(BOLD)postgre-hub$(RESET)  $(GREEN)v$(VERSION)$(RESET)\n"
	@printf "  $(DIM)backend/Cargo.toml      → $(VERSION)$(RESET)\n"
	@printf "  $(DIM)frontend/package.json   → $(FRONT_VERSION)$(RESET)\n"
	@if [ "$(VERSION)" != "$(FRONT_VERSION)" ]; then \
		printf "\n  $(BOLD)⚠ drift$(RESET)  $(DIM)frontend is out of sync — run:$(RESET)  make set-version $(VERSION)\n"; \
	fi
	@printf "\n  $(DIM)bump:$(RESET)  make set-version x.y.z\n\n"

set-version:
	@if [ -z "$(NEW)" ]; then \
		printf "\n  $(BOLD)error$(RESET)  missing version  $(DIM)(usage: make set-version 0.14.0)$(RESET)\n\n"; exit 1; \
	fi
	@if ! echo "$(NEW)" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$$'; then \
		printf "\n  $(BOLD)error$(RESET)  '$(NEW)' is not semver (x.y.z)\n\n"; exit 1; \
	fi
	@old="$(VERSION)"; new="$(NEW)"; \
	if [ "$$old" = "$$new" ] && [ "$(FRONT_VERSION)" = "$$new" ]; then \
		printf "\n  $(DIM)already at v$$new — nothing to do$(RESET)\n\n"; exit 0; \
	fi; \
	printf "\n  $(BOLD)bump$(RESET)  $(DIM)v$$old$(RESET)  →  $(GREEN)v$$new$(RESET)\n\n"; \
	awk -v new="$$new" 'BEGIN{done=0} !done && /^version = "[^"]+"/ {sub(/"[^"]+"/, "\"" new "\""); done=1} {print}' $(BACKEND_DIR)/Cargo.toml > $(BACKEND_DIR)/Cargo.toml.tmp && mv $(BACKEND_DIR)/Cargo.toml.tmp $(BACKEND_DIR)/Cargo.toml; \
	awk -v new="$$new" 'BEGIN{done=0} !done && /"version":[[:space:]]*"[^"]+"/ {sub(/"version":[[:space:]]*"[^"]+"/, "\"version\": \"" new "\""); done=1} {print}' $(FRONTEND_DIR)/package.json > $(FRONTEND_DIR)/package.json.tmp && mv $(FRONTEND_DIR)/package.json.tmp $(FRONTEND_DIR)/package.json; \
	printf "  $(DIM)updated:$(RESET)\n"; \
	printf "    backend/Cargo.toml      → version = \"$$new\"\n"; \
	printf "    frontend/package.json   → \"version\": \"$$new\"\n"; \
	printf "\n  $(DIM)review with$(RESET)  git diff  $(DIM)then commit & tag$(RESET)  git tag v$$new\n\n"

# ---------------------------------------------------------------------------
# Desarrollo (Docker Compose)
#   docker-compose.yml            produccion: el binario con la SPA embebida
#   docker-compose.override.yml   desarrollo: API --dev con cargo watch, Vite y
#                                 un PostgreSQL de pruebas (`sandbox`)
# ---------------------------------------------------------------------------

## Construye las imagenes y levanta toda la pila en segundo plano.
start up dev:
	@printf "\n  $(BOLD)Levantando postgre-hub$(RESET)\n\n"
	$(COMPOSE) up -d --build
	@printf "\n  $(B_FRONT)  $(GREEN)$(URL_FRONT)$(RESET)\n"
	@printf "  $(B_API)  $(GREEN)$(URL_API)$(RESET)  $(DIM)la primera compilacion de Rust tarda: make logs S=app$(RESET)\n"
	@printf "  $(B_DB)  $(GREEN)$(URL_DB)$(RESET)  $(DIM)desde la app: host sandbox, puerto 5432$(RESET)\n"
	@printf "\n  $(DIM)make logs - make down$(RESET)\n\n"

## Para y elimina los contenedores (conserva los volumenes de datos y caches).
down:
	$(COMPOSE) down

## Detiene los contenedores sin eliminarlos.
stop:
	$(COMPOSE) stop

## Sigue la salida de todos los servicios, o de uno con S=<servicio>.
logs:
	$(COMPOSE) logs -f $(S)

## Estado de los servicios.
ps status:
	$(COMPOSE) ps

## Construye (o reconstruye) las imagenes Docker.
images:
	$(COMPOSE) build

## Compila el backend (cargo check + clippy) y pasa eslint al frontend.
## Ojo: no ejecuta tests.
check:
	$(COMPOSE) run --rm --no-deps app cargo check
	$(COMPOSE) run --rm --no-deps app cargo clippy
	$(COMPOSE) run --rm --no-deps frontend pnpm check

## Formatea el backend (rustfmt) y el frontend (Prettier).
fmt:
	$(COMPOSE) run --rm --no-deps app cargo fmt
	$(COMPOSE) run --rm --no-deps frontend pnpm fmt

## Para todo y elimina los volumenes: datos de la app en dev, sandbox y caches.
clean:
	$(COMPOSE) down -v

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

install-frontend:
	cd $(FRONTEND_DIR) && pnpm install --frozen-lockfile

build-frontend: install-frontend
	cd $(FRONTEND_DIR) && pnpm build

build-backend:
	$(CARGO_CMD) build --manifest-path $(BACKEND_DIR)/Cargo.toml --release \
		$(if $(CARGO_TARGET),--target $(CARGO_TARGET),)

build: build-frontend build-backend

run:
	./$(BACKEND_BIN) --port $(PORT)

# ---------------------------------------------------------------------------
# Release
# ---------------------------------------------------------------------------

# Archivos que llevan la version; el bump los actualiza a la vez.
VERSION_FILES := $(BACKEND_DIR)/Cargo.toml $(FRONTEND_DIR)/package.json

## Publica una release siguiendo la cadena fija dev → beta → main: la rama de
## destino la determina la rama actual, sin preguntar.
##
##   · desde dev  → beta   Propone la siguiente version (patch/minor/major),
##                         la propaga con set-version, fusiona dev en beta,
##                         crea el tag vX.Y.Z y hace push.
##   · desde beta → main   Modo promocion: conserva la version (sin bump),
##                         fusiona y hace push.
##   · otra rama           Pregunta la rama de destino (lista las locales o
##                         acepta una de origin) y hace bump + merge + tag.
##
## En las promociones el tag vX.Y.Z solo se crea si aun no existia. Si el
## merge choca solo en archivos de version se resuelve con la de la rama de
## origen; cualquier otro conflicto aborta el merge y deja todo como estaba.
release:
	@set -e; \
	if [ -n "$$(git status --porcelain -uno)" ]; then \
		printf "\n  $(RED)✗ Hay cambios sin commitear. Haz commit o stash antes de la release.$(RESET)\n\n"; \
		exit 1; \
	fi; \
	V="$(VERSION)"; \
	ORIG=$$(git rev-parse --abbrev-ref HEAD); \
	MODE=bump; \
	case "$$ORIG" in \
		dev)  TARGET=beta ;; \
		beta) TARGET=main; MODE=promo ;; \
		*)    TARGET="" ;; \
	esac; \
	if [ -z "$$TARGET" ]; then \
		BRANCHES=$$(git branch --format='%(refname:short)'); \
		printf "\n  $(BOLD)Release$(RESET)  $(DIM)rama '$$ORIG' fuera del flujo dev → beta → main$(RESET)\n\n"; \
		printf "  $(BOLD)Rama de destino$(RESET)\n\n"; \
		i=0; \
		for b in $$BRANCHES; do \
			i=$$((i+1)); \
			if [ "$$b" = "main" ]; then \
				printf "    $(BOLD)$$i$(RESET)  $$b  $(DIM)enter = main$(RESET)\n"; \
			else \
				printf "    $(BOLD)$$i$(RESET)  $$b\n"; \
			fi; \
		done; \
		printf "    $(DIM)o escribe el nombre de una rama de origin$(RESET)\n\n"; \
		printf "  Pulsa el numero de la rama $(DIM)(enter = main)$(RESET) > "; read CH; echo ""; \
		if [ -z "$$CH" ]; then \
			TARGET=main; \
		elif [[ "$$CH" =~ ^[0-9]+$$ ]]; then \
			TARGET=$$(echo "$$BRANCHES" | sed -n "$${CH}p"); \
			if [ -z "$$TARGET" ]; then \
				printf "  $(RED)✗ Opcion invalida: $$CH$(RESET)\n\n"; exit 1; \
			fi; \
		else \
			TARGET="$$CH"; \
		fi; \
	fi; \
	if ! git rev-parse -q --verify "refs/heads/$$TARGET" >/dev/null; then \
		if git ls-remote --exit-code --heads origin "$$TARGET" >/dev/null 2>&1; then \
			printf "  $(DIM)La rama $$TARGET no existe en local pero si en origin — creando rama local...$(RESET)\n"; \
			git fetch -q origin "$$TARGET:$$TARGET"; \
		else \
			printf "  $(RED)✗ La rama '$$TARGET' no existe ni en local ni en origin$(RESET)\n\n"; \
			exit 1; \
		fi; \
	fi; \
	case "$$TARGET" in \
		main) CI_MSG="sin CI en el repo: los binarios se publican a mano (make package-all checksums)" ;; \
		*)    CI_MSG="sin CI en el repo para '$$TARGET'" ;; \
	esac; \
	if [ "$$MODE" = "promo" ]; then \
		printf "\n  $(BOLD)Release · promocion$(RESET)  $(DIM)$$ORIG → $$TARGET · version $$V$(RESET)\n\n"; \
		if git rev-parse -q --verify "refs/tags/v$$V" >/dev/null; then \
			TAG_NEW=0; \
		else \
			TAG_NEW=1; \
		fi; \
		printf "  $(BOLD)Resumen$(RESET)\n\n"; \
		printf "    Version  $(BOLD)$$V$(RESET)  $(DIM)se conserva, sin bump$(RESET)\n"; \
		printf "    Merge    $$ORIG → $$TARGET\n"; \
		if [ $$TAG_NEW -eq 1 ]; then \
			printf "    Tag      v$$V  $(DIM)no existia, se creara$(RESET)\n"; \
			printf "    Push     origin $$TARGET · origin v$$V\n"; \
		else \
			printf "    Tag      v$$V  $(DIM)ya existe$(RESET)\n"; \
			printf "    Push     origin $$TARGET\n"; \
		fi; \
		printf "    CI       $(DIM)$$CI_MSG$(RESET)\n"; \
		printf "\n  ¿Continuar? [y/N]: "; read ANS; echo ""; \
		if [ "$$ANS" != "y" ]; then \
			printf "  $(DIM)Cancelado — no se ha tocado nada.$(RESET)\n\n"; exit 0; \
		fi; \
		printf "  $(DIM)→ Fusionando $$ORIG en $$TARGET$(RESET)\n"; \
		git checkout -q "$$TARGET"; \
		git pull -q origin "$$TARGET"; \
		if ! git merge -q --no-ff -X theirs "$$ORIG" -m "release: v$$V"; then \
			CONFLICTS=$$(git diff --name-only --diff-filter=U); \
			if [ -n "$$CONFLICTS" ] && [ -z "$$(echo "$$CONFLICTS" | grep -vxF $(VERSION_FILES:%=-e %))" ]; then \
				printf "  $(DIM)→ Conflicto solo en archivos de version — se resuelve con $$V$(RESET)\n"; \
				git checkout -q --theirs -- $$CONFLICTS; \
				git add $$CONFLICTS; \
				git commit -q --no-edit; \
			else \
				printf "\n  $(RED)✗ Conflictos de merge en:$(RESET)\n"; \
				echo "$$CONFLICTS" | sed 's/^/      /'; \
				git merge --abort; \
				git checkout -q "$$ORIG"; \
				printf "\n  $(DIM)Merge abortado — no se ha publicado nada. De vuelta en $$ORIG.$(RESET)\n\n"; \
				exit 1; \
			fi; \
		fi; \
		if [ $$TAG_NEW -eq 1 ]; then \
			printf "  $(DIM)→ Creando tag v$$V$(RESET)\n"; \
			git tag -a "v$$V" -m "Release v$$V" "$$ORIG"; \
		fi; \
		printf "  $(DIM)→ Publicando $$TARGET$(RESET)\n"; \
		git push -q origin "$$TARGET"; \
		if [ $$TAG_NEW -eq 1 ]; then \
			git push -q origin "v$$V"; \
		fi; \
		git checkout -q "$$ORIG"; \
		echo ""; \
		printf "  $(GREEN)✓ v$$V promocionada a $$TARGET$(RESET)\n"; \
		printf "\n  De vuelta en $(BOLD)$$ORIG$(RESET)\n\n"; \
		exit 0; \
	fi; \
	IFS=. read MA MI PA <<< "$${V:-0.0.0}"; \
	P_PATCH="$$MA.$$MI.$$((PA+1))"; \
	P_MINOR="$$MA.$$((MI+1)).0"; \
	P_MAJOR="$$((MA+1)).0.0"; \
	printf "\n  $(BOLD)Release$(RESET)  $(DIM)$$ORIG → $$TARGET · version actual $$V$(RESET)\n\n"; \
	printf "  $(BOLD)Nueva version$(RESET)\n\n"; \
	printf "    $(BOLD)1$(RESET)  $$P_PATCH  $(DIM)patch$(RESET)\n"; \
	printf "    $(BOLD)2$(RESET)  $$P_MINOR  $(DIM)minor$(RESET)\n"; \
	printf "    $(BOLD)3$(RESET)  $$P_MAJOR  $(DIM)major$(RESET)\n"; \
	printf "    $(DIM)o escribe la version a mano (X.Y.Z)$(RESET)\n\n"; \
	printf "  > "; read CH; echo ""; \
	case "$$CH" in \
		1) NEW_V=$$P_PATCH ;; \
		2) NEW_V=$$P_MINOR ;; \
		3) NEW_V=$$P_MAJOR ;; \
		*) NEW_V=$$CH ;; \
	esac; \
	if ! [[ "$$NEW_V" =~ ^[0-9]+\.[0-9]+\.[0-9]+$$ ]]; then \
		printf "  $(RED)✗ Version invalida: '$$NEW_V'$(RESET)  $(DIM)formato esperado X.Y.Z, ej: 0.10.0$(RESET)\n\n"; \
		exit 1; \
	fi; \
	if [ "$$NEW_V" = "$$V" ]; then \
		printf "  $(RED)✗ La nueva version coincide con la actual ($$V)$(RESET)\n\n"; \
		exit 1; \
	fi; \
	if git rev-parse -q --verify "refs/tags/v$$NEW_V" >/dev/null; then \
		printf "  $(RED)✗ El tag v$$NEW_V ya existe$(RESET)\n\n"; \
		exit 1; \
	fi; \
	printf "  $(BOLD)Resumen$(RESET)\n\n"; \
	printf "    Version  $(DIM)$$V →$(RESET) $(BOLD)$$NEW_V$(RESET)\n"; \
	if [ "$$ORIG" != "$$TARGET" ]; then \
		printf "    Merge    $$ORIG → $$TARGET\n"; \
		printf "    Tag      v$$NEW_V\n"; \
		printf "    Push     origin $$ORIG · origin $$TARGET · origin v$$NEW_V\n"; \
	else \
		printf "    Merge    $(DIM)— (ya estas en $$TARGET)$(RESET)\n"; \
		printf "    Tag      v$$NEW_V\n"; \
		printf "    Push     origin $$TARGET · origin v$$NEW_V\n"; \
	fi; \
	printf "    CI       $(DIM)$$CI_MSG$(RESET)\n"; \
	printf "\n  ¿Continuar? [y/N]: "; read ANS; echo ""; \
	if [ "$$ANS" != "y" ]; then \
		printf "  $(DIM)Cancelado — no se ha tocado nada.$(RESET)\n\n"; exit 0; \
	fi; \
	printf "  $(DIM)→ Version $$V → $$NEW_V · commit y push en $$ORIG$(RESET)\n"; \
	$(MAKE) --no-print-directory set-version NEW=$$NEW_V >/dev/null; \
	git add $(VERSION_FILES); \
	git commit -q -m "chore: bump version to $$NEW_V"; \
	git push -q origin "$$ORIG"; \
	if [ "$$ORIG" != "$$TARGET" ]; then \
		printf "  $(DIM)→ Fusionando $$ORIG en $$TARGET$(RESET)\n"; \
		git checkout -q "$$TARGET"; \
		git pull -q origin "$$TARGET"; \
		if ! git merge -q --no-ff -X theirs "$$ORIG" -m "release: v$$NEW_V"; then \
			CONFLICTS=$$(git diff --name-only --diff-filter=U); \
			if [ -n "$$CONFLICTS" ] && [ -z "$$(echo "$$CONFLICTS" | grep -vxF $(VERSION_FILES:%=-e %))" ]; then \
				printf "  $(DIM)→ Conflicto solo en archivos de version — se resuelve con $$NEW_V$(RESET)\n"; \
				git checkout -q --theirs -- $$CONFLICTS; \
				git add $$CONFLICTS; \
				git commit -q --no-edit; \
			else \
				printf "\n  $(RED)✗ Conflictos de merge en:$(RESET)\n"; \
				echo "$$CONFLICTS" | sed 's/^/      /'; \
				git merge --abort; \
				git checkout -q "$$ORIG"; \
				printf "\n  $(DIM)Merge abortado — el bump de version ya esta commiteado en $$ORIG, pero no se ha publicado la release. De vuelta en $$ORIG.$(RESET)\n\n"; \
				exit 1; \
			fi; \
		fi; \
	fi; \
	printf "  $(DIM)→ Creando tag v$$NEW_V$(RESET)\n"; \
	git tag -a "v$$NEW_V" -m "Release v$$NEW_V"; \
	printf "  $(DIM)→ Publicando $$TARGET y el tag$(RESET)\n"; \
	git push -q origin "$$TARGET"; \
	git push -q origin "v$$NEW_V"; \
	if [ "$$ORIG" != "$$TARGET" ]; then \
		git checkout -q "$$ORIG"; \
	fi; \
	echo ""; \
	printf "  $(GREEN)✓ Release v$$NEW_V publicada en $$TARGET$(RESET)\n"; \
	printf "\n  De vuelta en $(BOLD)$$ORIG$(RESET)\n\n"

# ---------------------------------------------------------------------------
# Packaging
# ---------------------------------------------------------------------------

package: build
	@$(MAKE) package-one CARGO_TARGET="$(CARGO_TARGET)" ARTIFACT_ARCH="$(ARTIFACT_ARCH)"

package-one:
	@if [ ! -f "$(BACKEND_BIN)" ]; then \
		echo "ERROR: backend binary not found at $(BACKEND_BIN)"; \
		exit 1; \
	fi
	@mkdir -p $(DIST_DIR)
	@if [ "$(PLATFORM)" = "windows" ]; then \
		cp "$(BACKEND_BIN)" "$(DIST_DIR)/$(APP_NAME).exe"; \
		cd "$(DIST_DIR)" && zip -q "$(ARTIFACT_VERSIONED)" "$(APP_NAME).exe"; \
		if [ "$(ENABLE_LATEST_ASSET)" = "1" ]; then \
			cp "$(DIST_DIR)/$(ARTIFACT_VERSIONED)" "$(DIST_DIR)/$(ARTIFACT)"; \
		fi; \
		rm -f "$(DIST_DIR)/$(APP_NAME).exe"; \
	else \
		cp "$(BACKEND_BIN)" "$(DIST_DIR)/$(APP_NAME)"; \
		chmod +x "$(DIST_DIR)/$(APP_NAME)"; \
		tar -czf "$(DIST_DIR)/$(ARTIFACT_VERSIONED)" -C "$(DIST_DIR)" "$(APP_NAME)"; \
		if [ "$(ENABLE_LATEST_ASSET)" = "1" ]; then \
			cp "$(DIST_DIR)/$(ARTIFACT_VERSIONED)" "$(DIST_DIR)/$(ARTIFACT)"; \
		fi; \
		rm -f "$(DIST_DIR)/$(APP_NAME)"; \
	fi
	@echo "$(DIST_DIR)/$(ARTIFACT_VERSIONED)"

package-all: build-frontend
	@$(MAKE) --no-print-directory _package-linux-binaries
	@$(MAKE) --no-print-directory _package-macos-binaries
	@$(MAKE) --no-print-directory _package-windows-binaries

package-all-linux: build-frontend _package-linux-binaries

package-all-macos: build-frontend _package-macos-binaries

package-all-windows: build-frontend _package-windows-binaries

_package-linux-binaries:
	@set -e; \
	for target in $(LINUX_TARGETS); do \
		echo "==> [linux] $$target (cross + Docker)"; \
		$(MAKE) --no-print-directory build-backend CARGO_TARGET=$$target CARGO_CMD=cross; \
		arch=$$(echo $$target | cut -d- -f1); \
		case $$target in \
			*-musl*) arch_label="$${arch}-musl" ;; \
			*)       arch_label="$$arch" ;; \
		esac; \
		$(MAKE) --no-print-directory package-one \
			CARGO_TARGET=$$target \
			PLATFORM=linux \
			ARTIFACT_ARCH="$$arch_label"; \
	done

_package-macos-binaries:
	@set -e; \
	for target in $(MACOS_TARGETS); do \
		echo "==> [macos] $$target"; \
		rustup target add $$target >/dev/null; \
		$(MAKE) --no-print-directory build-backend CARGO_TARGET=$$target; \
		$(MAKE) --no-print-directory package-one \
			CARGO_TARGET=$$target \
			PLATFORM=macos \
			ARTIFACT_ARCH=$$(echo $$target | cut -d- -f1); \
	done

_package-windows-binaries:
	@set -e; \
	for target in $(WINDOWS_TARGETS); do \
		echo "==> [windows] $$target (cross + Docker)"; \
		$(MAKE) --no-print-directory build-backend CARGO_TARGET=$$target CARGO_CMD=cross; \
		$(MAKE) --no-print-directory package-one \
			CARGO_TARGET=$$target \
			PLATFORM=windows \
			ARTIFACT_ARCH=$$(echo $$target | cut -d- -f1); \
	done

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

## SHA256 de los artefactos de dist/: binarios de navegador (.tar.gz/.zip) y
## bundles de escritorio. Las firmas del updater (.sig) van aparte, en
## checksums-sig.txt, para no mezclarlas con los instaladores.
CHECKSUM_PATTERNS := *.tar.gz *.zip *.dmg *.msi *.exe *.AppImage *.deb *.rpm

checksums:
	@cd "$(DIST_DIR)" 2>/dev/null && files=$$(ls $(CHECKSUM_PATTERNS) 2>/dev/null); \
	if [ -z "$$files" ]; then \
		echo "ERROR: no artifacts ($(CHECKSUM_PATTERNS)) found in $(DIST_DIR)"; \
		exit 1; \
	fi; \
	sha256sum $$files > checksums.txt; \
	echo "$(DIST_DIR)/checksums.txt"; \
	sigs=$$(ls *.sig 2>/dev/null); \
	if [ -n "$$sigs" ]; then \
		sha256sum $$sigs > checksums-sig.txt; \
		echo "$(DIST_DIR)/checksums-sig.txt"; \
	else \
		rm -f checksums-sig.txt; \
	fi

rust-targets:
	@for target in $(LINUX_TARGETS); do echo $$target; done
	@for target in $(MACOS_TARGETS); do echo $$target; done
	@for target in $(WINDOWS_TARGETS); do echo $$target; done

clean-target:
	cargo clean --manifest-path $(BACKEND_DIR)/Cargo.toml

dist-clean:
	@if [ -z "$(DIST_DIR)" ] || [ "$(DIST_DIR)" = "/" ] || [ "$(DIST_DIR)" = "." ]; then \
		echo "ERROR: refusing to remove DIST_DIR='$(DIST_DIR)'"; \
		exit 1; \
	fi
	rm -rf "$(DIST_DIR)"

# ---------------------------------------------------------------------------
# Desktop (Tauri 2, crate desktop/)
#   Corre en el host, no en Docker: es una app con ventana y necesita el
#   webview del sistema (WKWebView, WebView2, WebKitGTK). Requiere
#   `cargo install tauri-cli --version "^2" --locked`.
#   El backend embebe frontend/dist al compilar, por eso desktop-build compila
#   antes el frontend. No toca package-all ni los binarios de navegador.
# ---------------------------------------------------------------------------

DESKTOP_DIR        := desktop
DESKTOP_TARGET     ?=
DESKTOP_BUILD_ARGS ?=
TAURI_CMD          ?= cargo tauri

DESKTOP_BUNDLE_DIR := $(DESKTOP_DIR)/target/$(if $(DESKTOP_TARGET),$(DESKTOP_TARGET)/,)release/bundle

DESKTOP_OS := $(strip $(if $(DESKTOP_TARGET),\
	$(if $(findstring apple-darwin,$(DESKTOP_TARGET)),macos,\
	$(if $(findstring windows,$(DESKTOP_TARGET)),windows,linux)),\
	$(if $(filter darwin,$(HOST_OS)),macos,\
	$(if $(findstring mingw,$(HOST_OS))$(findstring msys,$(HOST_OS)),windows,linux))))

DESKTOP_ARCH := $(strip $(if $(DESKTOP_TARGET),$(word 1,$(subst -, ,$(DESKTOP_TARGET))),\
	$(if $(filter arm64,$(HOST_ARCH)),aarch64,$(if $(filter amd64,$(HOST_ARCH)),x86_64,$(HOST_ARCH)))))

## Ventana de escritorio en debug. Reutiliza frontend/dist si ya existe.
desktop-dev:
	@test -f $(FRONTEND_DIR)/dist/index.html || $(MAKE) --no-print-directory build-frontend
	cd $(DESKTOP_DIR) && $(TAURI_CMD) dev

## Bundles nativos del host (o de DESKTOP_TARGET) en $(DESKTOP_BUNDLE_DIR).
## Sin claves: no firma ni genera artefactos del updater (ver docs/desktop.md).
desktop-build: build-frontend
	cd $(DESKTOP_DIR) && $(TAURI_CMD) build \
		$(if $(DESKTOP_TARGET),--target $(DESKTOP_TARGET),) $(DESKTOP_BUILD_ARGS)

## Abre la .app de release generada por desktop-build (solo macOS), para probarla
## como la recibira un usuario. Usa la carpeta de datos real de la app.
desktop-open:
	@app="$(DESKTOP_BUNDLE_DIR)/macos/Postgre Hub.app"; \
	if [ ! -d "$$app" ]; then \
		echo "ERROR: no existe $$app (run: make desktop-build)"; exit 1; \
	fi; \
	open "$$app"

## Bundles de escritorio de todas las arquitecturas de macOS (MACOS_TARGETS),
## copiados a dist/. El frontend se compila una sola vez.
package-desktop-macos: build-frontend
	@set -e; \
	for target in $(MACOS_TARGETS); do \
		echo "==> [desktop macos] $$target"; \
		rustup target add $$target >/dev/null; \
		(cd $(DESKTOP_DIR) && $(TAURI_CMD) build --target $$target $(DESKTOP_BUILD_ARGS)); \
		$(MAKE) --no-print-directory package-desktop DESKTOP_TARGET=$$target; \
	done

## Copia los bundles de la version actual a dist/ con nombre estable:
## postgre-hub-desktop-<os>-<arch>.<ext> (y <fichero>.sig si existe).
package-desktop:
	@mkdir -p $(DIST_DIR)
	@set -e; found=0; v="$(FRONT_VERSION)"; b="$(DESKTOP_BUNDLE_DIR)"; \
	for f in "$$b"/dmg/*"$$v"*.dmg "$$b"/macos/*.app.tar.gz \
	         "$$b"/msi/*"$$v"*.msi "$$b"/nsis/*"$$v"*.exe \
	         "$$b"/appimage/*"$$v"*.AppImage "$$b"/deb/*"$$v"*.deb "$$b"/rpm/*"$$v"*.rpm; do \
		[ -f "$$f" ] || continue; \
		case "$$f" in \
			*.app.tar.gz) ext=app.tar.gz ;; \
			*)            ext="$${f##*.}" ;; \
		esac; \
		dest="$(DIST_DIR)/postgre-hub-desktop-$(DESKTOP_OS)-$(DESKTOP_ARCH).$$ext"; \
		cp "$$f" "$$dest"; echo "$$dest"; found=1; \
		if [ -f "$$f.sig" ]; then cp "$$f.sig" "$$dest.sig"; echo "$$dest.sig"; fi; \
	done; \
	if [ $$found -eq 0 ]; then \
		echo "ERROR: no desktop bundles for v$$v in $$b (run: make desktop-build)"; \
		exit 1; \
	fi
