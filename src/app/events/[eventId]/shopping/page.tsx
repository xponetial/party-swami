import { AppShell } from "@/components/layout/app-shell";
import { ShoppingListCard } from "@/components/shopping/shopping-list-card";
import { getEventContext } from "@/lib/events";

export default async function EventShoppingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { event, plan, shoppingList, shoppingItems } = await getEventContext(eventId);

  return (
    <AppShell
      title="Party Genie Shopping"
      description="Personalized shopping recommendations based on the event details you already planned."
      backHref={`/events/${eventId}`}
      eventNav={{ eventId, eventTitle: event.title, active: "shopping" }}
    >
      <ShoppingListCard
        event={event}
        eventId={eventId}
        items={shoppingItems}
        plan={plan}
        shoppingList={shoppingList}
      />
    </AppShell>
  );
}
