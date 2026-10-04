# Setup Guide

This guide walks you through setting up Trakora on a clean machine. Estimated time: **5–10 minutes**.

## Prerequisites

| Tool | Minimum Version | Check command |
|------|----------------|---------------|
| [Git](https://git-scm.com/) | 2.30+ | `git --version` |
| [Docker](https://docs.docker.com/get-docker/) | 24.0+ | `docker --version` |
| [Docker Compose](https://docs.docker.com/compose/) | 2.20+ (V2, bundled with Docker Desktop) | `docker compose version` |

> **Note:** On Windows/macOS, install [Docker Desktop](https://www.docker.com/products/docker-desktop/) which includes Docker Compose V2. On Linux, install Docker Engine and the Compose plugin.

No local Python, Node.js, PostgreSQL, or Redis installation is needed — everything runs inside Docker containers.

## Step 1 — Clone the repository

```bash
git clone https://github.com/SE-FDA-NEU/group2_ai66a_se.git
cd group2_ai66a_se
```

## Step 2 — Create the environment file

```bash
cp .env.example .env
```

Open `.env` in a text editor and fill in the required values:

| Variable | Description | Example value |
|----------|-------------|---------------|
| `ADMIN_EMAIL` | Gmail address for the admin account (also used as SMTP sender for OTP emails) | `your.email@gmail.com` |
| `ADMIN_PASSWORD` | Gmail [App Password](https://myaccount.google.com/apppasswords) (16-character, not your login password) | `abcd efgh ijkl mnop` |
| `ADMIN_USERNAME` | Admin display name | `Admin` |
| `POSTGRES_PASSWORD` | Password for the PostgreSQL database | `your_db_password` |
| `POSTGRES_DB` | Database name | `trakora` |
| `REDIS_PASSWORD` | Password for Redis | `your_redis_password` |
| `SECRET_KEY` | Random string for JWT signing (use `openssl rand -hex 32`) | `a1b2c3d4...` |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID (from Google Cloud Console) | `123456789-xxx.apps.googleusercontent.com` |
| `RAPIDAPI_KEY` | *(Optional)* RapidAPI key for Amazon product lookup. Leave empty if not testing product tracking. | `your_rapidapi_key` |

All other variables have sensible defaults and can be left as-is.

## Step 3 — Build and start all services

```bash
docker compose up -d --build
```

This builds the backend and frontend Docker images, then starts all 4 services:
- **db-postgre** (PostgreSQL 15) on port `5432`
- **redis** (Redis 7) on port `6379`
- **backend** (FastAPI + Uvicorn) on port `8000`
- **frontend** (React + Vite) on port `3000`

Wait approximately 30–60 seconds for all containers to become healthy.

## Step 4 — Verify the setup

```bash
# Check all containers are running and healthy
docker compose ps
```

Expected output: all 4 services should show `Up` status.

Then verify each component:

```bash
# Backend API root
curl http://localhost:8000/
# Expected: {"success": "Welcome to Automated E-commerce Price Tracker API!"}

# Frontend
# Open http://localhost:3000 in your browser
# Expected: Trakora landing page
```

## Database Setup

The database is **automatically configured** — no manual steps required:

1. **Schema creation**: The backend's `entrypoint.sh` runs `alembic upgrade head` on every container start, applying all 5 migration files to create the `users`, `products`, `price_history`, and `tracked_products` tables.
2. **Admin seeding**: On startup, the FastAPI `lifespan` event calls `create_admin_user()`, which creates (or updates) a developer/admin account using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.

After startup, the database contains:
- 4 tables with all indexes and constraints
- 1 admin user (`is_developer = true`)

## Running Tests

```bash
# Run all tests (unit + integration)
docker compose exec backend python -m pytest tests -v -s

# Unit tests only
docker compose exec backend python -m pytest tests/unit -v -s

# Integration tests only
docker compose exec backend python -m pytest tests/integration -v -s
```

Current test suite: **22 test cases** (16 unit + 6 integration), covering auth flows, OTP verification, watchlist CRUD, Amazon link parsing, RapidAPI client, and price label computation.

## Stopping and Cleaning Up

```bash
# Stop all services (preserves data volumes)
docker compose down

# Stop and remove all data (database, Redis, etc.)
docker compose down -v
```

## Troubleshooting

### Problem 1: Port already in use

```
Error: Bind for 0.0.0.0:5432 failed: port is already allocated
```

**Cause:** Another service (local PostgreSQL, another Docker project) is using the same port.

**Fix:** Edit `.env` and change the conflicting port:
```env
HOST_PORT_DB=15432      # Change from 5432 to 15432
HOST_PORT_REDIS=16379   # Change from 6379 to 16379
HOST_PORT_BACKEND=18000 # Change from 8000 to 18000
```
Then restart: `docker compose down && docker compose up -d --build`

### Problem 2: Backend fails to start — "Connection refused" to database

```
sqlalchemy.exc.OperationalError: connection to server at "db-postgre" ... Connection refused
```

**Cause:** The backend started before PostgreSQL finished initializing.

**Fix:** Docker Compose healthchecks should handle this automatically. If it persists:
```bash
docker compose down
docker compose up -d --build
# Wait 30 seconds, then check logs:
docker compose logs backend
```

### Problem 3: "Module not found" or import errors in backend

**Cause:** The Python dependencies weren't installed correctly in the container.

**Fix:** Rebuild the backend image from scratch:
```bash
docker compose down
docker compose build --no-cache backend
docker compose up -d
```

### Problem 4: Frontend shows blank page or "Cannot GET /"

**Cause:** `node_modules` is stale or the frontend container didn't finish `npm install`.

**Fix:**
```bash
docker compose restart frontend
# Wait 30 seconds for npm install to complete, then check:
docker compose logs frontend
```

## Cross-machine Test

| Tested by | Date | Machine | Time to complete |
|-----------|------|---------|------------------|
| *(To be filled after cross-testing)* | | | |

> **Instructions for tester:** Follow Steps 1–4 on a machine that has never run this project. Record any issues encountered and the total time from `git clone` to seeing the landing page.
