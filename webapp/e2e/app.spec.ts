import { expect, test } from "@playwright/test";

// Covers all six routes plus the primary interactions on each, running against
// the built static site (npm run preview).

test.describe("routes", () => {
  test("overview renders KPIs and charts", async ({ page }) => {
    await page.goto("/#/overview");
    await expect(page.getByRole("heading", { name: "Visão Nacional" })).toBeVisible();
    await expect(page.getByText("Vegetação nativa por bioma")).toBeVisible();
    await expect(page.getByText("Composição do uso do solo")).toBeVisible();
  });

  test("map renders and the variable selector switches scale", async ({ page }) => {
    await page.goto("/#/map");
    await expect(page.getByRole("heading", { name: "Mapa Interativo" })).toBeVisible();
    // neutral base map by default (no variable)
    await expect(page.getByText(/Mapa base —/)).toBeVisible();
    // switching to a sequential variable shows the perceptual-scale caption
    await page.getByLabel("Variável").selectOption("pressao_ha");
    await expect(page.getByText(/Escala sequencial/)).toBeVisible();
    // and the net-balance variable switches to the diverging scale
    await page.getByLabel("Variável").selectOption("balanco_ha");
    await expect(page.getByText(/Escala divergente/)).toBeVisible();
  });

  test("about/methodology page renders", async ({ page }) => {
    await page.goto("/#/about");
    await expect(page.getByText("Metodologia e Fontes")).toBeVisible();
    await expect(page.getByText("Sistema de 15 classes")).toBeVisible();
  });
});

test.describe("map color blind mode and year slider", () => {
  test("toggles color blind mode and displays year slider on class selection", async ({ page }) => {
    await page.goto("/#/map");
    
    // Toggle Color Blind Mode on
    const cbBtn = page.getByRole("button", { name: "Modo Daltônico" });
    await expect(cbBtn).toBeVisible();
    await cbBtn.click();
    
    // Toggle Color Blind Mode off
    const cbBtnActive = page.getByRole("button", { name: "Daltônico: Ativado" });
    await expect(cbBtnActive).toBeVisible();
    await cbBtnActive.click();
    
    await expect(page.getByRole("button", { name: "Modo Daltônico" })).toBeVisible();

    // Select a class variable
    await page.getByLabel("Variável").selectOption("2 - Soja Safra Única");
    
    // Slider should appear
    await expect(page.getByText("Ano de visualização")).toBeVisible();
  });
});

test.describe("sidebar timeseries multi-source rendering", () => {
  test("renders multi-source options and source cards on map selection", async ({ page }) => {
    await page.goto("/#/map");
    
    // Search and click region
    await page.getByPlaceholder("Ex: Barreiras, Cascavel...").fill("Londrina");
    await page.getByText("Londrina (PR)").click();

    // Sidebar should show "Série Temporal & Comparação Multi-fonte"
    await expect(page.getByRole("heading", { name: "Série Temporal & Comparação Multi-fonte" })).toBeVisible();

    // Choose class visualization in chart select specifically by its label
    const select = page.getByLabel("Visualização do Gráfico");
    await select.selectOption("class:2 - Soja Safra Única");
    
    // Should render source cards above chart (using .first() to satisfy strict mode)
    await expect(page.getByText("MapBiomas col10").first()).toBeVisible();
    await expect(page.getByText("IBGE PAM / CONAB").first()).toBeVisible();
  });
});

test.describe("ranking", () => {
  test("search filters, sort toggles, and export downloads", async ({ page }) => {
    await page.goto("/#/ranking");
    await expect(page.getByText("Ranking de Pressão por RGINT")).toBeVisible();

    const rowsBefore = await page.locator("tbody tr").count();
    await page.getByPlaceholder("Buscar por nome ou UF…").fill("MT");
    await expect.poll(() => page.locator("tbody tr").count()).toBeLessThanOrEqual(rowsBefore);

    await page.getByPlaceholder("Buscar por nome ou UF…").fill("");
    // sort by a column header (clickable th)
    await page.getByText("Pressão", { exact: false }).first().click();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Exportar CSV/ }).click();
    expect((await download).suggestedFilename()).toContain("ranking");
  });
});

test.describe("region detail", () => {
  test("opens a golden region and cycles its analysis tabs", async ({ page }) => {
    await page.goto("/#/region/5101");
    await expect(page.getByText("Análise detalhada")).toBeVisible();
    // biome badge from the shared palette
    await expect(page.getByText("Cerrado").first()).toBeVisible();
    // per-region downloads card and data-status badge
    await expect(page.getByRole("heading", { name: "Downloads" })).toBeVisible();
    await expect(page.getByText("Golden standard")).toBeVisible();

    for (const tab of ["Série temporal", "Matriz", "Produção (PAM)", "Transições"]) {
      await page.getByRole("tab", { name: tab }).click();
      await expect(page.getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true");
    }
  });
});
