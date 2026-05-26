"""Unit tests for MatrixValidator (pure computation, no I/O)."""

import math
import pytest
from pathlib import Path
import sys

# Make data_pipeline importable
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "data_pipeline"))
from pipeline.validator import MatrixValidator, MassBalanceError


def _make_matrix_data(rgint_id, classes, years, matrices):
    return {
        "metadata": {"rgint": rgint_id},
        "classes": classes,
        "years": years,
        "matrices": {
            str(y): {
                from_cls: {to_cls: matrices[y][from_cls][to_cls] for to_cls in matrices[y][from_cls]}
                for from_cls in matrices[y]
            }
            for y in matrices
        },
    }


CLASSES = ["A", "B"]

def _simple_valid_matrix():
    return _make_matrix_data("5101", CLASSES, [2008, 2009], {
        2008: {"A": {"A": 100.0, "B": 10.0}, "B": {"A": 5.0, "B": 200.0}},
        2009: {"A": {"A": 95.0,  "B": 15.0}, "B": {"A": 8.0, "B": 197.0}},
    })


class TestValidateMassBalance:
    def setup_method(self):
        self.v = MatrixValidator()

    def test_valid_matrix_passes(self):
        result = self.v.validate_mass_balance(_simple_valid_matrix())
        assert result.is_valid is True
        assert result.has_negatives is False
        assert result.has_nulls is False
        assert result.error_count == 0

    def test_negative_value_detected(self):
        data = _make_matrix_data("5101", CLASSES, [2008], {
            2008: {"A": {"A": -5.0, "B": 10.0}, "B": {"A": 5.0, "B": 200.0}},
        })
        result = self.v.validate_mass_balance(data)
        assert result.has_negatives is True
        assert result.is_valid is False

    def test_null_none_value_detected(self):
        data = _make_matrix_data("5101", CLASSES, [2008], {
            2008: {"A": {"A": None, "B": 10.0}, "B": {"A": 5.0, "B": 200.0}},
        })
        result = self.v.validate_mass_balance(data)
        assert result.has_nulls is True
        assert result.is_valid is False

    def test_nan_value_detected(self):
        data = _make_matrix_data("5101", CLASSES, [2008], {
            2008: {"A": {"A": float("nan"), "B": 10.0}, "B": {"A": 5.0, "B": 200.0}},
        })
        result = self.v.validate_mass_balance(data)
        assert result.has_nulls is True
        assert result.is_valid is False

    def test_mass_balance_error_reported_when_diagonal_provided(self):
        data = _make_matrix_data("5101", CLASSES, [2008], {
            2008: {"A": {"A": 100.0, "B": 90.0}, "B": {"A": 5.0, "B": 200.0}},
        })
        # diagonal says A had 110.0 in 2008 — row_sum=190, error >> 5%
        diagonal = {"A": {"2008": 110.0}, "B": {"2008": 205.0}}
        result = self.v.validate_mass_balance(data, diagonal=diagonal, tolerance_pct=5.0)
        error_classes = [e.from_class for e in result.mass_balance_errors]
        assert "A" in error_classes

    def test_no_mass_balance_errors_when_no_diagonal(self):
        result = self.v.validate_mass_balance(_simple_valid_matrix(), diagonal=None)
        assert result.mass_balance_errors == []

    def test_within_tolerance_not_flagged(self):
        data = _make_matrix_data("5101", CLASSES, [2008], {
            2008: {"A": {"A": 100.0, "B": 3.0}, "B": {"A": 5.0, "B": 200.0}},
        })
        diagonal = {"A": {"2008": 100.0}, "B": {"2008": 200.0}}
        # row_sum A = 103, ref = 100 → 3% error < 5% tolerance
        result = self.v.validate_mass_balance(data, diagonal=diagonal, tolerance_pct=5.0)
        error_classes = [e.from_class for e in result.mass_balance_errors]
        assert "A" not in error_classes

    def test_empty_matrices_is_valid(self):
        data = {"metadata": {"rgint": "5101"}, "matrices": {}}
        result = self.v.validate_mass_balance(data)
        assert result.is_valid is True
        assert result.error_count == 0

    def test_error_count_matches_list_length(self):
        data = _make_matrix_data("5101", CLASSES, [2008, 2009], {
            2008: {"A": {"A": 100.0, "B": 200.0}, "B": {"A": 0.0, "B": 100.0}},
            2009: {"A": {"A": 100.0, "B": 200.0}, "B": {"A": 0.0, "B": 100.0}},
        })
        diagonal = {"A": {"2008": 50.0, "2009": 50.0}, "B": {"2008": 50.0, "2009": 50.0}}
        result = self.v.validate_mass_balance(data, diagonal=diagonal, tolerance_pct=5.0)
        assert result.error_count == len(result.mass_balance_errors)

    def test_rgint_id_taken_from_metadata(self):
        result = self.v.validate_mass_balance(_simple_valid_matrix())
        assert result.rgint_id == "5101"


class TestValidateCoverage:
    def setup_method(self):
        self.v = MatrixValidator()
        self.index = [
            {"rgint": "5101"}, {"rgint": "5102"}, {"rgint": "5103"},
            {"rgint": "5104"}, {"rgint": "5105"},
        ]

    def test_full_coverage(self, tmp_path):
        for r in self.index:
            (tmp_path / f"{r['rgint']}.json").write_text("{}")
        report = self.v.validate_coverage(tmp_path, self.index)
        assert report.coverage_pct == 100.0
        assert report.missing_ids == []
        assert len(report.present_ids) == 5

    def test_partial_coverage(self, tmp_path):
        for r in self.index[:3]:
            (tmp_path / f"{r['rgint']}.json").write_text("{}")
        report = self.v.validate_coverage(tmp_path, self.index)
        assert report.coverage_pct == 60.0
        assert len(report.missing_ids) == 2
        assert len(report.present_ids) == 3

    def test_zero_coverage(self, tmp_path):
        report = self.v.validate_coverage(tmp_path, self.index)
        assert report.coverage_pct == 0.0
        assert report.present_ids == []
        assert len(report.missing_ids) == 5

    def test_total_rgints_matches_index_length(self, tmp_path):
        report = self.v.validate_coverage(tmp_path, self.index)
        assert report.total_rgints == len(self.index)
