# Affiliate Product Catalog (Phase 1c)

This file documents the curated-product approach used to show real Amazon product images and links in Party Swami shopping cards without requiring Amazon PA-API credentials.

## Why this exists

- Affiliate monetization only needs `AMAZON_ASSOCIATE_TAG`.
- Real in-app product thumbnails need product metadata.
- We use a curated JSON catalog to map Party Swami recommendation queries to known Amazon product links and image URLs.

## Default catalog location

- `data/amazon-curated-catalog.json`

If this file is empty or missing matches, shopping cards fall back to category artwork.

## Optional environment overrides

- `AMAZON_CURATED_CATALOG_PATH` to point at a different JSON file.
- `AMAZON_CURATED_CATALOG_JSON` to provide a JSON array directly via environment variable.

## Catalog entry schema

```json
[
  {
    "id": "unique-id",
    "category": "Decor",
    "query_contains": ["dinosaur birthday balloon arch backdrop kit", "dinosaur balloon"],
    "name_contains": ["balloon", "garland"],
    "product_url": "https://www.amazon.com/dp/ASIN",
    "image_url": "https://m.media-amazon.com/images/I/IMAGE._AC_SL1500_.jpg",
    "estimated_price": 22
  }
]
```

## Matching behavior

- `query_contains` has highest match weight (matches against shopping `search_query`).
- `name_contains` matches against item name.
- `category` can boost match quality.
- Best-scoring entry wins per item.

## Practical workflow

1. Regenerate shopping recommendations in stage.
2. Review each item's `search_query`.
3. Add catalog entries for your top themes/categories.
4. Regenerate again to see real product images and links.
