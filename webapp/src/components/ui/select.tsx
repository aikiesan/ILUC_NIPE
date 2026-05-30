import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: SelectOption[];
  onValueChange?: (value: string) => void;
  label?: string;
}

/** Lightweight styled native select — accessible and dependency-free. */
export function Select({
  options,
  value,
  onValueChange,
  label,
  className,
  ...props
}: SelectProps) {
  return (
    <label className="flex flex-col gap-1">
      {label && (
        <span className="text-xs font-medium text-muted">{label}</span>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onValueChange?.(e.target.value)}
          className={cn(
            "h-9 w-full appearance-none rounded border border-border bg-card px-3 pr-8 text-sm text-foreground",
            "focus:outline-none focus:ring-1 focus:ring-accent",
            className,
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </label>
  );
}
