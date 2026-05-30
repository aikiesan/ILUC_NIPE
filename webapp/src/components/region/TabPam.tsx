import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartSkeleton, EmptyState, ErrorState } from "@/components/common/StateBlocks";
import { useAsync } from "@/lib/useAsync";
import { loadRegionPam } from "@/lib/data";
import { formatHa, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

const CULTURES = ["soja", "milho", "cana", "algodao"] as const;
const LABELS: Record<string, string> = {
  soja: "Soja", milho: "Milho", cana: "Cana-de-açúcar", algodao: "Algodão",
};
const COLORS: Record<string, string> = {
  soja: "#0A0A0A", milho: "#525252", cana: "#9CA3AF", algodao: "#D4D4D4",
};

export function TabPam({ regionId }: { regionId: string }) {
  const { data, loading, error } = useAsync(() => loadRegionPam(regionId), [regionId]);
  const [mode, setMode] = useState<"absolute" | "relative">("absolute");

  const chartData = useMemo(() => {
    if (!data) return [];
    const byYear = new Map<number, Record<string, number>>();
    for (const r of data) {
      const e = byYear.get(r.ano) ?? {};
      e[r.cultura] = (e[r.cultura] ?? 0) + (Number(r.area_ha) || 0);
      byYear.set(r.ano, e);
    }
    const years = [...byYear.keys()].sort((a, b) => a - b);
    const base = byYear.get(years[0]) ?? {};
    return years.map((ano) => {
      const vals = byYear.get(ano)!;
      const row: Record<string, number> = { ano };
      for (const c of CULTURES) {
        if (mode === "absolute") row[c] = vals[c] ?? 0;
        else {
          const b = base[c] ?? 0;
          row[c] = b > 0 ? ((vals[c] ?? 0) - b) / b * 100 : 0;
        }
      }
      return row;
    });
  }, [data, mode]);

  if (loading) return <ChartSkeleton height={320} />;
  if (error) return <ErrorState error={error} />;
  if (!chartData.length) return <EmptyState title="Sem dados de PAM para esta região" />;

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-1 rounded border border-border bg-highlight p-1">
        {([["absolute", "Área plantada"], ["relative", "Variação % vs 2008"]] as const).map(
          ([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                mode === key ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ),
        )}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
          <XAxis dataKey="ano" tick={{ fontSize: 11 }} stroke="#6B6B6B" />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="#6B6B6B"
            width={56}
            tickFormatter={(v: number) => (mode === "absolute" ? `${(v / 1000).toFixed(0)}k` : `${v.toFixed(0)}%`)}
          />
          <Tooltip
            formatter={(v: number, n) => [
              mode === "absolute" ? `${formatHa(v)} ha` : formatPct(v),
              LABELS[n as string] ?? n,
            ]}
            contentStyle={{ fontSize: 12, borderColor: "#E5E5E5", borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={(n) => LABELS[n] ?? n} />
          {CULTURES.map((c) => (
            <Bar key={c} dataKey={c} fill={COLORS[c]} radius={[2, 2, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
