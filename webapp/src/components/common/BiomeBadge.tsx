import { biomeTone } from "@/lib/colors";
import { cn } from "@/lib/utils";

/** Biome label chip using the shared, AA-compliant biome palette. */
export function BiomeBadge({ biome, className }: { biome: string; className?: string }) {
  const tone = biomeTone(biome);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={{ backgroundColor: tone.tint, color: tone.ink, borderColor: `${tone.ink}33` }}
    >
      {biome}
    </span>
  );
}
