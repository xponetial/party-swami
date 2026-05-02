"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = {
  children: ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type">;

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-busy={pending}
      className={pending ? `${className ?? ""} cursor-wait` : className}
      disabled={pending}
      type="submit"
      variant={variant}
      {...props}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
