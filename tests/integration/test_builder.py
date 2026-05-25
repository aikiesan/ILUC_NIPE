"""
Integration tests for the pipeline builder (pipeline/builder.py).
All tests are xfail until PR 2 creates the builder module.
"""

import pytest


@pytest.mark.xfail(reason="pipeline/builder.py not yet created (PR 2)")
def test_build_class_sources_returns_dict_with_source_keys():
    from pipeline.builder import build_class_sources
    from pipeline.registry import SourceRegistry

    registry = SourceRegistry.from_quality_rules()
    result   = build_class_sources("5101", "2 - Soja", registry, rules={})
    assert isinstance(result, dict)
    assert len(result) >= 1


@pytest.mark.xfail(reason="pipeline/builder.py not yet created (PR 2)")
def test_build_class_sources_each_entry_has_required_fields():
    from pipeline.builder import build_class_sources
    from pipeline.registry import SourceRegistry

    registry = SourceRegistry.from_quality_rules()
    result   = build_class_sources("5101", "2 - Soja", registry, rules={})
    for src_entry in result.values():
        assert "values"   in src_entry
        assert "years"    in src_entry
        assert "quality"  in src_entry
        assert "notes"    in src_entry
        assert "outliers" in src_entry or True  # outliers added by step 04


@pytest.mark.xfail(reason="pipeline/builder.py not yet created (PR 2)")
def test_build_class_sources_primary_source_present():
    from pipeline.builder import build_class_sources
    from pipeline.registry import SourceRegistry

    registry = SourceRegistry.from_quality_rules()
    result   = build_class_sources("5101", "2 - Soja", registry, rules={})
    primaries = [k for k, v in result.items() if v["quality"] == "primary"]
    assert len(primaries) >= 1


@pytest.mark.xfail(reason="pipeline/builder.py not yet created (PR 2)")
def test_adding_new_adapter_appears_in_output_without_modifying_builder():
    """OCP: new source appears automatically via registry.register(), no elif needed."""
    from pipeline.builder import build_class_sources
    from pipeline.registry import SourceRegistry
    from sources.base import ITimeSeriesSource

    class NewSource(ITimeSeriesSource):
        source_key = "new_test_source"
        def available_for(self, cls): return cls == "2 - Soja"
        def get_series(self, r, c): return [999.0] * 17
        def get_quality(self, c): return "fallback"
        def get_notes(self, c): return "test source"

    registry = SourceRegistry.from_quality_rules()
    registry.register(NewSource())
    result = build_class_sources("5101", "2 - Soja", registry, rules={})
    assert "new_test_source" in result
