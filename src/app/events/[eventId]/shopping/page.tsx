import { AppShell } from "@/components/layout/app-shell";
import { ShoppingListCard } from "@/components/shopping/shopping-list-card";

export default function EventShoppingPage() {
  return (
    <AppShell title="Shopping cart" description="Review the AI-generated cart, compare retailers, and keep the order aligned to budget.">
      <ShoppingListCard />
    </AppShell>
  );
}
