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
const AMAZON_IMAGE_URL_PATTERN =
  /https?:\/\/m\.media-amazon\.com\/images\/I\/[^"'\\\s>]+?\.(?:jpg|jpeg|png|webp)/gi;
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
const BEVERAGE_INTENT_TOKENS = [
  "drink",
  "beverage",
  "mixer",
  "mixers",
  "mocktail",
  "cocktail",
  "dispenser",
  "bar",
] as const;
const BEVERAGE_OFF_CATEGORY_TOKENS = [
  "favor",
  "favors",
  "goodie",
  "goodie bag",
  "gift bag",
  "balloon",
  "banner",
  "cake topper",
  "table decor",
] as const;
const BEVERAGE_FALLBACK_QUERIES = [
  "party drink dispenser with stand",
  "beverage dispenser for parties",
  "mocktail mixer set for party",
] as const;
const DEFAULT_BEVERAGE_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_BEVERAGE_ASIN?.trim() || "B0B924FCQG";
const DEFAULT_DECOR_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_DECOR_ASIN?.trim() || "B0GJD38FLF";
const DEFAULT_TABLEWARE_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_TABLEWARE_ASIN?.trim() || DEFAULT_DECOR_FALLBACK_ASIN;
const DEFAULT_HOSTING_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_HOSTING_ASIN?.trim() || DEFAULT_DECOR_FALLBACK_ASIN;
const DEFAULT_GENERAL_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_GENERAL_ASIN?.trim() || DEFAULT_DECOR_FALLBACK_ASIN;

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

type ResolvedAmazonProduct = {
  productUrl: string;
  imageUrl: string | null;
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

function normalizeAmazonImageUrl(value: string) {
  return value
    .replace(/\\\//g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&");
}

function extractFirstAmazonImageUrl(value: string) {
  AMAZON_IMAGE_URL_PATTERN.lastIndex = 0;
  const matched = AMAZON_IMAGE_URL_PATTERN.exec(value);
  return matched?.[0] ? normalizeAmazonImageUrl(matched[0]) : null;
}

function extractImageUrlNearAsin(html: string, asin: string) {
  const escapedAsin = asin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const asinPattern = new RegExp(`data-asin="${escapedAsin}"`, "i");
  const matched = asinPattern.exec(html);
  if (!matched) {
    return null;
  }

  const start = Math.max(0, matched.index - 1400);
  const end = Math.min(html.length, matched.index + 2200);
  const snippet = html.slice(start, end);
  return extractFirstAmazonImageUrl(snippet);
}

function extractOpenGraphImageUrl(html: string) {
  const ogImagePattern = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i;
  const matched = ogImagePattern.exec(html);
  if (!matched?.[1]) {
    return null;
  }

  return normalizeAmazonImageUrl(matched[1]);
}

async function resolveImageUrlFromAsin(asin: string): Promise<string | null> {
  const productUrl = toCanonicalProductUrl(asin);

  try {
    const response = await fetch(productUrl, {
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

    return (
      extractOpenGraphImageUrl(html) ??
      extractImageUrlNearAsin(html, asin) ??
      extractFirstAmazonImageUrl(html)
    );
  } catch {
    return null;
  }
}

function toMeaningfulTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_TOKENS.has(token));
}

function isBeverageCategory(categoryHint?: string) {
  const normalized = (categoryHint ?? "").toLowerCase();
  return (
    normalized.includes("beverage") ||
    normalized.includes("drink") ||
    normalized.includes("bar")
  );
}

function getFallbackAsinForCategory(categoryHint?: string) {
  const normalized = (categoryHint ?? "").toLowerCase();

  if (isBeverageCategory(normalized)) {
    return DEFAULT_BEVERAGE_FALLBACK_ASIN;
  }

  if (normalized.includes("decor")) {
    return DEFAULT_DECOR_FALLBACK_ASIN;
  }

  if (
    normalized.includes("table") ||
    normalized.includes("serve") ||
    normalized.includes("plate") ||
    normalized.includes("utensil")
  ) {
    return DEFAULT_TABLEWARE_FALLBACK_ASIN;
  }

  if (
    normalized.includes("host") ||
    normalized.includes("setup") ||
    normalized.includes("supply") ||
    normalized.includes("essential")
  ) {
    return DEFAULT_HOSTING_FALLBACK_ASIN;
  }

  return DEFAULT_GENERAL_FALLBACK_ASIN;
}

function extractBestAsinFromSearchHtml(
  html: string,
  query: string,
  {
    matchHint,
    categoryHint,
  }: {
    matchHint?: string;
    categoryHint?: string;
  } = {},
) {
  const hintTokens = toMeaningfulTokens(matchHint ?? "");
  const queryTokens = new Set(toMeaningfulTokens(`${query} ${matchHint ?? ""}`));
  const hasBeverageIntent =
    isBeverageCategory(categoryHint) ||
    [...queryTokens].some((token) =>
    BEVERAGE_INTENT_TOKENS.includes(token as (typeof BEVERAGE_INTENT_TOKENS)[number]),
  );
  const candidates: Array<{
    asin: string;
    score: number;
    blockedByIntent: boolean;
    imageUrl: string | null;
  }> = [];
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
    if (!hasBeverageIntent && hintTokens.length > 0 && hintMatchCount === 0 && tokenScore < 2) {
      continue;
    }

    const score = tokenScore - (isSponsored ? 2 : 0);
    const blockedByIntent =
      hasBeverageIntent &&
      BEVERAGE_OFF_CATEGORY_TOKENS.some((token) => snippet.includes(token));
    const imageUrl = extractFirstAmazonImageUrl(snippet);

    candidates.push({ asin, score, blockedByIntent, imageUrl });
  }

  if (!candidates.length) {
    return null;
  }

  const allowedCandidates = candidates.filter((candidate) => !candidate.blockedByIntent);
  if (hasBeverageIntent && !allowedCandidates.length) {
    return null;
  }

  const rankedCandidates = (allowedCandidates.length ? allowedCandidates : candidates).sort((a, b) => b.score - a.score);

  // Return the best available product result to keep click-through on a single PDP,
  // while still using intent filters to avoid obvious mismatches.
  if (!rankedCandidates.length) {
    return null;
  }

  return {
    asin: rankedCandidates[0].asin,
    imageUrl: rankedCandidates[0].imageUrl,
  };
}

function extractFirstBeverageAsinFromSearchHtml(html: string) {
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
    const hasBeverageToken = BEVERAGE_INTENT_TOKENS.some((token) => snippet.includes(token));
    const hasOffCategoryToken = BEVERAGE_OFF_CATEGORY_TOKENS.some((token) => snippet.includes(token));

    if (hasBeverageToken && !hasOffCategoryToken) {
      return {
        asin,
        imageUrl: extractFirstAmazonImageUrl(snippet),
      };
    }
  }

  return null;
}

async function resolveFirstAmazonProduct(
  query: string,
  {
    matchHint,
    categoryHint,
  }: {
    matchHint?: string;
    categoryHint?: string;
  } = {},
): Promise<ResolvedAmazonProduct | null> {
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

    const resolved = extractBestAsinFromSearchHtml(html, query, { matchHint, categoryHint });

    if (resolved?.asin) {
      return {
        productUrl: toCanonicalProductUrl(resolved.asin),
        imageUrl: resolved.imageUrl ?? extractImageUrlNearAsin(html, resolved.asin),
      };
    }

    if (isBeverageCategory(categoryHint)) {
      const beverageResolved = extractFirstBeverageAsinFromSearchHtml(html);
      if (!beverageResolved?.asin) {
        return null;
      }
      return {
        productUrl: toCanonicalProductUrl(beverageResolved.asin),
        imageUrl:
          beverageResolved.imageUrl ?? extractImageUrlNearAsin(html, beverageResolved.asin),
      };
    }

    // For non-beverage categories, keep a single-PDP experience even when
    // relevance scoring misses by falling back to first ASIN.
    if (categoryHint?.trim()) {
      const constrainedFallbackAsin = extractFirstAsinFromHtml(html);
      if (!constrainedFallbackAsin) {
        return null;
      }
      return {
        productUrl: toCanonicalProductUrl(constrainedFallbackAsin),
        imageUrl: extractImageUrlNearAsin(html, constrainedFallbackAsin),
      };
    }

    const firstAsinFallback = extractFirstAsinFromHtml(html);
    if (!firstAsinFallback) {
      return null;
    }
    return {
      productUrl: toCanonicalProductUrl(firstAsinFallback),
      imageUrl: extractImageUrlNearAsin(html, firstAsinFallback),
    };
  } catch {
    return null;
  }
}

export async function resolveAmazonProductFromSearchUrl(
  url: string,
  {
    matchHint,
    categoryHint,
  }: {
    matchHint?: string;
    categoryHint?: string;
  } = {},
): Promise<string | null> {
  const query = extractQueryFromAmazonSearchUrl(url);
  if (!query) {
    return null;
  }

  const resolved = await resolveFirstAmazonProduct(query, {
    matchHint,
    categoryHint,
  });
  if (resolved?.productUrl) {
    return resolved.productUrl;
  }

  if (isBeverageCategory(categoryHint)) {
    for (const fallbackQuery of BEVERAGE_FALLBACK_QUERIES) {
      const fallbackResolved = await resolveFirstAmazonProduct(fallbackQuery, {
        matchHint: "drink beverage mixer dispenser",
        categoryHint,
      });
      if (fallbackResolved?.productUrl) {
        return fallbackResolved.productUrl;
      }
    }

    return toCanonicalProductUrl(getFallbackAsinForCategory(categoryHint));
  }

  return toCanonicalProductUrl(getFallbackAsinForCategory(categoryHint));
}

async function enrichOneItem(item: CatalogEnrichmentItem): Promise<CatalogEnrichmentItem> {
  const existingUrl = item.external_url?.trim() || null;

  if (existingUrl) {
    const existingAsin = extractAsinFromUrl(existingUrl);
    if (existingAsin) {
      const resolvedImageUrl = item.image_url ?? (await resolveImageUrlFromAsin(existingAsin));
      return {
        ...item,
        external_url: toCanonicalProductUrl(existingAsin),
        image_url: resolvedImageUrl,
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
    const resolved = await resolveFirstAmazonProduct(candidate, {
      matchHint: item.name,
      categoryHint: item.category,
    });
    if (resolved?.productUrl) {
      return {
        ...item,
        external_url: resolved.productUrl,
        image_url: item.image_url ?? resolved.imageUrl,
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
