"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type ConfirmSubmitButtonProps = {
  children: ReactNode;
  pendingLabel: string;
  confirmMessage: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type">;

export function ConfirmSubmitButton({
  children,
  pendingLabel,
  confirmMessage,
  variant = "primary",
  className,
  onClick,
  ...props
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          return;
        }

        onClick?.(event);
      }}
      type="submit"
      variant={variant}
      {...props}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
