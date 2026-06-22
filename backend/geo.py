"""Synthetic Singapore trip + route generation for the fleet map.

The map shows *where and how the fleet drives*. Each trip is a real polyline of
GPS waypoints between two Singapore hubs, with safety events (hard brake, harsh
corner, speeding, night) geo-located along the route. Everything is deterministic
from the driver id + telematics — a high-night-driving profile produces night
trips with night flags, a heavy hard-braker produces more hard-brake markers, and
the per-trip score is anti-correlated with event density. Nothing is random at
request time, so the map renders identically every run.

This is the geometric/visualisation layer; the risk + pricing *math* still lives
in engine.py (the source of truth). Event density here is driven by the same
telematics the engine scores, so the map and the score always tell one story.
"""
from __future__ import annotations

from typing import TypedDict

# ---------------------------------------------------------------------------
# Singapore hubs (approx lat/lng) — depots, transport nodes, demand centres a
# taxi / last-mile fleet actually services.
# ---------------------------------------------------------------------------
HUBS: dict[str, tuple[float, float]] = {
    "Tampines": (1.3496, 103.9568),
    "Raffles Place": (1.2839, 103.8515),
    "Changi Airport": (1.3644, 103.9915),
    "Jurong East": (1.3329, 103.7436),
    "Woodlands": (1.4382, 103.7890),
    "Marina Bay": (1.2820, 103.8585),
    "Bishan": (1.3526, 103.8352),
    "HarbourFront": (1.2640, 103.8220),
    "Orchard": (1.3040, 103.8318),
    "Punggol": (1.4043, 103.9020),
    "Tuas": (1.2940, 103.6360),
    "Ang Mo Kio": (1.3691, 103.8454),
    "Clementi": (1.3151, 103.7651),
    "Serangoon": (1.3554, 103.8679),
    "Bedok": (1.3236, 103.9273),
    "Sentosa": (1.2494, 103.8303),
}
HUB_NAMES = list(HUBS.keys())

# Per-driver HOME base. Drivers take their assigned vehicle home and park near
# their place — there is no single shared depot. Each driver's base is a point in
# the residential town they live in (deterministic per driver), and every shift
# starts from home and ends with a drive back home (the return leg is itself a
# fleet ride). Homes are spread across Singapore's HDB towns.
HOME_TOWNS: dict[str, tuple[float, float]] = {
    "Tampines": (1.3496, 103.9445),
    "Bedok": (1.3240, 103.9300),
    "Woodlands": (1.4380, 103.7890),
    "Jurong West": (1.3400, 103.7090),
    "Yishun": (1.4290, 103.8350),
    "Ang Mo Kio": (1.3700, 103.8450),
    "Punggol": (1.4050, 103.9020),
    "Sengkang": (1.3910, 103.8950),
    "Hougang": (1.3710, 103.8920),
    "Clementi": (1.3150, 103.7650),
    "Bukit Batok": (1.3490, 103.7490),
    "Pasir Ris": (1.3720, 103.9490),
    "Choa Chu Kang": (1.3850, 103.7440),
    "Toa Payoh": (1.3340, 103.8560),
    "Bishan": (1.3510, 103.8480),
    "Serangoon": (1.3550, 103.8700),
}
HOME_TOWN_NAMES = list(HOME_TOWNS.keys())

# Map default focus (central Singapore).
CENTER = (1.3521, 103.8198)


def driver_base(driver_id: str) -> tuple[str, tuple[float, float], str]:
    """The driver's home base: ("Home · <town>", (lat, lng), town).

    Stable per driver id. A small deterministic offset places each driver's home
    at a distinct point within their town (so two drivers in Tampines don't sit on
    the exact same pixel).
    """
    h = _hash(driver_id + "home")
    town = HOME_TOWN_NAMES[h % len(HOME_TOWN_NAMES)]
    tlat, tlng = HOME_TOWNS[town]
    jlat = (((h >> 8) % 1000) / 1000 - 0.5) * 0.012
    jlng = (((h >> 18) % 1000) / 1000 - 0.5) * 0.012
    return f"Home · {town}", (round(tlat + jlat, 5), round(tlng + jlng, 5)), town


def base_of(driver: dict) -> dict:
    """One driver's home base, for the driver-detail map."""
    name, coord, _town = driver_base(driver["id"])
    return {"name": name, "lat": coord[0], "lng": coord[1]}


def bases_for(drivers: list[dict]) -> list[dict]:
    """Home bases for a set of drivers (one each), for the fleet map."""
    return [base_of(d) for d in drivers]


class TripEvent(TypedDict):
    type: str   # hard_brake | harsh_corner | speeding | night
    label: str
    lat: float
    lng: float


class Trip(TypedDict):
    id: str
    driver_id: str
    driver_name: str
    day: str
    date: str
    time: str
    from_: str
    to: str
    km: float
    score: int
    night: bool
    route: list[list[float]]   # [[lat, lng], ...]
    events: list[TripEvent]


DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
DATES = ["13 Jun", "12 Jun", "11 Jun", "10 Jun", "9 Jun", "8 Jun", "7 Jun", "6 Jun"]
EVENT_LABEL = {
    "hard_brake": "Hard brake",
    "harsh_corner": "Harsh corner",
    "speeding": "Speeding",
    "night": "Night driving",
}


def _hash(s: str) -> int:
    """FNV-1a 32-bit — stable across runs/machines (matches the frontend hash)."""
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def _mulberry32(seed: int):
    """Deterministic PRNG identical in spirit to the frontend's seeded()."""
    a = seed & 0xFFFFFFFF

    def rnd() -> float:
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = (t ^ (t >> 15)) * (t | 1) & 0xFFFFFFFF
        t ^= (t + ((t ^ (t >> 7)) * (t | 61) & 0xFFFFFFFF)) & 0xFFFFFFFF
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

    return rnd


def _route(a: tuple[float, float], b: tuple[float, float], rnd, segments: int = 8) -> list[list[float]]:
    """Build a curved polyline from a to b with deterministic road-like jitter.

    Linear interpolation + a perpendicular bow (so routes don't look like straight
    rulers) + small per-point noise. Coordinates stay within a realistic envelope.
    """
    (lat1, lng1), (lat2, lng2) = a, b
    # Perpendicular unit-ish vector to the a->b direction, for the bow.
    dlat, dlng = lat2 - lat1, lng2 - lng1
    plat, plng = -dlng, dlat
    bow = (rnd() - 0.5) * 0.5  # signed curve amount
    pts: list[list[float]] = []
    for i in range(segments + 1):
        t = i / segments
        # Parabolic bow weight (0 at ends, max in middle).
        w = bow * (t * (1 - t)) * 4
        jit_lat = (rnd() - 0.5) * 0.004
        jit_lng = (rnd() - 0.5) * 0.004
        lat = lat1 + dlat * t + plat * w + jit_lat
        lng = lng1 + dlng * t + plng * w + jit_lng
        pts.append([round(lat, 5), round(lng, 5)])
    return pts


def _point_on(route: list[list[float]], frac: float) -> tuple[float, float]:
    """Interpolate a point at fractional distance along a polyline (by index)."""
    if not route:
        return CENTER
    n = len(route) - 1
    x = max(0.0, min(1.0, frac)) * n
    i = int(x)
    if i >= n:
        return tuple(route[-1])  # type: ignore[return-value]
    f = x - i
    a, b = route[i], route[i + 1]
    return (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)


def driver_trips(driver: dict, count: int = 6) -> list[Trip]:
    """Recent trips for one driver, with routes + geo-located events.

    Event probabilities scale with the driver's own telematics rates so the map
    visually agrees with their DriveScore.
    """
    tel = driver.get("telematics", {})
    night_pct = float(tel.get("night_pct", 0.1))
    hb = float(tel.get("hard_brakes_per_100km", 1.0))
    hc = float(tel.get("harsh_corners_per_100km", 0.5))
    avg_speed = float(tel.get("avg_speed_kmh", 70))
    did = driver["id"]
    seed = _hash(did + "geo")
    rnd = _mulberry32(seed)
    base_name, base_coord, home_town = driver_base(did)

    trips: list[Trip] = []
    for i in range(count):
        km = round(8 + rnd() * 32, 1)
        night = rnd() < night_pct
        # Home is always one endpoint: outbound legs run home -> delivery point,
        # return legs run delivery point -> home. The shift ends with a drive home.
        dest_i = int(rnd() * len(HUB_NAMES)) % len(HUB_NAMES)
        if HUB_NAMES[dest_i] == home_town:
            dest_i = (dest_i + 1) % len(HUB_NAMES)
        dest_name = HUB_NAMES[dest_i]
        dest_coord = HUBS[dest_name]
        outbound = i % 2 == 0
        if outbound:
            from_name, from_coord, to_name, to_coord = base_name, base_coord, dest_name, dest_coord
        else:
            from_name, from_coord, to_name, to_coord = dest_name, dest_coord, base_name, base_coord
        route = _route(from_coord, to_coord, rnd)

        events: list[TripEvent] = []

        def add_event(etype: str):
            frac = 0.2 + rnd() * 0.6
            lat, lng = _point_on(route, frac)
            events.append(
                {"type": etype, "label": EVENT_LABEL[etype], "lat": round(lat, 5), "lng": round(lng, 5)}
            )

        if rnd() < (hb / 100) * km * 0.9:
            add_event("hard_brake")
        if rnd() < (hc / 100) * km * 0.9:
            add_event("harsh_corner")
        if avg_speed > 95 and rnd() < 0.5:
            add_event("speeding")
        if night:
            add_event("night")

        score = max(52, min(99, 96 - len(events) * 9 - (4 if night else 0) - round(rnd() * 4)))

        hour = (22 + int(rnd() * 4)) if night else (7 + int(rnd() * 12))
        mins = int(rnd() * 60)
        time = f"{hour % 24:02d}:{mins:02d}"

        trips.append(
            {
                "id": f"{did}-T{i}",
                "driver_id": did,
                "driver_name": driver.get("name", did),
                "day": DAYS[i % len(DAYS)],
                "date": DATES[i % len(DATES)],
                "time": time,
                "from_": from_name,
                "to": to_name,
                "km": km,
                "score": score,
                "night": night,
                "route": route,
                "events": events,
            }
        )
    return trips


def fleet_trips(drivers: list[dict], sample: int = 26, per_driver: int = 2) -> list[Trip]:
    """A legible cross-section of the fleet's recent rides for the fleet map.

    Always includes the three hero drivers, then a deterministic spread across the
    rest of the book (every k-th driver) so the map shows a representative mix of
    safe and risky routes without rendering all ~600 vehicles at once.
    """
    if not drivers:
        return []
    heroes = [d for d in drivers if d["id"] in ("D0001", "D0002", "D0003")]
    rest = [d for d in drivers if d["id"] not in ("D0001", "D0002", "D0003")]
    need = max(0, sample - len(heroes))
    step = max(1, len(rest) // need) if need else 1
    picked = heroes + rest[::step][:need]

    out: list[Trip] = []
    for d in picked:
        out.extend(driver_trips(d, per_driver))
    return out
