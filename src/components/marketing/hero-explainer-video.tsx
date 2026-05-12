"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PlayCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VIDEO_SRC = "/videos/PartySwami_50s_Punchy.mp4";
const VIDEO_POSTER = "/party-swami-banner.png";

function VideoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const id = useMemo(() => "party-swami-how-it-works-video", []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d1438]/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={id}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-[1.75rem] border border-white/50 bg-[#060a1c] shadow-[0_32px_96px_rgba(5,9,29,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full border border-white/60 bg-black/35 p-2 text-white transition hover:bg-black/55"
          aria-label="Close explainer video"
        >
          <X className="size-5" />
        </button>

        <div className="border-b border-white/15 px-5 py-4">
          <p id={id} className="text-sm font-semibold uppercase tracking-[0.16em] text-white/85">
            See Party Swami in action
          </p>
        </div>

        <video
          className="block h-auto w-full"
          src={VIDEO_SRC}
          poster={VIDEO_POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          controls
          controlsList="nodownload noplaybackrate"
        />
      </div>
    </div>
  );
}

export function WatchHowItWorksButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="lg"
        variant="secondary"
        className={className}
        onClick={() => setOpen(true)}
      >
        Watch how it works
        <PlayCircle className="size-4" />
      </Button>
      <VideoModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function HeroExplainerVideo({ className }: { className?: string }) {
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
        See Party Swami in action
      </p>
      <button
        type="button"
        onClick={() => {
          setShowControls(true);
          void videoRef.current?.play();
        }}
        className="group relative block w-full overflow-hidden rounded-[1.5rem] border border-white/60 bg-[#0b1030] shadow-[0_22px_60px_rgba(10,15,43,0.36)]"
        aria-label="Play Party Swami explainer video"
      >
        <video
          ref={videoRef}
          className="block h-auto w-full"
          src={VIDEO_SRC}
          poster={VIDEO_POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          controls={showControls}
          controlsList={showControls ? "nodownload noplaybackrate" : undefined}
        />
        {!showControls ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(11,16,48,0.08)_0%,rgba(11,16,48,0.5)_70%,rgba(11,16,48,0.72)_100%)] transition group-hover:bg-[radial-gradient(circle_at_center,rgba(11,16,48,0.02)_0%,rgba(11,16,48,0.34)_64%,rgba(11,16,48,0.6)_100%)]">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/20 px-4 py-2 text-sm font-medium text-white">
              <PlayCircle className="size-4" />
              Tap for controls
            </span>
          </span>
        ) : null}
      </button>
    </div>
  );
}

