import { AppShell } from "@/components/layout/app-shell";
import { ShoppingListCard } from "@/components/shopping/shopping-list-card";
import { getEventContext } from "@/lib/events";

export default async function EventShoppingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { shoppingList, shoppingItems } = await getEventContext(eventId);

  return (
    <AppShell
      title="Shopping cart"
      description="Review the AI-generated cart, compare retailers, and keep the order aligned to budget."
      backHref={`/events/${eventId}`}
    >
      <ShoppingListCard eventId={eventId} shoppingList={shoppingList} items={shoppingItems} />
    </AppShell>
  );
}
