"""Integration tests for 07_generate_synthetic_matrices.run()."""

import json
import pytest
from pathlib import Path
import sys

ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT / "data_pipeline"))
sys.path.insert(0, str(ROOT / "tests"))

from conftest import load_pipeline_script

YEARS = list(range(2008, 2025))
REAL_MATRIX_DIR = ROOT / "webapp" / "data" / "rgint_matrix"


@pytest.fixture(scope="module")
def gen():
    return load_pipeline_script("07_generate_synthetic_matrices")


@pytest.fixture
def tmp_output(tmp_path, gen):
    """Run the generator for the 3 known synthetic RGINTs, output to tmp_path."""
    n = gen.run(rgint_ids=["5101", "5102", "5103"], out_dir=tmp_path)
    return tmp_path, n


def _load(tmp_path, rgint_id):
    return json.loads((tmp_path / f"{rgint_id}.json").read_text(encoding="utf-8"))


class TestSyntheticGenerator:
    def test_run_generates_json_for_fixture_rgints(self, tmp_output):
        tmp_path, n = tmp_output
        assert n == 3
        assert (tmp_path / "5101.json").exists()

    def test_output_schema_has_all_required_keys(self, tmp_output):
        tmp_path, _ = tmp_output
        data = _load(tmp_path, "5101")
        for key in ("metadata", "anchor_years", "years", "classes", "matrices", "_synthetic"):
            assert key in data, f"Missing key: {key}"

    def test_output_has_all_17_years(self, tmp_output):
        tmp_path, _ = tmp_output
        data = _load(tmp_path, "5101")
        assert set(data["years"]) == set(YEARS)
        assert set(data["matrices"].keys()) == {str(y) for y in YEARS}

    def test_all_matrix_values_are_numeric_and_non_negative(self, tmp_output):
        tmp_path, _ = tmp_output
        data = _load(tmp_path, "5101")
        for year_str, year_matrix in data["matrices"].items():
            for from_cls, row in year_matrix.items():
                for to_cls, val in row.items():
                    assert isinstance(val, (int, float)), \
                        f"Non-numeric at {year_str}/{from_cls}/{to_cls}: {val!r}"
                    assert val >= 0, \
                        f"Negative value at {year_str}/{from_cls}/{to_cls}: {val}"

    def test_synthetic_flag_is_true(self, tmp_output):
        tmp_path, _ = tmp_output
        data = _load(tmp_path, "5101")
        assert data["_synthetic"] is True

    def test_missing_diagonal_rgint_is_skipped(self, tmp_path, gen):
        n = gen.run(rgint_ids=["9999_nonexistent"], out_dir=tmp_path)
        assert n == 0
        assert not (tmp_path / "9999_nonexistent.json").exists()

    def test_multiple_rgints_all_get_files(self, tmp_output):
        tmp_path, n = tmp_output
        assert n == 3
        for rgint_id in ("5101", "5102", "5103"):
            assert (tmp_path / f"{rgint_id}.json").exists()

    def test_metadata_has_rgint_field(self, tmp_output):
        tmp_path, _ = tmp_output
        data = _load(tmp_path, "5101")
        assert data["metadata"]["rgint"] == "5101"

    def test_anchor_years_are_2008_2017_2024(self, tmp_output):
        tmp_path, _ = tmp_output
        data = _load(tmp_path, "5101")
        assert data["anchor_years"] == [2008, 2017, 2024]
