import { lazy, Suspense, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { ChartSkeleton, ErrorState } from "@/components/common/StateBlocks";
import { useAsync } from "@/lib/useAsync";
import { loadGeoJson, loadIndicators } from "@/lib/data";
import { formatHa } from "@/lib/format";
import type { RegionIndicator } from "@/lib/types";

const ChoroplethMap = lazy(() => import("@/components/charts/ChoroplethMap"));

const VARIABLES: { value: keyof RegionIndicator; label: string }[] = [
  { value: "pressao_ha", label: "Pressão antrópica (ha)" },
  { value: "soja_2024_ha", label: "Área de soja (ha)" },
  { value: "balanco_ha", label: "Balanço líquido veg. nativa (ha)" },
  { value: "regeneracao_ha", label: "Regeneração (ha)" },
];

export default function MapView() {
  const geo = useAsync(loadGeoJson, []);
  const ind = useAsync(loadIndicators, []);
  const navigate = useNavigate();
  const [variable, setVariable] = useState<keyof RegionIndicator>("pressao_ha");

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
      const raw = Number(rec[variable]);
      z.push(variable === "balanco_ha" ? Math.abs(raw) : raw);
      text.push(`${rec.nome} (${rec.uf}) · ${rec.bioma}<br>${formatHa(raw)} ha`);
    }
    return { locations, z, text };
  }, [geo.data, ind.data, byId, variable]);

  const loading = geo.loading || ind.loading;
  const error = geo.error || ind.error;
  const label = VARIABLES.find((v) => v.value === variable)!.label;

  return (
    <div>
      <PageHeader
        title="Mapa Interativo"
        description="Coroplético das 133 Regiões Geográficas Intermediárias. Clique em uma região para abrir a ficha analítica."
      />

      <div className="mb-4 max-w-xs">
        <Select
          label="Variável"
          value={variable}
          onValueChange={(v) => setVariable(v as keyof RegionIndicator)}
          options={VARIABLES.map((v) => ({ value: v.value, label: v.label }))}
        />
      </div>

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
                onRegionClick={(id) => navigate(`/region/${id}`)}
              />
            </Suspense>
          ) : null}
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted">
        Escala de cinza · valores acumulados 2008–2024 · {trace?.locations.length ?? 0} regiões.
      </p>
    </div>
  );
}
