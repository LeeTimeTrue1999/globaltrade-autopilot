# MVP Readiness Board

This document defines what the first local MVP must contain, what is already visible in the frontend, and what is intentionally not implemented yet. Keep this file aligned with `docs/WORK_TODO.md` and the frontend `MVP 初版` page.

## MVP Goal

The first MVP should prove one complete cross-border operating loop without backend dependency:

1. Bring in product, supplier, logistics, order, and cost assumptions.
2. Discover and score opportunities.
3. Decide which products to test.
4. Create listing drafts for translation, localization, and manual review.
5. Track orders, revenue, shipment tasks, and operating follow-up.
6. Export or restore the local workspace for handoff.

2026-07-15 pivot: the product is moving toward a ToB lead generation workflow. The new first step is demand exploration: input a product/category, identify likely demand countries, generate map/review/search tasks, then collect public business contacts into a lead pool.

## Frontend Visibility Rule

Every MVP-critical capability should be visible from the frontend in one of three states:

- `已完成`: usable in the local MVP.
- `部分完成`: usable but still based on simplified/local assumptions.
- `待补`: required before a stronger MVP demo or team pilot.
- `暂缓`: intentionally deferred because it requires backend, API credentials, or production operations.

If a feature is only documented but not visible in the frontend, it should appear in the `MVP 初版` page as a gap.

## Current MVP Capability Matrix

2026-07-12 supplement: opportunity review now includes an evidence/enrichment panel in the frontend. It shows target-country pricing basis, advertising assumptions, weight/dimension gaps, logistics cost basis, supplier backup status, and conservative/base/optimistic profit scenarios. These fields are visible for MVP review, but true competitor pricing, ad performance, product weight/dimensions, and route-specific logistics evidence still need imports or future adapters.

2026-07-12 supplement: a local competitor price collection workbench is now visible in the frontend. It supports pasted visible marketplace results or CSV-like rows, extracts prices, previews samples, computes low/mid/high CNY price bands, and writes confirmed bands back to market products. It does not store cookies or run background scraping.

2026-07-13 supplement: the data source adapter contract is now defined in `docs/DATA_SOURCE_ADAPTER_CONTRACT.md` and visible on the frontend data import page. Manual upload, visible-page capture, public discovery, browser-assisted extraction, API sync, and scheduled jobs share one normalized intake envelope and credential rule.

2026-07-13 supplement: the listing draft workbench now includes a local translation/localization workflow. Operators can edit target title, keywords, attributes/specs, selling points, asset readiness, and compliance notes; saving updates localStorage, audit logs, draft completeness, and review status.

2026-07-13 supplement: Shopee, Lazada, and TikTok Shop adaptation is now organized in `docs/MARKETPLACE_PLATFORM_ADAPTERS.md`. The plan keeps seller exports, visible-page capture, browser-assisted extraction, future API sync, and scheduled jobs behind the same data source adapter contract.

2026-07-15 supplement: a ToB demand exploration page is now visible in the frontend. It recommends target countries and cities for a product intent such as `钓鱼竿`, generates low-frequency map/review/search tasks for public store contact discovery, and parses pasted visible-page/store-directory text into a local store lead pool. CRM follow-up remains the next gap.

| Area | Frontend status | MVP status | Notes |
| --- | --- | --- | --- |
| Local workspace storage | 配置中心 | 已完成 | Browser localStorage plus JSON backup/restore. |
| Data import | 数据导入 | 已完成 | Market products, supplier products, logistics quotes, and orders support CSV/Excel-compatible imports with preview and validation. |
| Field mapping | 数据导入 | 已完成 | Source columns map into canonical fields before confirmation. |
| Product management | 商品管理 | 已完成 | Shows market product data and import entry points. |
| Supplier management | 供应商管理 / 供应商匹配 | 已完成 | Supplier data is manageable and can be manually matched to products. |
| Yiwugo supplier discovery | 供应商管理 | 已完成 | Local dev server can query Yiwugo public product list data, rank low-price candidates, and add manually confirmed items into the supplier product pool. |
| Supplier discovery refresh rules | 供应商管理 | 已完成 | Source configs store readable fields, blocked fields, refresh cadence, overwrite policy, last fetch time, next refresh suggestion, and source snapshots for confirmed supplier rows. |
| Logistics quote management | 物流报价 | 已完成 | Local logistics quotes can be created and used to refresh product costs. |
| Opportunity discovery | 机会池 | 部分完成 | Link/category discovery exists, but signals are locally simulated until real parsing/API data is connected. |
| Opportunity detail review | 机会池 | 已完成 | Shows market data, supplier data, score factors, cost breakdown, and research source notes. |
| Listing draft handoff | 机会池 / 上架草稿 | 已完成 | Opportunities can generate or open listing drafts. |
| Listing review | 上架草稿 | 已完成 | Review panel includes editable translation/localization fields, readiness checks, local status updates, and audit logging. |
| Cost assumptions | 配置中心 / 机会池 | 部分完成 | Fees, FX, ad cost, return loss, packaging, supplier cost, and logistics cost are visible; source provenance needs clearer templates by platform/country/category. |
| Order and revenue data | 订单管理 / 收入数据 | 已完成 | Order import drives revenue summary and order management views. |
| Shipment fulfillment | 发货履约 | 部分完成 | Local shipment tasks and simulated tracking exist; no real platform callback or logistics tracking API yet. |
| Audit log | 配置中心 | 已完成 | Local audit records important workspace actions. |
| Data source registry | 数据导入 | 已完成 | Manual upload and future API candidates are managed together. |
| Marketplace platform adapter plan | 文档 / 数据导入 | 已完成 | Shopee, Lazada, and TikTok Shop adaptation phases, fields, source modes, credential rules, and acceptance criteria are documented. |
| ToB demand exploration | 需求探查 | 已完成 | Product/category input generates target-country recommendations, customer types, cities, and map/review/search collection tasks. |
| Store lead pool | 需求探查 | 已完成 | Visible map/review/directory/search text can be pasted, parsed, previewed, confirmed, scored, deduped, removed if mistaken, and kept in a local lead pool. |
| B2B sales follow-up | 前端尚未形成独立入口 | 待补 | Need CRM statuses, owner, notes, outreach channel, templates, and opt-out/suppression handling. |
| KPI weekly review | 经营复盘 | 待补 | Needs stronger KPI dashboard for GMV, margin, test outcome, supplier issues, and logistics exceptions. |
| Strategy action workflow | 多页面 | 待补 | Recommendations are visible, but approve/reject/execute workflow is not yet formalized. |
| Real user roles | Frontend not active | 暂缓 | Deferred until hosted multi-user mode exists. |
| Backend persistence | Frontend not active | 暂缓 | Deferred until data acquisition and collaboration model are decided. |
| Object storage for original files | Frontend not active | 暂缓 | Current MVP keeps parsed rows locally; hosted object storage is later. |

## Information Needed From Operators

### Required For First Useful MVP Demo

- Target platforms and countries to test first.
- Product rows with platform, country, category, title, local title, price, currency, rating, review count, sales signal, trend, competition level, and source URL if available.
- Supplier rows with market product id, supplier name, source platform, purchase price, MOQ, dispatch days, supplier rating, monthly sales, dropship support, and backup supplier.
- Supplier discovery rules for Yiwugo: category, keyword, max purchase price, max MOQ, and candidate count.
- Supplier discovery update rules: source mode, refresh cadence, overwrite policy, fetched-at timestamp, next refresh suggestion, and source snapshot for change review.
- Opportunity enrichment rows with target-country competitor price band, ad assumption or campaign test budget, product weight/dimensions, logistics quote basis, supplier backup status, and profit scenario assumptions.
- Competitor price snapshots from visible platform results or CSV-like rows: linked market product, source platform, country, keyword, source URL, sample title, sample price, currency, CNY conversion, and confirmation time.
- Logistics rows with provider, route, destination country, weight or parcel assumptions, cost in CNY, and delivery days.
- Order rows with platform, country, SKU/product, amount in CNY, profit in CNY, status, and owner.
- Cost assumptions for platform fee, payment fee, ad cost, return loss, packaging cost, FX rates, and minimum margin threshold.

### Helpful For Better Scoring

- Competitor price bands.
- Real search volume, ranking, sales, review, and ad data.
- Category-level return/refund/refusal rates.
- Product weight, dimensions, volumetric weight rule, and restricted goods flags.
- Route-specific logistics quotes by destination country, weight band, parcel type, channel, and delivery time.
- Supplier on-time delivery and defect history.
- Compliance notes for brand/IP, battery, liquid, food, cosmetics, children, medical, or country-specific restrictions.

## Open MVP Gaps

1. Real marketplace URL/platform parsing is not connected. Yiwugo public list discovery exists, but other platforms such as 1688 still need manual upload, logged-in browser assistance, or API access.
2. Platform-specific seller export mapping presets for Shopee, Lazada, and TikTok Shop are not implemented yet.
3. Browser-assisted marketplace capture is documented but not implemented.
4. B2B CRM follow-up workflow is not implemented yet.
5. Cost templates need platform/country/category provenance so every fee can show its source.
6. Competitor price collection is visible and local, but true automated logged-in browser extraction, official marketplace API access, and third-party market data providers still need compliance and account-access review.
7. Supplier discovery refresh is manual in the local MVP; background schedules need a hosted job runner later.
8. KPI weekly review needs clearer metrics and test outcome tracking.
9. Strategy recommendations need an approval/action log.
10. Shipment tracking is simulated; real carrier/platform sync is deferred.
11. Multi-user permissions and backend persistence are intentionally out of scope for the local MVP.

## Operating Rule

Before calling the MVP ready for a team demo, the frontend `MVP 初版` page should show no `待补` item in the P0 scope. P1 gaps can remain if they are clearly labeled and do not block the core local operating loop.
