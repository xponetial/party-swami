"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TurnstileGate, type TurnstileGateHandle } from "@/components/security/turnstile-gate";

const revisionOptions = [
  { value: "budget_adjustment", label: "Budget adjustment" },
  { value: "guest_count_change", label: "Guest count change" },
  { value: "theme_shift", label: "Theme shift" },
  { value: "menu_refresh", label: "Menu refresh" },
];

export function AiRevisePlanForm({ eventId }: { eventId: string }) {
  const turnstileRef = useRef<TurnstileGateHandle>(null);
  const [pending, setPending] = useState(false);
  const [changeType, setChangeType] = useState(revisionOptions[0]?.value ?? "budget_adjustment");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!instructions.trim()) {
      setError("Add a short revision instruction first.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const turnstileToken = await turnstileRef.current?.getToken();

      if (!turnstileToken) {
        setError("Bot protection could not verify this request. Please try again.");
        return;
      }

      const response = await fetch("/api/ai/revise-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventId,
          changeType,
          instructions: instructions.trim(),
          turnstileToken,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setError(payload?.message ?? "Unable to revise the plan right now.");
        return;
      }

      window.location.reload();
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="change-type">Revision type</Label>
        <select
          id="change-type"
          value={changeType}
          onChange={(event) => setChangeType(event.target.value)}
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
        >
          {revisionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="revision-instructions">Revision request</Label>
        <textarea
          id="revision-instructions"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="Example: Reduce the total spend by 20% and swap to easier grocery-store decor."
          className="min-h-28 w-full rounded-[1.5rem] border border-border bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
        />
      </div>

      <TurnstileGate ref={turnstileRef} />

      <Button disabled={pending} type="submit" variant="secondary">
        {pending ? "Revising plan..." : "Revise AI plan"}
      </Button>
      {error ? <p className="text-xs text-brand">{error}</p> : null}
    </form>
  );
}
