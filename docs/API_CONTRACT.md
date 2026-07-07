# API 契约草案

后续后端实现时按 REST 资源建模。MVP 原型暂不启动服务。

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

