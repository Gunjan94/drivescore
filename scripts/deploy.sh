#!/usr/bin/env bash
# One-command cloud deploy (DEFERRED for this prototype — local run is the focus).
# This script is a stub describing the intended steps; see infra/ for CDK stubs.
set -euo pipefail
echo "Cloud deploy is deferred for this prototype. Run locally with: ./scripts/dev.sh"
echo
echo "Intended deploy (once infra/ is fleshed out):"
echo "  cd frontend && npm install && npm run build"
echo "  cd ../infra && pip install -r requirements.txt && cdk bootstrap && cdk deploy"
exit 0
