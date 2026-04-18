import Link from "next/link";
import { AiGenerateButton } from "@/components/ai/ai-generate-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  type EventDetails,
  type PartyPlanDetails,
  type ShoppingItemDetails,
  type ShoppingListDetails,
} from "@/lib/events";

const SHOPPING_CATEGORY_ORDER = [
  "Decor",
  "Tableware",
  "Cake & Desserts",
  "Drinks",
  "Party Favors",
  "Hats & Wearables",
  "Activities & Games",
  "Serving Supplies",
] as const;

type ShoppingCategoryLabel = (typeof SHOPPING_CATEGORY_ORDER)[number];

function toDisplayCategory(category: string): ShoppingCategoryLabel | null {
  const normalized = category.trim().toLowerCase();

  if (normalized.includes("decor")) return "Decor";
  if (normalized.includes("tableware") || normalized.includes("plate") || normalized.includes("cups")) return "Tableware";
  if (normalized.includes("cake") || normalized.includes("dessert")) return "Cake & Desserts";
  if (normalized.includes("drink") || normalized.includes("beverage")) return "Drinks";
  if (normalized.includes("favor") || normalized.includes("goodie")) return "Party Favors";
  if (normalized.includes("hat") || normalized.includes("wearable")) return "Hats & Wearables";
  if (normalized.includes("activit") || normalized.includes("game")) return "Activities & Games";
  if (normalized.includes("serving") || normalized.includes("hosting") || normalized.includes("supply")) return "Serving Supplies";

  return null;
}

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

  return `Recommended because it supports the ${theme} plan and fits the event setup already stored in Party Swami.`;
}

function summarizeCategory(itemCount: number, category: string) {
  const label = toTitleCase(category);
  if (itemCount === 1) {
    return `${label} recommendation`;
  }

  return `${itemCount} ${label.toLowerCase()} picks`;
}

function getCategoryVisualPath(category: string) {
  const displayCategory = toDisplayCategory(category);
  if (displayCategory === "Decor") return "/shopping-categories/decor.png";
  if (displayCategory === "Tableware") return "/shopping-categories/tableware.png";
  if (displayCategory === "Cake & Desserts") return "/shopping-categories/cake-desserts.png";
  if (displayCategory === "Drinks") return "/shopping-categories/beverages.png";
  if (displayCategory === "Party Favors") return "/shopping-categories/party-favors.png";
  if (displayCategory === "Hats & Wearables") return "/shopping-categories/hats-wearables.png";
  if (displayCategory === "Activities & Games") return "/shopping-categories/activities-games.png";
  if (displayCategory === "Serving Supplies") return "/shopping-categories/serving-supplies.png";
  return null;
}

function buildTrackedShoppingHref({
  eventId,
  item,
}: {
  eventId: string;
  item: ShoppingItemDetails;
}) {
  const searchTarget = item.search_query
    ? `https://www.amazon.com/s?k=${encodeURIComponent(item.search_query.trim())}`
    : null;
  const isAmazonExternal =
    item.external_url &&
    (() => {
      try {
        const parsed = new URL(item.external_url);
        return parsed.hostname.replace(/^www\./, "").includes("amazon.");
      } catch {
        return false;
      }
    })();
  // Prefer live search-based resolution for Amazon so stale saved PDP links
  // do not keep sending users to mismatched items.
  const target = isAmazonExternal ? (searchTarget ?? item.external_url) : (item.external_url ?? searchTarget);

  if (!target) {
    return null;
  }

  const params = new URLSearchParams({
    eventId,
    itemId: item.id,
    itemName: item.name,
    itemCategory: item.category,
    target,
  });

  return `/api/affiliate/click?${params.toString()}`;
}

function buildRecommendationVisual(item: ShoppingItemDetails) {
  const categoryLabel = toTitleCase(item.category);
  const categoryVisualPath = getCategoryVisualPath(item.category);

  if (categoryVisualPath) {
    return (
      <div
        className="h-44 rounded-[1.35rem] border border-white/70 bg-cover bg-center lg:h-full lg:min-h-40"
        style={{ backgroundImage: `url(${categoryVisualPath})` }}
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
  const groupedMap = items.reduce<Record<string, ShoppingItemDetails[]>>((groups, item) => {
    const key = (toDisplayCategory(item.category) ?? item.category.trim()) || "Recommendations";
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});

  const groupedItems = SHOPPING_CATEGORY_ORDER
    .map((category) => [category, groupedMap[category] ?? []] as const)
    .filter(([, categoryItems]) => categoryItems.length > 0);

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
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-ink-muted">Step 3 of 4</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
              Party Swami Shopping
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

                  <div className="mt-4 grid gap-4 [@media(min-width:1500px)]:grid-cols-[220px_minmax(0,1fr)]">
                    {buildRecommendationVisual(categoryItems[0])}
                    <div className="overflow-hidden rounded-[1.2rem] border border-border bg-white/88">
                      <table className="w-full text-left">
                        <thead className="bg-[rgba(244,247,255,0.95)]">
                          <tr className="text-xs uppercase tracking-[0.16em] text-ink-muted">
                            <th className="px-4 py-3 font-medium">Affiliate link</th>
                            <th className="px-4 py-3 font-medium">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryItems.map((item) => {
                            const trackedHref = buildTrackedShoppingHref({ eventId, item });
                            return (
                              <tr key={item.id} className="border-t border-border/80 align-top">
                                <td className="px-4 py-3">
                                  {trackedHref ? (
                                    <a
                                      href={trackedHref}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-sm font-semibold text-blue-700 underline decoration-blue-500 underline-offset-4 hover:text-blue-800 hover:decoration-blue-700"
                                      style={{ color: "#1d4ed8", textDecoration: "underline" }}
                                    >
                                      {item.name}
                                    </a>
                                  ) : (
                                    <span className="text-sm text-ink-muted">{item.name}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm leading-6 text-ink-muted">
                                  {buildRecommendationReason(item, event, plan)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.75rem] border border-border bg-white/85 p-6">
                <p className="text-lg font-semibold text-ink">No recommendations yet</p>
                <p className="mt-2 text-sm leading-7 text-ink-muted">
                  Generate the shopping list and Party Swami will turn your event plan into grouped
                  recommendations here.
                </p>
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="bg-white/80">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Next step</p>
            <h3 className="mt-2 text-xl font-semibold text-ink">Turn the plan into a host-ready timeline</h3>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Once the shopping handoff looks right, move into the timeline to lock your checklist
              and day-of run-of-show.
            </p>
            <Button asChild className="mt-4">
              <Link href={`/events/${eventId}/timeline`}>Next: Timeline and tasks</Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
