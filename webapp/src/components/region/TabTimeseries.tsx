import { useEffect, useMemo, useState } from "react";
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
import { Select } from "@/components/ui/select";
import { NATIVE_CLASSES, PASTURE_CLASSES } from "@/lib/classes";
import { formatHa } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { loadRegionPam } from "@/lib/data";
import type { RegionSeries } from "@/lib/types";

const SOJA = "2 - Soja";
const SOJA_MILHO = "3 - Soja + Milho 2ª safra";
const MILHO_1A = "4 - Milho 1ª safra";
const CANA = "5 - Cana-de-açúcar";

type ViewMode = "geral" | "soja" | "milho" | "cana";

function sumClasses(series: RegionSeries, classes: string[], year: string): number {
  return classes.reduce((acc, c) => acc + (Number(series[c]?.[year]) || 0), 0);
}

export function TabTimeseries({
  series,
  regionId,
  initialMode,
}: {
  series: RegionSeries;
  regionId: string;
  initialMode?: ViewMode;
}) {
  const pam = useAsync(() => loadRegionPam(regionId), [regionId]);
  const [mode, setMode] = useState<ViewMode>(initialMode || "geral");

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  const years = useMemo(() => {
    const ys = new Set<string>();
    Object.values(series).forEach((byYear) => Object.keys(byYear).forEach((y) => ys.add(y)));
    return [...ys].sort();
  }, [series]);

  const pamByYear = useMemo(() => {
    const m = new Map<number, Record<string, number>>();
    if (!pam.data) return m;
    for (const r of pam.data) {
      const e = m.get(r.ano) ?? {};
      e[r.cultura] = (e[r.cultura] ?? 0) + (Number(r.area_ha) || 0);
      m.set(r.ano, e);
    }
    return m;
  }, [pam.data]);

  const data = useMemo(
    () =>
      years.map((y) => {
        const yearNum = Number(y);
        const pVals = pamByYear.get(yearNum) ?? {};

        const mbSoja = (Number(series[SOJA]?.[y]) || 0) + (Number(series[SOJA_MILHO]?.[y]) || 0);
        const mbMilho = (Number(series[MILHO_1A]?.[y]) || 0) + (Number(series[SOJA_MILHO]?.[y]) || 0);
        const mbCana = Number(series[CANA]?.[y]) || 0;
        const mbPastagem = sumClasses(series, PASTURE_CLASSES, y);
        const mbVegNativa = sumClasses(series, NATIVE_CLASSES, y);

        return {
          ano: yearNum,
          "Soja (MapBiomas)": mbSoja,
          "Pastagem (MapBiomas)": mbPastagem,
          "Veg. nativa (MapBiomas)": mbVegNativa,
          "Milho (MapBiomas)": mbMilho,
          "Cana (MapBiomas)": mbCana,
          "Soja (IBGE PAM)": pVals["soja"] ?? null,
          "Milho (IBGE PAM)": pVals["milho"] ?? null,
          "Cana (IBGE PAM)": pVals["cana"] ?? null,
        };
      }),
    [years, series, pamByYear],
  );

  const [yearIdx, setYearIdx] = useState(years.length - 1);
  const selected = data[yearIdx] ?? data[data.length - 1];

  if (!data.length) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between">
        <div className="w-full max-w-xs">
          <Select
            label="Visualização do Gráfico"
            value={mode}
            onValueChange={(v) => setMode(v as ViewMode)}
            options={[
              { value: "geral", label: "Visão Geral (Soja/Pastagem/Veg. nativa)" },
              { value: "soja", label: "Comparação: Soja (MapBiomas vs IBGE PAM)" },
              { value: "milho", label: "Comparação: Milho (MapBiomas vs IBGE PAM)" },
              { value: "cana", label: "Comparação: Cana (MapBiomas vs IBGE PAM)" },
            ]}
          />
        </div>

        <div className="flex-1 w-full max-w-xs">
          <div className="mb-1 flex items-center justify-between text-xs text-muted">
            <span>Seletor de Ano</span>
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
      </div>

      <div className="grid grid-cols-3 gap-3">
        {mode === "geral" ? (
          <>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-xs text-muted">Veg. nativa (MapBiomas)</p>
              <p className="text-base font-semibold text-foreground tnum">
                {formatHa(selected?.["Veg. nativa (MapBiomas)"])} ha
              </p>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-xs text-muted">Pastagem (MapBiomas)</p>
              <p className="text-base font-semibold text-foreground tnum">
                {formatHa(selected?.["Pastagem (MapBiomas)"])} ha
              </p>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-xs text-muted">Soja (MapBiomas)</p>
              <p className="text-base font-semibold text-foreground tnum">
                {formatHa(selected?.["Soja (MapBiomas)"])} ha
              </p>
            </div>
          </>
        ) : mode === "soja" ? (
          <>
            <div className="rounded border border-border bg-card p-3 col-span-2">
              <p className="text-xs text-muted">Soja (MapBiomas - física/dupla safra)</p>
              <p className="text-base font-semibold text-foreground tnum">
                {formatHa(selected?.["Soja (MapBiomas)"])} ha
              </p>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-xs text-muted">Soja (IBGE PAM)</p>
              <p className="text-base font-semibold text-foreground tnum">
                {selected?.["Soja (IBGE PAM)"] !== null ? `${formatHa(selected?.["Soja (IBGE PAM)"])} ha` : "N/D"}
              </p>
            </div>
          </>
        ) : mode === "milho" ? (
          <>
            <div className="rounded border border-border bg-card p-3 col-span-2">
              <p className="text-xs text-muted">Milho (MapBiomas - 1ª + 2ª safra)</p>
              <p className="text-base font-semibold text-foreground tnum">
                {formatHa(selected?.["Milho (MapBiomas)"])} ha
              </p>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-xs text-muted">Milho (IBGE PAM)</p>
              <p className="text-base font-semibold text-foreground tnum">
                {selected?.["Milho (IBGE PAM)"] !== null ? `${formatHa(selected?.["Milho (IBGE PAM)"])} ha` : "N/D"}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded border border-border bg-card p-3 col-span-2">
              <p className="text-xs text-muted">Cana (MapBiomas)</p>
              <p className="text-base font-semibold text-foreground tnum">
                {formatHa(selected?.["Cana (MapBiomas)"])} ha
              </p>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-xs text-muted">Cana (IBGE PAM)</p>
              <p className="text-base font-semibold text-foreground tnum">
                {selected?.["Cana (IBGE PAM)"] !== null ? `${formatHa(selected?.["Cana (IBGE PAM)"])} ha` : "N/D"}
              </p>
            </div>
          </>
        )}
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
          
          {mode === "geral" && (
            <>
              <Line type="monotone" name="Veg. nativa (MapBiomas)" dataKey="Veg. nativa (MapBiomas)" stroke="#15803D" strokeWidth={2} dot={false} />
              <Line type="monotone" name="Pastagem (MapBiomas)" dataKey="Pastagem (MapBiomas)" stroke="#B45309" strokeWidth={2} dot={false} />
              <Line type="monotone" name="Soja (MapBiomas)" dataKey="Soja (MapBiomas)" stroke="#0F766E" strokeWidth={2} dot={false} />
            </>
          )}

          {mode === "soja" && (
            <>
              <Line type="monotone" name="Soja (MapBiomas)" dataKey="Soja (MapBiomas)" stroke="#0F766E" strokeWidth={2.5} dot={false} />
              <Line type="monotone" name="Soja (IBGE PAM)" dataKey="Soja (IBGE PAM)" stroke="#0F766E" strokeWidth={2} strokeDasharray="5 5" connectNulls dot={false} />
            </>
          )}

          {mode === "milho" && (
            <>
              <Line type="monotone" name="Milho (MapBiomas)" dataKey="Milho (MapBiomas)" stroke="#B45309" strokeWidth={2.5} dot={false} />
              <Line type="monotone" name="Milho (IBGE PAM)" dataKey="Milho (IBGE PAM)" stroke="#B45309" strokeWidth={2} strokeDasharray="5 5" connectNulls dot={false} />
            </>
          )}

          {mode === "cana" && (
            <>
              <Line type="monotone" name="Cana (MapBiomas)" dataKey="Cana (MapBiomas)" stroke="#15803D" strokeWidth={2.5} dot={false} />
              <Line type="monotone" name="Cana (IBGE PAM)" dataKey="Cana (IBGE PAM)" stroke="#15803D" strokeWidth={2} strokeDasharray="5 5" connectNulls dot={false} />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
