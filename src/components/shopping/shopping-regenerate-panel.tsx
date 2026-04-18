"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function parseSearchTerms(value: string) {
  return value
    .split(/[\n,]/)
    .map((term) => term.trim())
    .filter(Boolean)
    .filter((term, index, terms) => terms.findIndex((entry) => entry.toLowerCase() === term.toLowerCase()) === index);
}

export function ShoppingRegeneratePanel({
  eventId,
  initialTerms,
}: {
  eventId: string;
  initialTerms: string[];
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTermsText, setSearchTermsText] = useState(initialTerms.join(", "));

  const parsedTerms = useMemo(() => parseSearchTerms(searchTermsText), [searchTermsText]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/generate-shopping-list", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventId,
          searchTerms: parsedTerms,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setError(payload?.message ?? "Unable to refresh recommendations right now.");
        return;
      }

      window.location.reload();
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="shopping-search-terms" className="text-white">
          Search words used for regenerate
        </Label>
        <textarea
          id="shopping-search-terms"
          value={searchTermsText}
          onChange={(event) => setSearchTermsText(event.target.value)}
          placeholder="Example: patriotic, fireworks, red white blue, soda variety pack"
          className="min-h-28 w-full rounded-[1.5rem] border border-white/30 bg-white/92 px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-white/80 focus:ring-4 focus:ring-white/20"
        />
      </div>

      <p className="text-xs leading-6 text-white/75">
        We already include the event title, event type, and theme. Add extra words here to steer the
        next Amazon search.
      </p>

      {parsedTerms.length ? (
        <div className="flex flex-wrap gap-2">
          {parsedTerms.map((term) => (
            <span
              key={term}
              className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs text-white"
            >
              {term}
            </span>
          ))}
        </div>
      ) : null}

      <Button disabled={pending} type="submit" variant="secondary">
        {pending ? "Refreshing recommendations..." : "Regenerate recommendations"}
      </Button>
      {error ? <p className="text-xs text-white">{error}</p> : null}
    </form>
  );
}
