import { Plot, baseConfig } from "./plotlyClient";
import { classColor } from "@/lib/colors";

/** #RRGGBB + alpha -> rgba() string for translucent Sankey links. */
function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export interface SankeyFlow {
  source: string;
  target: string;
  value: number;
}

interface SankeyChartProps {
  flows: SankeyFlow[];
  height?: number;
}

/** Plotly Sankey colored by LULC class group. Node order derives from flows. */
export default function SankeyChart({ flows, height = 420 }: SankeyChartProps) {
  const labels: string[] = [];
  const index = new Map<string, number>();
  const idOf = (name: string): number => {
    if (!index.has(name)) {
      index.set(name, labels.length);
      labels.push(name);
    }
    return index.get(name)!;
  };

  const source: number[] = [];
  const target: number[] = [];
  const value: number[] = [];
  const linkColor: string[] = [];
  for (const f of flows) {
    source.push(idOf(f.source));
    target.push(idOf(f.target));
    value.push(f.value);
    linkColor.push(hexToRgba(classColor(f.target), 0.4)); // tint link by destination
  }
  const nodeColor = labels.map((l) => classColor(l));

  return (
    <Plot
      data={[
        {
          type: "sankey",
          orientation: "h",
          arrangement: "snap",
          node: {
            label: labels,
            pad: 16,
            thickness: 16,
            color: nodeColor,
            line: { color: "#FFFFFF", width: 1 },
          },
          link: {
            source,
            target,
            value,
            color: linkColor,
          },
        } as never,
      ]}
      layout={{
        height,
        font: { family: "Inter, sans-serif", size: 12, color: "#0A0A0A" },
        paper_bgcolor: "rgba(0,0,0,0)",
        margin: { l: 10, r: 10, t: 10, b: 10 },
      }}
      config={{ ...baseConfig }}
      style={{ width: "100%" }}
      useResizeHandler
    />
  );
}
