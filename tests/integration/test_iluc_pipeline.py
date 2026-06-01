"""
Integration tests for the ILUC matrix load + interpolation pipeline (steps 05, 06).
"""

import json
import pytest
from pathlib import Path


def test_load_iluc_matrices_produces_parquet(tmp_path, iluc_matrix_csv_path):
    from tests.conftest import load_pipeline_script
    mod = load_pipeline_script("05_load_iluc_matrices")
    out = tmp_path / "iluc_matrix_2008.csv"
    mod.load_anchor_matrix(iluc_matrix_csv_path, 2008, out)
    assert out.exists()


def test_interpolated_json_contains_all_years(tmp_path, iluc_matrix_csv_path):
    from tests.conftest import load_pipeline_script
    interp = load_pipeline_script("06_interpolate_matrices")
    out_dir = tmp_path / "rgint_matrix"
    out_dir.mkdir()
    interp.run(
        anchor_csv_map={2008: iluc_matrix_csv_path, 2017: iluc_matrix_csv_path, 2024: iluc_matrix_csv_path},
        out_dir=out_dir,
    )
    out_file = out_dir / "5101.json"
    assert out_file.exists()
    data = json.loads(out_file.read_text())
    assert "matrices" in data
    assert set(data["years"]) == set(range(2008, 2025))


def test_interpolated_json_schema_valid(tmp_path, iluc_matrix_csv_path):
    from tests.conftest import load_pipeline_script
    interp = load_pipeline_script("06_interpolate_matrices")
    out_dir = tmp_path / "rgint_matrix"
    out_dir.mkdir()
    interp.run(
        anchor_csv_map={2008: iluc_matrix_csv_path, 2017: iluc_matrix_csv_path, 2024: iluc_matrix_csv_path},
        out_dir=out_dir,
    )
    data = json.loads((out_dir / "5101.json").read_text())
    assert "metadata"     in data
    assert "anchor_years" in data
    assert "years"        in data
    assert "classes"      in data
    assert "matrices"     in data
    for yr, matrix in data["matrices"].items():
        for from_cls, row in matrix.items():
            for val in row.values():
                assert isinstance(val, (int, float))
