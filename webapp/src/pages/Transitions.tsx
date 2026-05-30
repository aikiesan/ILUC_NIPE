import { lazy, Suspense, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartSkeleton, EmptyState, ErrorState } from "@/components/common/StateBlocks";
import { useAsync } from "@/lib/useAsync";
import { downloadCsv, loadNationalTransitions } from "@/lib/data";
import { shortClassLabel } from "@/lib/classes";
import { formatHa, formatPct } from "@/lib/format";
import type { SankeyFlow } from "@/components/charts/SankeyChart";

const SankeyChart = lazy(() => import("@/components/charts/SankeyChart"));

const PERIODS = [
  { value: "2008_2017", label: "2008 → 2017" },
  { value: "2017_2024", label: "2017 → 2024" },
  { value: "2008_2024", label: "2008 → 2024 (acumulado)" },
];

export default function Transitions() {
  const { data, loading, error } = useAsync(loadNationalTransitions, []);
  const [period, setPeriod] = useState("2008_2024");

  const rows = useMemo(
    () =>
      (data ?? [])
        .filter((r) => r.periodo === period)
        .sort((a, b) => b.area_ha - a.area_ha),
    [data, period],
  );
  const total = useMemo(() => rows.reduce((s, r) => s + r.area_ha, 0), [rows]);
  const top20 = rows.slice(0, 20);
  const flows = useMemo<SankeyFlow[]>(
    () =>
      rows.slice(0, 12).map((r) => ({
        source: shortClassLabel(r.origem_nome),
        target: shortClassLabel(r.destino_nome),
        value: r.area_ha,
      })),
    [rows],
  );

  return (
    <div>
      <PageHeader
        title="Análise de Transições Nacionais"
        description="Fluxos de conversão entre classes de uso do solo agregados nacionalmente, por período GTAP."
        actions={
          rows.length > 0 && (
            <button
              onClick={() => downloadCsv(`transicoes_${period}.csv`, rows as unknown as Record<string, unknown>[])}
              className="flex items-center gap-2 rounded border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-highlight"
            >
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </button>
          )
        }
      />

      <div className="mb-4 max-w-xs">
        <Select label="Período" value={period} onValueChange={setPeriod} options={PERIODS} />
      </div>

      {loading ? (
        <ChartSkeleton height={460} />
      ) : error ? (
        <ErrorState error={error} />
      ) : flows.length === 0 ? (
        <EmptyState title="Matrizes de transição em processamento">
          Os fluxos nacionais serão exibidos assim que as matrizes completas das 133 RGINTs
          forem incorporadas ao pipeline de dados.
        </EmptyState>
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="pt-5">
              <Suspense fallback={<ChartSkeleton height={460} />}>
                <SankeyChart flows={flows} height={460} />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead className="text-right">Área (ha)</TableHead>
                  <TableHead className="text-right">% do total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top20.map((r, i) => (
                  <TableRow key={`${r.origem_id}-${r.destino_id}`}>
                    <TableCell className="mono text-muted">{i + 1}</TableCell>
                    <TableCell>{shortClassLabel(r.origem_nome)}</TableCell>
                    <TableCell>{shortClassLabel(r.destino_nome)}</TableCell>
                    <TableCell className="text-right tnum">{formatHa(r.area_ha)}</TableCell>
                    <TableCell className="text-right tnum text-muted">
                      {formatPct((r.area_ha / total) * 100)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <p className="mt-3 text-xs text-muted">
            20 maiores transições do período · total das transições: {formatHa(total)} ha.
          </p>
        </>
      )}
    </div>
  );
}
