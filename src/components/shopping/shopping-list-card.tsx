import { addShoppingItemAction, updateShoppingSettingsAction } from "@/app/events/actions";
import { type ShoppingItemDetails, type ShoppingListDetails } from "@/lib/events";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

function formatMoney(value: number | null) {
  if (value == null) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ShoppingListCard({
  eventId,
  shoppingList,
  items,
}: {
  eventId: string;
  shoppingList: ShoppingListDetails | null;
  items: ShoppingItemDetails[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">Shopping cart and checkout</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Add real line items, keep the running total updated, and choose the retailer handoff.
            </p>
          </div>
          <p className="text-sm font-medium text-brand">
            Estimated total: {formatMoney(shoppingList?.estimated_total ?? 0)}
          </p>
        </div>

        {shoppingList ? (
          <form action={addShoppingItemAction} className="mt-6 grid gap-4 rounded-[1.75rem] bg-canvas p-5 md:grid-cols-2">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="shoppingListId" value={shoppingList.id} />
            <div className="space-y-2">
              <Label htmlFor="item-category">Category</Label>
              <Input id="item-category" name="category" placeholder="Decor" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-name">Item</Label>
              <Input id="item-name" name="name" placeholder="Fresh flower bundles" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-quantity">Quantity</Label>
              <Input id="item-quantity" name="quantity" type="number" min="1" defaultValue="1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-price">Estimated price</Label>
              <Input id="item-price" name="estimatedPrice" type="number" min="0" step="0.01" placeholder="24" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="item-url">Retailer URL</Label>
              <Input id="item-url" name="externalUrl" placeholder="https://example.com/item" />
            </div>
            <div className="md:col-span-2">
              <SubmitButton pendingLabel="Adding item...">Add shopping item</SubmitButton>
            </div>
          </form>
        ) : null}

        <div className="mt-6 grid gap-3">
          {items.length ? (
            items.map((item) => (
              <div key={item.id} className="grid gap-3 rounded-3xl border border-border bg-white/80 p-4 md:grid-cols-[0.8fr_1.2fr_0.5fr_0.5fr]">
                <p className="text-sm font-medium text-ink-muted">{item.category}</p>
                <p className="font-medium text-ink">{item.name}</p>
                <p className="text-sm text-ink-muted">Qty {item.quantity}</p>
                <p className="text-sm text-ink-muted">{formatMoney(item.estimated_price)}</p>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-border bg-white/80 p-4 text-sm text-ink-muted">
              No shopping items yet.
            </div>
          )}
        </div>
      </Card>

      <Card className="bg-[#fffaf2]">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Checkout summary</p>
        {shoppingList ? (
          <form action={updateShoppingSettingsAction} className="mt-4">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="shoppingListId" value={shoppingList.id} />
            <div className="space-y-2">
              <Label htmlFor="retailer">Retailer</Label>
              <select
                id="retailer"
                name="retailer"
                defaultValue={shoppingList.retailer ?? "mixed"}
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
              >
                <option value="mixed">Mixed</option>
                <option value="amazon">Amazon</option>
                <option value="walmart">Walmart</option>
              </select>
            </div>
            <div className="mt-4">
              <SubmitButton pendingLabel="Saving retailer..." variant="secondary">
                Save retailer
              </SubmitButton>
            </div>
          </form>
        ) : null}
        <div className="mt-4 grid gap-3">
          {[
            ["Retailer", shoppingList?.retailer ?? "Not selected"],
            ["Item count", `${items.length}`],
            ["Current estimate", formatMoney(shoppingList?.estimated_total ?? 0)],
            ["Guest contributions", "Optional guest contribution flow can plug in here"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-3xl bg-white/85 px-4 py-3">
              <p className="text-sm text-ink-muted">{label}</p>
              <p className="text-sm font-medium capitalize text-ink">{value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
