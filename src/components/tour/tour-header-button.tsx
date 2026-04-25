"use client";

import { usePathname } from "next/navigation";
import { Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTourPageKeyFromPath } from "@/lib/tour";

export function TourHeaderButton() {
  const pathname = usePathname();
  const pageKey = getTourPageKeyFromPath(pathname);

  function openTour() {
    window.dispatchEvent(
      new CustomEvent("party-swami-tour:open", {
        detail: {
          mode: "page",
          pageKey: pageKey ?? undefined,
        },
      }),
    );
  }

  return (
    <Button type="button" variant="secondary" onClick={openTour} className="gap-2" aria-label="Open page tour">
      <Map className="size-4" />
      Tour
    </Button>
  );
}

