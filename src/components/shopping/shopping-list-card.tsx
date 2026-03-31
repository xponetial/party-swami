import { Card } from "@/components/ui/card";

const items = [
  { category: "Decor", name: "Fresh flower bundles", quantity: "6", estimate: "$42" },
  { category: "Tableware", name: "Compostable plates", quantity: "30", estimate: "$18" },
  { category: "Food", name: "Mini quiches", quantity: "24", estimate: "$36" },
  { category: "Drinks", name: "Sparkling lemonade", quantity: "12", estimate: "$24" },
];

export function ShoppingListCard() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">Shopping cart and checkout</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Review the AI-populated list, tweak quantities, compare retailers, and keep the spend aligned to budget.
            </p>
          </div>
          <p className="text-sm font-medium text-brand">Estimated total: $186</p>
        </div>
        <div className="mt-6 grid gap-3">
          {items.map((item) => (
            <div key={item.name} className="grid gap-3 rounded-3xl border border-border bg-white/80 p-4 md:grid-cols-[0.8fr_1.2fr_0.5fr_0.5fr]">
              <p className="text-sm font-medium text-ink-muted">{item.category}</p>
              <p className="font-medium text-ink">{item.name}</p>
              <p className="text-sm text-ink-muted">Qty {item.quantity}</p>
              <p className="text-sm text-ink-muted">{item.estimate}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-[#fffaf2]">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Checkout summary</p>
        <div className="mt-4 grid gap-3">
          {[
            ["Retailer", "Amazon or Walmart"],
            ["Budget", "$450 target"],
            ["Current estimate", "$186"],
            ["Guest contributions", "Optional gift-to-host toggle"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-3xl bg-white/85 px-4 py-3">
              <p className="text-sm text-ink-muted">{label}</p>
              <p className="text-sm font-medium text-ink">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {["Select Amazon", "Select Walmart", "Checkout", "Request contributions"].map((item) => (
            <button
              key={item}
              type="button"
              disabled
              className="rounded-full border border-border bg-white px-4 py-3 text-sm font-medium text-ink opacity-80"
            >
              {item}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
