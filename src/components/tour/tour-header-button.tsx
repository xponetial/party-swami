"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ToggleLeft, ToggleRight } from "lucide-react";
import { getTourPageKeyFromPath, normalizeTourState } from "@/lib/tour";

export function TourHeaderButton() {
  const pathname = usePathname();
  const pageKey = getTourPageKeyFromPath(pathname);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/tour-state")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { tour_state?: unknown } | null) => {
        if (!isMounted || !payload) {
          return;
        }
        const state = normalizeTourState(payload.tour_state);
        setEnabled(!state.skipped);
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  async function toggleTour() {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);

    await fetch("/api/tour-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patch: nextEnabled
          ? { skipped: false, started: true, completed: false }
          : { skipped: true, started: false, completed: false },
      }),
    }).catch(() => undefined);

    if (!nextEnabled) {
      window.dispatchEvent(new CustomEvent("party-swami-tour:close"));
      return;
    }

    window.dispatchEvent(
      new CustomEvent("party-swami-tour:open", {
        detail: {
          mode: pageKey ? "page" : "full",
          pageKey: pageKey || undefined,
        },
      }),
    );
  }

  return (
    <button
      type="button"
      onClick={() => void toggleTour()}
      disabled={loading}
      aria-pressed={enabled}
      aria-label={enabled ? "Turn tour off" : "Turn tour on"}
      className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-[linear-gradient(135deg,rgba(255,247,255,0.92)_0%,rgba(240,232,255,0.92)_45%,rgba(236,245,255,0.92)_100%)] px-4 py-2 text-sm font-medium text-ink shadow-[0_14px_30px_rgba(101,85,176,0.12)] transition hover:border-brand/35 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {enabled ? <ToggleRight className="size-4 text-brand" /> : <ToggleLeft className="size-4 text-ink-muted" />}
      <span>Tour {enabled ? "On" : "Off"}</span>
    </button>
  );
}
