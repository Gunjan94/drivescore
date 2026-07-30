"""test_engine.py — unit tests for the DriveScore risk-scoring + pricing engine.

engine.py is the source of truth: every number the app shows comes from these
pure functions. These tests lock the load-bearing behaviour:
  - risk normalization + clamping
  - DriveScore inversely tracks risk
  - safe drivers get a discount, risky drivers a surcharge (clamped)
  - quadrant assignment (the two failure modes the console surfaces)

Run:  pytest test_engine.py -v
"""
import engine


SAFE_TELEMATICS = {
    "night_pct": 0.05, "hard_brakes_per_100km": 1.0, "avg_speed_kmh": 60.0,
    "harsh_corners_per_100km": 0.5, "monthly_km": 400.0,
}
RISKY_TELEMATICS = {
    "night_pct": 0.45, "hard_brakes_per_100km": 9.0, "avg_speed_kmh": 115.0,
    "harsh_corners_per_100km": 6.0, "monthly_km": 2500.0,
}


def test_norm_clamps_to_unit_interval():
    assert engine.norm(60, 60, 115) == 0.0        # at safe breakpoint
    assert engine.norm(115, 60, 115) == 1.0       # at risky breakpoint
    assert engine.norm(40, 60, 115) == 0.0        # below safe -> clamped
    assert engine.norm(200, 60, 115) == 1.0       # above risky -> clamped


def test_norm_degenerate_breakpoints():
    assert engine.norm(5, 10, 10) == 0.0          # risky == safe -> 0, no div-by-zero


def test_safe_driver_scores_high():
    s = engine.score(SAFE_TELEMATICS)
    assert s["drivescore"] >= 95
    assert s["band"] == "safe"
    assert s["risk"] <= 0.05


def test_risky_driver_scores_low():
    s = engine.score(RISKY_TELEMATICS)
    assert s["drivescore"] <= 5
    assert s["band"] == "high-risk"
    assert s["risk"] >= 0.95


def test_drivescore_inverse_of_risk():
    safe = engine.score(SAFE_TELEMATICS)
    risky = engine.score(RISKY_TELEMATICS)
    assert safe["drivescore"] > risky["drivescore"]


def test_factor_contributions_sorted_desc():
    s = engine.score(RISKY_TELEMATICS)
    contribs = [f["contribution"] for f in s["factors"]]
    assert contribs == sorted(contribs, reverse=True)


def test_band_boundaries():
    assert engine.band_for(80) == "safe"
    assert engine.band_for(79) == "moderate"
    assert engine.band_for(60) == "moderate"
    assert engine.band_for(59) == "high-risk"


def test_safe_driver_gets_discount():
    p = engine.price(SAFE_TELEMATICS, {"vehicle_class": "sedan"})
    assert p["multiplier"] < 1.0, "safe driver (risk<0.5) should get a discount"
    assert p["dynamic_premium"] < p["base_rate"]


def test_risky_driver_gets_surcharge():
    p = engine.price(RISKY_TELEMATICS, {"vehicle_class": "sedan"})
    assert p["multiplier"] > 1.0, "risky driver (risk>0.5) should get a surcharge"


def test_multiplier_clamped():
    # Even a maximally risky driver's multiplier must not exceed MULT_MAX
    p = engine.price(RISKY_TELEMATICS, {"vehicle_class": "suv"})
    assert engine.MULT_MIN <= p["multiplier"] <= engine.MULT_MAX


def test_quadrant_overcharged_safe():
    assert engine.quadrant(80, -10) == "overcharged_safe"


def test_quadrant_underpriced_risky():
    assert engine.quadrant(50, 10) == "underpriced_risky"


def test_quadrant_fair():
    assert engine.quadrant(70, 0) == "fair"


def test_loss_ratio_after_holds_target():
    rows = [
        {"id": "d1", "static_premium": 120.0, "delta": -10, "drivescore": 80,
         "telematics": SAFE_TELEMATICS},
        {"id": "d2", "static_premium": 100.0, "delta": 10, "drivescore": 40,
         "telematics": RISKY_TELEMATICS},
    ]
    before, after = engine.loss_ratio_before_after(rows)
    assert after == engine.TARGET_LR
    # Adverse selection makes the static residual book riskier than target
    assert before >= after
