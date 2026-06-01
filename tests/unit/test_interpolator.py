"""
Unit tests for the linear matrix interpolator (pipeline/interpolator.py).
"""

import pytest


def test_linear_midpoint():
    from pipeline.interpolator import interpolate_matrix
    m0 = {"A": {"A": 100.0, "B": 0.0},  "B": {"A": 0.0,  "B": 200.0}}
    m1 = {"A": {"A": 80.0,  "B": 20.0}, "B": {"A": 5.0,  "B": 195.0}}
    mid = interpolate_matrix(m0, m1, year_start=2008, year_end=2010, year_target=2009)
    assert mid["A"]["B"] == pytest.approx(10.0)
    assert mid["A"]["A"] == pytest.approx(90.0)


def test_anchor_year_returns_exact_matrix():
    from pipeline.interpolator import interpolate_matrix
    m = {"A": {"A": 100.0, "B": 50.0}}
    result = interpolate_matrix(m, m, year_start=2008, year_end=2017, year_target=2008)
    assert result == m


def test_interpolation_preserves_all_class_pairs():
    from pipeline.interpolator import interpolate_matrix
    classes = ["A", "B", "C"]
    m0 = {c: {d: float(i * 3 + j) for j, d in enumerate(classes)} for i, c in enumerate(classes)}
    m1 = {c: {d: float(i * 3 + j) * 2 for j, d in enumerate(classes)} for i, c in enumerate(classes)}
    mid = interpolate_matrix(m0, m1, 2008, 2010, 2009)
    assert set(mid.keys()) == set(classes)
    for row in mid.values():
        assert set(row.keys()) == set(classes)


def test_build_annual_matrices_returns_all_years():
    from pipeline.interpolator import build_annual_matrices
    m2008 = {"A": {"A": 100.0}}
    m2017 = {"A": {"A": 80.0}}
    m2024 = {"A": {"A": 60.0}}
    result = build_annual_matrices({2008: m2008, 2017: m2017, 2024: m2024})
    assert set(result.keys()) == set(range(2008, 2025))


def test_cells_bounded_by_anchor_values():
    from pipeline.interpolator import interpolate_matrix
    m0 = {"A": {"A": 100.0}}
    m1 = {"A": {"A": 200.0}}
    for y in range(2008, 2018):
        mid = interpolate_matrix(m0, m1, 2008, 2017, y)
        assert 100.0 <= mid["A"]["A"] <= 200.0
