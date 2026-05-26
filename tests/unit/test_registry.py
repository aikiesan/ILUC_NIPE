"""
Unit tests for the SourceRegistry (pipeline/registry.py).
"""

import pytest


def test_registry_register_and_retrieve():
    from pipeline.registry import SourceRegistry
    from sources.base import ITimeSeriesSource

    class MockAdapter(ITimeSeriesSource):
        source_key = "mock"
        def available_for(self, cls): return cls == "2 - Soja"
        def get_series(self, rgint_id, cls): return [0.0] * 17
        def get_quality(self, cls): return "primary"
        def get_notes(self, cls): return "mock notes"

    registry = SourceRegistry()
    adapter  = MockAdapter()
    registry.register(adapter)
    assert adapter in registry.adapters_for("2 - Soja")
    assert adapter not in registry.adapters_for("11 - Veg. prim. florestal")


def test_registry_empty_for_unregistered_class():
    from pipeline.registry import SourceRegistry
    registry = SourceRegistry()
    assert registry.adapters_for("2 - Soja") == []


def test_registry_preserves_registration_order():
    from pipeline.registry import SourceRegistry
    from sources.base import ITimeSeriesSource

    class A(ITimeSeriesSource):
        source_key = "a"
        def available_for(self, cls): return True
        def get_series(self, r, c): return []
        def get_quality(self, c): return "primary"
        def get_notes(self, c): return ""

    class B(A):
        source_key = "b"

    registry = SourceRegistry()
    registry.register(A())
    registry.register(B())
    keys = [a.source_key for a in registry.adapters_for("any")]
    assert keys == ["a", "b"]


def test_registry_from_quality_rules_has_all_known_sources():
    from pipeline.registry import SourceRegistry
    registry = SourceRegistry.from_quality_rules()
    # "2 - Soja" → pipeline_diagonal + conab_pam
    # "7 - Pastagem deg. média" → pipeline_diagonal + lapig_vigor + mb_pastagem_total + tc_pastagem
    all_keys = {a.source_key for cls in ["2 - Soja", "7 - Pastagem deg. média"]
                for a in registry.adapters_for(cls)}
    assert "pipeline_diagonal" in all_keys
    assert "conab_pam" in all_keys
    assert "lapig_vigor" in all_keys
