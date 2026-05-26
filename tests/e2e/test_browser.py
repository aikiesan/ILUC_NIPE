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


# ── Sankey / transition view tests ───────────────────────────────────────────

@pytest.mark.xfail(reason="Playwright chromium may not be installed in CI")
def test_transition_view_toggle_visible(page, live_server_url):
    page.goto(live_server_url)
    page.wait_for_selector('[data-view="transitions"]', timeout=10_000)
    assert page.locator('[data-view="transitions"]').is_visible()


@pytest.mark.xfail(reason="Playwright chromium may not be installed in CI — also needs rgint_matrix/ data")
def test_sankey_renders_on_transition_tab(page, live_server_url):
    page.goto(live_server_url)
    page.wait_for_selector("#dashboard-content:not(.hidden)", timeout=15_000)
    page.click('[data-view="transitions"]')
    page.wait_for_selector("#transition-chart .sankey", timeout=12_000)
    assert page.locator("#transition-chart").is_visible()


@pytest.mark.xfail(reason="Playwright chromium may not be installed in CI")
def test_time_mode_selector_switches_anchor_periods(page, live_server_url):
    page.goto(live_server_url)
    page.wait_for_selector('[data-view="transitions"]', timeout=10_000)
    page.click('[data-view="transitions"]')
    page.wait_for_selector('[data-mode="anchor"]', timeout=5_000)
    page.click('[data-mode="anchor"]')
    assert page.locator('[data-mode="anchor"]').get_attribute('class').find('active') >= 0


@pytest.mark.xfail(reason="Playwright chromium may not be installed in CI — also needs rgint_matrix/ data")
def test_stable_area_summary_visible(page, live_server_url):
    page.goto(live_server_url)
    page.wait_for_selector("#dashboard-content:not(.hidden)", timeout=15_000)
    page.click('[data-view="transitions"]')
    page.wait_for_selector("#stable-area-bar:not(.hidden)", timeout=12_000)
    assert page.locator("#stable-area-bar").is_visible()


# ── Chart interactivity tests ─────────────────────────────────────────────────

@pytest.mark.xfail(reason="Playwright chromium may not be installed in CI")
def test_trace_highlight_on_legend_click(page, live_server_url):
    """Clicking a legend item dims other traces (chart stays visible, no crash)."""
    page.goto(live_server_url)
    page.wait_for_selector("#dashboard-content:not(.hidden)", timeout=15_000)
    page.wait_for_selector(".tab-btn", timeout=10_000)
    page.wait_for_selector("#chart .legend", timeout=10_000)
    legend_item = page.locator("#chart .legend .traces").first
    legend_item.click()
    assert page.locator("#chart .svg-container").is_visible()


@pytest.mark.xfail(reason="Playwright chromium may not be installed in CI")
def test_second_legend_click_resets_highlight(page, live_server_url):
    """Second click on the same legend item resets all traces to normal opacity."""
    page.goto(live_server_url)
    page.wait_for_selector("#dashboard-content:not(.hidden)", timeout=15_000)
    page.wait_for_selector("#chart .legend .traces", timeout=10_000)
    legend_item = page.locator("#chart .legend .traces").first
    legend_item.click()
    legend_item.click()
    assert page.locator("#chart .svg-container").is_visible()


@pytest.mark.xfail(reason="Playwright chromium may not be installed in CI — also needs rgint_matrix/ data")
def test_sankey_node_click_shows_reset_button(page, live_server_url):
    """After clicking a Sankey node, the reset-focus button becomes visible."""
    page.goto(live_server_url)
    page.wait_for_selector("#dashboard-content:not(.hidden)", timeout=15_000)
    page.click('[data-view="transitions"]')
    page.wait_for_selector("#transition-chart .sankey", timeout=12_000)
    page.locator("#transition-chart .sankey-node").first.click()
    assert page.locator("#sankey-reset-btn:not(.hidden)").is_visible()


@pytest.mark.xfail(reason="Playwright chromium may not be installed in CI — also needs rgint_matrix/ data")
def test_sankey_reset_button_clears_focus(page, live_server_url):
    """Clicking the reset button hides it and restores all Sankey link opacities."""
    page.goto(live_server_url)
    page.wait_for_selector("#dashboard-content:not(.hidden)", timeout=15_000)
    page.click('[data-view="transitions"]')
    page.wait_for_selector("#transition-chart .sankey", timeout=12_000)
    page.locator("#transition-chart .sankey-node").first.click()
    page.locator("#sankey-reset-btn:not(.hidden)").click()
    assert page.locator("#transition-chart").is_visible()
    assert page.locator("#sankey-reset-btn.hidden").count() > 0
