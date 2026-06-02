import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAsync } from "@/lib/useAsync";
import {
  downloadCsv,
  loadRegionMatrix,
  loadRegionPam,
  loadRegionSeries,
  matrixToRows,
  seriesToRows,
} from "@/lib/data";

interface RegionDownloadsProps {
  regionId: string;
}

/** Per-region data downloads — timeseries, PAM, and the 15×15 matrix (when present). */
export function RegionDownloads({ regionId }: RegionDownloadsProps) {
  const series = useAsync(() => loadRegionSeries(regionId), [regionId]);
  const pam = useAsync(() => loadRegionPam(regionId), [regionId]);
  const matrix = useAsync(() => loadRegionMatrix(regionId), [regionId]);

  const items: { label: string; ready: boolean; onClick: () => void }[] = [
    {
      label: "Série temporal (CSV)",
      ready: !!series.data,
      onClick: () => series.data && downloadCsv(`serie_rgint_${regionId}.csv`, seriesToRows(series.data)),
    },
    {
      label: "Produção PAM (CSV)",
      ready: !!pam.data?.length,
      onClick: () => pam.data && downloadCsv(`pam_rgint_${regionId}.csv`, pam.data as unknown as Record<string, unknown>[]),
    },
    {
      label: "Matriz de transição (CSV)",
      ready: !!matrix.data,
      onClick: () => matrix.data && downloadCsv(`matriz_rgint_${regionId}.csv`, matrixToRows(matrix.data)),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Downloads</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((it) => (
          <button
            key={it.label}
            type="button"
            disabled={!it.ready}
            onClick={it.onClick}
            className="flex w-full items-center justify-between gap-2 rounded border border-border px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-highlight disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>{it.label}</span>
            <Download className="h-3.5 w-3.5 shrink-0 text-muted" />
          </button>
        ))}
        <p className="text-xs text-muted">
          A matriz fica disponível para regiões já reconciliadas. As demais serão liberadas
          após a integração dos dados HARVEX.
        </p>
      </CardContent>
    </Card>
  );
}
