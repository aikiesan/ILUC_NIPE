import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ChartSkeleton({ height = 320 }: { height?: number }) {
  return <Skeleton className="w-full" style={{ height }} />;
}

export function ErrorState({ error }: { error: Error }) {
  return (
    <div className="rounded border border-border bg-card p-6 text-sm text-muted">
      Não foi possível carregar os dados. {error.message}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-dashed border-border bg-card px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {children && <p className="mt-1 max-w-md text-xs text-muted">{children}</p>}
    </div>
  );
}
