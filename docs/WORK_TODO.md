# Work TODO and Operating Log

This document is the project operating board. Every future work session must read it before making changes and update it before finishing.

## Mandatory Workflow

Before starting work:

1. Read this document.
2. Check `git status --short`.
3. Identify any existing user changes and avoid overwriting unrelated work.
4. Pick the relevant item from the TODO board or add a new one if the work is new.

Before finishing work:

1. Update task status, notes, and next steps in this document.
2. Add any new decisions, blockers, data requirements, or follow-up tasks.
3. Record validation performed, such as tests, browser checks, or known gaps.
4. Mention any files intentionally left unchanged because they contain user work.

Status values:

- `todo`: not started.
- `doing`: actively being worked on.
- `blocked`: cannot continue without a decision, credential, data sample, or external resource.
- `done`: implemented and verified for the current scope.

Priority values:

- `P0`: required for a usable internal MVP.
- `P1`: important for team operation and auditability.
- `P2`: useful enhancement after MVP flow is stable.

## Current Product Split

### Operations Platform

Daily operating surface based on existing data and B2B lead intent:

- ToB demand exploration by product/category.
- Target-country and target-city lead search tasks.
- Dashboard and opportunity pool.
- Opportunity scoring and recommended action.
- Listing drafts and manual review.
- Orders and fulfillment tracking.
- Reports, strategy summaries, and operating review.

### Management Platform

Manual confirmation, configuration, and data governance surface:

- B2B lead source rules for maps, review platforms, directories, and visible-page capture.
- B2B lead source discovery plans for automatically generated map/review/directory/search entry points and parser rules.
- Data import and preview.
- Field mapping rules.
- Data source adapter registry for manual uploads and future API sync.
- Supplier matching.
- Logistics rate card management.
- Cost templates and FX configuration.
- Risk rules and approval workflow.
- Local audit logs and workspace backup.

## TODO Board

| ID | Priority | Area | Status | Task | Notes / Acceptance |
| --- | --- | --- | --- | --- | --- |
| T-001 | P0 | Data import | done | Market, supplier, and logistics CSV/Excel-compatible import templates | Implemented in static prototype with validation and opportunity scoring integration. |
| T-002 | P0 | Data import | done | Import preview and confirmation flow | Files stage first; users confirm before data is applied. |
| T-003 | P0 | Data import | done | Import history and data quality issue pool | Shows confirmed/rejected imports and missing supplier/logistics/source issues. |
| T-004 | P0 | Storage | done | localStorage persistence for prototype data | Persists full workspace snapshot: market, supplier, logistics, orders, listing drafts, config, field mappings, history, audit logs, and filters. |
| T-005 | P0 | Data import | done | Standardized field mapping rules | Canonical schema and source-to-target mapping are implemented in the import flow. |
| T-006 | P0 | Management platform | done | Supplier matching management page | Allows manual supplier-to-market-product binding. |
| T-007 | P0 | Management platform | done | Logistics rate card management page | Allows manual logistics quote creation and product cost refresh. |
| T-008 | P2 | Backend | done | Design backend persistence schema | Reference design only. Do not treat backend/database/object storage as current MVP dependencies until the data acquisition mode is decided. |
| T-009 | P2 | Infrastructure | blocked | Choose MVP deployment stack and cloud vendor | Deferred until we decide whether data enters through API sync, manual upload, shared workspace, or another operating model. |
| T-010 | P2 | Files | blocked | Store original import files | Deferred backend/object-storage task. Current MVP keeps parsed local import rows and JSON backups. |
| T-011 | P0 | Audit | done | Add local audit log model and UI | Local MVP records import, rollback, supplier matching, logistics quote, backup, restore, reset, and config changes. Backend append-only audit remains covered by T-023. |
| T-012 | P2 | Auth | blocked | Add users, roles, and permissions | Deferred until the system needs real multi-user hosted access. Current MVP is local browser workspace. |
| T-013 | P1 | Costing | done | Cost template management | Local MVP settings page edits platform fee, payment fee, ad cost, return loss, packaging cost, and margin threshold. Effective dates remain a backend follow-up. |
| T-014 | P1 | FX | done | FX rate snapshots | Local MVP settings page edits FX rates used by scoring. Historical snapshots remain a backend follow-up. |
| T-015 | P1 | Listings | done | Opportunity-to-listing draft handoff | Opportunity details now include a generate/view draft action; new drafts carry score, risk, supplier, localization, and cost snapshot data where available. |
| T-016 | P1 | Orders | done | Order CSV import template | Added order CSV/Excel-compatible template, field mapping, validation, and import into local fulfillment table. |
| T-017 | P0 | Data source | done | Define data source adapter contract | Added `docs/DATA_SOURCE_ADAPTER_CONTRACT.md` and a frontend data-source contract table covering manual upload, visible-page capture, public discovery, browser-assisted extraction, and future API/scheduled sync through one normalized intake envelope. |
| T-018 | P2 | Integrations | blocked | Platform API access verification | Deferred until API-based acquisition is confirmed; keep manual export/import as first-class input. |
| T-019 | P2 | Analytics | todo | KPI and weekly review dashboard | Add GMV, order count, margin, test outcomes, supplier issues, logistics exceptions. |
| T-020 | P2 | Automation | todo | Strategy action workflow | Approve/execute/reject recommended actions; no automatic high-impact execution. |
| T-021 | P2 | Backend | blocked | Implement persistence migrations | Deferred. Only start after backend form and storage requirements are confirmed. |
| T-022 | P2 | Backend | blocked | Implement object storage adapter | Deferred. Only start if original file retention needs hosted storage. |
| T-023 | P2 | Backend | blocked | Implement auth and audit middleware | Deferred. Current MVP uses local audit logs; hosted multi-user security is a later track. |
| T-024 | P0 | Storage | done | Local JSON backup and restore | Settings page exports/imports the complete local workspace snapshot. |
| T-025 | P0 | Data import | done | Roll back confirmed import batches | Import history can remove all rows created by a confirmed batch and records the rollback in audit logs. |
| T-026 | P1 | Data import | done | Keep local original import record | Confirmed/rejected import history stores parsed raw rows and field mapping for local audit. Backend original file object storage remains T-010/T-022. |
| T-027 | P0 | Data source | done | Add data source management UI | Added a dedicated management page for source type, owner, cadence, expected fields, confidence level, and current mode: manual upload, API candidate, or not connected. Import templates/history moved there from the opportunity pool. |
| T-028 | P0 | UI | done | Localize MVP UI to Chinese and debug | User-facing labels, buttons, empty states, import validation messages, data source status, audit log summaries, logistics forms, and settings panels are now Chinese. |
| T-029 | P0 | UI | done | Reorganize data management navigation | Sidebar now separates Operations Platform, Data Management, and System Management. Added explicit product management and revenue data pages; supplier and order pages now surface management metrics and import entry points. |
| T-030 | P0 | UI | done | Rebuild listing review into listing draft workbench | Renamed the page to listing drafts, replaced the status-only kanban with a draft table, added readiness checks, metrics, owner, stage, and next-step links back to opportunity, supplier matching, logistics, and import pages. |
| T-031 | P0 | UI | done | Review design logic and frontend clarity pass | Added page-level guidance across data and system management pages, clarified finance split headings, added supplier matching/logistics table headers, and fixed data source card responsive overflow. |
| T-032 | P0 | Fulfillment | done | Add local shipment fulfillment workbench | Added a dedicated operations page for shipment tasks generated from orders, manual carrier/tracking/status maintenance, readiness checks for future auto-send, simulated tracking refresh, local persistence, and audit logs. |
| T-033 | P1 | Fulfillment | todo | Define platform shipment callback contract | Future backend/API work: after an order is ready, send carrier and tracking number to marketplace platforms with retry, idempotency, and audit trail. |
| T-034 | P1 | Fulfillment | todo | Define logistics tracking sync adapter | Future backend/API work: poll or subscribe to logistics tracking events, normalize shipment milestones, and push exceptions into the manual workbench. |
| T-035 | P0 | Opportunity discovery | done | Add active discovery MVP to opportunity pool | Users can enter a product link or product category, generate local market-research candidates, add selected candidates to the product pool, and create listing drafts. |
| T-036 | P1 | Opportunity discovery | todo | Add real URL and platform parsing adapter | Replace local simulated signals with normalized inputs from marketplace pages, search APIs, trend data, competitor listings, or uploaded research exports. |
| T-037 | P1 | Listings | done | Build translation and localization workflow | 上架草稿详情可编辑目标标题、关键词、属性规格、卖点、图片素材状态和合规备注；保存后更新草稿完整度、审核状态、localStorage 和审计日志。 |
| T-038 | P1 | Operations | todo | Build advertising operations workflow | After listing, manage launch budgets, campaign tests, performance feedback, and stop/scale decisions from the same operating platform. |
| T-039 | P0 | UI | done | Add detailed opportunity and listing review panels | Opportunity pool cards now show more operating data and the selected opportunity opens a full detail panel; listing drafts now use a queue plus full review panel with localization, checklist, cost, supplier, and logistics sections. |
| T-040 | P0 | MVP governance | done | Add MVP readiness document and frontend page | Added `docs/MVP_READINESS.md` and a system-management frontend page showing required MVP capabilities, frontend visibility, status, priority, gaps, and deferred items. |
| T-041 | P0 | Supplier discovery | done | Add Yiwugo automatic supplier discovery MVP | Supplier management page can query Yiwugo public product list data through the local dev server, rank low-price candidates, show price/MOQ/sales/shop signals, and add confirmed candidates to the supplier product pool. |
| T-042 | P0 | Supplier discovery | done | Add supplier discovery storage and refresh rules | Supplier discovery now stores source configs, fetched candidates, fetched-at timestamps, next-refresh suggestions, overwrite policy, source snapshots, and manual confirmation status in the local workspace. |
| T-043 | P0 | Opportunity discovery | done | Add opportunity evidence and enrichment panel | Opportunity details now show target-country price basis, advertising assumption, weight/dimension gap, logistics cost basis, supplier backup status, and conservative/base/optimistic profit scenarios before deciding whether to add or test a product. |
| T-044 | P1 | Opportunity discovery | done | Probe competitor price source access | Tested Shopee, Lazada, TikTok Shop, and Ozon public search/API access. Direct server-side pulling is blocked or unreliable for these platforms, so MVP should support manual competitor-price import first and later add browser-assisted or official/API adapters where allowed. |
| T-045 | P0 | Competitor research | done | Add local competitor price collection workbench | Added a competitor collection page that accepts visible platform result text or CSV-like rows, parses prices by currency, previews samples, computes low/mid/high CNY price bands, and writes confirmed bands back to market products and the opportunity evidence panel. |
| T-046 | P1 | Platform adapters | done | Organize Shopee, Lazada, and TikTok Shop adapter plan | Added `docs/MARKETPLACE_PLATFORM_ADAPTERS.md` covering source modes, domain mapping, credential rules, implementation phases, and production acceptance criteria; linked it from data source and API contracts. |
| T-047 | P1 | Platform adapters | todo | Add Shopee/Lazada/TikTok Shop seller export mapping presets | Build platform-specific CSV/Excel mapping presets for product, order, shipment, and ad/report exports so manual seller-center data enters the canonical schemas faster. |
| T-048 | P1 | Platform adapters | todo | Add browser-assisted visible marketplace capture | Operator opens Shopee/Lazada/TikTok Shop pages and explicitly extracts visible title, price, sold/rating, URL, and rank into the same preview-confirm competitor evidence flow. |
| T-049 | P0 | B2B lead generation | done | Add demand exploration board | Added a ToB demand exploration page and `docs/B2B_LEAD_GENERATION_PLAN.md`; users can input a product/category, get target-country recommendations, and generate low-frequency map/review/search tasks for public store contact discovery. |
| T-050 | P0 | B2B lead generation | done | Add store lead pool and visible-page lead parser | 需求探查页已支持粘贴地图/点评/目录/搜索结果可见内容，解析店名、地址、公开电话、网站、评分、评论数和来源，预览确认后进入本地店铺线索池，并支持状态维护和移除误解析线索。 |
| T-051 | P0 | B2B lead generation | done | Add automatic lead source discovery plans | 需求探查页可以基于商品、国家、城市和客户类型自动生成 Google Maps、百度/高德地图、大众点评、网页搜索和行业目录入口，并记录解析方式、可读字段、合规边界、状态和审计日志。 |
| T-052 | P0 | B2B lead generation | todo | Add browser-assisted source extraction runner | Operator opens a generated source page and explicitly triggers extraction of visible store cards into the same preview-confirm lead pool flow. Must not store cookies, bypass login, bypass CAPTCHA, or collect hidden/private contacts. |
| T-053 | P1 | CRM | todo | Add B2B sales follow-up workflow | Manage lead statuses, contact notes, owner, outreach channel, message templates, quote/sample follow-up, and opt-out/suppression rules. |

## Decisions To Make

| ID | Status | Decision | Current Default |
| --- | --- | --- | --- |
| D-001 | deferred | Backend stack | No current default. Backend is deferred until acquisition mode and collaboration model are known. |
| D-002 | deferred | Cloud vendor | No current default. Do not buy server/database resources for the local MVP. |
| D-003 | open | First production data sources | Manual CSV/Excel and API are both valid; keep the product source-agnostic. |
| D-004 | deferred | Object storage provider | No current default. Local parsed import history and JSON backup are enough for MVP. |
| D-005 | open | Notification channel | Email, WeCom, DingTalk, or Feishu for import failures and approval tasks. |
| D-006 | open | Roles and approval policy | Operations, supply chain, store ops, finance/viewer, admin. |

## Data And Infrastructure Notes

### Data To Introduce

- Market products: CSV/Excel manual upload now; marketplace API remains optional.
- Supplier products: CSV/Excel/manual now; supplier system or API remains optional.
- Supplier discovery candidates: Yiwugo public list data can be queried through the local dev server for low-price supplier candidate discovery. Candidates require manual confirmation before entering the supplier product pool.
- Supplier discovery source rules: local MVP stores source mode, readable fields, blocked fields, refresh cadence, overwrite policy, last fetch time, and next suggested refresh time.
- Logistics rate cards: Excel/manual now; logistics API remains optional.
- FX rates: manual configuration now; API snapshot remains optional.
- Cost templates: manual configuration with effective dates.
- Listing drafts: generated from opportunities and manually reviewed.
- Discovery candidates: generated from product links or product categories; local MVP stores simulated market signals and selection status.
- Market research inputs: future adapters may include marketplace page parsing, platform search results, keyword trends, competitor price bands, and ads demand signals.
- Opportunity enrichment inputs: target-country competitor price band, ad cost or test budget assumption, product weight/dimensions, logistics route and weight-band quote, supplier backup, and profit scenarios.
- Competitor price snapshots: local MVP stores manually confirmed visible-page/CSV samples, source platform, country, keyword, source URL, sample prices, CNY price band, confirmation time, and linked market product.
- Data source adapter envelopes: every manual upload, visible-page capture, public discovery result, browser-assisted extraction, or future API sync should preserve adapter id, source id, mode, domain, entity type, schema version, collected time, operator, confidence level, source provenance, field mapping, raw rows, normalized rows, row quality, and summary counts.
- Marketplace platform adapter data: Shopee, Lazada, and TikTok Shop sources should normalize seller exports, visible page captures, browser-assisted captures, API sync batches, product/listing rows, orders, shipments, ads, shop metrics, and competitor price evidence through the same adapter envelope.
- B2B demand exploration data: product intent, inferred customer types, target countries, target cities, demand signals, recommended search keywords, source platforms, suggested per-task limits, and task status.
- B2B lead source plans: generated source URL, source platform, source type, parse mode, expected fields, safety rule, cadence, task link, status, created time, and updated time.
- B2B store leads: store name, business type, country, city, address, public phone/email/website/social URL, map/review/source URL, rating, review count, source keyword, source mode, confidence, match reason, lead score, and sales follow-up status.
- Localized listing content: translated title, attributes/specs, keywords, selling points, asset/spec readiness, compliance notes, reviewer status, and publish-readiness status.
- Orders: CSV/Excel upload now; platform API remains optional.
- Shipment tasks: generated from local orders now; future platform shipment callback and logistics tracking sync remain optional integrations.
- Risk rules: manually maintained category, keyword, IP, and country rules.
- Audit logs: local audit is enough for MVP; hosted append-only logs are only needed for multi-user usage.

### Current MVP Storage

- Browser localStorage for working data.
- JSON export/import for backup and handoff.
- Parsed import rows retained in local import history.
- No server, PostgreSQL, Redis, or object storage dependency for the current MVP.

### Deferred Infrastructure

Only revisit server resources after the team decides how data is acquired and shared:

- Manual-only upload workflow may stay local longer.
- API sync workflow may need backend jobs, secrets, retries, and logs.
- Team-shared workflow may need hosted storage, auth, roles, and backups.
- Original-file compliance may need object storage later.

## Work Log

| Date | Summary | Validation | Notes |
| --- | --- | --- | --- |
| 2026-07-13 | Added local listing translation/localization workflow in the listing draft workbench. Drafts now have editable target title, keywords, attributes/specs, selling points, asset status, and compliance notes, with local status and audit updates after saving. | `node --check app/src/app.js`; `node --check scripts/serve.js`; `npm.cmd test`; in-app browser check for listing localization form, save, reload persistence, console errors, and narrow-width overflow. | Existing untracked `docs/codex.code-workspace` left untouched. |
| 2026-07-13 | Organized Shopee, Lazada, and TikTok Shop platform adaptation into a formal adapter plan. | Documentation review; contract references updated in `docs/DATA_SOURCE_ADAPTER_CONTRACT.md` and `docs/API_CONTRACT.md`. | Platform API implementation remains deferred until developer accounts, scopes, token storage, and backend job requirements are confirmed. |
| 2026-07-15 | Pivoted planning toward ToB merchant lead discovery. Added a demand exploration board that turns product intent into target-country recommendations and low-frequency map/review/search tasks, plus `docs/B2B_LEAD_GENERATION_PLAN.md`. | `node --check app/src/app.js`; `node --check scripts/serve.js`; `npm.cmd test`; in-app browser check for nav, demand generation, task status update, reload persistence, console errors, and horizontal overflow. | Store lead pool is covered by T-050; CRM follow-up is now T-053. Existing untracked `docs/codex.code-workspace` left untouched. |
| 2026-07-15 | Added visible-page store lead collection logic. Operators can paste map, review platform, directory, or search-result text, preview parsed store leads, confirm them into the lead pool, update basic lead status, and remove mistaken rows locally. | `node --check app/src/app.js`; `node --check scripts/serve.js`; `npm.cmd test`; in-app browser check for lead paste parsing, preview, confirmation, lead status update, removal, reload persistence, console errors, and horizontal overflow. | This remains a local MVP parser; it does not bypass login, CAPTCHA, hidden contacts, or platform anti-bot controls. |
| 2026-07-15 | Added automatic lead source discovery plans. Demand exploration now generates map, review, directory, and search-source URLs from product intent, country, city, and customer type, with parser mode, expected fields, safety rules, status tracking, local persistence, and audit logs. | `node --check app/src/app.js`; `node --check scripts/serve.js`; `npm.cmd test`; in-app browser check for demand generation, source plan generation, source URL/field/safety display, status update, reload persistence, and console errors. | Real visible-page extraction from generated sources remains T-052; current implementation standardizes source discovery and parser routing. Existing untracked `docs/codex.code-workspace` left untouched. |
| 2026-07-11 | Added CSV/Excel-compatible import templates, validation, staging preview, import history, data quality pool, localStorage persistence, field mapping, supplier matching page, and logistics management page. | `npm.cmd test`; browser DOM check for management pages. | Existing unrelated `README.md` and `docs/CROSS_BORDER_OPERATIONS_REVIEW.md` changes were present before this TODO document work. |
| 2026-07-11 | Added backend persistence design for import batches, field mappings, original file object storage, supplier matches, logistics rate cards, users/roles, and audit logs. Updated API contract and README references. | Documentation review only; no code tests required. | Implementation remains TODO via T-021, T-022, and T-023. Existing app changes and `docs/CROSS_BORDER_OPERATIONS_REVIEW.md` were left untouched. |
| 2026-07-11 | Added local MVP workspace backup/restore, import batch rollback, editable cost/FX config, local audit logs, local parsed import record retention, and order import template/validation. | `npm.cmd test`; `node --check app/src/app.js`; `node --check app/src/import-utils.js`. `npm.cmd run build` unavailable because no build script exists. | Backend object storage, effective-dated cost snapshots, and append-only audit middleware remain future backend tasks. |
| 2026-07-11 | Re-scoped current MVP away from backend dependencies. Data acquisition remains source-agnostic: manual CSV/Excel upload now, API sync optional later. | Documentation update only. | Backend, cloud, object storage, auth, and migrations are blocked/deferred until data acquisition and collaboration model are decided. |
| 2026-07-11 | Added a dedicated Data Source Management page and moved CSV/Excel import workspace out of the opportunity pool. Management views now hide the global opportunity filters. | `node --check app/src/app.js`; `npm.cmd test`. Browser verification was blocked by browser URL policy for both `file://` and `127.0.0.1`. | The opportunity pool is now focused on scored opportunities; source registry keeps manual upload and future API modes side by side. |
| 2026-07-11 | Localized visible MVP UI text to Chinese and debugged the updated import/data-source/settings flows. | `node --check app/src/app.js`; `node --check app/src/import-utils.js`; `npm.cmd test`. | Internal field names and file extensions remain English where required for data mapping and import compatibility. |
| 2026-07-11 | Reorganized the UI so product, supplier, order, and revenue data each have clear management pages and import entry points. | `node --check app/src/app.js`; `npm.cmd test`. | Data import remains centralized under Data Management; operations pages focus on scoring, review, and reporting. |
| 2026-07-11 | Rebuilt the listing review page as a clear listing draft workbench and added guide copy to separate operations pages from data management pages. | `node --check app/src/app.js`; `node --check app/src/scoring.js`; `node --check app/src/import-utils.js`; `npm.cmd test`; in-app browser check on local HTTP page for nav, listing draft page, Chinese text, and console errors. | Top action now opens existing listing drafts instead of implying draft generation. T-015 remains open for the real opportunity-to-draft creation flow. |
| 2026-07-11 | Ran a design logic and frontend review across all pages. Added missing page guides, clarified revenue table titles, added workbench/table headers, and tightened responsive grid behavior. | `node --check app/src/app.js`; `node --check app/src/scoring.js`; `node --check app/src/import-utils.js`; `npm.cmd test`; in-app browser desktop and 390px mobile checks for nav, page headings, mojibake, console errors, and horizontal overflow. | Remaining product logic gap is still T-015: create listing drafts directly from opportunities with score/cost/source snapshots. |
| 2026-07-12 | Added a local shipment fulfillment workbench for post-transaction shipping operations and future automatic shipment/tracking integrations. | `node --check app/src/app.js`; `node --check app/src/scoring.js`; `node --check app/src/import-utils.js`; `npm.cmd test`; in-app browser check for nav, fulfillment page structure, save tracking info, simulated tracking refresh, console errors, mojibake, and overflow. | Current MVP does not call external marketplace or logistics APIs. T-033 and T-034 cover the future automated callback and real-time tracking adapters. |
| 2026-07-12 | Added active opportunity discovery inside the opportunity pool: link/category input, generated research candidates, add-to-product-pool action, and listing draft creation. | `node --check app/src/app.js`; `node --check app/src/scoring.js`; `node --check app/src/import-utils.js`; `npm.cmd test`; in-app browser check for discovery form, candidate generation, add-to-product-pool, listing draft handoff, console errors, mojibake, and overflow. | Current MVP does not fetch external pages or APIs; T-036 covers real parsing/data adapters, and T-037 covers the full translation/localization workflow. |
| 2026-07-12 | Expanded opportunity and listing review UX. Opportunity cards now expose more key data and the selected detail panel shows market data, cost breakdown, scoring factors, supplier fulfillment, and research source notes. Listing drafts now have a queue plus full audit panel for publish info, localization, checklist, cost snapshot, supplier, and logistics readiness. | `node --check app/src/app.js`; `npm.cmd test`; in-app browser checks for opportunity details, draft review panel, localization section, checklist, cost snapshot, console errors, mojibake, and overflow. | This is still local MVP data. Real external research parsing remains T-036; editable local listing content is now covered by T-037. |
| 2026-07-12 | Added MVP readiness governance: `docs/MVP_READINESS.md` plus a frontend `MVP 初版` page that lists required MVP capabilities, frontend visibility, current status, priority, gaps, and deferred backend/API items. | `node --check app/src/app.js`; `node --check app/src/scoring.js`; `node --check app/src/import-utils.js`; `npm.cmd test`; local HTTP 200 check for `http://127.0.0.1:4173/`. | In-app browser automation timed out during one validation attempt, but service and code checks passed. |
| 2026-07-12 | Added Yiwugo automatic supplier discovery MVP. The local dev server now proxies Yiwugo public product list data and the supplier management page can find low-price candidates, display price/MOQ/sales/shop signals, and add confirmed items to the supplier pool. | `node --check scripts/serve.js`; `node --check app/src/app.js`; `npm.cmd test`; local API check for `/api/yiwugo/discover`; in-app browser check for supplier discovery panel, candidate cards, add-to-supplier-pool, console errors, mojibake, and overflow. | This requires the local dev server to have network access. It does not collect contact phone numbers, login-only data, or auto-purchase anything. |
| 2026-07-12 | Added supplier discovery storage and configurable refresh rules. Supplier management now shows multiple source modes, including Yiwugo automatic discovery, 1688 manual-link registration, and manual upload; candidates and confirmed supplier rows preserve source timestamps, next refresh suggestions, overwrite policy, and source snapshots. | `node --check app/src/app.js`; `node --check scripts/serve.js`; `npm.cmd test`; in-app browser check for multi-source rules, 1688 design visibility, refresh cadence, overwrite policy, candidate timestamps, console errors, mojibake, and overflow. | MVP still does not run background jobs. Refresh is manual and should generate reviewable changes before overwriting supplier data. |
| 2026-07-12 | Added opportunity evidence and enrichment detail. Opportunity review now separates target-country pricing basis, advertising assumption, weight/dimension gaps, logistics basis, supplier backup status, and three profit scenarios so operators can see what is known versus what still needs evidence. | `node --check app/src/app.js`; `node --check scripts/serve.js`; `npm.cmd test`; in-app browser check for opportunity evidence panel, console errors, and horizontal overflow. | Current values are still local MVP calculations unless competitor pricing, ad data, weight, and logistics quotes are supplied through imports or future adapters. |
| 2026-07-12 | Probed direct competitor-price access for Shopee, Lazada, TikTok Shop, and Ozon. | Temporary read-only Node probe with external network access. Shopee search API returned 403/error 90309999; Lazada returned a search shell without product prices and challenge markers; TikTok Shop reset the connection; Ozon composer API exceeded redirects. Browser-rendered follow-up timed out before usable extraction. | Do not build the first MVP on blind direct scraping for these platforms. Use manual competitor-price import/export first; add official APIs, browser-assisted extraction, or third-party marketplace data providers only after legality, stability, and account access are confirmed. |
| 2026-07-12 | Added local competitor price collection workbench. Operators can paste visible marketplace result text or CSV-like rows, preview extracted prices, calculate low/mid/high CNY bands, and confirm the band into the linked market product so opportunity details use real competitor evidence instead of only sale-price estimates. | `node --check app/src/app.js`; `node --check scripts/serve.js`; `npm.cmd test`; in-app browser check for competitor nav, paste/parse preview, sample count, price-band preview, no-cookie notice, console errors, and horizontal overflow. | This is intentionally not cookie storage or background scraping. Logged-in browser extraction remains a future browser-assisted adapter with explicit user control and compliance review. |
| 2026-07-13 | Defined the data source adapter contract and surfaced it in the frontend. Manual CSV/Excel upload, visible-page competitor capture, Yiwugo public discovery, future browser-assisted extraction, API sync, and scheduled jobs now share one normalized envelope and credential rule. | `node --check app/src/app.js`; `node --check scripts/serve.js`; `npm.cmd test`. | This completes T-017 at the MVP contract level. Future adapters should emit this envelope before validation, preview, confirmation, and audit. |
