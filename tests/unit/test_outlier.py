"""
Unit tests for outlier detection logic in 04_outlier_detection.py.
These tests run against pure functions and require no file I/O.
All tests in this file should PASS in PR 1.
"""

import pytest


# ── MAD outlier detection ─────────────────────────────────────────────────────

class TestMadOutlierYears:
    def test_flags_single_spike(self, outlier_mod):
        values = [100, 102, 98, 101, 500, 99, 103]
        years  = [2008, 2009, 2010, 2011, 2012, 2013, 2014]
        result = outlier_mod.mad_outlier_years(values, years)
        assert 2012 in result

    def test_stable_series_no_outliers(self, outlier_mod):
        values = [100, 101, 99, 100, 102, 98, 101]
        years  = list(range(2008, 2015))
        assert outlier_mod.mad_outlier_years(values, years) == []

    def test_too_few_points_returns_empty(self, outlier_mod):
        values = [100, 200, 150]
        years  = [2008, 2009, 2010]
        assert outlier_mod.mad_outlier_years(values, years) == []

    def test_none_values_skipped(self, outlier_mod):
        values = [100, None, 98, 101, 99, 500, 102]
        years  = [2008, 2009, 2010, 2011, 2012, 2013, 2014]
        result = outlier_mod.mad_outlier_years(values, years)
        assert 2013 in result
        assert 2009 not in result

    def test_zero_mad_no_crash(self, outlier_mod):
        values = [100, 100, 100, 100, 100, 100]
        years  = list(range(2008, 2014))
        assert outlier_mod.mad_outlier_years(values, years) == []

    def test_custom_threshold_changes_sensitivity(self, outlier_mod):
        values = [100, 102, 98, 200, 99, 101, 103]
        years  = list(range(2008, 2015))
        strict   = outlier_mod.mad_outlier_years(values, years, threshold=1.0)
        relaxed  = outlier_mod.mad_outlier_years(values, years, threshold=10.0)
        assert len(strict) >= len(relaxed)


# ── Cross-source outlier detection ───────────────────────────────────────────

class TestCrossSourceOutlierYears:
    def _sources(self, primary_val, secondary_val, year=2008):
        return {
            "primary_src":   {"quality": "primary",  "years": [year], "values": [primary_val]},
            "secondary_src": {"quality": "fallback",  "years": [year], "values": [secondary_val]},
        }

    def test_flags_large_divergence(self, outlier_mod):
        sources = self._sources(1000.0, 2000.0)
        flagged = outlier_mod.cross_source_outlier_years(sources, threshold=0.40)
        assert 2008 in flagged["secondary_src"]

    def test_no_flag_for_small_divergence(self, outlier_mod):
        sources = self._sources(1000.0, 1050.0)
        flagged = outlier_mod.cross_source_outlier_years(sources, threshold=0.40)
        assert flagged["secondary_src"] == []

    def test_primary_never_flagged(self, outlier_mod):
        sources = self._sources(1000.0, 5000.0)
        flagged = outlier_mod.cross_source_outlier_years(sources)
        assert flagged["primary_src"] == []

    def test_no_primary_returns_empty_lists(self, outlier_mod):
        sources = {
            "src_a": {"quality": "fallback", "years": [2008], "values": [100.0]},
            "src_b": {"quality": "fallback", "years": [2008], "values": [900.0]},
        }
        flagged = outlier_mod.cross_source_outlier_years(sources)
        assert all(v == [] for v in flagged.values())

    def test_none_value_skipped(self, outlier_mod):
        sources = {
            "primary_src":   {"quality": "primary",  "years": [2008, 2009], "values": [1000.0, None]},
            "secondary_src": {"quality": "fallback",  "years": [2008, 2009], "values": [2000.0, 500.0]},
        }
        flagged = outlier_mod.cross_source_outlier_years(sources, threshold=0.40)
        assert 2008 in flagged["secondary_src"]
        assert 2009 not in flagged["secondary_src"]

    def test_missing_year_in_secondary_skipped(self, outlier_mod):
        sources = {
            "primary_src":   {"quality": "primary",  "years": [2008, 2010], "values": [100.0, 100.0]},
            "secondary_src": {"quality": "fallback",  "years": [2010],       "values": [900.0]},
        }
        flagged = outlier_mod.cross_source_outlier_years(sources, threshold=0.40)
        assert 2008 not in flagged["secondary_src"]
        assert 2010 in flagged["secondary_src"]
