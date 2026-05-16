SHELL := /bin/bash

# ---------------------------------------------------------------------------
# Project
# ---------------------------------------------------------------------------

APP_NAME     ?= postgre-hub
BACKEND_DIR  := backend
FRONTEND_DIR := frontend
PORT         ?= 8080
LOGS_DIR     := $(CURDIR)/.logs

RESET := \033[0m
BOLD  := \033[1m
DIM   := \033[2m
GREEN := \033[0;32m

VERSION     ?= $(shell sed -n 's/^version = "\(.*\)"/\1/p' $(BACKEND_DIR)/Cargo.toml | head -n1)
VERSION_TAG ?= v$(VERSION)

HOST_OS   := $(shell uname -s | tr '[:upper:]' '[:lower:]')
HOST_ARCH := $(shell uname -m)

# ---------------------------------------------------------------------------
# Build target — set CARGO_TARGET to a Rust triple to cross-compile
# ---------------------------------------------------------------------------

CARGO_TARGET ?=

BACKEND_BIN := $(if $(CARGO_TARGET),\
	$(BACKEND_DIR)/target/$(CARGO_TARGET)/release/backend$(if $(findstring windows,$(CARGO_TARGET)),.exe,),\
	$(BACKEND_DIR)/target/release/backend)

PLATFORM ?= $(if $(CARGO_TARGET),\
	$(if $(findstring apple-darwin,$(CARGO_TARGET)),macos,\
	$(if $(findstring windows,$(CARGO_TARGET)),windows,linux)),\
	$(if $(filter darwin,$(HOST_OS)),macos,linux))

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
	aarch64-pc-windows-gnullvm \
	i686-pc-windows-gnu

# ---------------------------------------------------------------------------
# Phony targets
# ---------------------------------------------------------------------------

.PHONY: help version \
        install dev start stop status logs \
        dev-backend watch-backend dev-frontend \
        install-frontend build-frontend build-backend build run release \
        package package-one \
        package-all package-all-linux package-all-macos package-all-windows \
        _package-linux-binaries _package-macos-binaries _package-windows-binaries \
        checksums rust-targets clean dist-clean

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------

help:
	@echo "Postgres Hub — available targets"
	@echo ""
	@echo "  Development"
	@echo "    make install                  Install all dependencies (skips if up to date)"
	@echo "    make dev / make start         Install + start backend & frontend"
	@echo "    make stop                     Stop all running dev services"
	@echo "    make status                   Show which services are running"
	@echo "    make logs                     Tail live output (interactive selection)"
	@echo "    make dev-backend              Run backend only (foreground)"
	@echo "    make watch-backend            Run backend with cargo-watch (auto-reload)"
	@echo "    make dev-frontend             Run frontend only (foreground)"
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
	@echo "    make clean                    Remove backend build artifacts"
	@echo "    make dist-clean               Remove the dist directory"
	@echo ""
	@echo "  Variables"
	@echo "    PORT=<port>                   Backend port at runtime (default: 8080)"
	@echo "    VERSION=<x.y.z>              Override the version from Cargo.toml"
	@echo "    DIST_DIR=<dir>               Output directory for artifacts (default: dist)"
	@echo "    CARGO_TARGET=<triple>        Rust target triple (e.g. aarch64-apple-darwin)"
	@echo "    LINUX_TARGETS=\"...\"         Space-separated triples for package-all-linux"
	@echo "    MACOS_TARGETS=\"...\"         Space-separated triples for package-all-macos"
	@echo "    WINDOWS_TARGETS=\"...\"       Space-separated triples for package-all-windows"
	@echo "    ENABLE_LATEST_ASSET=1        Also write an unversioned copy of each artifact"
	@echo "    ARTIFACT_BASENAME=<name>     Artifact filename prefix (default: postgre-hub)"

# ---------------------------------------------------------------------------
# Dev directory
# ---------------------------------------------------------------------------

$(LOGS_DIR):
	@mkdir -p $(LOGS_DIR)

# ---------------------------------------------------------------------------
# Development
# ---------------------------------------------------------------------------

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

install: $(LOGS_DIR)
	@echo ""
	@printf "  $(BOLD)Instalando dependencias$(RESET)\n"
	@echo ""
	@if [ ! -d $(FRONTEND_DIR)/node_modules ] || [ $(FRONTEND_DIR)/pnpm-lock.yaml -nt $(FRONTEND_DIR)/node_modules ]; then \
		printf "  \033[1;30;48;5;35m front \033[0m  $(DIM)instalando dependencias...$(RESET)\n\n"; \
		cd $(FRONTEND_DIR) && pnpm install --frozen-lockfile --silent; \
		echo ""; \
	else \
		printf "  \033[1;30;48;5;35m front \033[0m  $(DIM)ok$(RESET)\n"; \
	fi
	@if ! command -v cargo > /dev/null 2>&1; then \
		printf "  \033[1;37;48;5;208m back  \033[0m  $(DIM)cargo no encontrado — instala Rust desde https://rustup.rs$(RESET)\n"; \
	else \
		printf "  \033[1;37;48;5;208m back  \033[0m  $(DIM)ok (cargo gestiona dependencias al compilar)$(RESET)\n"; \
	fi
	@echo ""

dev start: $(LOGS_DIR) install
	@echo ""
	@printf "  \033[1;37;48;5;208m back  \033[0m  $(DIM)http://localhost:$(PORT)$(RESET)\n"
	@( cargo run --manifest-path $(BACKEND_DIR)/Cargo.toml -- --dev --port $(PORT) \
		> $(LOGS_DIR)/backend.log 2>&1 ) & echo $$! > $(LOGS_DIR)/backend.pid
	@printf "  \033[1;30;48;5;35m front \033[0m  $(DIM)http://localhost:5173$(RESET)\n"
	@( cd $(FRONTEND_DIR) && pnpm dev > $(LOGS_DIR)/frontend.log 2>&1 ) & echo $$! > $(LOGS_DIR)/frontend.pid
	@echo ""
	@printf "  $(DIM)make logs · make stop$(RESET)\n"
	@echo ""

stop:
	@echo ""
	@printf "  $(BOLD)Parando servicios$(RESET)\n"
	@echo ""
	@_stop() { \
		badge=$$1; name=$$2; pid_file=$(LOGS_DIR)/$$2.pid; \
		if [ -f "$$pid_file" ]; then \
			pid=$$(cat "$$pid_file"); \
			if kill -0 "$$pid" 2>/dev/null; then \
				kill "$$pid" 2>/dev/null; \
				printf "  $$badge  $(GREEN)parado$(RESET)\n"; \
			else \
				printf "  $$badge  $(DIM)inactivo$(RESET)\n"; \
			fi; \
			rm -f "$$pid_file"; \
		else \
			printf "  $$badge  $(DIM)inactivo$(RESET)\n"; \
		fi \
	}; \
	_stop "\033[1;37;48;5;208m back  \033[0m" backend; \
	_stop "\033[1;30;48;5;35m front \033[0m" frontend
	@echo ""

status:
	@echo ""
	@printf "  $(BOLD)Estado de servicios$(RESET)\n"
	@echo ""
	@_status() { \
		badge=$$1; port=$$2; \
		pid=$$(lsof -ti tcp:$$port 2>/dev/null | head -1); \
		if [ -n "$$pid" ]; then \
			printf "  $$badge  $(GREEN)activo$(RESET)   $(DIM)PID $$pid  :$$port$(RESET)\n"; \
		else \
			printf "  $$badge  $(DIM)inactivo$(RESET)\n"; \
		fi \
	}; \
	_status "\033[1;37;48;5;208m back  \033[0m" $(PORT); \
	_status "\033[1;30;48;5;35m front \033[0m" 5173
	@echo ""

logs:
	@if [ ! -f $(LOGS_DIR)/backend.log ] && [ ! -f $(LOGS_DIR)/frontend.log ]; then \
		echo "  No hay logs disponibles. Ejecuta 'make dev' primero."; exit 1; \
	fi
	@echo ""
	@printf "  $(BOLD)Selecciona servicio$(RESET)  $(DIM)Ctrl+C para salir$(RESET)\n"
	@echo ""
	@printf "  \033[1;37;48;5;208m 1  back  \033[0m\n"
	@printf "  \033[1;30;48;5;35m 2  front \033[0m\n"
	@printf "  $(DIM) ↵  todos  todos los servicios activos$(RESET)\n"
	@echo ""
	@printf "  > "; read choice; echo ""; \
	_tail() { \
		if [ ! -f "$$1" ]; then \
			printf "  $$2  $(DIM)sin log ($$1)$(RESET)\n"; \
			return; \
		fi; \
		tail -n 20 -f "$$1" 2>/dev/null | awk -v b="$$2" '{"date +%H:%M:%S" | getline t; close("date +%H:%M:%S"); print "  " b "  \033[2m[" t "]\033[0m  " $$0; fflush()}'; \
	}; \
	trap 'kill 0' INT; \
	case "$$choice" in \
		1) _tail $(LOGS_DIR)/backend.log  "\033[1;37;48;5;208m back  \033[0m" & wait ;; \
		2) _tail $(LOGS_DIR)/frontend.log "\033[1;30;48;5;35m front \033[0m" & wait ;; \
		*) _tail $(LOGS_DIR)/backend.log  "\033[1;37;48;5;208m back  \033[0m" & \
		   _tail $(LOGS_DIR)/frontend.log "\033[1;30;48;5;35m front \033[0m" & wait ;; \
	esac

dev-backend:
	cargo run --manifest-path $(BACKEND_DIR)/Cargo.toml -- --dev --port $(PORT)

watch-backend:
	cargo watch --manifest-path $(BACKEND_DIR)/Cargo.toml -x "run -- --dev --port $(PORT)"

dev-frontend:
	cd $(FRONTEND_DIR) && pnpm dev

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

clean:
	cargo clean --manifest-path $(BACKEND_DIR)/Cargo.toml

dist-clean:
	@if [ -z "$(DIST_DIR)" ] || [ "$(DIST_DIR)" = "/" ] || [ "$(DIST_DIR)" = "." ]; then \
		echo "ERROR: refusing to remove DIST_DIR='$(DIST_DIR)'"; \
		exit 1; \
	fi
	rm -rf "$(DIST_DIR)"
