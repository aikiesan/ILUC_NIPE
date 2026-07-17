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
  selectedLocation?: string | null;
  center?: { lon: number; lat: number };
  zoom?: number;
  zmin?: number;
  zmax?: number;
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
  selectedLocation,
  center = BRAZIL_CENTER,
  zoom = BRAZIL_ZOOM,
  zmin,
  zmax,
}: ChoroplethMapProps) {
  const traces: any[] = [
    {
      type: "choroplethmapbox",
      geojson,
      locations,
      z: baseMode ? locations.map(() => 0) : z,
      text,
      featureidkey: "properties.rgint",
      colorscale: baseMode ? BASE_FILL : colorscale,
      zmid: !baseMode && diverging ? 0 : undefined,
      zmin: !baseMode ? zmin : undefined,
      zmax: !baseMode ? zmax : undefined,
      showscale: !baseMode,
      marker: {
        line: { color: "#FFFFFF", width: 0.5 },
        opacity: baseMode ? 0.35 : 0.82,
      },
      hovertemplate: baseMode ? "%{text}<extra></extra>" : "%{text}<br>%{z:,.0f}<extra></extra>",
      colorbar: { title: { text: colorbarTitle, side: "right" }, thickness: 10, outlinewidth: 0, tickfont: { size: 10 } },
    }
  ];

  if (selectedLocation) {
    traces.push({
      type: "choroplethmapbox",
      geojson,
      locations: [selectedLocation],
      z: [1],
      showscale: false,
      featureidkey: "properties.rgint",
      colorscale: [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0)"]], // transparent fill
      marker: {
        line: { color: "#EA580C", width: 3.0 }, // high-contrast thick orange-red line
        opacity: 1.0,
      },
      hovertemplate: "%{text}<extra></extra>",
    });
  }

  return (
    <Plot
      data={traces}
      layout={{
        height,
        mapbox: {
          style: BASEMAP_STYLE,
          center,
          zoom,
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
