import Papa from "papaparse";
import type {
  IndexEntry,
  NationalTimeseriesRow,
  NationalTransitionRow,
  PamRow,
  RegionIndicator,
  RegionMatrix,
  RegionMeta,
  RegionSeries,
  RegionTransitionRow,
} from "./types";

const BASE = import.meta.env.BASE_URL;

/** Resolve a path under the deployed /data directory. */
function dataUrl(path: string): string {
  return `${BASE}data/${path}`;
}

const jsonCache = new Map<string, Promise<unknown>>();
const csvCache = new Map<string, Promise<unknown[]>>();

async function fetchJson<T>(path: string): Promise<T> {
  const url = dataUrl(path);
  if (!jsonCache.has(url)) {
    jsonCache.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`Falha ao carregar ${path} (${r.status})`);
        return r.text().then((t) => JSON.parse(t.replace(/\bNaN\b/g, "null")));
      }),
    );
  }
  return jsonCache.get(url) as Promise<T>;
}

function fetchCsv<T>(path: string): Promise<T[]> {
  const url = dataUrl(path);
  if (!csvCache.has(url)) {
    csvCache.set(
      url,
      new Promise<T[]>((resolve, reject) => {
        Papa.parse(url, {
          download: true,
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (res) => resolve(res.data as T[]),
          error: (err) => reject(err),
        });
      }),
    );
  }
  return csvCache.get(url) as Promise<T[]>;
}

export const loadMeta = () => fetchJson<RegionMeta[]>("rgint_meta.json");
export const loadIndex = () => fetchJson<IndexEntry[]>("rgint_index.json");
export const loadIndicators = () => fetchCsv<RegionIndicator>("rgint_indicators.csv");
export const loadNationalTimeseries = () =>
  fetchCsv<NationalTimeseriesRow>("national_timeseries.csv");
export const loadNationalTransitions = () =>
  fetchCsv<NationalTransitionRow>("national_transitions.csv");
export const loadRegionSeries = (id: string) =>
  fetchJson<RegionSeries>(`rgint_series/${id}.json`);
export const loadRegionPam = (id: string) => fetchCsv<PamRow>(`rgint_pam/${id}.csv`);
export const loadGeoJson = () =>
  fetchJson<GeoJSON.FeatureCollection>("rgint_simplified.geojson");

/** Region transitions / matrix may be absent until the full dataset lands. */
export async function loadRegionTransitions(id: string): Promise<RegionTransitionRow[] | null> {
  try {
    return await fetchCsv<RegionTransitionRow>(`rgint_transitions/${id}.csv`);
  } catch {
    return null;
  }
}

export async function loadRegionMatrix(id: string): Promise<RegionMatrix | null> {
  try {
    return await fetchJson<RegionMatrix>(`rgint_matrix/${id}.json`);
  } catch {
    return null;
  }
}

/** Convert a record of objects to a CSV blob and trigger a browser download. */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
