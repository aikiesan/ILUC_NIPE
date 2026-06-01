import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Slider } from "@/components/ui/slider";
import { NATIVE_CLASSES, PASTURE_CLASSES } from "@/lib/classes";
import { formatHa } from "@/lib/format";
import type { RegionSeries } from "@/lib/types";

const SOJA = "2 - Soja";

function sumClasses(series: RegionSeries, classes: string[], year: string): number {
  return classes.reduce((acc, c) => acc + (Number(series[c]?.[year]) || 0), 0);
}

export function TabTimeseries({ series }: { series: RegionSeries }) {
  const years = useMemo(() => {
    const ys = new Set<string>();
    Object.values(series).forEach((byYear) => Object.keys(byYear).forEach((y) => ys.add(y)));
    return [...ys].sort();
  }, [series]);

  const data = useMemo(
    () =>
      years.map((y) => ({
        ano: Number(y),
        Soja: Number(series[SOJA]?.[y]) || 0,
        Pastagem: sumClasses(series, PASTURE_CLASSES, y),
        "Veg. nativa": sumClasses(series, NATIVE_CLASSES, y),
      })),
    [years, series],
  );

  const [yearIdx, setYearIdx] = useState(years.length - 1);
  const selected = data[yearIdx] ?? data[data.length - 1];

  if (!data.length) return null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {(["Soja", "Pastagem", "Veg. nativa"] as const).map((k) => (
          <div key={k} className="rounded border border-border bg-card p-3">
            <p className="text-xs text-muted">{k}</p>
            <p className="text-base font-semibold text-foreground tnum">
              {formatHa(selected?.[k])} ha
            </p>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-muted">
          <span>Ano</span>
          <span className="mono font-semibold text-foreground">{selected?.ano}</span>
        </div>
        <Slider
          min={0}
          max={years.length - 1}
          step={1}
          value={yearIdx}
          onValueChange={setYearIdx}
        />
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
          <XAxis dataKey="ano" tick={{ fontSize: 11 }} stroke="#6B6B6B" />
          <YAxis tick={{ fontSize: 11 }} stroke="#6B6B6B" width={56}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            formatter={(v: number) => `${formatHa(v)} ha`}
            contentStyle={{ fontSize: 12, borderColor: "#E5E5E5", borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Soja" stroke="#0A0A0A" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Pastagem" stroke="#737373" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Veg. nativa" stroke="#BDBDBD" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
