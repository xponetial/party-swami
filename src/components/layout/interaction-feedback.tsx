"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      "button, a[href], input[type='submit'], input[type='button'], [role='button']",
    ),
  );
}

export function InteractionFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    document.body.style.cursor = "wait";
    return () => {
      document.body.style.cursor = "";
    };
  }, [visible]);

  useEffect(() => {
    setVisible(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    function startFeedback(event: MouseEvent) {
      if (!isInteractiveTarget(event.target)) {
        return;
      }

      setVisible(true);

      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }

      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
        hideTimerRef.current = null;
      }, 9000);
    }

    function stopFeedback() {
      setVisible(false);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    }

    window.addEventListener("click", startFeedback, true);
    window.addEventListener("pageshow", stopFeedback);
    window.addEventListener("pagehide", stopFeedback);

    return () => {
      window.removeEventListener("click", startFeedback, true);
      window.removeEventListener("pageshow", stopFeedback);
      window.removeEventListener("pagehide", stopFeedback);
      stopFeedback();
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[120]">
      <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-sm text-ink shadow-party backdrop-blur">
        <Loader2 className="size-4 animate-spin text-brand" />
        Working...
      </div>
    </div>
  );
}
