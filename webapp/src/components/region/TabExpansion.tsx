import { useMemo, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { ChartSkeleton, EmptyState, ErrorState } from "@/components/common/StateBlocks";
import { useAsync } from "@/lib/useAsync";
import { loadDirectIndirect } from "@/lib/data";
import { formatMha, formatPct } from "@/lib/format";
import type { DirectIndirectCut } from "@/lib/types";

/** UFs whose regions also contribute to the MATOPIBA agricultural-frontier cut. */
const MATOPIBA_UFS = new Set(["MA", "TO", "PI", "BA"]);

const PERIODS = [
  { value: "2008_2024", label: "2008–2024 (acumulado)" },
  { value: "2008_2017", label: "2008–2017" },
  { value: "2017_2024", label: "2017–2024" },
];

// Direct = native vegetation cleared for soy (the alarming flow); indirect =
// soy expanding over already-anthropic land (pasture/other crops). Colors mirror
// the map's colorblind-safe RdBu (red = loss/direct, blue = indirect). The direct
// segment also carries a diagonal-stripe texture so the split survives color
// blindness without relying on hue alone (the project lead has deuteranopia).
const DIRETA = "#B2182B"; // ColorBrewer RdBu red
const INDIRETA = "#4393C3"; // ColorBrewer RdBu blue
// Diagonal stripes layered over the solid red — redundant, hue-independent cue.
const DIRETA_TEXTURE =
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.45) 0 3px, transparent 3px 7px)";

/** Horizontal stacked bar: direct (native conversion) vs indirect share. */
function SplitBar({ cut }: { cut: DirectIndirectCut }) {
  const pct = cut.pct_direta ?? 0;
  return (
    <div className="flex h-5 w-full overflow-hidden rounded bg-muted/20" role="img"
      aria-label={`${formatPct(pct * 100)} direta, ${formatPct((1 - pct) * 100)} indireta`}>
      <div style={{ width: `${pct * 100}%`, backgroundColor: DIRETA, backgroundImage: DIRETA_TEXTURE }} />
      <div style={{ width: `${(1 - pct) * 100}%`, backgroundColor: INDIRETA }} />
    </div>
  );
}

/** One labelled cut row: name, stacked bar, and the direct-share figure. */
function CutRow({
  name,
  cut,
  highlight,
}: {
  name: string;
  cut: DirectIndirectCut;
  highlight?: boolean;
}) {
  if (!cut.reliable) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">{name}</span>
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <AlertTriangle className="h-3 w-3" /> volume desprezível
          </span>
        </div>
        <p className="text-xs text-muted">
          Apenas {formatMha(cut.total_ha)} Mha de transição para soja — percentual
          omitido (estatisticamente irrelevante).
        </p>
      </div>
    );
  }
  return (
    <div className={highlight ? "rounded-md p-3 ring-1 ring-[#B2182B]/40 bg-[#B2182B]/5" : "p-3"}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className={`font-medium ${highlight ? "text-[#B2182B]" : "text-foreground"}`}>
          {name}
        </span>
        <span className="tnum">
          <strong>{formatPct((cut.pct_direta ?? 0) * 100)}</strong>
          <span className="text-muted"> direta</span>
        </span>
      </div>
      <SplitBar cut={cut} />
      <p className="mt-1 text-xs text-muted tnum">
        {formatMha(cut.direta_ha)} Mha nativa convertida · {formatMha(cut.total_ha)} Mha
        total entrando em soja
      </p>
    </div>
  );
}

export function TabExpansion({ bioma, uf }: { bioma: string; uf: string }) {
  const { data, loading, error } = useAsync(loadDirectIndirect, []);
  const [period, setPeriod] = useState("2008_2024");

  const cuts = useMemo(() => {
    const recortes = data?.periodos[period]?.recortes;
    if (!recortes) return null;
    // Show the region's own biome and (if applicable) MATOPIBA first, then the
    // national baseline for contrast. Skip cuts absent from the data.
    const order: { name: string; highlight?: boolean }[] = [];
    if (bioma && recortes[bioma]) order.push({ name: bioma });
    if (MATOPIBA_UFS.has(uf) && recortes.MATOPIBA)
      order.push({ name: "MATOPIBA", highlight: true });
    if (recortes.Nacional) order.push({ name: "Nacional" });
    return order
      .filter((o, i) => order.findIndex((x) => x.name === o.name) === i)
      .map((o) => ({ ...o, cut: recortes[o.name] }));
  }, [data, period, bioma, uf]);

  if (loading) return <ChartSkeleton height={300} />;
  if (error) return <ErrorState error={error} />;
  if (!cuts || cuts.length === 0) {
    return <EmptyState title="Breakdown de expansão indisponível" />;
  }

  const inMatopiba = MATOPIBA_UFS.has(uf);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-prose text-sm text-muted">
          Expansão da soja decomposta em <strong className="text-[#B2182B]">direta</strong>{" "}
          (vegetação nativa convertida) vs.{" "}
          <strong style={{ color: INDIRETA }}>indireta</strong> (sobre pastagem/área já
          antropizada). Rotações internas do complexo soja-milho são excluídas do
          denominador.
        </p>
        <div className="w-48 shrink-0">
          <Select
            label="Período"
            value={period}
            onValueChange={setPeriod}
            options={PERIODS}
          />
        </div>
      </div>

      <Card className="divide-y divide-border p-2">
        {cuts.map(({ name, cut, highlight }) => (
          <CutRow key={name} name={name} cut={cut} highlight={highlight} />
        ))}
      </Card>

      {inMatopiba && (
        <div className="flex gap-2 rounded-md border border-[#B2182B]/30 bg-[#B2182B]/5 p-3 text-xs text-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#B2182B]" />
          <span>
            Esta RGINT está no <strong>MATOPIBA</strong> — a fronteira agrícola onde a
            conversão direta de savana nativa para soja (~40%) é muito superior à média
            nacional (~14%). O problema da conversão direta é concentrado, não difuso.
          </span>
        </div>
      )}
    </div>
  );
}
