#!/usr/bin/env bash
# Run the full DriveScore prototype locally: backend (FastAPI/uvicorn) + Vite dev.
# Works with ZERO AWS credentials — /explain falls back to grounded canned text.
# Set USE_BEDROCK=1 (with valid AWS creds + Bedrock model access) to use real Claude.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- backend ---------------------------------------------------------------
cd "$ROOT/backend"
if [ ! -d .venv ]; then
  echo "Creating backend venv + installing deps…"
  python3 -m venv .venv
  ./.venv/bin/pip install -q -r requirements.txt
fi
echo "Starting backend on http://localhost:8000 …"
./.venv/bin/python -m uvicorn handler:app --port 8000 &
BACK_PID=$!

cleanup() { kill "$BACK_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

# --- frontend --------------------------------------------------------------
cd "$ROOT/frontend"
if [ ! -d node_modules ]; then
  echo "Installing frontend deps…"
  npm install
fi
echo "Starting Vite dev server on http://localhost:5173 …"
npm run dev
