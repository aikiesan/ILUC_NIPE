// Builds the React wrapper around the lightweight plotly.js-dist-min bundle.
// Importing this module pulls in plotly (~3 MB), so charts that use it are
// loaded via React.lazy/dynamic import to keep the initial bundle small.
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";

export const Plot = createPlotlyComponent(Plotly);

/** Monochrome scientific layout defaults shared by all Plotly charts. */
export const baseLayout = {
  font: { family: "Inter, sans-serif", size: 12, color: "#0A0A0A" },
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  margin: { l: 40, r: 20, t: 20, b: 40 },
} as const;

export const baseConfig = {
  displayModeBar: false,
  responsive: true,
} as const;
