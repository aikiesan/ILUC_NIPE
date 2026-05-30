import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatHa, formatSignedHa } from "@/lib/format";
import type { RegionIndicator, RegionMeta } from "@/lib/types";

interface RegionSummaryProps {
  meta: RegionMeta;
  indicator?: RegionIndicator;
}

export function RegionSummary({ meta, indicator }: RegionSummaryProps) {
  const stats = [
    { label: "Área agrícola (PAM)", value: `${formatHa(indicator?.area_agro_2024)} ha` },
    { label: "Pressão antrópica acum.", value: `${formatHa(indicator?.pressao_ha)} ha` },
    { label: "Regeneração acum.", value: `${formatHa(indicator?.regeneracao_ha)} ha` },
    { label: "Balanço líquido veg. nativa", value: `${formatSignedHa(indicator?.balanco_ha)} ha` },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="solid" className="mono">{meta.id}</Badge>
            <Badge variant="outline">{meta.uf}</Badge>
            <Badge>{meta.bioma_principal}</Badge>
          </div>
          <CardTitle className="mt-1 text-lg">{meta.nome}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            <span className="mono text-xs">
              {meta.lat_centroide.toFixed(2)}, {meta.lon_centroide.toFixed(2)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <p className="text-xs text-muted">Área total</p>
              <p className="text-sm font-semibold text-foreground tnum">{formatHa(meta.area_ha)} ha</p>
            </div>
            <div>
              <p className="text-xs text-muted">Municípios</p>
              <p className="text-sm font-semibold text-foreground tnum">{meta.n_municipios}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Indicadores-síntese</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.map((s) => (
            <div key={s.label} className="flex items-baseline justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
              <span className="text-xs text-muted">{s.label}</span>
              <span className="text-sm font-semibold text-foreground tnum">{s.value}</span>
            </div>
          ))}
          {indicator && (
            <div className="mt-2 rounded bg-highlight p-3 text-center">
              <p className="text-xs text-muted">Ranking de pressão (entre 133)</p>
              <p className="mono text-2xl font-bold text-foreground">#{indicator.ranking_pressao}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
