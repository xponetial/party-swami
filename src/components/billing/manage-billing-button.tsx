"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";

export function ManageBillingButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleManageBilling() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });

      if (response.status === 401) {
        router.push("/login?next=/dashboard");
        return;
      }

      const payload = (await response.json()) as { ok?: boolean; url?: string; message?: string };

      if (!response.ok || !payload.ok || !payload.url) {
        setError(payload.message ?? "Unable to open billing right now.");
        return;
      }

      window.location.assign(payload.url);
    } catch {
      setError("Unable to open billing right now.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          void handleManageBilling();
        }}
        disabled={pending}
        className={`inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-brand/40 hover:text-brand disabled:opacity-60 ${className}`.trim()}
      >
        {pending ? "Opening..." : "Manage billing"}
        <ArrowRightLeft className="size-4" />
      </button>
      {error ? <p className="text-xs text-brand">{error}</p> : null}
    </div>
  );
}
