"""End-to-end pipeline test: raw files -> Postgres -> static artifacts.

Requires a reachable Postgres (POSTGRES_* env / infra/.env); skips otherwise
via the ``pg_conn`` fixture. Runs the real ingest against the committed raw
data, then the DB-backed exporters into a temp dir and asserts the artifacts.
"""
import csv
import sys

import pytest

import common
import ingest


@pytest.fixture(scope="module")
def ingested(pg_conn):
    """Run the full ingest once; yield a cursor for assertions."""
    sys.argv = ["ingest.py"]  # no --schema (pg_conn already applied it)
    ingest.main()
    with pg_conn.cursor() as cur:
        yield cur


def _count(cur, table):
    cur.execute(f"SELECT COUNT(*) FROM {table}")
    return cur.fetchone()[0]


def test_core_tables_populated(ingested):
    assert _count(ingested, "regions") == 133
    # 133 regions x 15 classes x 17 years (2008-2024)
    assert _count(ingested, "lulc_timeseries") == 33915
    assert _count(ingested, "municipios") > 5000
    assert _count(ingested, "pam") > 0
    assert _count(ingested, "transitions") > 0  # 3 regions today


def test_golden_regions_flagged(ingested):
    ingested.execute("SELECT rgint_id FROM regions WHERE is_golden ORDER BY rgint_id")
    assert [r[0] for r in ingested.fetchall()] == [1201, 5101]


def test_export_produces_expected_artifacts(ingested, tmp_path, monkeypatch):
    monkeypatch.setattr(common, "OUT", tmp_path)
    import generate_pam_by_rgint
    import generate_rgint_transitions
    import generate_national_transitions
    import generate_rgint_indicators

    generate_pam_by_rgint.main()
    generate_rgint_transitions.main()
    generate_national_transitions.main()
    generate_rgint_indicators.main()

    # indicators: header + 133 regions, ranking is a 1..133 permutation
    with open(tmp_path / "rgint_indicators.csv", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    assert len(rows) == 133
    ranks = sorted(int(r["ranking_pressao"]) for r in rows)
    assert ranks == list(range(1, 134))

    assert (tmp_path / "national_timeseries.csv").exists()
    assert (tmp_path / "national_transitions.csv").exists()
    assert len(list((tmp_path / "rgint_pam").glob("*.csv"))) == 133
    # transitions only for regions whose matrices are present
    assert len(list((tmp_path / "rgint_transitions").glob("*.csv"))) >= 3


def test_national_transitions_only_offdiagonal(ingested, tmp_path, monkeypatch):
    monkeypatch.setattr(common, "OUT", tmp_path)
    import generate_national_transitions
    generate_national_transitions.main()
    with open(tmp_path / "national_transitions.csv", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    assert rows, "expected national transition flows"
    # off-diagonal only: origin never equals destination
    assert all(r["origem_id"] != r["destino_id"] for r in rows)
    assert set(r["periodo"] for r in rows) <= {"2008_2017", "2017_2024", "2008_2024"}
