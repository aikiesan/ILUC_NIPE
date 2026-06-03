import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MousePointerClick } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { ChartSkeleton, EmptyState, ErrorState } from "@/components/common/StateBlocks";
import { RegionSummary } from "@/components/region/RegionSummary";
import { RegionFicha } from "@/components/region/RegionFicha";
import { TabExpansion } from "@/components/region/TabExpansion";
import { useAsync } from "@/lib/useAsync";
import { loadGeoJson, loadIndicators, loadMeta } from "@/lib/data";
import { formatHa } from "@/lib/format";
import { scaleForVariable } from "@/lib/colors";
import type { RegionIndicator } from "@/lib/types";

const ChoroplethMap = lazy(() => import("@/components/charts/ChoroplethMap"));

type MapVar = keyof RegionIndicator | "none";

const VARIABLES: { value: MapVar; label: string }[] = [
  { value: "none", label: "Mapa base (sem variável)" },
  { value: "pressao_ha", label: "Pressão antrópica (ha)" },
  { value: "soja_2024_ha", label: "Área de soja (ha)" },
  { value: "balanco_ha", label: "Balanço líquido veg. nativa (ha)" },
  { value: "regeneracao_ha", label: "Regeneração (ha)" },
];

export default function MapView() {
  const geo = useAsync(loadGeoJson, []);
  const ind = useAsync(loadIndicators, []);
  const meta = useAsync(loadMeta, []);
  // Default to the neutral base map (regions + basemap, no variable coloring).
  const [variable, setVariable] = useState<MapVar>("none");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const baseMode = variable === "none";

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
      } else {
        const raw = Number(rec[variable as keyof RegionIndicator]);
        z.push(variable === "balanco_ha" ? raw : Math.abs(raw));
        text.push(`${rec.nome} (${rec.uf}) · ${rec.bioma}<br>${formatHa(raw)} ha`);
      }
    }
    return { locations, z, text };
  }, [geo.data, ind.data, byId, variable, baseMode]);

  const selectedMeta = useMemo(
    () => (selectedId ? meta.data?.find((m) => m.id === selectedId) : undefined),
    [meta.data, selectedId],
  );
  const selectedInd = selectedId ? byId.get(selectedId) : undefined;

  const loading = geo.loading || ind.loading;
  const error = geo.error || ind.error;
  const label = VARIABLES.find((v) => v.value === variable)!.label;
  const scale = baseMode
    ? { colorscale: undefined, diverging: false }
    : scaleForVariable(variable);

  return (
    <div>
      <PageHeader
        title="Mapa Interativo"
        description="Coroplético das 133 Regiões Geográficas Intermediárias sobre mapa base. Clique em uma região para ver os detalhes ao lado."
      />

      <div className="mb-4 max-w-xs">
        <Select
          label="Variável"
          value={variable}
          onValueChange={(v) => setVariable(v as MapVar)}
          options={VARIABLES.map((v) => ({ value: v.value, label: v.label }))}
        />
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
                  Clique em uma região no mapa para ver indicadores e a
                  decomposição da expansão da soja (direta vs. indireta).
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

              <RegionFicha regionId={selectedMeta.id} />

              <RegionSummary meta={selectedMeta} indicator={selectedInd} />

              <Card>
                <CardContent className="pt-5">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">
                    Expansão da soja (iLUC)
                  </h3>
                  <TabExpansion bioma={selectedMeta.bioma_principal} uf={selectedMeta.uf} />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {meta.loading && !selectedMeta ? (
        <EmptyState title="Carregando metadados das regiões…" />
      ) : null}
    </div>
  );
}
