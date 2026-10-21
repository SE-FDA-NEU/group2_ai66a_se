#!/bin/sh
set -e

echo "=== [1/3] Kiem tra ket noi Database... ==="
python wait_db.py

echo "=== [2/3] Tu dong cap nhat cau truc Database (Alembic Migration)... ==="
alembic upgrade head

echo "=== [3/3] Khoi chay ung dung FastAPI... ==="
exec "$@"
