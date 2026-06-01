import { lazy, Suspense, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { ChartSkeleton, EmptyState, ErrorState } from "@/components/common/StateBlocks";
import { useAsync } from "@/lib/useAsync";
import { downloadCsv, loadRegionMatrix } from "@/lib/data";
import { shortClassLabel } from "@/lib/classes";
import { formatHa, formatPct } from "@/lib/format";
import type { RegionMatrix } from "@/lib/types";

const HeatmapChart = lazy(() => import("@/components/charts/HeatmapChart"));

interface CellDetail {
  origem: string;
  destino: string;
  area: number;
  pctOrigin: number;
  pctDest: number;
}

export function TabMatrix({ regionId }: { regionId: string }) {
  const { data, loading, error } = useAsync(() => loadRegionMatrix(regionId), [regionId]);
  const [year, setYear] = useState<string | null>(null);
  const [detail, setDetail] = useState<CellDetail | null>(null);

  const activeYear = year ?? (data ? String(data.anchor_years[data.anchor_years.length - 1]) : "");

  const grid = useMemo(() => buildGrid(data, activeYear), [data, activeYear]);

  if (loading) return <ChartSkeleton height={520} />;
  if (error) return <ErrorState error={error} />;
  if (!data || !grid) {
    return (
      <EmptyState title="Matriz de transição pendente">
        O heatmap 15×15 será exibido quando a matriz desta RGINT for incorporada ao dataset.
      </EmptyState>
    );
  }

  const { z, labels, rowTotals, colTotals } = grid;

  const handleClick = (row: number, col: number) => {
    const area = z[row][col] ?? 0;
    setDetail({
      origem: labels[row],
      destino: labels[col],
      area,
      pctOrigin: rowTotals[row] > 0 ? (area / rowTotals[row]) * 100 : 0,
      pctDest: colTotals[col] > 0 ? (area / colTotals[col]) * 100 : 0,
    });
  };

  const exportCsv = () => {
    const rows: Record<string, unknown>[] = [];
    labels.forEach((origem, r) =>
      labels.forEach((destino, c) => {
        if (z[r][c]) rows.push({ origem, destino, area_ha: z[r][c] });
      }),
    );
    downloadCsv(`matriz_${regionId}_${activeYear}.csv`, rows);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-[12rem]">
          <Select
            label="Ano-âncora"
            value={activeYear}
            onValueChange={setYear}
            options={data.anchor_years.map((y) => ({ value: String(y), label: String(y) }))}
          />
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 rounded border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-highlight"
        >
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </button>
      </div>

      <Suspense fallback={<ChartSkeleton height={520} />}>
        <HeatmapChart
          z={z}
          x={labels.map(shortClassLabel)}
          y={labels.map(shortClassLabel)}
          onCellClick={handleClick}
        />
      </Suspense>
      <p className="text-xs text-muted">Clique em uma célula para ver os detalhes da transição.</p>

      <Dialog open={!!detail} onClose={() => setDetail(null)} title="Detalhe da transição">
        {detail && (
          <div className="space-y-2">
            <p>
              <strong>{shortClassLabel(detail.origem)}</strong> →{" "}
              <strong>{shortClassLabel(detail.destino)}</strong>
            </p>
            <p className="tnum">Área: {formatHa(detail.area)} ha</p>
            <p className="tnum text-muted">% da origem: {formatPct(detail.pctOrigin)}</p>
            <p className="tnum text-muted">% do destino: {formatPct(detail.pctDest)}</p>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function buildGrid(data: RegionMatrix | null, year: string) {
  if (!data || !year || !data.matrices[year]) return null;
  const labels = data.classes;
  const matrix = data.matrices[year];
  const z: number[][] = labels.map((origem) =>
    labels.map((destino) => {
      const v = matrix[origem]?.[destino];
      return v == null ? 0 : Number(v);
    }),
  );
  const rowTotals = z.map((row) => row.reduce((s, v) => s + v, 0));
  const colTotals = labels.map((_, c) => z.reduce((s, row) => s + row[c], 0));
  return { z, labels, rowTotals, colTotals };
}
