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
const AMAZON_IMAGE_URL_ALT_PATTERN =
  /https?:\/\/(?:m\.media-amazon\.com|images-na\.ssl-images-amazon\.com)\/images\/[IP]\/[^"'\\\s>]+?\.(?:jpg|jpeg|png|webp)/gi;
const AMAZON_ESCAPED_IMAGE_URL_PATTERN =
  /https?:\\\/\\\/(?:m\.media-amazon\.com|images-na\.ssl-images-amazon\.com)\\\/images\\\/[IP]\\\/[^"'\\\s>]+?\.(?:jpg|jpeg|png|webp)/gi;
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
const BEVERAGE_PACKAGED_TOKENS = [
  "soda",
  "sprite",
  "coke",
  "pepsi",
  "pepper",
  "juice",
  "capri",
  "water",
  "bottled",
  "sparkling",
  "gatorade",
  "minute",
  "maid",
  "fanta",
  "can",
  "cans",
  "bottle",
  "bottles",
] as const;
const BEVERAGE_SERVEWARE_TOKENS = [
  "dispenser",
  "dispensers",
  "spigot",
  "pitcher",
  "pitchers",
  "garnish",
  "markers",
  "tub",
  "bucket",
  "stand",
  "accessories",
  "accessory",
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
const DEFAULT_BEVERAGE_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_BEVERAGE_ASIN?.trim() || "B0B924FCQG";
const DEFAULT_BEVERAGE_SODA_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_BEVERAGE_SODA_ASIN?.trim() || "B08MB245WZ";
const DEFAULT_BEVERAGE_JUICE_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_BEVERAGE_JUICE_ASIN?.trim() || "B0812HZGGZ";
const DEFAULT_BEVERAGE_WATER_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_BEVERAGE_WATER_ASIN?.trim() || "B004CQWWKY";
const DEFAULT_DECOR_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_DECOR_ASIN?.trim() || "B0FRMPZNMY";
const DEFAULT_TABLEWARE_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_TABLEWARE_ASIN?.trim() || "B0CDWNNHWN";
const DEFAULT_CAKE_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_CAKE_ASIN?.trim() || "B09L8HD231";
const DEFAULT_FAVORS_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_FAVORS_ASIN?.trim() || "B017VNRKT2";
const DEFAULT_HATS_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_HATS_ASIN?.trim() || "B0BN9KQW8C";
const DEFAULT_ACTIVITIES_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_ACTIVITIES_ASIN?.trim() || "B0FMXT3DDJ";
const DEFAULT_SERVING_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_SERVING_ASIN?.trim() || "B0D9H7KDFJ";
const DEFAULT_HOSTING_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_HOSTING_ASIN?.trim() || DEFAULT_SERVING_FALLBACK_ASIN;
const DEFAULT_GENERAL_FALLBACK_ASIN =
  process.env.AMAZON_DEFAULT_GENERAL_ASIN?.trim() || DEFAULT_DECOR_FALLBACK_ASIN;
const CATEGORY_FALLBACK_ASIN_POOLS = {
  decor: [
    DEFAULT_DECOR_FALLBACK_ASIN,
    process.env.AMAZON_FALLBACK_DECOR_BALLOON_ASIN?.trim() || "B0GJD38FLF",
    process.env.AMAZON_FALLBACK_DECOR_BACKDROP_ASIN?.trim() || "B0FBL3ZK57",
  ],
  tableware: [
    DEFAULT_TABLEWARE_FALLBACK_ASIN,
    process.env.AMAZON_FALLBACK_TABLEWARE_CUPS_ASIN?.trim() || "B0CDWNNHWN",
    process.env.AMAZON_FALLBACK_TABLEWARE_TRAYS_ASIN?.trim() || DEFAULT_SERVING_FALLBACK_ASIN,
  ],
  cake: [
    DEFAULT_CAKE_FALLBACK_ASIN,
    process.env.AMAZON_FALLBACK_CAKE_DESSERT_ASIN?.trim() || "B0BM5H6GBL",
    process.env.AMAZON_FALLBACK_CAKE_TREATS_ASIN?.trim() || DEFAULT_CAKE_FALLBACK_ASIN,
  ],
  favors: [
    DEFAULT_FAVORS_FALLBACK_ASIN,
    process.env.AMAZON_FALLBACK_FAVORS_STICKERS_ASIN?.trim() || DEFAULT_ACTIVITIES_FALLBACK_ASIN,
    process.env.AMAZON_FALLBACK_FAVORS_TOYS_ASIN?.trim() || DEFAULT_HATS_FALLBACK_ASIN,
  ],
  hats: [
    DEFAULT_HATS_FALLBACK_ASIN,
    process.env.AMAZON_FALLBACK_HATS_GLASSES_ASIN?.trim() || DEFAULT_FAVORS_FALLBACK_ASIN,
    process.env.AMAZON_FALLBACK_HATS_PROPS_ASIN?.trim() || DEFAULT_ACTIVITIES_FALLBACK_ASIN,
  ],
  activities: [
    DEFAULT_ACTIVITIES_FALLBACK_ASIN,
    process.env.AMAZON_FALLBACK_ACTIVITIES_GAMES_ASIN?.trim() || DEFAULT_FAVORS_FALLBACK_ASIN,
    process.env.AMAZON_FALLBACK_ACTIVITIES_PRIZES_ASIN?.trim() || DEFAULT_HATS_FALLBACK_ASIN,
  ],
  serving: [
    DEFAULT_SERVING_FALLBACK_ASIN,
    process.env.AMAZON_FALLBACK_SERVING_TRAYS_ASIN?.trim() || DEFAULT_TABLEWARE_FALLBACK_ASIN,
    process.env.AMAZON_FALLBACK_SERVING_CLEANUP_ASIN?.trim() || DEFAULT_HOSTING_FALLBACK_ASIN,
  ],
  general: [
    DEFAULT_GENERAL_FALLBACK_ASIN,
    DEFAULT_TABLEWARE_FALLBACK_ASIN,
    DEFAULT_FAVORS_FALLBACK_ASIN,
  ],
} as const;
const GLOBAL_FALLBACK_ASIN_POOL = [
  DEFAULT_DECOR_FALLBACK_ASIN,
  "B0GJD38FLF",
  "B0FBL3ZK57",
  DEFAULT_TABLEWARE_FALLBACK_ASIN,
  DEFAULT_SERVING_FALLBACK_ASIN,
  DEFAULT_CAKE_FALLBACK_ASIN,
  "B0BM5H6GBL",
  DEFAULT_FAVORS_FALLBACK_ASIN,
  DEFAULT_HATS_FALLBACK_ASIN,
  DEFAULT_ACTIVITIES_FALLBACK_ASIN,
] as const;
const AMAZON_IMAGE_PROVIDER = process.env.AMAZON_IMAGE_PROVIDER?.trim().toLowerCase() || "";
const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY?.trim() || "";
const RAINFOREST_AMAZON_DOMAIN =
  process.env.AMAZON_IMAGE_PROVIDER_AMAZON_DOMAIN?.trim() || "amazon.com";
const imageUrlByAsinCache = new Map<string, Promise<string | null>>();

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

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  return /^https?:\/\//i.test(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeExternalImageUrl(url: string) {
  return normalizeAmazonImageUrl(url).trim();
}

function pickFirstValidImageUrl(candidates: Array<unknown>) {
  for (const candidate of candidates) {
    if (!isHttpUrl(candidate)) continue;
    const normalized = normalizeExternalImageUrl(candidate);
    if (!normalized) continue;
    return normalized;
  }
  return null;
}

async function resolveImageUrlViaRainforestByAsin(asin: string): Promise<string | null> {
  if (!RAINFOREST_API_KEY) {
    return null;
  }

  const apiUrl = new URL("https://api.rainforestapi.com/request");
  apiUrl.searchParams.set("api_key", RAINFOREST_API_KEY);
  apiUrl.searchParams.set("type", "product");
  apiUrl.searchParams.set("amazon_domain", RAINFOREST_AMAZON_DOMAIN);
  apiUrl.searchParams.set("asin", asin);
  apiUrl.searchParams.set("output", "json");

  try {
    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "accept": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const root = asRecord(payload);
    if (!root) {
      return null;
    }

    const product = asRecord(root.product);
    if (!product) {
      return null;
    }

    const mainImage = asRecord(product.main_image);
    const images = Array.isArray(product.images) ? product.images : [];
    const firstImage = asRecord(images[0]);

    return pickFirstValidImageUrl([
      mainImage?.link,
      mainImage?.image,
      mainImage?.url,
      product.main_image,
      firstImage?.link,
      firstImage?.image,
      firstImage?.url,
      images[0],
    ]);
  } catch {
    return null;
  }
}

async function resolveImageUrlViaProviderByAsin(asin: string): Promise<string | null> {
  if (AMAZON_IMAGE_PROVIDER === "rainforest") {
    return resolveImageUrlViaRainforestByAsin(asin);
  }

  return null;
}

function resolveImageUrlFromAsinCached(asin: string): Promise<string | null> {
  const normalizedAsin = asin.trim().toUpperCase();
  const cached = imageUrlByAsinCache.get(normalizedAsin);
  if (cached) {
    return cached;
  }

  const pending = resolveImageUrlFromAsin(normalizedAsin);
  imageUrlByAsinCache.set(normalizedAsin, pending);
  return pending;
}

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
  const patterns = [
    AMAZON_IMAGE_URL_PATTERN,
    AMAZON_IMAGE_URL_ALT_PATTERN,
    AMAZON_ESCAPED_IMAGE_URL_PATTERN,
  ];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const matched = pattern.exec(value);
    if (!matched?.[0]) continue;

    const candidate = matched[0].replace(/\\\//g, "/");
    const normalized = normalizeAmazonImageUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
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
  return extractFirstAmazonImageUrl(snippet) ?? extractImageUrlFromImgTagNearAsin(snippet);
}

function extractImageUrlFromImgTagNearAsin(value: string) {
  const imgPatterns = [
    /<img[^>]+src="([^"]+)"/i,
    /<img[^>]+src='([^']+)'/i,
    /<img[^>]+data-image-source-density="1"[^>]+src="([^"]+)"/i,
  ];

  for (const pattern of imgPatterns) {
    const matched = pattern.exec(value);
    if (!matched?.[1]) continue;
    if (!/^https?:\/\//i.test(matched[1])) continue;

    const normalized = normalizeAmazonImageUrl(matched[1]);
    if (!/amazon\./i.test(normalized)) continue;
    if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(normalized)) continue;
    return normalized;
  }

  return null;
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
  const providerImageUrl = await resolveImageUrlViaProviderByAsin(asin);
  if (providerImageUrl) {
    return providerImageUrl;
  }

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

function hasAnyToken(tokens: Set<string>, candidates: readonly string[]) {
  return candidates.some((token) => tokens.has(token));
}

function getBeverageFallbackAsinForQuery(query: string, matchHint?: string) {
  const tokens = new Set(toMeaningfulTokens(`${query} ${matchHint ?? ""}`));

  if (hasAnyToken(tokens, ["water", "bottled", "sparkling"])) {
    return DEFAULT_BEVERAGE_WATER_FALLBACK_ASIN;
  }

  if (hasAnyToken(tokens, ["juice", "capri", "sun", "pouch", "box"])) {
    return DEFAULT_BEVERAGE_JUICE_FALLBACK_ASIN;
  }

  if (
    hasAnyToken(tokens, [
      "soda",
      "sprite",
      "coke",
      "cola",
      "pepsi",
      "pepper",
      "fanta",
      "gatorade",
      "variety",
    ])
  ) {
    return DEFAULT_BEVERAGE_SODA_FALLBACK_ASIN;
  }

  return DEFAULT_BEVERAGE_FALLBACK_ASIN;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function pickFromFallbackPool(
  pool: readonly string[],
  query: string,
  matchHint?: string,
  fallbackSeed?: string,
  fallbackIndex?: number,
) {
  const candidates = [...pool, ...GLOBAL_FALLBACK_ASIN_POOL]
    .map((asin) => asin.trim().toUpperCase())
    .filter((asin, index, asins) => /^[A-Z0-9]{10}$/.test(asin) && asins.indexOf(asin) === index);

  if (!candidates.length) {
    return DEFAULT_GENERAL_FALLBACK_ASIN;
  }

  if (typeof fallbackIndex === "number" && Number.isFinite(fallbackIndex)) {
    return candidates[Math.abs(Math.trunc(fallbackIndex)) % candidates.length];
  }

  const fingerprint = `${query} ${matchHint ?? ""} ${fallbackSeed ?? ""}`.trim().toLowerCase();
  return candidates[hashString(fingerprint) % candidates.length];
}

function getFallbackAsinForCategory(
  categoryHint?: string,
  query = "",
  matchHint?: string,
  fallbackSeed?: string,
  fallbackIndex?: number,
) {
  const normalized = (categoryHint ?? "").toLowerCase();

  if (isBeverageCategory(normalized)) {
    return getBeverageFallbackAsinForQuery(query, matchHint);
  }

  if (normalized.includes("decor")) {
    return pickFromFallbackPool(CATEGORY_FALLBACK_ASIN_POOLS.decor, query, matchHint, fallbackSeed, fallbackIndex);
  }

  if (
    normalized.includes("cake") ||
    normalized.includes("dessert") ||
    normalized.includes("sweet")
  ) {
    return pickFromFallbackPool(CATEGORY_FALLBACK_ASIN_POOLS.cake, query, matchHint, fallbackSeed, fallbackIndex);
  }

  if (
    normalized.includes("table") ||
    normalized.includes("serve") ||
    normalized.includes("plate") ||
    normalized.includes("utensil")
  ) {
    return normalized.includes("serving") || normalized.includes("supply")
      ? pickFromFallbackPool(CATEGORY_FALLBACK_ASIN_POOLS.serving, query, matchHint, fallbackSeed, fallbackIndex)
      : pickFromFallbackPool(CATEGORY_FALLBACK_ASIN_POOLS.tableware, query, matchHint, fallbackSeed, fallbackIndex);
  }

  if (normalized.includes("favor") || normalized.includes("goodie")) {
    return pickFromFallbackPool(CATEGORY_FALLBACK_ASIN_POOLS.favors, query, matchHint, fallbackSeed, fallbackIndex);
  }

  if (
    normalized.includes("hat") ||
    normalized.includes("wearable") ||
    normalized.includes("costume")
  ) {
    return pickFromFallbackPool(CATEGORY_FALLBACK_ASIN_POOLS.hats, query, matchHint, fallbackSeed, fallbackIndex);
  }

  if (normalized.includes("activit") || normalized.includes("game")) {
    return pickFromFallbackPool(CATEGORY_FALLBACK_ASIN_POOLS.activities, query, matchHint, fallbackSeed, fallbackIndex);
  }

  if (
    normalized.includes("host") ||
    normalized.includes("setup") ||
    normalized.includes("supply") ||
    normalized.includes("essential")
  ) {
    return pickFromFallbackPool(CATEGORY_FALLBACK_ASIN_POOLS.serving, query, matchHint, fallbackSeed, fallbackIndex);
  }

  return pickFromFallbackPool(CATEGORY_FALLBACK_ASIN_POOLS.general, query, matchHint, fallbackSeed, fallbackIndex);
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
  const wantsPackagedBeverages = hasAnyToken(queryTokens, BEVERAGE_PACKAGED_TOKENS);
  const wantsServeware = hasAnyToken(queryTokens, BEVERAGE_SERVEWARE_TOKENS);
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
    const rawSnippet = html.slice(windowStart, windowEnd);
    const snippet = rawSnippet.toLowerCase();

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

    const hasServewareSnippet = BEVERAGE_SERVEWARE_TOKENS.some((token) => snippet.includes(token));
    const hasPackagedSnippet = BEVERAGE_PACKAGED_TOKENS.some((token) => snippet.includes(token));
    const blockedByBeverageMismatch =
      hasBeverageIntent &&
      ((wantsPackagedBeverages && hasServewareSnippet && !hasPackagedSnippet) ||
        (!wantsServeware && !wantsPackagedBeverages && hasServewareSnippet && hintMatchCount === 0));
    const score =
      tokenScore -
      (isSponsored ? 2 : 0) +
      (wantsPackagedBeverages && hasPackagedSnippet ? 3 : 0) -
      (wantsPackagedBeverages && hasServewareSnippet && !hasPackagedSnippet ? 4 : 0);
    const blockedByIntent =
      (hasBeverageIntent &&
        BEVERAGE_OFF_CATEGORY_TOKENS.some((token) => snippet.includes(token))) ||
      blockedByBeverageMismatch;
    const imageUrl =
      extractFirstAmazonImageUrl(rawSnippet) ?? extractImageUrlFromImgTagNearAsin(rawSnippet);

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
    const rawSnippet = html.slice(windowStart, windowEnd);
    const snippet = rawSnippet.toLowerCase();
    const hasBeverageToken = BEVERAGE_INTENT_TOKENS.some((token) => snippet.includes(token));
    const hasOffCategoryToken = BEVERAGE_OFF_CATEGORY_TOKENS.some((token) => snippet.includes(token));

    if (hasBeverageToken && !hasOffCategoryToken) {
      return {
        asin,
        imageUrl:
          extractFirstAmazonImageUrl(rawSnippet) ?? extractImageUrlFromImgTagNearAsin(rawSnippet),
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
  const beverageQueryTokens = new Set(toMeaningfulTokens(`${query} ${matchHint ?? ""}`));
  const wantsServeware = hasAnyToken(beverageQueryTokens, BEVERAGE_SERVEWARE_TOKENS);

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
      const imageUrl =
        resolved.imageUrl ??
        extractImageUrlNearAsin(html, resolved.asin) ??
        (await resolveImageUrlFromAsinCached(resolved.asin));
      return {
        productUrl: toCanonicalProductUrl(resolved.asin),
        imageUrl,
      };
    }

    if (isBeverageCategory(categoryHint) && wantsServeware) {
      const beverageResolved = extractFirstBeverageAsinFromSearchHtml(html);
      if (!beverageResolved?.asin) {
        const firstBeverageFallbackAsin = extractFirstAsinFromHtml(html);
        if (!firstBeverageFallbackAsin) {
          return null;
        }
        return {
          productUrl: toCanonicalProductUrl(firstBeverageFallbackAsin),
          imageUrl:
            extractImageUrlNearAsin(html, firstBeverageFallbackAsin) ??
            (await resolveImageUrlFromAsinCached(firstBeverageFallbackAsin)),
        };
      }
      const imageUrl =
        beverageResolved.imageUrl ??
        extractImageUrlNearAsin(html, beverageResolved.asin) ??
        (await resolveImageUrlFromAsinCached(beverageResolved.asin));
      return {
        productUrl: toCanonicalProductUrl(beverageResolved.asin),
        imageUrl,
      };
    }

    if (isBeverageCategory(categoryHint)) {
      const firstBeverageFallbackAsin = extractFirstAsinFromHtml(html);
      if (!firstBeverageFallbackAsin) {
        return null;
      }
      return {
        productUrl: toCanonicalProductUrl(firstBeverageFallbackAsin),
        imageUrl:
          extractImageUrlNearAsin(html, firstBeverageFallbackAsin) ??
          (await resolveImageUrlFromAsinCached(firstBeverageFallbackAsin)),
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
        imageUrl:
          extractImageUrlNearAsin(html, constrainedFallbackAsin) ??
          (await resolveImageUrlFromAsinCached(constrainedFallbackAsin)),
      };
    }

    const firstAsinFallback = extractFirstAsinFromHtml(html);
    if (!firstAsinFallback) {
      return null;
    }
    return {
      productUrl: toCanonicalProductUrl(firstAsinFallback),
      imageUrl:
        extractImageUrlNearAsin(html, firstAsinFallback) ??
        (await resolveImageUrlFromAsinCached(firstAsinFallback)),
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
    fallbackSeed,
    fallbackIndex,
  }: {
    matchHint?: string;
    categoryHint?: string;
    fallbackSeed?: string;
    fallbackIndex?: number;
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
    return toCanonicalProductUrl(getBeverageFallbackAsinForQuery(query, matchHint));
  }

  return toCanonicalProductUrl(
    getFallbackAsinForCategory(categoryHint, query, matchHint, fallbackSeed, fallbackIndex),
  );
}

async function enrichOneItem(item: CatalogEnrichmentItem): Promise<CatalogEnrichmentItem> {
  const existingUrl = item.external_url?.trim() || null;

  if (existingUrl) {
    const existingAsin = extractAsinFromUrl(existingUrl);
    if (existingAsin) {
      const resolvedImageUrl =
        item.image_url ?? (await resolveImageUrlFromAsinCached(existingAsin));
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
