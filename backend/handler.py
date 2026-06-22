"""Local FastAPI server exposing the four DriveScore endpoints.

Handlers are written as plain functions (score / price / explain / portfolio)
so they can later be lifted into AWS Lambda. For local dev they are served via
uvicorn. CORS is wide open — this is a demo, not production.

    uvicorn handler:app --reload --port 8000
"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

import engine
import explain as explain_mod
import geo
from data import get_driver, load_drivers

app = FastAPI(title="DriveScore API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- plain handler functions (Lambda-portable) ----------------------------
def handle_score(body: dict) -> dict:
    telematics = body.get("telematics", {})
    return engine.score(telematics)


def handle_price(body: dict) -> dict:
    telematics = body.get("telematics", {})
    driver_meta = body.get("driver_meta", {})
    return engine.price(telematics, driver_meta)


def handle_portfolio(_body: dict | None = None) -> dict:
    rows = [engine.score_driver(d) for d in load_drivers()]
    summary = engine.portfolio_summary(rows)
    return {"drivers": rows, "summary": summary}


def handle_fleet_summary(_body: dict | None = None) -> dict:
    drivers = load_drivers()
    rows = [engine.score_driver(d) for d in drivers]
    return engine.fleet_summary(rows, drivers)


def handle_fleet_trips(limit: int = 52) -> dict:
    """Recent rides across a representative cross-section of the fleet."""
    drivers = load_drivers()
    per_driver = 2
    sample = max(1, limit // per_driver)
    trips = geo.fleet_trips(drivers, sample=sample, per_driver=per_driver)
    # One home base per driver actually shown on the map.
    by_id = {d["id"]: d for d in drivers}
    shown_ids = list(dict.fromkeys(t["driver_id"] for t in trips))
    bases = [geo.base_of(by_id[i]) for i in shown_ids if i in by_id]
    return {"trips": trips, "center": list(geo.CENTER), "count": len(trips), "bases": bases}


def handle_driver_trips(driver_id: str, count: int = 6) -> dict:
    d = get_driver(driver_id)
    if d is None:
        return {"error": "not_found", "id": driver_id, "trips": []}
    return {"trips": geo.driver_trips(d, count), "center": list(geo.CENTER), "bases": [geo.base_of(d)]}


# ---- HTTP routes -----------------------------------------------------------
@app.get("/health")
def health() -> dict:
    return {"status": "ok", "explain_source": explain_mod.source_label()}


@app.post("/score")
async def score(request: Request) -> dict:
    return handle_score(await request.json())


@app.post("/price")
async def price(request: Request) -> dict:
    return handle_price(await request.json())


@app.get("/portfolio")
def portfolio_get() -> dict:
    return handle_portfolio()


@app.post("/portfolio")
def portfolio_post() -> dict:
    return handle_portfolio()


@app.get("/driver/{driver_id}")
def driver(driver_id: str) -> dict:
    d = get_driver(driver_id)
    if d is None:
        return {"error": "not_found", "id": driver_id}
    return engine.score_driver(d)


@app.get("/fleet/summary")
def fleet_summary_get() -> dict:
    return handle_fleet_summary()


@app.get("/fleet/trips")
def fleet_trips_get(limit: int = 52) -> dict:
    return handle_fleet_trips(limit)


@app.get("/driver/{driver_id}/trips")
def driver_trips_get(driver_id: str, count: int = 6) -> dict:
    return handle_driver_trips(driver_id, count)


@app.post("/explain")
async def explain(request: Request) -> StreamingResponse:
    """Streamed natural-language explanation (SSE).

    Emits `data: {json}` lines; the final line is `data: [DONE]`. The browser
    reads tokens as they arrive and renders them live.
    """
    payload = await request.json()

    def event_stream():
        import json as _json

        for chunk in explain_mod.stream_explanation(payload):
            yield f"data: {_json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
