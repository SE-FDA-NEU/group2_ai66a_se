#!/bin/sh
set -e

echo "=== [1/3] Checking database connection... ==="
python wait_db.py

echo "=== [2/3] Applying database migrations (Alembic)... ==="
alembic upgrade head

echo "=== [3/3] Starting FastAPI... ==="
if [ "$#" -gt 0 ]; then
    exec "$@"
fi
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
