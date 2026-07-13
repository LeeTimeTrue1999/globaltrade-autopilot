# Marketplace Platform Adapter Plan

This document organizes the first Shopee, Lazada, and TikTok Shop adaptation plan. It extends `docs/DATA_SOURCE_ADAPTER_CONTRACT.md`; every platform connector must emit the same normalized intake envelope before validation, preview, confirmation, scoring, listing review, fulfillment, or audit.

## Principle

Do not build one-off scrapers into the business workflow.

Each platform has different pages, permissions, country sites, rate limits, and anti-bot behavior. The system should treat platform access as a data source adapter with a clear source mode:

1. `manual_upload`: seller-center CSV/Excel export uploaded by an operator.
2. `visible_page_capture`: operator pastes visible page text or CSV-like rows.
3. `browser_assisted`: operator opens a logged-in page and explicitly extracts visible data.
4. `api_sync`: backend uses official platform authorization and tokens.
5. `scheduled_job`: hosted worker refreshes authorized data on a cadence.

The local MVP should start with modes 1 and 2, selectively add mode 3, and defer modes 4 and 5 until developer accounts, API scopes, token storage, and backend jobs are confirmed.

## Platform Summary

| Platform | MVP path | Later API path | Main risks |
| --- | --- | --- | --- |
| Shopee | Seller export upload; visible-page competitor capture; browser-assisted visible page extraction | Shopee Open Platform for product, order, stock, shipment, and shop data where authorized | Public search pages can return access errors or anti-bot responses; API availability depends on account, region, and scope approval. |
| Lazada | Seller export upload; visible-page competitor capture; browser-assisted visible page extraction | Lazada Open Platform for seller-authorized product, order, price, stock, and fulfillment data | Country-site behavior and API scope approval can differ; competitor pages should not be treated as stable server-side APIs. |
| TikTok Shop | Seller export upload; visible-page competitor/content capture; browser-assisted visible page extraction | TikTok Shop Open API for seller-authorized product, order, fulfillment, and shop data; ad/content data may need separate permissions | Content-commerce data has extra dimensions such as creator, video/live, traffic, and ad attribution; do not mix it into basic product/order schemas without an explicit model. |

Official documentation starting points:

- Shopee Open Platform: https://open.shopee.com/
- Lazada Open Platform: https://open.lazada.com/
- TikTok Shop Partner Center / Open API documentation: https://partner.tiktokshop.com/

## Supported Business Domains

| Domain | MVP source | Future source | Used by |
| --- | --- | --- | --- |
| `market_products` | CSV/Excel export, manual product rows | Platform product/search APIs, browser-assisted page extraction | Opportunity pool, scoring, listing drafts |
| `competitor_prices` | Visible page paste, CSV-like rows | Browser-assisted extraction, official/third-party market data providers where allowed | Price band, margin scenario, opportunity evidence |
| `listing_drafts` | Local draft created from opportunity | Platform listing API after manual approval | Translation/localization, publish review |
| `orders` | Seller-center order export | Seller-authorized order API | Revenue, fulfillment, KPI review |
| `shipments` | Local manual update, order import | Platform fulfillment API and carrier tracking sync | Shipment workbench, logistics exceptions |
| `ads` | Manual assumptions, uploaded reports | Ad report import/API where platform grants access | Launch budget, stop/scale decisions, KPI review |
| `shop_metrics` | Manual weekly summary | Seller API/report exports | Weekly operating review |

## Canonical Adapter Output

Every platform adapter should produce a `DataSourceAdapterContract` envelope like this:

```json
{
  "adapterId": "shopee-seller-export-orders-v1",
  "sourceId": "source-shopee-th-orders",
  "sourceName": "Shopee Thailand seller order export",
  "mode": "manual_upload",
  "domain": "orders",
  "entityType": "order",
  "schemaVersion": "2026-07-13",
  "collectedAt": "2026-07-13T09:00:00.000Z",
  "operator": "local-mvp",
  "confidenceLevel": "A",
  "idempotencyKey": "shopee:th:orders:2026-07-13",
  "source": {
    "platform": "Shopee",
    "country": "Thailand",
    "inputType": "seller_center_export",
    "credentialHandling": "operator_export"
  },
  "mapping": {
    "order_id": "id",
    "sku": "sku",
    "paid_amount": "amountCny",
    "order_status": "status"
  },
  "rows": [],
  "summary": {
    "rowCount": 0,
    "validRows": 0,
    "warningRows": 0,
    "errorRows": 0
  }
}
```

The adapter is not allowed to directly mutate business data. It must stage, validate, preview, and wait for confirmation unless the future backend job is explicitly configured as a low-risk auto-sync.

## Field Mapping Requirements

### Product / Listing

| Canonical field | Meaning |
| --- | --- |
| `platform` | Shopee, Lazada, TikTok Shop |
| `country` | Sales country or marketplace site |
| `platformProductId` | Platform item/listing id when available |
| `sku` | Seller SKU |
| `category` | Platform category or local category |
| `title` | Source listing title |
| `localTitle` | Operator-facing Chinese/local name |
| `price` / `currency` | Current selling price and currency |
| `rating` / `reviewCount` | Marketplace social proof |
| `salesSignal` | Monthly sales, sold count, or normalized demand signal |
| `sourceUrl` | Product or search result URL |
| `status` | Draft, active, inactive, delisted, under review |

### Competitor Price

| Canonical field | Meaning |
| --- | --- |
| `linkedMarketProductId` | Product/opportunity this evidence supports |
| `platform` / `country` | Source marketplace |
| `keyword` | Search term or category used |
| `sampleTitle` | Competitor listing title |
| `samplePrice` / `currency` | Visible price |
| `sampleUrl` | Listing URL if visible |
| `position` | Search rank/page position if visible |
| `collectedAt` | Evidence collection time |
| `confidenceLevel` | A for API/export, B for visible page, C for incomplete manual notes |

### Order

| Canonical field | Meaning |
| --- | --- |
| `platformOrderId` | Marketplace order id |
| `platform` / `country` | Marketplace |
| `sku` / `product` | Sold product |
| `amountCny` | Paid amount converted to CNY |
| `profitCny` | Estimated or actual profit |
| `status` | Order status |
| `paidAt` | Payment time if available |
| `shipBy` | Required ship-by time if available |
| `trackingNumber` / `carrier` | Shipment fields if available |
| `owner` | Internal operator |

### Ads / Content

| Canonical field | Meaning |
| --- | --- |
| `platform` / `country` | Advertising platform/site |
| `campaignId` / `campaignName` | Campaign identity |
| `linkedMarketProductId` | Product being tested |
| `spendCny` | Spend converted to CNY |
| `impressions` / `clicks` / `orders` | Funnel metrics |
| `revenueCny` | Attributed revenue |
| `acos` / `roi` | Derived performance metrics |
| `contentId` / `creatorId` | TikTok Shop content/affiliate dimension when available |

## Credential And Compliance Rules

- Do not store cookies, passwords, MFA codes, or seller-center session data in localStorage.
- Browser-assisted extraction reads visible page content only after the operator opens the page and triggers extraction.
- API tokens belong in a backend secret store, not the frontend.
- CAPTCHA, MFA, account login, permission grants, purchases, publishing, and destructive changes remain user-controlled.
- Competitor data must keep `sourceUrl`, `collectedAt`, `mode`, and `confidenceLevel` so operators can judge freshness and reliability.
- High-impact writes such as listing publish, shipment callback, price changes, or campaign budget changes must require explicit approval and audit logging.

## Implementation Phases

### Phase 1: Local MVP Data Imports

Goal: start operating without platform API approval.

- Add platform-specific seller export templates for Shopee, Lazada, and TikTok Shop orders/products.
- Add field mapping presets for common export column names.
- Keep visible-page competitor collection as the first price evidence path.
- Store source mode, country, platform, URL/file name, collected time, and confidence level.

### Phase 2: Browser-Assisted Research

Goal: reduce manual copy/paste while staying operator-controlled.

- Operator opens a search or product page in the browser.
- System extracts visible title, price, currency, sold count/rating when present, URL, and page position.
- Extracted rows enter the same preview-confirm flow as manual competitor collection.
- No background crawling, no cookie storage, no automatic login flow.

### Phase 3: Official API Read Sync

Goal: synchronize seller-owned data reliably.

- Register developer applications and confirm country/site scopes.
- Implement OAuth/token refresh in backend only.
- Sync products, orders, inventory, shipment status, and shop metrics.
- Emit the normalized intake envelope for every sync batch.
- Add idempotency, retries, rate-limit handling, and audit logs.

### Phase 4: Controlled Write Actions

Goal: allow approved operating actions while keeping humans in control.

- Listing publish/update after draft approval.
- Shipment callback after fulfillment verification.
- Inventory/price update after operator approval.
- Ad budget or campaign status changes after strategy action approval.

## Open Decisions

| ID | Decision | Default |
| --- | --- | --- |
| MP-001 | First target countries per platform | Thailand for Shopee/Lazada; TikTok Shop country TBD. |
| MP-002 | First API integration | Orders and products before ads. |
| MP-003 | Competitor data source | Visible-page/manual first; browser-assisted second; official/third-party provider later. |
| MP-004 | Token storage | Backend secret store only, deferred until hosted backend exists. |
| MP-005 | Automated writes | Disabled until approval workflow and audit trail are complete. |

## Acceptance Criteria For Production Use

- Each platform source has a registered data source config with owner, cadence, mode, expected fields, and confidence rule.
- Product/order/supplier/logistics imports can be traced back to source file, URL, API job, or visible page capture.
- Competitor price evidence shows freshness and source mode before it affects scoring.
- Listing publish and shipment callback cannot run without approved draft/order status.
- API credentials are never stored in frontend localStorage.
- Weekly operating review can distinguish platform data, manual assumptions, and simulated/local MVP values.
