import { ShellFrame } from "@/components/layout/shell-frame";
import { Card } from "@/components/ui/card";

export default function PricingPage() {
  return (
    <ShellFrame
      eyebrow="Pricing"
      title="Simple launch pricing for the hosted beta."
      description="Pricing is intentionally lightweight for Milestone 1. This page exists so the marketing route structure is in place early."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">Free Beta</h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">Create events, generate plans, and test the end-to-end workflow during private beta.</p>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">Future Premium</h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">Reserved for event-level upgrades, advanced AI packs, and premium invite design options.</p>
        </Card>
      </div>
    </ShellFrame>
  );
}
