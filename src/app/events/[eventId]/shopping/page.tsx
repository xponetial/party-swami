import { AppShell } from "@/components/layout/app-shell";
import { ShoppingListCard } from "@/components/shopping/shopping-list-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getEventContext } from "@/lib/events";
import Link from "next/link";

export default async function EventShoppingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { event, plan, shoppingList, shoppingItems } = await getEventContext(eventId);

  return (
    <AppShell
      title="Party Swami Shopping"
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
      <Card className="bg-white/80">
        <p className="text-sm leading-6 text-ink-muted">
          Ready for service providers? Open your AI-ranked vendor matches to request quotes and compare options.
        </p>
        <div className="mt-4">
          <Button asChild>
            <Link href={`/events/${eventId}/vendors`}>View Recommended Vendors</Link>
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
