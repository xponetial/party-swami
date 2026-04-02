import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

type DashboardMetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
};

export function DashboardMetricCard({ label, value, detail, icon: Icon }: DashboardMetricCardProps) {
  return (
    <Card className="bg-canvas">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">{label}</p>
          <p className="mt-3 text-4xl font-semibold tracking-tight text-ink">{value}</p>
        </div>
        <div className="rounded-2xl bg-accent-soft p-3 text-accent">
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-ink-muted">{detail}</p>
    </Card>
  );
}
