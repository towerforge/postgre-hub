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
FROM rust:1-slim AS backend

WORKDIR /app

COPY backend/ backend/
COPY --from=frontend /app/frontend/dist frontend/dist

RUN cargo build --manifest-path backend/Cargo.toml --release

# ─── Stage 3: Runtime ───────────────────────────────────────────────────────
FROM debian:bookworm-slim

WORKDIR /app

COPY --from=backend /app/backend/target/release/backend ./postgre-hub
RUN chmod +x ./postgre-hub

EXPOSE 8080

ENTRYPOINT ["./postgre-hub", "--port", "8080"]
