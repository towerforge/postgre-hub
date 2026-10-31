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
        install-frontend build-frontend build-backend build run release \
        package package-one \
        package-all package-all-linux package-all-macos package-all-windows \
        _package-linux-binaries _package-macos-binaries _package-windows-binaries \
        checksums rust-targets clean-target dist-clean

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
	@echo "  Packaging"
	@echo "    make package                  Build and package for the host (or CARGO_TARGET)"
	@echo "    make package-all              Package all Linux + macOS + Windows targets"
	@echo "    make package-all-linux        Package all Linux targets (cross + Docker)"
	@echo "    make package-all-macos        Package all macOS targets (rustup)"
	@echo "    make package-all-windows      Package all Windows targets (cross + Docker)"
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
	@echo "    MACOS_TARGETS=\"...\"         Space-separated triples for package-all-macos"
	@echo "    WINDOWS_TARGETS=\"...\"       Space-separated triples for package-all-windows"
	@echo "    ENABLE_LATEST_ASSET=1        Also write an unversioned copy of each artifact"
	@echo "    ARTIFACT_BASENAME=<name>     Artifact filename prefix (default: postgre-hub)"

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

release: build

run:
	./$(BACKEND_BIN) --port $(PORT)

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

checksums:
	@if [ ! -d "$(DIST_DIR)" ] || [ -z "$$(ls $(DIST_DIR)/*.tar.gz $(DIST_DIR)/*.zip 2>/dev/null)" ]; then \
		echo "ERROR: no .tar.gz or .zip files found in $(DIST_DIR)"; \
		exit 1; \
	fi
	cd "$(DIST_DIR)" && sha256sum $$(ls *.tar.gz *.zip 2>/dev/null) > checksums.txt
	@echo "$(DIST_DIR)/checksums.txt"

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
