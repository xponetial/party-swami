"use client";

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

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="guestToken" value={guestToken} />

      <div className="space-y-2">
        <Label htmlFor="status">RSVP status</Label>
        <select
          id="status"
          name="status"
          defaultValue={currentStatus}
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
        >
          <option value="confirmed">Yes, I&apos;ll be there</option>
          <option value="declined">Sorry, can&apos;t make it</option>
          <option value="pending">Maybe / still deciding</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="plusOneCount">Plus-ones</Label>
        <Input
          id="plusOneCount"
          name="plusOneCount"
          type="number"
          min="0"
          defaultValue={String(currentPlusOneCount)}
        />
      </div>

      {successMessage ? (
        <p className="rounded-2xl border border-[#cfe1da] bg-[#eff8f4] px-4 py-3 text-sm text-accent">
          {successMessage}
        </p>
      ) : null}

      {state.error ? (
        <p className="rounded-2xl border border-[#e7c2b7] bg-[#fff5f1] px-4 py-3 text-sm text-brand">
          {state.error}
        </p>
      ) : null}

      <SubmitButton className="w-full" pendingLabel="Saving RSVP...">
        Save RSVP
      </SubmitButton>
    </form>
  );
}
