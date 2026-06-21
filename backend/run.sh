#!/bin/bash
# Lambda Web Adapter entrypoint: starts the FastAPI app under uvicorn.
# LWA (layer, via AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap) proxies the Lambda
# Function URL — including RESPONSE_STREAM for the /explain SSE — to this server.
cd "${LAMBDA_TASK_ROOT:-.}"
exec python -m uvicorn handler:app --host 0.0.0.0 --port "${PORT:-8000}"
