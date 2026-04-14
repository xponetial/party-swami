"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Images } from "lucide-react";

export function BuyImagePackButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/image-pack-checkout", {
        method: "POST",
      });

      if (response.status === 401) {
        router.push("/login?next=/billing");
        return;
      }

      const payload = (await response.json()) as { ok?: boolean; url?: string; message?: string };
      if (!response.ok || !payload.ok || !payload.url) {
        setError(payload.message ?? "Unable to start image pack checkout right now.");
        return;
      }

      window.location.assign(payload.url);
    } catch {
      setError("Unable to start image pack checkout right now.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          void handleCheckout();
        }}
        disabled={pending}
        className={`inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-brand/40 hover:text-brand disabled:opacity-60 ${className}`.trim()}
      >
        {pending ? "Redirecting..." : "Buy $10 image pack"}
        <Images className="size-4" />
      </button>
      {error ? <p className="text-xs text-brand">{error}</p> : null}
    </div>
  );
}
