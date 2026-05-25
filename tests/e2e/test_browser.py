"""
E2E browser tests using Playwright.
Requires a live server — use the live_server_url fixture from conftest.py.

Tests for existing UI (map + chart) should PASS in PR 1 (once Playwright is installed).
Tests for Sankey/transition view are xfail until PR 4.
"""

import pytest


# ── Existing UI smoke tests ───────────────────────────────────────────────────

@pytest.mark.xfail(reason="Playwright chromium may not be installed in CI — install with: playwright install chromium")
def test_index_page_loads(page, live_server_url):
    page.goto(live_server_url)
    assert page.title() != ""
    page.wait_for_selector("#map", timeout=10_000)


@pytest.mark.xfail(reason="Playwright chromium may not be installed in CI")
def test_map_panel_visible(page, live_server_url):
    page.goto(live_server_url)
    page.wait_for_selector("#map", timeout=10_000)
    assert page.locator("#map").is_visible()


@pytest.mark.xfail(reason="Playwright chromium may not be installed in CI")
def test_default_region_loads_chart(page, live_server_url):
    """Cuiabá (5101) auto-loads on startup — chart should appear."""
    page.goto(live_server_url)
    page.wait_for_selector("#dashboard-content:not(.hidden)", timeout=15_000)
    assert page.locator("#chart").is_visible()


@pytest.mark.xfail(reason="Playwright chromium may not be installed in CI")
def test_class_tabs_render(page, live_server_url):
    page.goto(live_server_url)
    page.wait_for_selector(".tab-btn", timeout=15_000)
    tab_count = page.locator(".tab-btn").count()
    assert tab_count == 15


@pytest.mark.xfail(reason="Playwright chromium may not be installed in CI")
def test_clicking_class_tab_updates_chart(page, live_server_url):
    page.goto(live_server_url)
    page.wait_for_selector(".tab-btn", timeout=15_000)
    page.locator(".tab-btn").nth(1).click()
    page.wait_for_selector("#chart .svg-container", timeout=5_000)
    assert page.locator("#chart").is_visible()


# ── Outlier badge tests (passes after 04_outlier_detection runs + rgint_full exists) ──

@pytest.mark.xfail(reason="rgint_full/ must be populated (run pipeline 02 + 04) and outliers must exist")
def test_outlier_badge_visible_on_at_least_one_tab(page, live_server_url):
    page.goto(live_server_url)
    page.wait_for_selector(".tab-btn", timeout=15_000)
    assert page.locator(".outlier-warn").count() > 0


# ── Sankey / transition view tests (xfail until PR 4) ────────────────────────

@pytest.mark.xfail(reason="Transition view not yet implemented (PR 4)")
def test_transition_view_toggle_visible(page, live_server_url):
    page.goto(live_server_url)
    page.wait_for_selector('[data-view="transitions"]', timeout=10_000)
    assert page.locator('[data-view="transitions"]').is_visible()


@pytest.mark.xfail(reason="Transition view not yet implemented (PR 4)")
def test_sankey_renders_on_transition_tab(page, live_server_url):
    page.goto(live_server_url)
    page.wait_for_selector('[data-view="transitions"]', timeout=10_000)
    page.click('[data-view="transitions"]')
    page.wait_for_selector("#transition-chart .sankey", timeout=10_000)
    assert page.locator("#transition-chart").is_visible()


@pytest.mark.xfail(reason="Transition view not yet implemented (PR 4)")
def test_time_mode_selector_switches_anchor_periods(page, live_server_url):
    page.goto(live_server_url)
    page.click('[data-view="transitions"]')
    page.wait_for_selector('[data-mode="anchor"]', timeout=5_000)
    page.click('[data-mode="anchor"]')
    assert "2008" in page.locator("#transition-chart").inner_text()


@pytest.mark.xfail(reason="Transition view not yet implemented (PR 4)")
def test_stable_area_summary_visible(page, live_server_url):
    page.goto(live_server_url)
    page.click('[data-view="transitions"]')
    page.wait_for_selector("#stable-area-bar", timeout=5_000)
    assert page.locator("#stable-area-bar").is_visible()
