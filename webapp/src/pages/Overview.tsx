import { lazy, Suspense, useMemo } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Scale, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartSkeleton, EmptyState, ErrorState } from "@/components/common/StateBlocks";
import { useAsync } from "@/lib/useAsync";
import { loadNationalTimeseries, loadNationalTransitions } from "@/lib/data";
import { compositionLatestYear, nativeByBiomeYear } from "@/lib/analytics";
import { shortClassLabel } from "@/lib/classes";
import { formatHa, formatPct } from "@/lib/format";
import type { SankeyFlow } from "@/components/charts/SankeyChart";

const SankeyChart = lazy(() => import("@/components/charts/SankeyChart"));

// Grayscale palette for categorical series.
const GRAYS = ["#0A0A0A", "#525252", "#737373", "#9CA3AF", "#BDBDBD", "#D4D4D4", "#E5E5E5"];

const KPIS = [
  { label: "Pressão antrópica 2008–2024", value: "38.392.587 ha", hint: "Conversão acumulada de vegetação nativa", icon: <TrendingDown className="h-4 w-4" /> },
  { label: "Regeneração acumulada", value: "487.648 ha", hint: "Ganho bruto de vegetação nativa", icon: <ArrowUpRight className="h-4 w-4" /> },
  { label: "Balanço líquido veg. nativa", value: "−37.904.939 ha", hint: "Perda líquida 2008–2024", icon: <ArrowDownRight className="h-4 w-4" /> },
  { label: "Razão pressão / regeneração", value: "78,7 : 1", hint: "Pressão muito superior à recuperação", icon: <Scale className="h-4 w-4" /> },
];

export default function Overview() {
  const ts = useAsync(loadNationalTimeseries, []);
  const tr = useAsync(loadNationalTransitions, []);

  const lineData = useMemo(
    () => (ts.data ? nativeByBiomeYear(ts.data, ["Amazônia", "Cerrado"]) : []),
    [ts.data],
  );
  const composition = useMemo(
    () => (ts.data ? compositionLatestYear(ts.data) : null),
    [ts.data],
  );
  const sankeyFlows = useMemo<SankeyFlow[]>(() => {
    if (!tr.data) return [];
    return tr.data
      .filter((r) => r.periodo === "2008_2024")
      .sort((a, b) => b.area_ha - a.area_ha)
      .slice(0, 6)
      .map((r) => ({
        source: shortClassLabel(r.origem_nome),
        target: shortClassLabel(r.destino_nome),
        value: r.area_ha,
      }));
  }, [tr.data]);

  return (
    <div>
      <PageHeader
        title="Visão Nacional"
        description="Síntese da mudança de uso e cobertura da terra no Brasil entre 2008 e 2024, agregando as 133 Regiões Geográficas Intermediárias."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vegetação nativa por bioma</CardTitle>
            <CardDescription>Estoque de vegetação nativa (Mha) · Amazônia e Cerrado</CardDescription>
          </CardHeader>
          <CardContent>
            {ts.loading ? (
              <ChartSkeleton />
            ) : ts.error ? (
              <ErrorState error={ts.error} />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={lineData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                  <XAxis dataKey="ano" tick={{ fontSize: 11 }} stroke="#6B6B6B" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#6B6B6B" width={44}
                    label={{ value: "Mha", angle: -90, position: "insideLeft", fontSize: 11, fill: "#6B6B6B" }} />
                  <Tooltip
                    formatter={(v: number) => `${v.toFixed(2)} Mha`}
                    contentStyle={{ fontSize: 12, borderColor: "#E5E5E5", borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Amazônia" stroke="#0A0A0A" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Cerrado" stroke="#9CA3AF" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Composição do uso do solo</CardTitle>
            <CardDescription>
              Distribuição nacional {composition ? `· ${composition.year}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ts.loading ? (
              <ChartSkeleton />
            ) : ts.error ? (
              <ErrorState error={ts.error} />
            ) : composition ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={composition.groups}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={64}
                    outerRadius={110}
                    paddingAngle={1}
                  >
                    {composition.groups.map((_, i) => (
                      <Cell key={i} fill={GRAYS[i % GRAYS.length]} stroke="#FFFFFF" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, n) => [
                      `${formatHa(v)} ha · ${formatPct((v / composition.total) * 100)}`,
                      n as string,
                    ]}
                    contentStyle={{ fontSize: 12, borderColor: "#E5E5E5", borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Sem dados de composição" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Principais transições acumuladas 2008–2024</CardTitle>
          <CardDescription>
            Fluxos de conversão entre classes (ha). Atualiza automaticamente conforme as
            matrizes das 133 RGINTs forem incorporadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tr.loading ? (
            <ChartSkeleton height={420} />
          ) : tr.error ? (
            <ErrorState error={tr.error} />
          ) : sankeyFlows.length > 0 ? (
            <Suspense fallback={<ChartSkeleton height={420} />}>
              <SankeyChart flows={sankeyFlows} height={420} />
            </Suspense>
          ) : (
            <EmptyState title="Matrizes de transição em processamento">
              Os fluxos nacionais aparecerão aqui assim que as matrizes completas das 133 RGINTs
              forem geradas pelo pipeline.
            </EmptyState>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
