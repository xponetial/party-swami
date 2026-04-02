import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border border-white/70 bg-surface p-6 shadow-party backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
