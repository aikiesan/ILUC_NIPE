import { expect, test } from "@playwright/test";

test("redirects to the interactive map landing", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/#\/map/);
  await expect(page.getByRole("heading", { name: "Mapa Interativo" })).toBeVisible();
  // default view is the neutral base map (no variable coloring)
  await expect(page.getByText(/Mapa base —/)).toBeVisible();
});

test("navigates to the ranking and opens a region", async ({ page }) => {
  await page.goto("/#/ranking");
  await expect(page.getByText("Ranking de Pressão por RGINT")).toBeVisible();
  const firstRow = page.locator("tbody tr").first();
  await firstRow.click();
  await expect(page).toHaveURL(/#\/region\//);
  await expect(page.getByText("Análise detalhada")).toBeVisible();
});

test("renders the about/methodology page", async ({ page }) => {
  await page.goto("/#/about");
  await expect(page.getByText("Metodologia e Fontes")).toBeVisible();
  await expect(page.getByText("Sistema de 15 classes")).toBeVisible();
});
