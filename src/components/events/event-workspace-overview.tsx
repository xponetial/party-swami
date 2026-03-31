import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const shoppingItems = [
  ["Decor", "Lemon taper candles", "4 boxes"],
  ["Table", "Compostable plates", "30 settings"],
  ["Food", "Mini quiches", "24 pieces"],
  ["Drinks", "Sparkling lemonade", "12 bottles"],
];

const tasks = [
  "Finalize invite wording by Tuesday",
  "Confirm bakery order on Thursday",
  "Buy flowers the morning before",
  "Set patio tables 90 minutes before guests arrive",
];

const menuIdeas = [
  "Citrus fruit board with mint",
  "Mini quiches and tea sandwiches",
  "Lemonade spritz bar",
];

export function EventWorkspaceOverview({ eventId }: { eventId: string }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="bg-white/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Theme and invite preview</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">Sunny Garden Brunch</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                Playful florals, citrus accents, and soft gold table details for a warm afternoon birthday.
              </p>
            </div>
            <Badge variant="success">AI generated</Badge>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-[1.75rem] border border-dashed border-border bg-canvas p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Invite front</p>
              <p className="mt-6 text-3xl font-semibold text-ink">Join us in the garden</p>
              <p className="mt-3 text-sm leading-7 text-ink-muted">
                Celebrate Ava turning eight with flower crowns, lemonade spritzers, and a sunny birthday brunch.
              </p>
            </div>
            <div className="rounded-[1.75rem] bg-[#fffaf2] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Recommended next actions</p>
              <div className="mt-4 space-y-3">
                {[
                  "Edit invite details and send to the first guest batch",
                  "Approve the shopping list and push everything to a retailer cart",
                  "Review menu items and sync quantities back into the plan",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-white/85 px-4 py-3">
                    <Sparkles className="mt-0.5 size-4 text-brand" />
                    <p className="text-sm leading-6 text-ink-muted">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-[#fffaf2]">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Quick links</p>
          <div className="mt-4 grid gap-3">
            {[
              { href: `/events/${eventId}/invite`, label: "Invitation generator", detail: "Edit copy, manage sharing, and send reminders." },
              { href: `/events/${eventId}/guests`, label: "Guest management", detail: "Track RSVPs, messages, plus-ones, and imports." },
              { href: `/events/${eventId}/shopping`, label: "Shopping cart", detail: "Compare retailers and keep spending within budget." },
              { href: `/events/${eventId}/timeline`, label: "Timeline tracker", detail: "Stay on top of pre-event tasks and day-of timing." },
              { href: `/events/${eventId}/settings`, label: "Security and settings", detail: "Review privacy, payments, and consent controls." },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="rounded-3xl border border-border bg-white/85 p-4 transition hover:-translate-y-0.5">
                <p className="font-semibold text-ink">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{item.detail}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Shopping list</p>
              <h3 className="mt-2 text-xl font-semibold text-ink">Categorized and quantity-aware</h3>
            </div>
            <Link href={`/events/${eventId}/shopping`} className="text-sm font-medium text-brand hover:text-brand-dark">
              Add all to cart
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {shoppingItems.map(([category, item, quantity]) => (
              <div key={item} className="grid gap-2 rounded-3xl border border-border bg-white/80 p-4 md:grid-cols-[0.6fr_1.2fr_0.6fr]">
                <p className="text-sm font-medium text-ink-muted">{category}</p>
                <p className="font-medium text-ink">{item}</p>
                <label className="flex items-center justify-between gap-3 text-sm text-ink-muted">
                  <span>{quantity}</span>
                  <input type="checkbox" checked readOnly className="size-4 accent-[var(--brand)]" />
                </label>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Task checklist</p>
            <div className="mt-4 space-y-3">
              {tasks.map((task) => (
                <div key={task} className="flex items-start gap-3 rounded-3xl border border-border bg-white/80 px-4 py-3">
                  <span className="mt-1 flex size-5 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <Check className="size-3.5" />
                  </span>
                  <p className="text-sm leading-6 text-ink-muted">{task}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Menu suggestions</p>
            <div className="mt-4 space-y-3">
              {menuIdeas.map((item) => (
                <div key={item} className="rounded-3xl bg-canvas px-4 py-3 text-sm text-ink">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
