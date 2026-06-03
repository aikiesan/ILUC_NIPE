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
  /** Base mode: render regions as a neutral translucent overlay (no variable / no colorbar). */
  baseMode?: boolean;
  height?: number;
  onRegionClick?: (rgint: string) => void;
}

// Carto Positron — clean light tile basemap, no API token required.
const BASEMAP_STYLE = "carto-positron";
// Brazil-centered view (the geo `fitbounds` auto-zoom isn't available on mapbox).
const BRAZIL_CENTER = { lon: -54, lat: -14 };
const BRAZIL_ZOOM = 3.1;
// Uniform slate fill for the no-variable base map.
const BASE_FILL: PlotlyColorscale = [[0, "#64748B"], [1, "#64748B"]];

/** Choropleth of the 133 RGINTs over a tile basemap, keyed by properties.rgint. */
export default function ChoroplethMap({
  geojson,
  locations,
  z,
  text,
  colorbarTitle,
  colorscale = VIRIDIS,
  diverging = false,
  baseMode = false,
  height = 560,
  onRegionClick,
}: ChoroplethMapProps) {
  return (
    <Plot
      data={[
        {
          type: "choroplethmapbox",
          geojson,
          locations,
          z: baseMode ? locations.map(() => 0) : z,
          text,
          featureidkey: "properties.rgint",
          colorscale: baseMode ? BASE_FILL : colorscale,
          zmid: !baseMode && diverging ? 0 : undefined,
          showscale: !baseMode,
          marker: {
            line: { color: "#FFFFFF", width: 0.5 },
            opacity: baseMode ? 0.35 : 0.82,
          },
          hovertemplate: baseMode ? "%{text}<extra></extra>" : "%{text}<br>%{z:,.0f}<extra></extra>",
          colorbar: { title: { text: colorbarTitle, side: "right" }, thickness: 10, outlinewidth: 0, tickfont: { size: 10 } },
        } as never,
      ]}
      layout={{
        height,
        mapbox: {
          style: BASEMAP_STYLE,
          center: BRAZIL_CENTER,
          zoom: BRAZIL_ZOOM,
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
