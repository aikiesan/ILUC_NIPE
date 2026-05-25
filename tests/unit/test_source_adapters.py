"""
Unit tests for source adapter implementations (sources/*.py).
All tests are xfail until PR 2 creates the sources/ package.
"""

import pytest

CLASSES = [
    "1 - Culturas perenes", "2 - Soja", "3 - Soja + Milho 2ª safra",
    "4 - Milho 1ª safra", "5 - Cana-de-açúcar", "6 - Outra agropecuária",
    "7 - Pastagem deg. média", "8 - Pastagem deg. alta", "9 - Pastagem deg. baixa",
    "10 - Silvicultura", "11 - Veg. prim. florestal", "12 - Veg. sec. florestal",
    "13 - Veg. prim. não-florestal", "14 - Veg. sec. não-florestal", "15 - Outro",
]

YEARS = list(range(2008, 2025))


def _check_series_contract(adapter, rgint_id, class_name):
    """Common contract: get_series returns a list aligned to YEARS with float|None elements."""
    series = adapter.get_series(rgint_id, class_name)
    assert isinstance(series, list)
    assert len(series) == len(YEARS)
    for v in series:
        assert v is None or isinstance(v, float)


@pytest.mark.xfail(reason="sources/ package not yet created (PR 2)")
def test_mapbiomas_adapter_available_for_all_classes():
    from sources.mapbiomas import MapBiomasAdapter
    adapter = MapBiomasAdapter()
    for cls in CLASSES:
        assert adapter.available_for(cls) is True


@pytest.mark.xfail(reason="sources/ package not yet created (PR 2)")
def test_pam_ibge_adapter_available_for_crop_classes_only():
    from sources.pam_ibge import PamIbgeAdapter
    adapter = PamIbgeAdapter()
    assert adapter.available_for("2 - Soja") is True
    assert adapter.available_for("11 - Veg. prim. florestal") is False


@pytest.mark.xfail(reason="sources/ package not yet created (PR 2)")
def test_lapig_adapter_available_for_pasture_classes_only():
    from sources.lapig import LapigAdapter
    adapter = LapigAdapter()
    assert adapter.available_for("7 - Pastagem deg. média") is True
    assert adapter.available_for("2 - Soja") is False


@pytest.mark.xfail(reason="sources/ package not yet created (PR 2)")
def test_adapter_quality_returns_primary_or_fallback():
    from sources.pam_ibge import PamIbgeAdapter
    adapter = PamIbgeAdapter()
    quality = adapter.get_quality("2 - Soja")
    assert quality in ("primary", "fallback")


@pytest.mark.xfail(reason="sources/ package not yet created (PR 2)")
def test_adapter_notes_returns_nonempty_string():
    from sources.mapbiomas import MapBiomasAdapter
    adapter = MapBiomasAdapter()
    notes = adapter.get_notes("2 - Soja")
    assert isinstance(notes, str) and len(notes) > 0


@pytest.mark.xfail(reason="sources/ package not yet created (PR 2)")
def test_source_key_is_string():
    from sources.mapbiomas import MapBiomasAdapter
    from sources.pam_ibge import PamIbgeAdapter
    from sources.lapig import LapigAdapter
    for cls in [MapBiomasAdapter, PamIbgeAdapter, LapigAdapter]:
        assert isinstance(cls().source_key, str)
