const AMAZON_HOST = "www.amazon.com";

const PRODUCT_PATH_PATTERNS = [
  /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /%2Fdp%2F([A-Z0-9]{10})(?:%2F|%3F|%26|$)/i,
  /%2Fgp%2Fproduct%2F([A-Z0-9]{10})(?:%2F|%3F|%26|$)/i,
] as const;
const ASIN_ATTRIBUTE_PATTERN = /data-asin="([A-Z0-9]{10})"/gi;
const ASIN_JSON_PATTERN = /"asin":"([A-Z0-9]{10})"/gi;

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

type AmazonSearchResolutionDiagnostics = {
  query: string;
  searchUrl: string;
  status: number | null;
  captchaDetected: boolean;
  asin: string | null;
  resolvedUrl: string | null;
  error: string | null;
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

async function resolveAmazonProductFromQueryWithDiagnostics(
  query: string,
): Promise<AmazonSearchResolutionDiagnostics> {
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
      return {
        query,
        searchUrl,
        status: response.status,
        captchaDetected: false,
        asin: null,
        resolvedUrl: null,
        error: `amazon_response_${response.status}`,
      };
    }

    const html = await response.text();
    const captchaDetected = /Type the characters you see in this image/i.test(html);
    if (captchaDetected) {
      return {
        query,
        searchUrl,
        status: response.status,
        captchaDetected: true,
        asin: null,
        resolvedUrl: null,
        error: "amazon_captcha_detected",
      };
    }

    const asin = extractFirstAsinFromHtml(html);
    return {
      query,
      searchUrl,
      status: response.status,
      captchaDetected: false,
      asin,
      resolvedUrl: asin ? toCanonicalProductUrl(asin) : null,
      error: asin ? null : "asin_not_found",
    };
  } catch (error) {
    return {
      query,
      searchUrl,
      status: null,
      captchaDetected: false,
      asin: null,
      resolvedUrl: null,
      error: error instanceof Error ? error.message : "amazon_fetch_error",
    };
  }
}

async function resolveFirstAmazonProductUrl(query: string): Promise<string | null> {
  const result = await resolveAmazonProductFromQueryWithDiagnostics(query);
  return result.resolvedUrl;
}

export async function resolveAmazonProductFromSearchUrl(
  url: string,
): Promise<string | null> {
  const query = extractQueryFromAmazonSearchUrl(url);
  if (!query) {
    return null;
  }

  return resolveFirstAmazonProductUrl(query);
}

export async function debugResolveAmazonTarget(target: string) {
  const query = extractQueryFromAmazonSearchUrl(target);
  if (!query) {
    return {
      kind: "non_search_target" as const,
      target,
      query: null,
      attempts: [] as AmazonSearchResolutionDiagnostics[],
      resolvedUrl: null as string | null,
    };
  }

  const queriesToTry = dedupeQueries([
    query,
    query
      .split(/\s+/)
      .filter((token) => token.length >= 3)
      .slice(0, 8)
      .join(" "),
  ]);
  const attempts: AmazonSearchResolutionDiagnostics[] = [];

  for (const candidate of queriesToTry) {
    const attempt = await resolveAmazonProductFromQueryWithDiagnostics(candidate);
    attempts.push(attempt);

    if (attempt.resolvedUrl) {
      return {
        kind: "amazon_search_target" as const,
        target,
        query,
        attempts,
        resolvedUrl: attempt.resolvedUrl,
      };
    }
  }

  return {
    kind: "amazon_search_target" as const,
    target,
    query,
    attempts,
    resolvedUrl: null as string | null,
  };
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
    const resolved = await resolveFirstAmazonProductUrl(candidate);
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
