# B2B Lead Generation Plan

This document records the product pivot from cross-border marketplace operations toward B2B merchant lead discovery and sales follow-up.

## Product Goal

Given a product or category, identify countries where demand is likely to exist, then find relevant stores, distributors, wholesalers, or local service businesses in those countries and prepare contactable leads for sales follow-up.

Example:

1. Input: `钓鱼竿`.
2. Demand exploration suggests Thailand, Philippines, Indonesia, Malaysia, and the United States.
3. The system generates search tasks for fishing tackle shops, outdoor stores, marine supply stores, and sporting goods retailers.
4. Operators collect public store information from maps, review platforms, directories, or visible search results.
5. Leads enter a CRM-style follow-up flow.

## Core Workflow

```mermaid
flowchart LR
  A["输入商品/类目"] --> B["需求探查"]
  B --> C["推荐国家和城市"]
  C --> D["生成地图/点评/目录搜索任务"]
  D --> E["采集公开店铺信息"]
  E --> F["线索池去重和评分"]
  F --> G["销售跟进"]
  G --> H["报价/样品/成交复盘"]
```

## Demand Exploration

The demand exploration module should combine multiple signals. In the local MVP, these are modeled as configurable assumptions; future versions can attach real evidence.

| Signal | Meaning | MVP source | Future source |
| --- | --- | --- | --- |
| Search interest | Whether buyers search for this product/category | Local rules and operator notes | Google Trends, search engine result counts, SEO tools |
| Retail density | Whether local stores exist for this category | Generated map/search tasks | Maps/POI APIs, visible page capture, industry directories |
| Use-case fit | Whether the product fits climate, hobby, lifestyle, or business scenarios | Local category rules | Country/category research, social content, marketplace category data |
| Import fit | Whether the country is plausible for imported wholesale goods | Operator assumption | Customs/import data, trade databases, freight data |
| Contactability | Whether stores expose phone, website, email, WhatsApp, Line, or social pages | Manual or visible-page review | Browser-assisted extraction and verification |

## Lead Sources

| Source | Role | Preferred mode | Guardrail |
| --- | --- | --- | --- |
| Google Maps | Overseas store discovery | Official API later; visible-page/manual now | Do not bypass CAPTCHA or hidden data. |
| 高德地图 / 百度地图 / 腾讯地图 | China local merchant discovery | Low-frequency visible-page/manual now; API later if needed | Keep source URL and collection time. |
| 大众点评 / 美团 | Local-life business context | Visible-page/manual review | Avoid background scraping and login-only data. |
| Industry directories | B2B wholesalers and distributors | CSV/manual upload or visible-page capture | Preserve directory source and freshness. |
| Search engines | Website and contact page discovery | Manual/browser-assisted visible results | Keep the search query and result URL. |
| Social pages | Active business verification | Manual/browser-assisted visible data | Do not collect private personal accounts. |

## Lead Entity

```json
{
  "id": "lead-001",
  "productIntent": "钓鱼竿",
  "country": "泰国",
  "city": "曼谷",
  "businessName": "Example Fishing Tackle",
  "businessType": "钓具店",
  "address": "Bangkok, Thailand",
  "phone": "+66...",
  "website": "https://example.com",
  "socialUrl": "https://facebook.com/example",
  "mapUrl": "https://maps.google.com/...",
  "rating": 4.5,
  "reviewCount": 128,
  "sourcePlatform": "Google Maps",
  "sourceMode": "visible_page_capture",
  "sourceKeyword": "fishing tackle shop Bangkok",
  "collectedAt": "2026-07-15T09:00:00.000Z",
  "confidenceLevel": "B",
  "matchReason": "Name/category matches fishing tackle and outdoor retail.",
  "leadScore": 82,
  "status": "待联系"
}
```

## Lead Scoring

| Factor | Weight | Description |
| --- | --- | --- |
| Category match | 30 | Store category/name clearly matches the product. |
| Public contact available | 20 | Phone, email, website, WhatsApp, Line, or social page exists. |
| Business credibility | 15 | Rating, reviews, complete address, open status. |
| Wholesale/distributor fit | 15 | Name or website suggests wholesale, distributor, retailer, or professional buyer. |
| Country demand score | 10 | Comes from a high-priority demand country. |
| Freshness | 10 | Recently collected and source still accessible. |

## Collection Rules

- Low-frequency collection is acceptable for MVP validation, but every task must be reviewable and stoppable.
- Do not bypass login, CAPTCHA, paywalls, anti-bot interstitials, or hidden contact details.
- Only collect public business contact information, not private personal contacts.
- Preserve source platform, keyword, URL, timestamp, and source mode.
- Human confirmation is required before adding leads to outreach campaigns.
- Outreach must support status tracking and opt-out/suppression once real campaigns begin.

## MVP Modules

| Module | Current target |
| --- | --- |
| 需求探查 | Input product/category, recommend countries, generate search tasks. |
| 定点采集任务 | Store map/review/search tasks by product, country, city, platform, keyword, and suggested limit. |
| 店铺线索池 | Future: parse/store business leads, dedupe, score, and manage source evidence. |
| 销售跟进 | Future: status, owner, contact log, template messages, quote/sample follow-up. |
| 数据源治理 | Reuse the existing adapter envelope for maps, visible pages, directories, manual uploads, and future APIs. |

## Near-Term TODO

1. Add local demand exploration page. Done in local MVP.
2. Add low-frequency map/review/search task generator. Done in local MVP.
3. Add visible-page lead paste/import parser. Done in local MVP.
4. Add lead pool with dedupe and scoring. Done in local MVP.
5. Add CRM follow-up statuses and contact notes.
6. Add message templates by language and product category.
