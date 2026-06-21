"""AWS Lambda entry point — wraps the FastAPI app with Mangum (ASGI adapter).

Used only in the deployed Lambda (behind a Function URL). Local dev still runs
uvicorn directly (see scripts/dev.sh). Mangum buffers responses, so the SSE
endpoints return their full body at once on Lambda rather than token-by-token —
content is identical; the live "typing" effect is a local-only nicety.
"""
from mangum import Mangum

from handler import app

handler = Mangum(app, lifespan="off")
