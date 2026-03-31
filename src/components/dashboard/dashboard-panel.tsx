import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function DashboardPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
      </div>
      {children}
    </Card>
  );
}
