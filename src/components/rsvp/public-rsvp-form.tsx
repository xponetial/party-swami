"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { submitPublicRsvpAction, type PublicRsvpState } from "@/app/rsvp/[slug]/actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: PublicRsvpState = {};

export function PublicRsvpForm({
  slug,
  guestToken,
  currentStatus,
  currentPlusOneCount,
  successMessage,
}: {
  slug: string;
  guestToken: string;
  currentStatus: "pending" | "confirmed" | "declined";
  currentPlusOneCount: number;
  successMessage?: string;
}) {
  const [state, formAction] = useActionState(submitPublicRsvpAction, initialState);
  const [status, setStatus] = useState(currentStatus);
  const [plusOneCount, setPlusOneCount] = useState(String(currentPlusOneCount));
  const plusOneDisabled = status !== "confirmed";
  const helperText = useMemo(() => {
    if (status === "declined") {
      return "No plus-ones are counted when you decline.";
    }

    if (status === "pending") {
      return "Leave this at 0 until you know how many guests may join you.";
    }

    return "Count only the additional people joining you, not yourself.";
  }, [status]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="guestToken" value={guestToken} />

      <div className="space-y-2">
        <Label>RSVP status</Label>
        <div className="grid gap-3">
          {[
            {
              value: "confirmed",
              label: "Yes, I'll be there",
              description: "Let the host know to count you in.",
            },
            {
              value: "pending",
              label: "Maybe / still deciding",
              description: "Keep your spot warm while you confirm.",
            },
            {
              value: "declined",
              label: "Sorry, can't make it",
              description: "Send a polite decline so the host can plan accurately.",
            },
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-3xl border border-border bg-white px-4 py-4 text-sm transition hover:border-brand/30"
            >
              <input
                type="radio"
                name="status"
                value={option.value}
                checked={status === option.value}
                onChange={() => setStatus(option.value as typeof currentStatus)}
                className="mt-1 size-4 accent-[var(--brand)]"
              />
              <span className="space-y-1">
                <span className="block font-medium text-ink">{option.label}</span>
                <span className="block text-ink-muted">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="plusOneCount">Plus-ones</Label>
        <Input
          id="plusOneCount"
          name="plusOneCount"
          type="number"
          min="0"
          value={plusOneDisabled ? "0" : plusOneCount}
          onChange={(event) => setPlusOneCount(event.target.value)}
          disabled={plusOneDisabled}
        />
        <p className="text-sm text-ink-muted">{helperText}</p>
      </div>

      {successMessage ? (
        <p className="rounded-2xl border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-accent">
          {successMessage}
        </p>
      ) : null}

      {state.error ? (
        <p className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand">
          {state.error}
        </p>
      ) : null}

      <SubmitButton className="w-full" pendingLabel="Saving RSVP...">
        Save RSVP
      </SubmitButton>
    </form>
  );
}
