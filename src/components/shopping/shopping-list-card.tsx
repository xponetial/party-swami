import {
  addShoppingItemAction,
  deleteShoppingItemAction,
  updateShoppingItemAction,
  updateShoppingSettingsAction,
} from "@/app/events/actions";
import { AiGenerateButton } from "@/components/ai/ai-generate-button";
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
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-brand">
              Estimated total: {formatMoney(shoppingList?.estimated_total ?? 0)}
            </p>
            <AiGenerateButton
              endpoint="/api/ai/generate-shopping-list"
              eventId={eventId}
              label="Generate with AI"
              pendingLabel="Generating list..."
            />
          </div>
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
              <div key={item.id} className="rounded-3xl border border-border bg-white/80 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-muted">{item.category}</p>
                    <p className="mt-1 text-lg font-semibold text-ink">{item.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-ink-muted">
                    <span className="rounded-full bg-canvas px-3 py-2">{item.status}</span>
                    <span className="rounded-full bg-canvas px-3 py-2">Qty {item.quantity}</span>
                    <span className="rounded-full bg-canvas px-3 py-2">
                      {formatMoney(item.estimated_price)}
                    </span>
                  </div>
                </div>

                <form action={updateShoppingItemAction} className="mt-4 grid gap-4 md:grid-cols-2">
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="shoppingListId" value={shoppingList?.id ?? ""} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <div className="space-y-2">
                    <Label htmlFor={`item-category-${item.id}`}>Category</Label>
                    <Input
                      id={`item-category-${item.id}`}
                      name="category"
                      defaultValue={item.category}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`item-name-${item.id}`}>Item</Label>
                    <Input id={`item-name-${item.id}`} name="name" defaultValue={item.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`item-quantity-${item.id}`}>Quantity</Label>
                    <Input
                      id={`item-quantity-${item.id}`}
                      name="quantity"
                      type="number"
                      min="1"
                      defaultValue={String(item.quantity)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`item-price-${item.id}`}>Estimated price</Label>
                    <Input
                      id={`item-price-${item.id}`}
                      name="estimatedPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={item.estimated_price == null ? "" : String(item.estimated_price)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`item-url-${item.id}`}>Retailer URL</Label>
                    <Input
                      id={`item-url-${item.id}`}
                      name="externalUrl"
                      defaultValue={item.external_url ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`item-status-${item.id}`}>Status</Label>
                    <select
                      id={`item-status-${item.id}`}
                      name="status"
                      defaultValue={item.status}
                      className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                    >
                      <option value="pending">Pending</option>
                      <option value="ready">Ready</option>
                      <option value="purchased">Purchased</option>
                      <option value="removed">Removed</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <SubmitButton pendingLabel="Saving item..." variant="secondary">
                      Save item
                    </SubmitButton>
                  </div>
                </form>

                <form action={deleteShoppingItemAction} className="mt-3">
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="shoppingListId" value={shoppingList?.id ?? ""} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <SubmitButton pendingLabel="Removing item..." variant="ghost">
                    Delete item
                  </SubmitButton>
                </form>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-border bg-white/80 p-4 text-sm text-ink-muted">
              No shopping items yet.
            </div>
          )}
        </div>
      </Card>

      <Card className="bg-[rgba(244,247,255,0.9)]">
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
