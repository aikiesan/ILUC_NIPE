import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  onValueChange?: (value: number) => void;
}

/** Range slider styled to the monochrome design system. */
export function Slider({ className, onValueChange, ...props }: SliderProps) {
  return (
    <input
      type="range"
      onChange={(e) => onValueChange?.(Number(e.target.value))}
      className={cn(
        "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border",
        "accent-accent",
        className,
      )}
      {...props}
    />
  );
}
