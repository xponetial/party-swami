import fs from "node:fs/promises";
import path from "node:path";

const AMAZON_DOMAIN_HOSTS = new Set([
  "amazon.com",
  "amazon.co.uk",
  "amazon.ca",
  "amazon.com.au",
  "amazon.de",
  "amazon.fr",
  "amazon.co.jp",
]);

const DEFAULT_CATALOG_PATH = "data/amazon-curated-catalog.json";

export type CatalogEnrichmentItem = {
  category: string;
  name: string;
  quantity: number;
  estimated_price: number | null;
  recommendation_reason: string;
  search_query: string;
  image_url: string | null;
  external_url: string | null;
};

type RawCatalogEntry = {
  id?: string;
  category?: string;
  query_contains?: string[];
  name_contains?: string[];
  product_url?: string;
  image_url?: string;
  estimated_price?: number;
};

type CatalogEntry = {
  id: string;
  category: string | null;
  queryContains: string[];
  nameContains: string[];
  productUrl: string | null;
  imageUrl: string | null;
  estimatedPrice: number | null;
};

let cachedCatalog: CatalogEntry[] | null = null;
let cachedCatalogKey: string | null = null;

function normalizeKeywordList(value: string[] | undefined) {
  return (value ?? [])
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length >= 2);
}

function safeUrl(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

function normalizeCatalog(entries: RawCatalogEntry[]) {
  return entries
    .map((entry, index): CatalogEntry | null => {
      const queryContains = normalizeKeywordList(entry.query_contains);
      const nameContains = normalizeKeywordList(entry.name_contains);
      const category = entry.category?.trim().toLowerCase() || null;
      const productUrl = safeUrl(entry.product_url);
      const imageUrl = safeUrl(entry.image_url);
      const estimatedPrice =
        typeof entry.estimated_price === "number" && Number.isFinite(entry.estimated_price)
          ? Math.round(entry.estimated_price)
          : null;

      if (
        !queryContains.length &&
        !nameContains.length &&
        !category &&
        !productUrl &&
        !imageUrl &&
        estimatedPrice == null
      ) {
        return null;
      }

      return {
        id: entry.id?.trim() || `catalog-entry-${index + 1}`,
        category,
        queryContains,
        nameContains,
        productUrl,
        imageUrl,
        estimatedPrice,
      };
    })
    .filter((entry): entry is CatalogEntry => Boolean(entry));
}

async function readCatalogFromPath(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return normalizeCatalog(parsed as RawCatalogEntry[]);
  } catch {
    return [];
  }
}

async function readCatalogFromEnvJson(envJson: string) {
  try {
    const parsed = JSON.parse(envJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return normalizeCatalog(parsed as RawCatalogEntry[]);
  } catch {
    return [];
  }
}

async function loadCatalog(): Promise<CatalogEntry[]> {
  const envJson = process.env.AMAZON_CURATED_CATALOG_JSON?.trim() || "";
  const envPath = process.env.AMAZON_CURATED_CATALOG_PATH?.trim() || DEFAULT_CATALOG_PATH;
  const resolvedPath = path.resolve(process.cwd(), envPath);
  const cacheKey = `${envPath}::${envJson.length ? "env-json" : "path"}`;

  if (cachedCatalog && cachedCatalogKey === cacheKey) {
    return cachedCatalog;
  }

  const catalog = envJson
    ? await readCatalogFromEnvJson(envJson)
    : await readCatalogFromPath(resolvedPath);

  cachedCatalog = catalog;
  cachedCatalogKey = cacheKey;
  return catalog;
}

function isAmazonUrl(value: string | null): boolean {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.replace(/^www\./, "");
    return AMAZON_DOMAIN_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

function scoreCatalogMatch(item: CatalogEnrichmentItem, entry: CatalogEntry) {
  const searchQuery = item.search_query.trim().toLowerCase();
  const name = item.name.trim().toLowerCase();
  const category = item.category.trim().toLowerCase();
  let score = 0;

  for (const token of entry.queryContains) {
    if (searchQuery.includes(token)) {
      score += 4;
    }
  }

  for (const token of entry.nameContains) {
    if (name.includes(token)) {
      score += 3;
    }
  }

  if (entry.category && entry.category === category) {
    score += 2;
  }

  return score;
}

function pickCatalogEntry(
  item: CatalogEnrichmentItem,
  catalog: CatalogEntry[],
): CatalogEntry | null {
  let best: CatalogEntry | null = null;
  let bestScore = 0;

  for (const entry of catalog) {
    const score = scoreCatalogMatch(item, entry);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }

  return bestScore > 0 ? best : null;
}

export async function enrichShoppingItemsWithAmazonCatalog(
  items: CatalogEnrichmentItem[],
): Promise<CatalogEnrichmentItem[]> {
  if (!items.length) {
    return items;
  }

  const catalog = await loadCatalog();
  if (!catalog.length) {
    return items;
  }

  return items.map((item) => {
    const match = pickCatalogEntry(item, catalog);
    if (!match) {
      return item;
    }

    const shouldReplaceUrl = !item.external_url || isAmazonUrl(item.external_url);

    return {
      ...item,
      image_url: match.imageUrl || item.image_url,
      external_url:
        shouldReplaceUrl && match.productUrl
          ? match.productUrl
          : item.external_url,
      estimated_price:
        item.estimated_price == null && match.estimatedPrice != null
          ? match.estimatedPrice
          : item.estimated_price,
    };
  });
}
