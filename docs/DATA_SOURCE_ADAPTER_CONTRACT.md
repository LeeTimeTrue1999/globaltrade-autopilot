# Data Source Adapter Contract

This contract defines how every data source enters the MVP and future backend system. It keeps manual CSV/Excel upload, visible-page competitor collection, supplier discovery, future platform APIs, and scheduled syncs source-agnostic.

Marketplace-specific adaptation for Shopee, Lazada, and TikTok Shop is organized in `docs/MARKETPLACE_PLATFORM_ADAPTERS.md`. Platform connectors must still emit the normalized envelope defined here.

## Goals

- One normalized intake envelope for all sources.
- Preserve source provenance, confidence, timestamps, and raw row references.
- Support local MVP flows now without requiring backend storage.
- Allow future API jobs to reuse the same validation, field mapping, audit, and confirmation flow.
- Keep high-impact writes reviewable; adapters should stage data before applying it.

## Adapter Modes

| Mode | Current MVP status | Examples | Notes |
| --- | --- | --- | --- |
| `manual_upload` | Active | Market, supplier, logistics, orders CSV/Excel | User uploads a file, maps fields, previews, then confirms. |
| `visible_page_capture` | Active | Competitor price collection | User copies visible platform data or CSV-like rows; system parses and user confirms. No cookies are stored. |
| `public_discovery` | Active | Yiwugo supplier discovery | Local dev server reads public list data and stages candidates for manual confirmation. |
| `browser_assisted` | Future | Logged-in marketplace pages | User controls browser session; system extracts visible data only after explicit action. |
| `api_sync` | Future | Shopee, Lazada, TikTok Shop, Ozon, logistics, FX | Requires API authorization, secrets, retries, rate limits, and hosted jobs. |
| `scheduled_job` | Future | Daily FX, logistics tracking, marketplace refresh | Requires backend worker and audit trail. |

## Normalized Intake Envelope

Every adapter should emit this envelope before domain-specific validation:

```json
{
  "adapterId": "competitor-visible-page-v1",
  "sourceId": "source-competitor-prices",
  "sourceName": "Competitor visible page capture",
  "mode": "visible_page_capture",
  "domain": "competitor_prices",
  "entityType": "competitor_price_snapshot",
  "schemaVersion": "2026-07-13",
  "collectedAt": "2026-07-13T09:00:00.000Z",
  "operator": "local-mvp",
  "confidenceLevel": "B",
  "idempotencyKey": "competitor:lazada-th:foldable-rack:2026-07-13",
  "source": {
    "platform": "Lazada",
    "country": "Thailand",
    "url": "https://www.lazada.co.th/catalog/?q=foldable%20kitchen%20storage%20rack",
    "inputType": "visible_page_text",
    "credentialHandling": "none"
  },
  "mapping": {
    "title": "title",
    "price": "price",
    "currency": "currency",
    "url": "product_url"
  },
  "rows": [
    {
      "sourceRowId": "row-1",
      "raw": "Foldable kitchen storage rack ฿329 https://example.com/a",
      "normalized": {
        "title": "Foldable kitchen storage rack",
        "price": 329,
        "currency": "THB",
        "productUrl": "https://example.com/a"
      },
      "quality": {
        "status": "valid",
        "warnings": [],
        "errors": []
      }
    }
  ],
  "summary": {
    "rowCount": 1,
    "validRows": 1,
    "warningRows": 0,
    "errorRows": 0
  }
}
```

## Required Metadata

| Field | Required | Description |
| --- | --- | --- |
| `adapterId` | Yes | Stable adapter name and version. |
| `sourceId` | Yes | Registered data source id from the data source registry. |
| `mode` | Yes | One of the adapter modes above. |
| `domain` | Yes | Business domain such as `market_products`, `supplier_products`, `logistics_rates`, `orders`, `competitor_prices`, `fx_rates`, `shipments`, or `ads`. |
| `entityType` | Yes | Target normalized entity type. |
| `schemaVersion` | Yes | Version of the normalized schema the adapter emits. |
| `collectedAt` | Yes | When the source data was collected or uploaded. |
| `operator` | Yes | Local user, service account, or job identity. |
| `confidenceLevel` | Yes | `A`, `B`, or `C`; manual/visible-page data is usually `B` until reconciled. |
| `idempotencyKey` | Strongly recommended | Prevents duplicate application of the same source batch. |
| `source` | Yes | Platform, URL, file name, API endpoint, or other provenance. |
| `mapping` | Yes for flexible inputs | Source-to-canonical field mapping used for audit. |
| `rows` | Yes | Raw and normalized records with per-row quality status. |
| `summary` | Yes | Row count and quality counts. |

## Domain Entity Types

| Domain | Entity type | Current intake path |
| --- | --- | --- |
| `market_products` | `market_product` | CSV/Excel import; future marketplace API/search adapter. |
| `supplier_products` | `supplier_product` | CSV/Excel import, Yiwugo candidate confirmation, future 1688/API/manual quote adapter. |
| `logistics_rates` | `logistics_rate_card` | CSV/Excel/manual rate card; future logistics API. |
| `orders` | `order` | CSV/Excel import; future marketplace order API. |
| `competitor_prices` | `competitor_price_snapshot` | Visible-page/CSV-like collection; future browser-assisted extraction or data provider. |
| `fx_rates` | `fx_rate_snapshot` | Manual config now; future FX API. |
| `shipments` | `shipment_event` | Local manual/simulated now; future carrier tracking sync. |
| `ads` | `ad_performance_snapshot` | Manual assumption now; future ad report import/API. |
| `shop_metrics` | `shop_metric_snapshot` | Manual weekly summary now; future seller report/API. |

## Quality Status

Each row must resolve to one of:

- `valid`: ready to stage for confirmation.
- `warning`: usable, but missing optional evidence or low confidence.
- `error`: cannot be applied without correction.
- `duplicate`: already seen by idempotency key or natural key.
- `stale`: collected data is older than the source freshness rule.

## Apply Rules

Adapters should not directly mutate business entities. The standard lifecycle is:

1. Collect source data.
2. Normalize into the intake envelope.
3. Map fields to canonical schema.
4. Validate row quality.
5. Stage preview for user or job review.
6. Confirm application.
7. Write audit log with adapter id, source id, row count, validation result, and affected entity ids.

## Credential Rules

- Do not store marketplace cookies in localStorage.
- Browser-assisted adapters should read only visible page data after explicit user action.
- API adapters must store tokens only in a backend secret store, never in frontend localStorage.
- CAPTCHA, MFA, password prompts, and final destructive actions remain user-controlled.

## MVP Implementation Notes

- CSV/Excel import already follows preview-confirm-apply and should be treated as `manual_upload`.
- Competitor collection should emit `visible_page_capture` snapshots before updating market products.
- Yiwugo supplier discovery should emit `public_discovery` candidates before supplier confirmation.
- Future API jobs should produce the same envelope so scoring, opportunity review, audit logs, and rollback do not need separate source-specific code paths.
