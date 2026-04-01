"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function InviteSendButton({ eventId }: { eventId: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/invites/send", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ eventId }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setError(payload?.message ?? "Unable to send invites right now.");
        return;
      }

      setMessage(
        `Sent ${payload.summary.sentCount} invite${payload.summary.sentCount === 1 ? "" : "s"}${payload.summary.skippedCount ? `, skipped ${payload.summary.skippedCount}` : ""}.`,
      );
      window.location.reload();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" disabled={pending} onClick={handleClick} type="button">
        {pending ? "Sending invites..." : "Send invite emails"}
      </Button>
      {message ? <p className="text-xs text-accent">{message}</p> : null}
      {error ? <p className="text-xs text-brand">{error}</p> : null}
    </div>
  );
}
