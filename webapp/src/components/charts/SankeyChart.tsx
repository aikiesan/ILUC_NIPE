import { Plot, baseConfig } from "./plotlyClient";

export interface SankeyFlow {
  source: string;
  target: string;
  value: number;
}

interface SankeyChartProps {
  flows: SankeyFlow[];
  height?: number;
}

/** Monochrome Plotly Sankey. Node order is derived from the flow list. */
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
  for (const f of flows) {
    source.push(idOf(f.source));
    target.push(idOf(f.target));
    value.push(f.value);
  }

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
            color: "#1A1A1A",
            line: { color: "#E5E5E5", width: 1 },
          },
          link: {
            source,
            target,
            value,
            color: "rgba(107,107,107,0.35)",
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
