"""
E2E API tests for the FastAPI backend (webapp/backend/main.py).
Uses httpx.AsyncClient with ASGITransport — no running server required.

Tests in this file should PASS in PR 1 (existing endpoints only).
Tests for new endpoints (PR 3) are marked xfail.
"""

import pytest
from httpx import AsyncClient, ASGITransport


# ── Existing endpoints (must pass in PR 1) ───────────────────────────────────

class TestIndexEndpoint:
    async def test_returns_200(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/index")
        assert r.status_code == 200

    async def test_returns_list(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/index")
        data = r.json()
        assert isinstance(data, list)

    async def test_returns_133_entries(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/index")
        assert len(r.json()) == 133

    async def test_each_entry_has_required_fields(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/index")
        for entry in r.json():
            assert "rgint"  in entry
            assert "nome"   in entry
            assert "uf"     in entry
            assert "biome"  in entry


class TestRgintEndpoint:
    async def test_known_rgint_returns_200(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/rgint/5101")
        assert r.status_code == 200

    async def test_unknown_rgint_returns_404(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/rgint/9999")
        assert r.status_code == 404

    async def test_response_has_15_classes(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/rgint/5101")
        data = r.json()
        assert len(data) == 15

    async def test_class_values_are_numeric(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/rgint/5101")
        for cls_name, year_dict in r.json().items():
            for year, val in year_dict.items():
                assert val is None or isinstance(val, (int, float)), \
                    f"{cls_name}[{year}] is not numeric: {val!r}"


class TestRgintFullEndpoint:
    async def test_returns_404_when_not_generated(self, fastapi_app):
        """rgint_full/ is empty until pipeline 02 runs — expect 404, not 500."""
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/rgint_full/5101")
        assert r.status_code == 404

    async def test_404_body_is_json(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/rgint_full/5101")
        assert r.headers["content-type"].startswith("application/json")


class TestPipelineStatusEndpoint:
    async def test_returns_200(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/pipeline_status")
        assert r.status_code == 200

    async def test_has_count_fields(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/pipeline_status")
        data = r.json()
        assert "rgint_full_count"   in data
        assert "html_reports_count" in data

    async def test_counts_are_non_negative_ints(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/pipeline_status")
        data = r.json()
        assert data["rgint_full_count"]   >= 0
        assert data["html_reports_count"] >= 0


class TestReportEndpoint:
    async def test_returns_404_when_not_generated(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/report/5101")
        assert r.status_code == 404


# ── New endpoints (xfail until PR 3) ─────────────────────────────────────────

class TestMatrixEndpoint:
    async def test_returns_200(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/rgint_matrix/5101")
        assert r.status_code == 200

    async def test_schema_valid(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/rgint_matrix/5101")
        data = r.json()
        assert "metadata"     in data
        assert "anchor_years" in data
        assert "years"        in data
        assert "classes"      in data
        assert "matrices"     in data


class TestTransitionEndpoint:
    async def test_returns_200(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/rgint_transition/5101/2008/2017")
        assert r.status_code == 200

    async def test_matrix_cells_are_numeric(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/rgint_transition/5101/2008/2017")
        for row in r.json().values():
            for val in row.values():
                assert isinstance(val, (int, float))

    async def test_invalid_year_range_returns_4xx(self, fastapi_app):
        async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as c:
            r = await c.get("/api/rgint_transition/5101/2024/2008")
        assert r.status_code in (400, 422)
