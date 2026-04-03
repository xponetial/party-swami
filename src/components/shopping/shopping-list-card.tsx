import Link from "next/link";
import {
  addShoppingItemAction,
  deleteShoppingItemAction,
  updateShoppingItemAction,
  updateShoppingSettingsAction,
} from "@/app/events/actions";
import { AiGenerateButton } from "@/components/ai/ai-generate-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  type EventDetails,
  type PartyPlanDetails,
  type ShoppingItemDetails,
  type ShoppingListDetails,
} from "@/lib/events";

function formatMoney(value: number | null) {
  if (value == null) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatEventDate(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function toTitleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildRecommendationReason(
  item: ShoppingItemDetails,
  event: EventDetails,
  plan: PartyPlanDetails | null,
) {
  if (item.recommendation_reason?.trim()) {
    return item.recommendation_reason;
  }

  const normalizedCategory = item.category.toLowerCase();
  const guestTarget = event.guest_target;
  const theme = plan?.theme ?? event.theme ?? event.event_type;

  if (normalizedCategory.includes("decor")) {
    return `Picked to reinforce the ${theme} direction without sending you back into a generic search.`;
  }

  if (normalizedCategory.includes("table") || normalizedCategory.includes("serve")) {
    return guestTarget
      ? `A practical fit for hosting around ${guestTarget} guests with a little buffer built in.`
      : "A practical hosting item that supports the guest setup already planned.";
  }

  if (normalizedCategory.includes("favor") || normalizedCategory.includes("activity")) {
    return `Included because it matches the event type and keeps the guest experience feeling intentional.`;
  }

  if (normalizedCategory.includes("upgrade")) {
    return event.budget
      ? `This is a nice stretch item if you want to spend part of the ${formatMoney(event.budget)} budget on a stronger finish.`
      : "This is a higher-impact extra if you want the event to feel more polished.";
  }

  return `Recommended because it supports the ${theme} plan and fits the event setup already stored in Party Genie.`;
}

function summarizeCategory(itemCount: number, category: string) {
  const label = toTitleCase(category);
  if (itemCount === 1) {
    return `${label} recommendation`;
  }

  return `${itemCount} ${label.toLowerCase()} picks`;
}

function truncateSearchQuery(value: string | null, maxLength = 72) {
  if (!value) return null;
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

function buildTrackedShoppingHref({
  eventId,
  item,
}: {
  eventId: string;
  item: ShoppingItemDetails;
}) {
  if (!item.external_url) {
    return null;
  }

  const params = new URLSearchParams({
    eventId,
    itemId: item.id,
    target: item.external_url,
  });

  return `/api/affiliate/click?${params.toString()}`;
}

function buildRecommendationVisual(item: ShoppingItemDetails) {
  const categoryLabel = toTitleCase(item.category);

  if (item.image_url) {
    return (
      <div
        className="h-28 rounded-[1.35rem] bg-cover bg-center lg:h-full lg:min-h-40"
        style={{ backgroundImage: `url(${item.image_url})` }}
      />
    );
  }

  return (
    <div className="flex h-28 items-end rounded-[1.35rem] border border-white/70 bg-[linear-gradient(145deg,rgba(37,146,255,0.22)_0%,rgba(118,97,255,0.18)_45%,rgba(255,255,255,0.94)_100%)] p-4 lg:h-full lg:min-h-40">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Amazon search pick</p>
        <p className="mt-2 text-lg font-semibold text-ink">{categoryLabel}</p>
      </div>
    </div>
  );
}

export function ShoppingListCard({
  event,
  eventId,
  shoppingList,
  items,
  plan,
}: {
  event: EventDetails;
  eventId: string;
  shoppingList: ShoppingListDetails | null;
  items: ShoppingItemDetails[];
  plan: PartyPlanDetails | null;
}) {
  const groupedItems = Object.entries(
    items.reduce<Record<string, ShoppingItemDetails[]>>((groups, item) => {
      const key = item.category.trim() || "Recommendations";
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {}),
  ).sort((a, b) => a[0].localeCompare(b[0]));

  const summaryChips = [
    event.theme || plan?.theme
      ? { label: "Theme", value: event.theme || plan?.theme || "" }
      : null,
    event.guest_target ? { label: "Guest count", value: `${event.guest_target} guests` } : null,
    formatEventDate(event.event_date) ? { label: "Date", value: formatEventDate(event.event_date) ?? "" } : null,
    event.budget ? { label: "Budget", value: formatMoney(event.budget) } : null,
    { label: "Vibe", value: plan?.theme ?? `${event.event_type} celebration` },
  ].filter((chip): chip is { label: string; value: string } => Boolean(chip));

  const completedItems = items.filter((item) => item.status === "purchased").length;

  return (
    <div className="grid gap-4">
      <Card className="bg-white/85">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <Badge>Amazon-style recommendations</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
              Party Genie Shopping
            </h2>
            <p className="mt-3 text-base leading-7 text-ink-muted">
              Based on the event parameters you gave me, here are my recommendations from Amazon.
            </p>
            <p className="mt-3 text-sm leading-7 text-ink-muted">
              The goal here is not to make you search from scratch. It is to turn the event you
              already planned into a cleaner shopping handoff.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {summaryChips.map((chip) => (
                <span
                  key={chip.label}
                  className="rounded-full border border-border bg-[rgba(244,247,255,0.92)] px-4 py-2 text-sm text-ink"
                >
                  <span className="mr-2 text-xs uppercase tracking-[0.18em] text-ink-muted">
                    {chip.label}
                  </span>
                  {chip.value}
                </span>
              ))}
            </div>
          </div>

          <div className="w-full max-w-md rounded-[1.9rem] border border-white/80 bg-[linear-gradient(140deg,rgba(39,147,255,0.92)_0%,rgba(118,97,255,0.9)_48%,rgba(187,119,255,0.86)_100%)] p-5 text-white shadow-party">
            <p className="text-xs uppercase tracking-[0.22em] text-white/70">Refresh action</p>
            <h3 className="mt-3 text-2xl font-semibold">Regenerate recommendations</h3>
            <p className="mt-3 text-sm leading-6 text-white/85">
              Rebuild the list from your current event details whenever the plan, guest count, or
              budget shifts.
            </p>
            <div className="mt-5">
              <AiGenerateButton
                endpoint="/api/ai/generate-shopping-list"
                eventId={eventId}
                label="Regenerate recommendations"
                pendingLabel="Refreshing recommendations..."
                variant="secondary"
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Recommendation groups",
            value: String(groupedItems.length),
            detail: groupedItems.length ? "Decor, tableware, favors, and more" : "No groups yet",
          },
          {
            label: "Recommended items",
            value: String(items.length),
            detail: items.length ? "Current AI-curated product picks" : "No items generated yet",
          },
          {
            label: "Estimated spend",
            value: formatMoney(shoppingList?.estimated_total ?? 0),
            detail: event.budget ? `Working against ${formatMoney(event.budget)}` : "Budget can stay flexible",
          },
          {
            label: "Purchased",
            value: `${completedItems}/${items.length || 0}`,
            detail: completedItems ? "Items already marked complete" : "Nothing marked purchased yet",
          },
        ].map((item) => (
          <Card key={item.label} className="bg-white/80">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-ink">{item.value}</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{item.detail}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 [@media(min-width:1700px)]:grid-cols-[1.15fr_0.85fr]">
        <Card className="bg-[rgba(244,247,255,0.9)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Recommendation groups</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink">
                Shopping picks organized the way a host actually shops
              </h3>
            </div>
            {shoppingList ? (
              <div className="self-start rounded-full border border-border bg-white/85 px-4 py-2 text-sm font-medium text-brand">
                Current estimate: {formatMoney(shoppingList.estimated_total)}
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4">
            {groupedItems.length ? (
              groupedItems.map(([category, categoryItems]) => (
                <div key={category} className="rounded-[1.75rem] border border-border bg-white/88 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
                        {summarizeCategory(categoryItems.length, category)}
                      </p>
                      <h4 className="mt-2 text-xl font-semibold text-ink">{toTitleCase(category)}</h4>
                    </div>
                    <Badge>{categoryItems.length} items</Badge>
                  </div>

                  <div className="mt-4 grid gap-4">
                    {categoryItems.map((item) => {
                      const trackedHref = buildTrackedShoppingHref({ eventId, item });

                      return (
                        <div
                          key={item.id}
                          className="rounded-[1.5rem] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(244,247,255,0.92)_100%)] p-4"
                        >
                        <div className="grid gap-4 [@media(min-width:1500px)]:grid-cols-[200px_minmax(0,1fr)]">
                          {buildRecommendationVisual(item)}

                          <div className="flex min-w-0 flex-col justify-between gap-4">
                            <div className="flex min-w-0 flex-col gap-4 [@media(min-width:1700px)]:flex-row [@media(min-width:1700px)]:items-start [@media(min-width:1700px)]:justify-between">
                              <div className="min-w-0 max-w-2xl">
                                <p className="text-xl font-semibold leading-8 text-ink">{item.name}</p>
                                <p className="mt-2 max-w-xl text-sm leading-7 text-ink-muted">
                                  {buildRecommendationReason(item, event, plan)}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-ink-muted">
                                  <span className="rounded-full bg-white px-3 py-2">Qty {item.quantity}</span>
                                  <span className="rounded-full bg-white px-3 py-2">
                                    {formatMoney(item.estimated_price)}
                                  </span>
                                  <span className="rounded-full bg-white px-3 py-2">{item.status}</span>
                                </div>
                              </div>

                              <div className="flex shrink-0 flex-wrap gap-3 [@media(min-width:1700px)]:justify-end">
                                {trackedHref ? (
                                  <Button asChild>
                                    <a
                                      href={trackedHref}
                                      rel="noreferrer"
                                      target="_blank"
                                    >
                                      View on Amazon
                                    </a>
                                  </Button>
                                ) : null}
                                <Button asChild variant="secondary">
                                  <Link href={`#manual-item-${item.id}`}>Adjust details</Link>
                                </Button>
                              </div>
                            </div>

                            {item.search_query ? (
                              <div className="rounded-[1.1rem] border border-border bg-white/80 px-4 py-3 text-sm text-ink-muted">
                                <span className="mr-2 text-xs uppercase tracking-[0.18em] text-ink-muted">
                                  Amazon search
                                </span>
                                {truncateSearchQuery(item.search_query)}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.75rem] border border-border bg-white/85 p-6">
                <p className="text-lg font-semibold text-ink">No recommendations yet</p>
                <p className="mt-2 text-sm leading-7 text-ink-muted">
                  Generate the shopping list and Party Genie will turn your event plan into grouped
                  recommendations here.
                </p>
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="bg-white/80">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Retailer handoff</p>
            {shoppingList ? (
              <form action={updateShoppingSettingsAction} className="mt-4">
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="shoppingListId" value={shoppingList.id} />
                <div className="space-y-2">
                  <Label htmlFor="retailer">Retailer focus</Label>
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
                [
                  "Budget pressure",
                  event.budget && (shoppingList?.estimated_total ?? 0) > event.budget
                    ? "Over target"
                    : "Within range",
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-3xl bg-[rgba(244,247,255,0.9)] px-4 py-3">
                  <p className="text-sm text-ink-muted">{label}</p>
                  <p className="text-sm font-medium capitalize text-ink">{value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-white/80">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Manual adjustments</p>
            <h3 className="mt-2 text-xl font-semibold text-ink">Add a specific item</h3>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Use this when you already know an item you want on top of the AI recommendations.
            </p>

            {shoppingList ? (
              <form action={addShoppingItemAction} className="mt-5 grid gap-4">
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="item-quantity">Quantity</Label>
                    <Input id="item-quantity" name="quantity" type="number" min="1" defaultValue="1" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-price">Estimated price</Label>
                    <Input
                      id="item-price"
                      name="estimatedPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="24"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-url">Retailer URL</Label>
                  <Input id="item-url" name="externalUrl" placeholder="https://example.com/item" />
                </div>
                <SubmitButton pendingLabel="Adding item...">Add shopping item</SubmitButton>
              </form>
            ) : null}
          </Card>

          <Card className="bg-[rgba(244,247,255,0.92)]">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Editable list</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Recommendations come first, but every line item can still be edited if the host needs
              to fine-tune quantities, links, or purchase status.
            </p>

            <div className="mt-4 grid gap-3">
              {items.length ? (
                items.map((item) => (
                  <div
                    key={item.id}
                    id={`manual-item-${item.id}`}
                    className="rounded-[1.5rem] border border-border bg-white/90 p-4"
                  >
                    <form action={updateShoppingItemAction} className="grid gap-4">
                      <input type="hidden" name="eventId" value={eventId} />
                      <input type="hidden" name="shoppingListId" value={shoppingList?.id ?? ""} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <div className="space-y-2">
                        <Label htmlFor={`item-category-${item.id}`}>Category</Label>
                        <Input id={`item-category-${item.id}`} name="category" defaultValue={item.category} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`item-name-${item.id}`}>Item</Label>
                        <Input id={`item-name-${item.id}`} name="name" defaultValue={item.name} required />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
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
                      </div>
                      <div className="space-y-2">
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
                      <div className="flex flex-wrap gap-3">
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
                <div className="rounded-[1.5rem] border border-border bg-white/85 p-4 text-sm leading-6 text-ink-muted">
                  Once recommendations are generated, you can still tune every line item here.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
