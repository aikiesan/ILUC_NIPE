/**
 * Data-quality status of a region, derived from signals available to the static
 * SPA. Mirrors the project's validation state (D4 §11): two golden-standard
 * regions are fully validated; regions with a committed 15×15 transition matrix
 * are available; the remainder stay in draft until the HARVEX reconciliation.
 */

/** Golden-standard, fully validated RGINTs — Rio Branco/AC and Cuiabá/MT (D4 §11). */
export const GOLDEN_RGINTS = new Set(["1201", "5101"]);

export type DataStatusKind = "golden" | "available" | "pending";

export interface DataStatus {
  kind: DataStatusKind;
  label: string;
  /** Badge tone, reused from the shared Badge variants. */
  variant: "solid" | "outline";
}

export function regionStatus(id: string, hasMatrix: boolean): DataStatus {
  if (GOLDEN_RGINTS.has(id)) {
    return { kind: "golden", label: "Golden standard", variant: "solid" };
  }
  if (hasMatrix) {
    return { kind: "available", label: "Matriz disponível", variant: "solid" };
  }
  return { kind: "pending", label: "Aguardando reconciliação", variant: "outline" };
}
