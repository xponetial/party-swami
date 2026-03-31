import { ReactNode } from "react";
import { ShellFrame } from "@/components/layout/shell-frame";
import { Card } from "@/components/ui/card";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <ShellFrame eyebrow="Authentication">
      <div className="mx-auto max-w-xl">
        <Card className="bg-white/80">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-ink-muted">{description}</p>
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-6">{footer}</div> : null}
        </Card>
      </div>
    </ShellFrame>
  );
}
