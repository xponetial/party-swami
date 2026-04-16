import crypto from "node:crypto";

const AMAZON_DOMAIN_HOSTS = new Set([
  "amazon.com",
  "amazon.co.uk",
  "amazon.ca",
  "amazon.com.au",
  "amazon.de",
  "amazon.fr",
  "amazon.co.jp",
]);

const PAAPI_TARGET = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";
const PAAPI_CONTENT_ENCODING = "amz-1.0";
const PAAPI_PATH = "/paapi5/searchitems";
const DEFAULT_MARKETPLACE = "www.amazon.com";
const DEFAULT_HOST = "webservices.amazon.com";
const DEFAULT_REGION = "us-east-1";
const DEFAULT_PARTNER_TYPE = "Associates";

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

type AmazonCatalogProduct = {
  imageUrl: string | null;
  detailPageUrl: string | null;
  priceAmount: number | null;
};

type AmazonPaapiConfig = {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  partnerType: string;
  host: string;
  region: string;
  marketplace: string;
};

function getPaapiConfig(): AmazonPaapiConfig | null {
  const accessKey = process.env.AMAZON_PAAPI_ACCESS_KEY?.trim();
  const secretKey = process.env.AMAZON_PAAPI_SECRET_KEY?.trim();
  const partnerTag =
    process.env.AMAZON_PAAPI_PARTNER_TAG?.trim() ||
    process.env.AMAZON_ASSOCIATE_TAG?.trim();

  if (!accessKey || !secretKey || !partnerTag) {
    return null;
  }

  return {
    accessKey,
    secretKey,
    partnerTag,
    partnerType: process.env.AMAZON_PAAPI_PARTNER_TYPE?.trim() || DEFAULT_PARTNER_TYPE,
    host: process.env.AMAZON_PAAPI_HOST?.trim() || DEFAULT_HOST,
    region: process.env.AMAZON_PAAPI_REGION?.trim() || DEFAULT_REGION,
    marketplace: process.env.AMAZON_PAAPI_MARKETPLACE?.trim() || DEFAULT_MARKETPLACE,
  };
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

function hmac(key: crypto.BinaryLike, data: string) {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function getSignatureKey(secretKey: string, dateStamp: string, region: string) {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "ProductAdvertisingAPI");
  return hmac(kService, "aws4_request");
}

function buildSignedHeaders({
  payload,
  host,
  region,
  accessKey,
  secretKey,
}: {
  payload: string;
  host: string;
  region: string;
  accessKey: string;
  secretKey: string;
}) {
  const now = new Date();
  const iso8601 = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const amzDate = iso8601.slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(payload);

  const canonicalHeaders = [
    `content-encoding:${PAAPI_CONTENT_ENCODING}`,
    "content-type:application/json; charset=utf-8",
    `host:${host}`,
    `x-amz-date:${amzDate}`,
    `x-amz-target:${PAAPI_TARGET}`,
  ].join("\n");
  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";
  const canonicalRequest = [
    "POST",
    PAAPI_PATH,
    "",
    canonicalHeaders,
    "",
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/ProductAdvertisingAPI/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSignatureKey(secretKey, dateStamp, region);
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  const authorizationHeader = [
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  return {
    "content-encoding": PAAPI_CONTENT_ENCODING,
    "content-type": "application/json; charset=utf-8",
    "x-amz-date": amzDate,
    "x-amz-target": PAAPI_TARGET,
    Authorization: authorizationHeader,
  };
}

async function fetchTopAmazonProduct(
  config: AmazonPaapiConfig,
  query: string,
): Promise<AmazonCatalogProduct | null> {
  const payload = JSON.stringify({
    Keywords: query,
    Marketplace: config.marketplace,
    PartnerTag: config.partnerTag,
    PartnerType: config.partnerType,
    SearchIndex: "All",
    ItemCount: 1,
    Resources: [
      "Images.Primary.Small",
      "Images.Primary.Medium",
      "Images.Primary.Large",
      "Offers.Listings.Price",
    ],
  });

  const headers = buildSignedHeaders({
    payload,
    host: config.host,
    region: config.region,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });

  try {
    const response = await fetch(`https://${config.host}${PAAPI_PATH}`, {
      method: "POST",
      headers,
      body: payload,
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      SearchResult?: {
        Items?: Array<{
          DetailPageURL?: string;
          Images?: {
            Primary?: {
              Large?: { URL?: string };
              Medium?: { URL?: string };
              Small?: { URL?: string };
            };
          };
          Offers?: {
            Listings?: Array<{
              Price?: { Amount?: number };
            }>;
          };
        }>;
      };
    };

    const item = data.SearchResult?.Items?.[0];
    if (!item) {
      return null;
    }

    return {
      detailPageUrl: item.DetailPageURL?.trim() || null,
      imageUrl:
        item.Images?.Primary?.Medium?.URL?.trim() ||
        item.Images?.Primary?.Large?.URL?.trim() ||
        item.Images?.Primary?.Small?.URL?.trim() ||
        null,
      priceAmount:
        typeof item.Offers?.Listings?.[0]?.Price?.Amount === "number"
          ? item.Offers.Listings[0].Price.Amount
          : null,
    };
  } catch {
    return null;
  }
}

export async function enrichShoppingItemsWithAmazonCatalog(
  items: CatalogEnrichmentItem[],
): Promise<CatalogEnrichmentItem[]> {
  const config = getPaapiConfig();
  if (!config || !items.length) {
    return items;
  }

  const queries = Array.from(
    new Set(
      items
        .map((item) => item.search_query.trim())
        .filter((query) => query.length >= 3),
    ),
  );

  if (!queries.length) {
    return items;
  }

  const productByQuery = new Map<string, AmazonCatalogProduct | null>();

  await Promise.all(
    queries.map(async (query) => {
      const product = await fetchTopAmazonProduct(config, query);
      productByQuery.set(query, product);
    }),
  );

  return items.map((item) => {
    const query = item.search_query.trim();
    const product = productByQuery.get(query);

    if (!product) {
      return item;
    }

    const shouldReplaceUrl = !item.external_url || isAmazonUrl(item.external_url);

    return {
      ...item,
      image_url: product.imageUrl || item.image_url,
      external_url:
        shouldReplaceUrl && product.detailPageUrl
          ? product.detailPageUrl
          : item.external_url,
      estimated_price:
        item.estimated_price == null && product.priceAmount != null
          ? Math.round(product.priceAmount)
          : item.estimated_price,
    };
  });
}
