"""Unit tests for pure helpers in the Postgres ingest/export scripts.

These need no database — they exercise parsing and the native-vegetation
pressure/regeneration math used to build rgint_indicators.csv.
"""
import ingest
from generate_rgint_indicators import native_total_by_year, pressure_metrics


def test_num_parses_and_tolerates_nan():
    assert ingest._num("12.5") == 12.5
    assert ingest._num(3) == 3.0
    for bad in ("", "NaN", "nan", None):
        assert ingest._num(bad) is None


def test_int_truncates_and_tolerates_nan():
    assert ingest._int("5100201.0") == 5100201
    assert ingest._int(2017.0) == 2017
    assert ingest._int("") is None


def test_native_total_sums_only_native_classes_per_year():
    series = {
        "11 - Veg. prim. florestal": {"2008": 100.0, "2009": 90.0},
        "14 - Veg. sec. não-florestal": {"2008": 10.0, "2009": 20.0},
        "2 - Soja": {"2008": 9999.0, "2009": 9999.0},  # ignored
    }
    totals = native_total_by_year(series)
    assert totals == {2008: 110.0, 2009: 110.0}


def test_pressure_metrics_splits_gross_loss_and_gain():
    # native total: 100 -> 80 (loss 20) -> 130 (gain 50); balance = +30
    series = {"11 - Veg. prim. florestal": {"2008": 100.0, "2009": 80.0, "2010": 130.0}}
    pressao, regen, balanco = pressure_metrics(series)
    assert pressao == 20.0
    assert regen == 50.0
    assert balanco == 30.0


def test_pressure_metrics_handles_single_year():
    assert pressure_metrics({"11 - Veg. prim. florestal": {"2008": 100.0}}) == (0.0, 0.0, 0.0)
