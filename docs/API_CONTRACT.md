# API 契约草案

后续后端实现时按 REST 资源建模。MVP 原型暂不启动服务。

后端持久化、对象存储、权限和审计设计见 `docs/BACKEND_PERSISTENCE_DESIGN.md`。

Data source adapters must emit the normalized intake envelope defined in `docs/DATA_SOURCE_ADAPTER_CONTRACT.md` before validation, preview, confirmation, and audit.

Shopee, Lazada, and TikTok Shop integration phases and field mapping rules are organized in `docs/MARKETPLACE_PLATFORM_ADAPTERS.md`.

## Auth

```http
POST /api/auth/login
GET /api/auth/me
POST /api/auth/logout
```

## Opportunities

```http
GET /api/opportunities
POST /api/opportunities
GET /api/opportunities/{id}
PATCH /api/opportunities/{id}
POST /api/opportunities/{id}/score
POST /api/opportunities/{id}/submit-review
POST /api/opportunities/{id}/approve
POST /api/opportunities/{id}/reject
```

## Market Products

```http
GET /api/market-products
POST /api/market-products
POST /api/market-products/import
GET /api/market-products/{id}
PATCH /api/market-products/{id}
```

## Supplier Products

```http
GET /api/supplier-products
POST /api/supplier-products
POST /api/supplier-products/import
GET /api/supplier-products/{id}
PATCH /api/supplier-products/{id}
```

## Import Batches

```http
POST /api/import-batches
GET /api/import-batches
GET /api/import-batches/{id}
POST /api/import-batches/{id}/parse
POST /api/import-batches/{id}/validate
POST /api/import-batches/{id}/confirm
POST /api/import-batches/{id}/rollback
GET /api/import-batches/{id}/rows
GET /api/import-batches/{id}/original-file-url
```

## Field Mappings

```http
GET /api/field-mappings
POST /api/field-mappings
GET /api/field-mappings/{id}
PATCH /api/field-mappings/{id}
POST /api/field-mappings/{id}/archive
```

## Supplier Matches

```http
GET /api/supplier-matches
POST /api/supplier-matches
PATCH /api/supplier-matches/{id}
POST /api/supplier-matches/{id}/approve
POST /api/supplier-matches/{id}/reject
GET /api/market-products/{id}/supplier-matches
```

## Logistics Rate Cards

```http
GET /api/logistics-rate-cards
POST /api/logistics-rate-cards
GET /api/logistics-rate-cards/{id}
PATCH /api/logistics-rate-cards/{id}
POST /api/logistics-rate-cards/{id}/archive
POST /api/logistics-rate-cards/quote
```

## Listing Drafts

```http
GET /api/listing-drafts
POST /api/listing-drafts
GET /api/listing-drafts/{id}
PATCH /api/listing-drafts/{id}
POST /api/listing-drafts/{id}/submit-review
POST /api/listing-drafts/{id}/approve
POST /api/listing-drafts/{id}/publish
```

发布接口必须校验：

- 审核状态为 approved。
- 风险分未超过阈值。
- 用户有发布权限。
- 平台授权有效。

## Orders

```http
GET /api/orders
POST /api/orders/import
GET /api/orders/{id}
PATCH /api/orders/{id}/fulfillment-status
```

## Platform Sources And Adapters

```http
GET /api/platform-sources
POST /api/platform-sources
GET /api/platform-sources/{id}
PATCH /api/platform-sources/{id}
POST /api/platform-sources/{id}/test-connection
POST /api/platform-sources/{id}/sync
GET /api/platform-sources/{id}/sync-batches
POST /api/platform-adapters/browser-captures
POST /api/platform-adapters/visible-page-captures
```

平台适配器规则：

- 所有同步、导出解析、浏览器辅助采集都必须先生成 data source adapter envelope。
- API token 只能存后端 secret store，不能进前端 localStorage。
- 竞品页和搜索页优先走可见页采集或浏览器辅助采集，不把公开页面当成稳定服务端 API。
- 发布、调价、发货回传、广告预算修改必须走审批和审计。

## Strategy

```http
GET /api/strategy/daily-report
GET /api/strategy/weekly-report
GET /api/strategy/actions
POST /api/strategy/actions/{id}/approve
POST /api/strategy/actions/{id}/execute
```

## Config

```http
GET /api/config/markets
PATCH /api/config/markets
GET /api/config/scoring
PATCH /api/config/scoring
GET /api/config/cost-templates
PATCH /api/config/cost-templates
```

## Audit

```http
GET /api/audit-logs
GET /api/audit-logs/{id}
```

## Users And Roles

```http
GET /api/users
POST /api/users
PATCH /api/users/{id}
POST /api/users/{id}/disable
GET /api/roles
POST /api/users/{id}/roles
DELETE /api/users/{id}/roles/{role_id}
```

所有关键动作必须写入审计日志：

- 登录。
- 创建/修改机会。
- 修改成本配置。
- 审批。
- 发布。
- 采购。
- 调价。
- 删除。
