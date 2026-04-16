const AMAZON_HOST = "www.amazon.com";

const PRODUCT_PATH_PATTERNS = [
  /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /%2Fdp%2F([A-Z0-9]{10})(?:%2F|%3F|%26|$)/i,
  /%2Fgp%2Fproduct%2F([A-Z0-9]{10})(?:%2F|%3F|%26|$)/i,
] as const;
const ASIN_ATTRIBUTE_PATTERN = /data-asin="([A-Z0-9]{10})"/gi;
const ASIN_JSON_PATTERN = /"asin":"([A-Z0-9]{10})"/gi;
const SEARCH_RESULT_ASIN_PATTERN =
  /data-component-type="s-search-result"[\s\S]{0,1200}?data-asin="([A-Z0-9]{10})"/gi;
const STOP_TOKENS = new Set([
  "the",
  "and",
  "for",
  "with",
  "set",
  "pack",
  "kit",
  "party",
  "extras",
  "accessories",
  "birthday",
]);

type CatalogEnrichmentItem = {
  category: string;
  name: string;
  quantity: number;
  estimated_price: number | null;
  recommendation_reason: string;
  search_query: string;
  image_url: string | null;
  external_url: string | null;
};

function buildAmazonSearchUrl(query: string) {
  return `https://${AMAZON_HOST}/s?k=${encodeURIComponent(query.trim())}`;
}

function normalizeQuery(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "")
    .trim();
}

function dedupeQueries(queries: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const query of queries.map(normalizeQuery).filter(Boolean)) {
    const key = query.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(query);
  }

  return result;
}

function extractAsinFromUrl(url: string) {
  for (const pattern of PRODUCT_PATH_PATTERNS) {
    const matched = url.match(pattern);
    if (matched?.[1]) {
      return matched[1].toUpperCase();
    }
  }

  return null;
}

function toCanonicalProductUrl(asin: string) {
  return `https://${AMAZON_HOST}/dp/${asin}`;
}

function extractQueryFromAmazonSearchUrl(value: string) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.replace(/^www\./, "");
    const isAmazon = hostname === "amazon.com";
    if (!isAmazon || parsed.pathname !== "/s") {
      return null;
    }

    const query = parsed.searchParams.get("k")?.trim();
    return query || null;
  } catch {
    return null;
  }
}

function extractFirstAsinFromHtml(html: string) {
  for (const pattern of [ASIN_ATTRIBUTE_PATTERN, ASIN_JSON_PATTERN]) {
    pattern.lastIndex = 0;
    const matched = pattern.exec(html);
    if (matched?.[1]) {
      return matched[1].toUpperCase();
    }
  }

  for (const pattern of PRODUCT_PATH_PATTERNS) {
    const matched = html.match(pattern);
    if (matched?.[1]) {
      return matched[1].toUpperCase();
    }
  }

  return null;
}

function toMeaningfulTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_TOKENS.has(token));
}

function extractBestAsinFromSearchHtml(html: string, query: string, matchHint?: string) {
  const hintTokens = toMeaningfulTokens(matchHint ?? "");
  const queryTokens = new Set(toMeaningfulTokens(`${query} ${matchHint ?? ""}`));
  const candidates: Array<{ asin: string; score: number }> = [];
  const seenAsins = new Set<string>();

  SEARCH_RESULT_ASIN_PATTERN.lastIndex = 0;
  for (;;) {
    const match = SEARCH_RESULT_ASIN_PATTERN.exec(html);
    if (!match?.[1]) {
      break;
    }

    const asin = match[1].toUpperCase();
    if (seenAsins.has(asin)) continue;
    seenAsins.add(asin);

    const windowStart = Math.max(0, match.index - 500);
    const windowEnd = Math.min(html.length, match.index + 1500);
    const snippet = html.slice(windowStart, windowEnd).toLowerCase();

    // Avoid obvious ad slots when possible.
    const isSponsored = /\bsponsored\b|puis-sponsored-label|adfeedback/i.test(snippet);
    const tokenScore = [...queryTokens].reduce(
      (sum, token) => (snippet.includes(token) ? sum + 1 : sum),
      0,
    );
    const hintMatchCount = hintTokens.reduce(
      (sum, token) => (snippet.includes(token) ? sum + 1 : sum),
      0,
    );
    if (hintTokens.length > 0 && hintMatchCount === 0) {
      continue;
    }

    const score = tokenScore - (isSponsored ? 2 : 0);

    candidates.push({ asin, score });
  }

  if (!candidates.length) {
    return null;
  }

  candidates.sort((a, b) => b.score - a.score);

  // If confidence is weak, avoid forcing a likely-wrong product.
  if (candidates[0].score < 2) {
    return null;
  }

  return candidates[0].asin;
}

async function resolveFirstAmazonProductUrl(
  query: string,
  matchHint?: string,
): Promise<string | null> {
  const searchUrl = buildAmazonSearchUrl(query);

  try {
    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "accept-language": "en-US,en;q=0.9",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    if (/Type the characters you see in this image/i.test(html)) {
      return null;
    }

    const asin = extractBestAsinFromSearchHtml(html, query, matchHint);

    return asin ? toCanonicalProductUrl(asin) : null;
  } catch {
    return null;
  }
}

export async function resolveAmazonProductFromSearchUrl(
  url: string,
  matchHint?: string,
): Promise<string | null> {
  const query = extractQueryFromAmazonSearchUrl(url);
  if (!query) {
    return null;
  }

  return resolveFirstAmazonProductUrl(query, matchHint);
}

async function enrichOneItem(item: CatalogEnrichmentItem): Promise<CatalogEnrichmentItem> {
  const existingUrl = item.external_url?.trim() || null;

  if (existingUrl) {
    const existingAsin = extractAsinFromUrl(existingUrl);
    if (existingAsin) {
      return {
        ...item,
        external_url: toCanonicalProductUrl(existingAsin),
      };
    }
  }

  const query = item.search_query.trim();
  const queriesToTry = dedupeQueries([
    query,
    item.name,
    query
      .split(/\s+/)
      .filter((token) => token.length >= 3)
      .slice(0, 8)
      .join(" "),
  ]);

  if (!queriesToTry.length) {
    return item;
  }

  for (const candidate of queriesToTry) {
    const resolved = await resolveFirstAmazonProductUrl(candidate, item.name);
    if (resolved) {
      return {
        ...item,
        external_url: resolved,
      };
    }
  }

  return item;
}

export async function enrichShoppingItemsWithAmazonCatalog(
  items: CatalogEnrichmentItem[],
): Promise<CatalogEnrichmentItem[]> {
  if (!items.length) {
    return items;
  }

  // Keep this small to avoid hammering Amazon during regenerate.
  const CONCURRENCY = 3;
  const pending = [...items];
  const enriched: CatalogEnrichmentItem[] = [];

  while (pending.length > 0) {
    const chunk = pending.splice(0, CONCURRENCY);
    const chunkResult = await Promise.all(chunk.map((item) => enrichOneItem(item)));
    enriched.push(...chunkResult);
  }

  return enriched;
}

export type { CatalogEnrichmentItem };
