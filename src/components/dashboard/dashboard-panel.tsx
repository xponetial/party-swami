import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DashboardPanel({
  title,
  description,
  children,
  collapsible = false,
  defaultOpen = true,
  summaryMeta,
}: {
  title: string;
  description: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  summaryMeta?: ReactNode;
}) {
  if (collapsible) {
    return (
      <Card className="p-0">
        <details className="group" open={defaultOpen}>
          <summary className="cursor-pointer list-none px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-ink">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
              </div>
              <div className="flex items-center gap-3">
                {summaryMeta ? (
                  <span className="rounded-full bg-canvas px-3 py-1 text-xs uppercase tracking-[0.18em] text-ink-muted">
                    {summaryMeta}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "rounded-full bg-canvas px-3 py-1 text-xs uppercase tracking-[0.18em] text-ink-muted transition",
                    "group-open:bg-canvas group-open:text-ink",
                  )}
                >
                  <span className="group-open:hidden">Expand</span>
                  <span className="hidden group-open:inline">Collapse</span>
                </span>
              </div>
            </div>
          </summary>
          <div className="px-6 pb-6">{children}</div>
        </details>
      </Card>
    );
  }

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
