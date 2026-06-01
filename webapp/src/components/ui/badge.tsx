import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "solid";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-highlight text-foreground border-transparent",
    outline: "bg-transparent text-muted border-border",
    solid: "bg-accent text-white border-transparent",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium tnum",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
