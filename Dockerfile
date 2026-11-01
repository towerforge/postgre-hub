# ─── Stage 1: Build frontend ────────────────────────────────────────────────
FROM node:24-slim AS frontend

RUN npm install -g pnpm@latest

WORKDIR /app

# sync-version script needs backend/Cargo.toml two levels up from frontend/scripts/
COPY backend/Cargo.toml backend/Cargo.toml
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/
RUN cd frontend && pnpm install --frozen-lockfile

COPY frontend/ frontend/
RUN cd frontend && pnpm build

# ─── Stage 2: Build backend ─────────────────────────────────────────────────
# Builder y runtime fijados a la misma Debian (trixie): el binario enlaza la
# glibc del builder y no arrancaria en una runtime mas antigua (bookworm).
FROM rust:1-slim-trixie AS backend

# ssh2 compila OpenSSL vendorizado: necesita perl, make y pkg-config.
RUN apt-get update \
    && apt-get install -y --no-install-recommends perl make pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/ backend/
COPY --from=frontend /app/frontend/dist frontend/dist

RUN cargo build --manifest-path backend/Cargo.toml --release

# ─── Stage 3: Runtime ───────────────────────────────────────────────────────
FROM debian:trixie-slim

WORKDIR /app

COPY --from=backend /app/backend/target/release/backend ./postgre-hub
RUN chmod +x ./postgre-hub

EXPOSE 8080

ENTRYPOINT ["./postgre-hub", "--port", "8080"]
