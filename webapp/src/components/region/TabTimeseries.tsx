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
import { CLASS_ORDER, NATIVE_CLASSES, PASTURE_CLASSES } from "@/lib/classes";
import { formatHa } from "@/lib/format";
import { classColor } from "@/lib/colors";
import { useAsync } from "@/lib/useAsync";
import { loadRegionFull } from "@/lib/data";
import { ChartSkeleton, EmptyState, ErrorState } from "@/components/common/StateBlocks";

const SOJA = "2 - Soja";
const SOJA_MILHO = "3 - Soja + Milho 2ª safra";
const MILHO_1A = "4 - Milho 1ª safra";
const CANA = "5 - Cana-de-açúcar";

const SOURCE_NAMES: Record<string, string> = {
  pipeline_diagonal: "MapBiomas (Matriz)",
  conab_pam: "IBGE PAM / CONAB",
  lapig_vigor: "LAPIG Vigor",
  conab_cafe: "CONAB Café",
  tc_pastagem: "TerraClass Pastagem",
  tc_floresta_prim: "TerraClass Primária",
  tc_floresta_sec: "TerraClass Secundária",
  tc_nao_florestal: "TerraClass Não-Florestal",
  mb_floresta_total: "MapBiomas Floresta Bruta",
  mb_pastagem_total: "MapBiomas Pastagem Bruta",
  mb_savana_total: "MapBiomas Savana Bruta",
};

const SOURCE_COLORS: Record<string, string> = {
  pipeline_diagonal: "", // dynamic
  conab_pam: "#0F766E", // teal
  lapig_vigor: "#D97706", // amber
  conab_cafe: "#7C3AED", // purple
  tc_pastagem: "#059669", // emerald
  tc_floresta_prim: "#047857",
  tc_floresta_sec: "#10B981",
  tc_nao_florestal: "#34D399",
  mb_floresta_total: "#2563EB", // blue
  mb_pastagem_total: "#4F46E5", // indigo
  mb_savana_total: "#DB2777", // pink
};

function getSourceColor(srcKey: string, activeClass: string): string {
  if (srcKey === "pipeline_diagonal") {
    return classColor(activeClass);
  }
  return SOURCE_COLORS[srcKey] || "#6B7280";
}

function getSourceDashArray(srcKey: string): string | undefined {
  if (srcKey === "pipeline_diagonal") return undefined; // solid
  if (srcKey.includes("pam") || srcKey.includes("conab")) return "5 5"; // dashed
  if (srcKey.includes("tc_") || srcKey.includes("lapig")) return "3 3"; // dotted
  return "1 1";
}

export function TabTimeseries({
  regionId,
  initialMode,
}: {
  regionId: string;
  initialMode?: string;
}) {
  const full = useAsync(() => loadRegionFull(regionId), [regionId]);
  const [mode, setMode] = useState<string>(initialMode || "geral");

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  const years = useMemo(() => Array.from({ length: 17 }, (_, i) => 2008 + i), []);

  const data = useMemo(() => {
    if (!full.data) return [];
    return years.map((y, idx) => {
      const row: Record<string, any> = { ano: y };

      // High-level MapBiomas sums
      const getMbVal = (c: string) => Number(full.data?.classes[c]?.pipeline_diagonal?.values[idx]) || 0;
      const mbSoja = getMbVal(SOJA) + getMbVal(SOJA_MILHO);
      const mbPastagem = sumGroup(full.data, PASTURE_CLASSES, idx);
      const mbVegNativa = sumGroup(full.data, NATIVE_CLASSES, idx);
      const mbMilho = getMbVal(MILHO_1A) + getMbVal(SOJA_MILHO);
      const mbCana = getMbVal(CANA);

      // PAM comparisons
      const pamSoja = Number(full.data?.classes[SOJA]?.conab_pam?.values[idx]);
      const pamMilho = (Number(full.data?.classes[SOJA_MILHO]?.conab_pam?.values[idx]) || 0) +
                       (Number(full.data?.classes[MILHO_1A]?.conab_pam?.values[idx]) || 0);
      const pamCana = Number(full.data?.classes[CANA]?.conab_pam?.values[idx]);

      row["Soja (MapBiomas)"] = mbSoja;
      row["Pastagem (MapBiomas)"] = mbPastagem;
      row["Veg. nativa (MapBiomas)"] = mbVegNativa;
      row["Milho (MapBiomas)"] = mbMilho;
      row["Cana (MapBiomas)"] = mbCana;
      row["Soja (IBGE PAM)"] = pamSoja !== null && !isNaN(pamSoja) ? pamSoja : null;
      row["Milho (IBGE PAM)"] = pamMilho !== null && !isNaN(pamMilho) ? pamMilho : null;
      row["Cana (IBGE PAM)"] = pamCana !== null && !isNaN(pamCana) ? pamCana : null;

      // Individual LULC classes all sources
      CLASS_ORDER.forEach((c) => {
        const classObj = full.data?.classes[c] || {};
        Object.keys(classObj).forEach((srcKey) => {
          const val = classObj[srcKey]?.values[idx];
          row[`${c}__${srcKey}`] = val !== null && !isNaN(Number(val)) ? Number(val) : null;
        });
      });

      return row;
    });
  }, [years, full.data]);

  const [yearIdx, setYearIdx] = useState(years.length - 1);
  const selected = data[yearIdx] ?? data[data.length - 1];

  const selectOptions = useMemo(() => {
    const list = [
      { value: "geral", label: "Visão Geral (Soja/Pastagem/Veg. nativa)" },
      { value: "soja", label: "Comparação: Soja (MapBiomas vs IBGE PAM)" },
      { value: "milho", label: "Comparação: Milho (MapBiomas vs IBGE PAM)" },
      { value: "cana", label: "Comparação: Cana (MapBiomas vs IBGE PAM)" },
    ];
    CLASS_ORDER.forEach((c) => {
      list.push({ value: `class:${c}`, label: `Classe: ${c}` });
    });
    return list;
  }, []);

  if (full.loading) return <ChartSkeleton height={300} />;
  if (full.error) return <ErrorState error={full.error} />;
  if (!full.data || !data.length) return <EmptyState title="Série temporal indisponível" />;

  const isClassMode = mode.startsWith("class:");
  const activeClassName = isClassMode ? mode.substring(6) : "";
  const classSources = isClassMode ? (full.data.classes[activeClassName] || {}) : {};
  const sourceKeys = Object.keys(classSources);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between">
        <div className="w-full max-w-xs">
          <Select
            label="Visualização do Gráfico"
            value={mode}
            onValueChange={(v) => setMode(v)}
            options={selectOptions}
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
              <p className="text-base font-semibold text-foreground tnum font-mono">
                {formatHa(selected?.["Veg. nativa (MapBiomas)"])} ha
              </p>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-xs text-muted">Pastagem (MapBiomas)</p>
              <p className="text-base font-semibold text-foreground tnum font-mono">
                {formatHa(selected?.["Pastagem (MapBiomas)"])} ha
              </p>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-xs text-muted">Soja (MapBiomas)</p>
              <p className="text-base font-semibold text-foreground tnum font-mono">
                {formatHa(selected?.["Soja (MapBiomas)"])} ha
              </p>
            </div>
          </>
        ) : mode === "soja" ? (
          <>
            <div className="rounded border border-border bg-card p-3 col-span-2">
              <p className="text-xs text-muted">Soja (MapBiomas - física/dupla safra)</p>
              <p className="text-base font-semibold text-foreground tnum font-mono">
                {formatHa(selected?.["Soja (MapBiomas)"])} ha
              </p>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-xs text-muted">Soja (IBGE PAM)</p>
              <p className="text-base font-semibold text-foreground tnum font-mono">
                {selected?.["Soja (IBGE PAM)"] !== null ? `${formatHa(selected?.["Soja (IBGE PAM)"])} ha` : "N/D"}
              </p>
            </div>
          </>
        ) : mode === "milho" ? (
          <>
            <div className="rounded border border-border bg-card p-3 col-span-2">
              <p className="text-xs text-muted">Milho (MapBiomas - 1ª + 2ª safra)</p>
              <p className="text-base font-semibold text-foreground tnum font-mono">
                {formatHa(selected?.["Milho (MapBiomas)"])} ha
              </p>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-xs text-muted">Milho (IBGE PAM)</p>
              <p className="text-base font-semibold text-foreground tnum font-mono">
                {selected?.["Milho (IBGE PAM)"] !== null ? `${formatHa(selected?.["Milho (IBGE PAM)"])} ha` : "N/D"}
              </p>
            </div>
          </>
        ) : mode === "cana" ? (
          <>
            <div className="rounded border border-border bg-card p-3 col-span-2">
              <p className="text-xs text-muted">Cana (MapBiomas)</p>
              <p className="text-base font-semibold text-foreground tnum font-mono">
                {formatHa(selected?.["Cana (MapBiomas)"])} ha
              </p>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-xs text-muted">Cana (IBGE PAM)</p>
              <p className="text-base font-semibold text-foreground tnum font-mono">
                {selected?.["Cana (IBGE PAM)"] !== null ? `${formatHa(selected?.["Cana (IBGE PAM)"])} ha` : "N/D"}
              </p>
            </div>
          </>
        ) : (
          <>
            {sourceKeys.map((srcKey) => {
              const val = selected?.[`${activeClassName}__${srcKey}`];
              return (
                <div key={srcKey} className="rounded border border-border bg-card p-2 text-center col-span-1">
                  <p className="text-[10px] text-muted truncate" title={SOURCE_NAMES[srcKey] || srcKey}>
                    {SOURCE_NAMES[srcKey] || srcKey}
                  </p>
                  <p className="text-xs font-semibold text-foreground font-mono">
                    {val !== null ? `${formatHa(val)} ha` : "N/D"}
                  </p>
                </div>
              );
            })}
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

          {isClassMode &&
            sourceKeys.map((srcKey) => (
              <Line
                key={srcKey}
                type="monotone"
                name={SOURCE_NAMES[srcKey] || srcKey}
                dataKey={`${activeClassName}__${srcKey}`}
                stroke={getSourceColor(srcKey, activeClassName)}
                strokeWidth={srcKey === "pipeline_diagonal" ? 2.5 : 1.8}
                strokeDasharray={getSourceDashArray(srcKey)}
                dot={false}
                connectNulls
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function sumGroup(fullData: any, classes: string[], yearIdx: number): number {
  return classes.reduce((acc, c) => {
    const val = Number(fullData.classes[c]?.pipeline_diagonal?.values[yearIdx]) || 0;
    return acc + val;
  }, 0);
}
