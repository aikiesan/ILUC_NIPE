import { Plot, baseConfig } from "./plotlyClient";
import { VIRIDIS, type PlotlyColorscale } from "@/lib/colors";

interface ChoroplethMapProps {
  geojson: GeoJSON.FeatureCollection;
  locations: string[];
  z: number[];
  text: string[];
  colorbarTitle: string;
  /** Perceptually-uniform scale (defaults to Viridis). See src/lib/colors.ts. */
  colorscale?: PlotlyColorscale;
  /** Center the scale at zero (diverging) — used for the net-balance variable. */
  diverging?: boolean;
  height?: number;
  onRegionClick?: (rgint: string) => void;
}

/** Choropleth of the 133 RGINTs, keyed by properties.rgint. */
export default function ChoroplethMap({
  geojson,
  locations,
  z,
  text,
  colorbarTitle,
  colorscale = VIRIDIS,
  diverging = false,
  height = 560,
  onRegionClick,
}: ChoroplethMapProps) {
  return (
    <Plot
      data={[
        {
          type: "choropleth",
          geojson,
          locations,
          z,
          text,
          featureidkey: "properties.rgint",
          colorscale,
          zmid: diverging ? 0 : undefined,
          marker: { line: { color: "#FFFFFF", width: 0.5 } },
          hovertemplate: "%{text}<br>%{z:,.0f}<extra></extra>",
          colorbar: { title: { text: colorbarTitle, side: "right" }, thickness: 10, outlinewidth: 0, tickfont: { size: 10 } },
        } as never,
      ]}
      layout={{
        height,
        geo: {
          fitbounds: "locations",
          visible: false,
          bgcolor: "rgba(0,0,0,0)",
          projection: { type: "mercator" },
        },
        margin: { l: 0, r: 0, t: 0, b: 0 },
        paper_bgcolor: "rgba(0,0,0,0)",
      }}
      config={{ ...baseConfig }}
      style={{ width: "100%" }}
      useResizeHandler
      onClick={(e) => {
        const loc = (e.points?.[0] as { location?: string } | undefined)?.location;
        if (loc && onRegionClick) onRegionClick(loc);
      }}
    />
  );
}
