import { lazy, Suspense, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartSkeleton, EmptyState, ErrorState } from "@/components/common/StateBlocks";
import { useAsync } from "@/lib/useAsync";
import { loadRegionTransitions } from "@/lib/data";
import { shortClassLabel } from "@/lib/classes";
import { formatHa, formatPct } from "@/lib/format";
import type { SankeyFlow } from "@/components/charts/SankeyChart";

const SankeyChart = lazy(() => import("@/components/charts/SankeyChart"));

export function TabTransitions({ regionId }: { regionId: string }) {
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
  const sankey = useMemo<SankeyFlow[]>(
    () =>
      flows.slice(0, 8).map((f) => ({
        source: shortClassLabel(f.origem),
        target: shortClassLabel(f.destino),
        value: f.value,
      })),
    [flows],
  );

  if (loading) return <ChartSkeleton height={360} />;
  if (error) return <ErrorState error={error} />;
  if (!data || flows.length === 0) {
    return (
      <EmptyState title="Matriz de transição pendente">
        A matriz completa desta RGINT ainda não foi incorporada. Os fluxos aparecerão
        automaticamente quando o dataset das 133 regiões estiver disponível.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <Suspense fallback={<ChartSkeleton height={360} />}>
          <SankeyChart flows={sankey} height={360} />
        </Suspense>
      </Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Origem</TableHead>
            <TableHead>Destino</TableHead>
            <TableHead className="text-right">Área (ha)</TableHead>
            <TableHead className="text-right">% do total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flows.slice(0, 15).map((f) => (
            <TableRow key={`${f.origem}-${f.destino}`}>
              <TableCell>{shortClassLabel(f.origem)}</TableCell>
              <TableCell>{shortClassLabel(f.destino)}</TableCell>
              <TableCell className="text-right tnum">{formatHa(f.value)}</TableCell>
              <TableCell className="text-right tnum text-muted">
                {formatPct((f.value / total) * 100)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
