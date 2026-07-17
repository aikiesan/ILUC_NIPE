import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MousePointerClick } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { ChartSkeleton, EmptyState, ErrorState } from "@/components/common/StateBlocks";
import { TabExpansion } from "@/components/region/TabExpansion";
import { useAsync } from "@/lib/useAsync";
import { loadAllTimeseries, loadGeoJson, loadIndicators, loadMeta, loadRegionTransitions } from "@/lib/data";
import { formatHa, formatSignedHa, formatPct } from "@/lib/format";
import { scaleForVariable, COLORBLIND_DIVERGING, SEQ_GAIN } from "@/lib/colors";
import type { RegionIndicator, RegionMeta } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CLASS_ORDER, shortClassLabel } from "@/lib/classes";
import { Slider } from "@/components/ui/slider";
import { TabTimeseries } from "@/components/region/TabTimeseries";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ChoroplethMap = lazy(() => import("@/components/charts/ChoroplethMap"));

type MapVar = keyof RegionIndicator | "none" | string;

const VARIABLES: { value: MapVar; label: string }[] = [
  { value: "none", label: "Mapa base (sem variável)" },
  { value: "pressao_ha", label: "Pressão antrópica (ha) - Acumulado 2008-2024" },
  { value: "balanco_ha", label: "Balanço líquido veg. nativa (ha) - Acumulado 2008-2024" },
  { value: "regeneracao_ha", label: "Regeneração (ha) - Acumulado 2008-2024" },
  { value: "soja_2024_ha", label: "Área de soja (ha) - PAM 2024" },
  ...CLASS_ORDER.map((c) => ({ value: c, label: `Uso do solo: ${c}` })),
];

export function RegionSummaryHorizontal({ meta, indicator }: { meta: RegionMeta; indicator?: RegionIndicator }) {
  return (
    <Card className="w-full">
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="rounded bg-accent/10 px-2 py-1 text-xs font-semibold text-accent mono">{meta.id}</span>
            <span className="rounded border border-border px-2 py-1 text-xs font-medium text-muted">{meta.uf}</span>
            <span className="text-sm font-semibold text-foreground">{meta.nome}</span>
            <span className="text-xs text-muted">({meta.bioma_principal})</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <div>
              Área total: <span className="font-semibold text-foreground tnum">{formatHa(meta.area_ha)} ha</span>
            </div>
            <div>
              Municípios: <span className="font-semibold text-foreground tnum">{meta.n_municipios}</span>
            </div>
            {indicator && (
              <div className="bg-highlight px-2 py-0.5 rounded text-accent font-medium">
                Ranking Pressão: #{indicator.ranking_pressao}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="rounded border border-border bg-card p-3">
            <p className="text-xs text-muted mb-1">Área agrícola (PAM)</p>
            <p className="text-sm font-semibold text-foreground tnum font-mono">
              {indicator?.area_agro_2024 ? `${formatHa(indicator.area_agro_2024)} ha` : "N/D"}
            </p>
          </div>
          <div className="rounded border border-border bg-card p-3">
            <p className="text-xs text-muted mb-1">Pressão antrópica acum.</p>
            <p className="text-sm font-semibold text-foreground tnum font-mono">
              {indicator?.pressao_ha ? `${formatHa(indicator.pressao_ha)} ha` : "N/D"}
            </p>
          </div>
          <div className="rounded border border-border bg-card p-3">
            <p className="text-xs text-muted mb-1">Regeneração acum.</p>
            <p className="text-sm font-semibold text-foreground tnum font-mono">
              {indicator?.regeneracao_ha ? `${formatHa(indicator.regeneracao_ha)} ha` : "N/D"}
            </p>
          </div>
          <div className="rounded border border-border bg-card p-3">
            <p className="text-xs text-muted mb-1">Balanço líquido nativa</p>
            <p className="text-sm font-semibold text-foreground tnum font-mono">
              {indicator?.balanco_ha ? `${formatSignedHa(indicator.balanco_ha)} ha` : "N/D"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RegionTransitionsTable({ regionId }: { regionId: string }) {
  const { data, loading, error } = useAsync(() => loadRegionTransitions(regionId), [regionId]);

  const flows = useMemo(() => {
    if (!data) return [];
    const agg = new Map<string, number>();
    for (const r of data) {
      if (r.origem_id === r.destino_id) continue;
      const key = `${r.origem_id}__${r.destino_id}`;
      agg.set(key, (agg.get(key) ?? 0) + (Number(r.area_ha) || 0));
    }
    return [...agg.entries()]
      .map(([key, value]) => {
        const [origem, destino] = key.split("__");
        return { origem, destino, value };
      })
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const total = useMemo(() => flows.reduce((s, f) => s + f.value, 0), [flows]);

  if (loading) return <ChartSkeleton height={180} />;
  if (error) return <ErrorState error={error} />;
  if (!data || flows.length === 0) {
    return (
      <EmptyState title="Matriz de transição pendente">
        A matriz completa desta RGINT ainda não foi incorporada.
      </EmptyState>
    );
  }

  return (
    <div className="max-h-60 overflow-y-auto border border-border rounded">
      <Table>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow>
            <TableHead className="py-2 text-xs font-semibold">Origem</TableHead>
            <TableHead className="py-2 text-xs font-semibold">Destino</TableHead>
            <TableHead className="py-2 text-xs font-semibold text-right">Área (ha)</TableHead>
            <TableHead className="py-2 text-xs font-semibold text-right">% do total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flows.slice(0, 15).map((f) => (
            <TableRow key={`${f.origem}-${f.destino}`}>
              <TableCell className="py-2 text-xs">{shortClassLabel(f.origem)}</TableCell>
              <TableCell className="py-2 text-xs">{shortClassLabel(f.destino)}</TableCell>
              <TableCell className="py-2 text-xs text-right tnum font-mono">{formatHa(f.value)}</TableCell>
              <TableCell className="py-2 text-xs text-right tnum font-mono text-muted">
                {formatPct((f.value / total) * 100)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function MapView() {
  const geo = useAsync(loadGeoJson, []);
  const ind = useAsync(loadIndicators, []);
  const meta = useAsync(loadMeta, []);
  const ts = useAsync(loadAllTimeseries, []);
  // Default to the neutral base map (regions + basemap, no variable coloring).
  const [variable, setVariable] = useState<MapVar>("none");
  const [year, setYear] = useState<number>(2024);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [colorBlindMode, setColorBlindMode] = useState(false);
  const baseMode = variable === "none";
  const isClass = CLASS_ORDER.includes(variable as any);

  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const selectedMeta = useMemo(
    () => (selectedId ? meta.data?.find((m) => m.id === selectedId) : undefined),
    [meta.data, selectedId],
  );

  useEffect(() => {
    if (selectedMeta) {
      setSearchQuery(selectedMeta.nome);
    } else {
      setSearchQuery("");
    }
  }, [selectedMeta]);

  const suggestions = useMemo(() => {
    if (!searchQuery || !meta.data) return [];
    const query = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return meta.data
      .filter((m) => {
        const nameNorm = m.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const idNorm = m.id.toLowerCase();
        const ufNorm = m.uf.toLowerCase();
        return nameNorm.includes(query) || idNorm.includes(query) || ufNorm.includes(query);
      })
      .slice(0, 10);
  }, [searchQuery, meta.data]);





  const chartMode = useMemo(() => {
    if (isClass) {
      return `class:${variable}`;
    }
    return "geral";
  }, [variable, isClass]);

  const colorRange = useMemo(() => {
    if (baseMode || !ts.data) return undefined;
    if (!isClass) return undefined;
    
    let minVal = Infinity;
    let maxVal = -Infinity;
    
    for (const rId in ts.data) {
      const classSeries = ts.data[rId]?.[variable];
      if (!classSeries) continue;
      for (const y in classSeries) {
        const val = Number(classSeries[y]) || 0;
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
    }
    
    if (minVal === Infinity) return undefined;
    return { min: minVal, max: maxVal };
  }, [ts.data, variable, baseMode, isClass]);

  const byId = useMemo(() => {
    const m = new Map<string, RegionIndicator>();
    (ind.data ?? []).forEach((r) => m.set(String(r.rgint_id), r));
    return m;
  }, [ind.data]);

  const trace = useMemo(() => {
    if (!geo.data || !ind.data) return null;
    const locations: string[] = [];
    const z: number[] = [];
    const text: string[] = [];
    for (const f of geo.data.features) {
      const id = String(f.properties?.rgint ?? "");
      const rec = byId.get(id);
      if (!rec) continue;
      locations.push(id);
      if (baseMode) {
        z.push(0);
        text.push(`${rec.nome} (${rec.uf}) · ${rec.bioma}`);
      } else if (isClass) {
        const classSeries = ts.data?.[id]?.[variable];
        const val = classSeries ? (classSeries[String(year)] ?? 0) : 0;
        z.push(val || 0);
        text.push(`${rec.nome} (${rec.uf}) · ${rec.bioma}<br>${variable}: ${formatHa(val || 0)} ha (${year})`);
      } else {
        const raw = Number(rec[variable as keyof RegionIndicator]);
        z.push(variable === "balanco_ha" ? raw : Math.abs(raw));
        text.push(`${rec.nome} (${rec.uf}) · ${rec.bioma}<br>${formatHa(raw)} ha`);
      }
    }
    return { locations, z, text };
  }, [geo.data, ind.data, byId, variable, baseMode, isClass, year, ts.data]);

  const selectedInd = selectedId ? byId.get(selectedId) : undefined;

  const loading = geo.loading || ind.loading || (isClass && ts.loading);
  const error = geo.error || ind.error || (isClass && ts.error);
  const label = isClass ? `${variable} (${year})` : VARIABLES.find((v) => v.value === variable)!.label;
  let scale = baseMode
    ? { colorscale: undefined, diverging: false }
    : scaleForVariable(variable);

  if (colorBlindMode && !baseMode) {
    if (scale.diverging) {
      scale = { colorscale: COLORBLIND_DIVERGING, diverging: true };
    } else {
      scale = { colorscale: SEQ_GAIN, diverging: false };
    }
  }

  return (
    <div>
      <PageHeader
        title="Mapa Interativo"
        description="Coroplético das 133 Regiões Geográficas Intermediárias sobre mapa base. Clique em uma região para ver os detalhes ao lado."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
        <div className="w-full">
          <Select
            label="Variável / Classe de Uso do Solo"
            value={variable}
            onValueChange={(v) => setVariable(v as MapVar)}
            options={VARIABLES.map((v) => ({ value: v.value, label: v.label }))}
          />
        </div>
        <div className="w-full">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted">Buscar Região Intermediária</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: Barreiras, Cascavel..."
                className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded border border-border bg-card shadow-lg">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-accent/10 transition-colors border-b border-border last:border-0"
                      onMouseDown={() => {
                        setSelectedId(s.id);
                        setSearchQuery(s.nome);
                        setShowSuggestions(false);
                      }}
                    >
                      <span className="font-semibold text-foreground">{s.nome} ({s.uf})</span>
                      <span className="ml-2 text-muted-foreground font-mono">#{s.id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 w-full items-end justify-between sm:justify-start">
          <div className="flex gap-2 items-center shrink-0">
            {selectedId && (
              <button
                onClick={() => setSelectedId(null)}
                className="rounded border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-highlight hover:text-foreground transition-colors shrink-0"
              >
                Limpar Seleção
              </button>
            )}
            <button
              onClick={() => setColorBlindMode(!colorBlindMode)}
              className={cn(
                "rounded border px-3 py-2 text-xs font-semibold transition-colors shrink-0",
                colorBlindMode
                  ? "bg-accent border-accent text-white hover:bg-accent/90"
                  : "border-border text-foreground hover:bg-card"
              )}
            >
              {colorBlindMode ? "Daltônico: Ativado" : "Modo Daltônico"}
            </button>
          </div>
          {isClass && (
            <div className="w-full max-w-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Ano de visualização</span>
                <span className="mono font-semibold text-foreground">{year}</span>
              </div>
              <Slider
                min={2008}
                max={2024}
                step={1}
                value={year}
                onValueChange={setYear}
              />
            </div>
          )}
        </div>
      </div>

      {/* Split-screen: map (left) ◄ ► region detail panel (right). */}
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem] xl:grid-cols-[1fr_26rem]">
        <Card>
          <CardContent className="pt-5">
            {loading ? (
              <ChartSkeleton height={560} />
            ) : error ? (
              <ErrorState error={error} />
            ) : trace ? (
              <Suspense fallback={<ChartSkeleton height={560} />}>
                <ChoroplethMap
                  geojson={geo.data!}
                  locations={trace.locations}
                  z={trace.z}
                  text={trace.text}
                  colorbarTitle={label}
                  colorscale={scale.colorscale}
                  diverging={scale.diverging}
                  baseMode={baseMode}
                  onRegionClick={(id) => setSelectedId(id)}
                  selectedLocation={selectedId}
                  zmin={colorRange?.min}
                  zmax={colorRange?.max}
                />
              </Suspense>
            ) : null}
            <p className="mt-3 text-xs text-muted">
              {baseMode
                ? "Mapa base — 133 regiões intermediárias. Selecione uma variável para colorir, ou clique numa região."
                : `${scale.diverging ? "Escala divergente (perda ↔ ganho)" : "Escala sequencial perceptual"} · valores acumulados 2008–2024 · ${trace?.locations.length ?? 0} regiões.`}
            </p>
          </CardContent>
        </Card>

        {/* Right detail panel — updates on map click, no page navigation. */}
        <div className="min-w-0 space-y-4">
          {!selectedMeta ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <MousePointerClick className="h-8 w-8 text-muted" />
                <p className="text-sm text-muted">
                  Clique em uma região no mapa para ver a série temporal e a
                  comparação multi-fonte.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Prominent "more detail" actions pinned to the top of the panel. */}
              <Link
                to={`/region/${selectedMeta.id}`}
                className="flex items-center justify-between gap-2 rounded-md bg-[#0F766E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0D655E]"
              >
                <span>Ficha completa de {selectedMeta.nome}</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>

              <Card>
                <CardContent className="pt-5">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">
                    Série Temporal & Comparação Multi-fonte
                  </h3>
                    <TabTimeseries
                      regionId={selectedMeta.id}
                      initialMode={chartMode}
                    />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {selectedMeta && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_22rem] xl:grid-cols-[1fr_26rem]">
          {/* Bottom Left: Horizontal Summary & Soy Expansion */}
          <div className="space-y-4 min-w-0">
            <RegionSummaryHorizontal meta={selectedMeta} indicator={selectedInd} />
            <Card>
              <CardContent className="pt-5">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Expansão da soja (iLUC)
                </h3>
                <TabExpansion bioma={selectedMeta.bioma_principal} uf={selectedMeta.uf} />
              </CardContent>
            </Card>
          </div>

          {/* Bottom Right: Transitions Table */}
          <Card className="min-w-0">
            <CardContent className="pt-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Tabela de Transições ({selectedMeta.nome})
              </h3>
              <RegionTransitionsTable regionId={selectedMeta.id} />
            </CardContent>
          </Card>
        </div>
      )}

      {meta.loading && !selectedMeta ? (
        <EmptyState title="Carregando metadados das regiões…" />
      ) : null}
    </div>
  );
}
