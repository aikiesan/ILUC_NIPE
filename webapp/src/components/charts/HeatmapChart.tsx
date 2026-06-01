import { Plot, baseConfig } from "./plotlyClient";

interface HeatmapChartProps {
  z: (number | null)[][];
  x: string[];
  y: string[];
  height?: number;
  onCellClick?: (row: number, col: number) => void;
}

/** Grayscale transition-matrix heatmap with click-through cells. */
export default function HeatmapChart({
  z,
  x,
  y,
  height = 520,
  onCellClick,
}: HeatmapChartProps) {
  return (
    <Plot
      data={[
        {
          type: "heatmap",
          z,
          x,
          y,
          colorscale: [
            [0, "#FFFFFF"],
            [1, "#0A0A0A"],
          ],
          hovertemplate: "%{y} → %{x}<br>%{z:,.0f} ha<extra></extra>",
          showscale: true,
          colorbar: { thickness: 10, outlinewidth: 0, tickfont: { size: 10 } },
        } as never,
      ]}
      layout={{
        height,
        font: { family: "Inter, sans-serif", size: 10, color: "#0A0A0A" },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        margin: { l: 150, r: 20, t: 20, b: 150 },
        xaxis: { tickangle: -45, automargin: true, title: { text: "Destino" } },
        yaxis: { automargin: true, autorange: "reversed", title: { text: "Origem" } },
      }}
      config={{ ...baseConfig }}
      style={{ width: "100%" }}
      useResizeHandler
      onClick={(e) => {
        const pt = e.points?.[0] as unknown as { pointIndex?: [number, number] } | undefined;
        if (pt?.pointIndex && onCellClick) {
          onCellClick(pt.pointIndex[0], pt.pointIndex[1]);
        }
      }}
    />
  );
}
