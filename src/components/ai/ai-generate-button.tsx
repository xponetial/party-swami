"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TurnstileGate, type TurnstileGateHandle } from "@/components/security/turnstile-gate";

export function AiGenerateButton({
  endpoint,
  eventId,
  label,
  pendingLabel,
  variant = "secondary",
}: {
  endpoint:
    | "/api/ai/generate-plan"
    | "/api/ai/generate-invite-copy"
    | "/api/ai/generate-shopping-list"
    | "/api/ai/one-click";
  eventId: string;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const turnstileRef = useRef<TurnstileGateHandle>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setPending(true);

    try {
      const turnstileToken = await turnstileRef.current?.getToken();

      if (!turnstileToken) {
        setError("Bot protection could not verify this request. Please try again.");
        return;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, turnstileToken }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setError(payload?.message ?? "Unable to generate content right now.");
        return;
      }

      window.location.reload();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button disabled={pending} onClick={handleClick} type="button" variant={variant}>
        {pending ? pendingLabel : label}
      </Button>
      <TurnstileGate ref={turnstileRef} />
      {error ? <p className="text-xs text-brand">{error}</p> : null}
    </div>
  );
}
