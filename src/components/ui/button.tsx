import { ButtonHTMLAttributes, ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  size?: "default" | "lg";
  children: ReactNode;
};

export function Button({
  asChild = false,
  className,
  variant = "primary",
  size = "default",
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-brand px-5 py-3 text-white hover:bg-brand-dark",
        variant === "secondary" && "border border-border bg-white/70 px-5 py-3 text-ink hover:bg-white",
        variant === "ghost" && "px-4 py-2 text-ink-muted hover:bg-white/60 hover:text-ink",
        size === "lg" && "px-6 py-3.5 text-base",
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
