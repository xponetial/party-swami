"use client";

import { useEffect, useMemo, useState } from "react";

type ImageBudgetUsage = {
  monthlyBudgetUsd: number;
  usedBudgetUsd: number;
  remainingBudgetUsd: number;
  generatedImagesCount: number;
  monthlyImageCap: number;
  imagesLeftThisMonth: number;
  purchasedImagePackCount: number;
};

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function ImageBudgetMeter({ initialUsage }: { initialUsage: ImageBudgetUsage }) {
  const [usage, setUsage] = useState<ImageBudgetUsage>(initialUsage);

  const usagePct = useMemo(() => {
    if (!usage.monthlyBudgetUsd) return 0;
    return Math.min(100, Math.round((usage.usedBudgetUsd / usage.monthlyBudgetUsd) * 100));
  }, [usage.monthlyBudgetUsd, usage.usedBudgetUsd]);

  useEffect(() => {
    let isMounted = true;

    async function refreshUsage() {
      const response = await fetch("/api/usage/invite-images", { method: "GET" });
      const payload = await response.json().catch(() => null);

      if (!isMounted || !response.ok || !payload?.ok || !payload?.usage) return;

      setUsage(payload.usage as ImageBudgetUsage);
    }

    function handleUsageUpdated() {
      void refreshUsage();
    }

    window.addEventListener("party-swami:image-usage-updated", handleUsageUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener("party-swami:image-usage-updated", handleUsageUpdated);
    };
  }, []);

  return (
    <div className="rounded-3xl border border-white/70 bg-white/45 px-4 py-4 text-ink backdrop-blur">
      <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Pro image budget</p>
      <p className="mt-1 text-sm font-semibold">
        {formatUsd(usage.usedBudgetUsd)} / {formatUsd(usage.monthlyBudgetUsd)}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(38,146,255,0.96),rgba(139,70,255,0.92))]"
          style={{ width: `${usagePct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        {usage.generatedImagesCount} generated | {usage.imagesLeftThisMonth} left this month
      </p>
      <p className="text-xs text-ink-muted">
        Cap {usage.monthlyImageCap} images
        {usage.purchasedImagePackCount > 0 ? ` (${usage.purchasedImagePackCount} pack${usage.purchasedImagePackCount === 1 ? "" : "s"} added)` : ""}
      </p>
      <p className="text-xs text-ink-muted">{formatUsd(usage.remainingBudgetUsd)} budget remaining</p>
    </div>
  );
}
