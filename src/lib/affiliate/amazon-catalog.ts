const AMAZON_HOST = "www.amazon.com";

const PRODUCT_PATH_PATTERNS = [
  /\/dp\/([A-Z0-9]{10})(?:[/?]|$)/i,
  /\/gp\/product\/([A-Z0-9]{10})(?:[/?]|$)/i,
] as const;

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

function extractFirstAsinFromHtml(html: string) {
  for (const pattern of PRODUCT_PATH_PATTERNS) {
    const matched = html.match(pattern);
    if (matched?.[1]) {
      return matched[1].toUpperCase();
    }
  }

  return null;
}

async function resolveFirstAmazonProductUrl(query: string): Promise<string | null> {
  const searchUrl = buildAmazonSearchUrl(query);

  try {
    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "accept-language": "en-US,en;q=0.9",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const asin = extractFirstAsinFromHtml(html);

    return asin ? toCanonicalProductUrl(asin) : null;
  } catch {
    return null;
  }
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
  if (!query) {
    return item;
  }

  const resolved = await resolveFirstAmazonProductUrl(query);
  if (!resolved) {
    return item;
  }

  return {
    ...item,
    external_url: resolved,
  };
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
