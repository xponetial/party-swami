import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "success";
};

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]",
        variant === "default" && "bg-white/75 text-ink-muted",
        variant === "success" && "bg-accent-soft text-accent",
        className,
      )}
    >
      {children}
    </span>
  );
}
