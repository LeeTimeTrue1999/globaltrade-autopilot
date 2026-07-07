# 工程架构

## 1. 总体架构

```text
Frontend Web App
  |
Backend API
  |
Domain Services
  |-- Opportunity Service
  |-- Supplier Service
  |-- Listing Service
  |-- Order Service
  |-- Strategy Service
  |-- Risk Service
  |
PostgreSQL / Redis / Object Storage
  |
External Integrations
  |-- Shopee
  |-- TikTok Shop
  |-- Ozon
  |-- 1688 / Supplier Imports
  |-- Logistics Providers
  |-- FX Rate Provider
```

## 2. MVP 原型架构

当前 `app/` 使用静态文件：

```text
app/
  index.html
  styles.css
  src/
    app.js
    scoring.js
    sample-data.js
```

特点：

- 不依赖外部包。
- 不访问互联网。
- 评分逻辑独立在 `scoring.js`。
- 示例数据独立在 `sample-data.js`。
- 后续可将 `scoring.js` 迁移到后端服务或共享包。

## 3. 后端服务边界

### Opportunity Service

负责：

- 商品机会管理。
- 市场商品数据聚合。
- 机会评分。
- 推荐动作。

不负责：

- 实际上架。
- 订单履约。

### Supplier Service

负责：

- 供应商商品管理。
- 供应商评分。
- 货源匹配。
- 采购价历史。

### Listing Service

负责：

- 商品上架草稿。
- 多平台刊登映射。
- 多语言标题和描述。
- 发布审核状态。

### Order Service

负责：

- 订单聚合。
- SKU 映射。
- 履约状态。
- 售后和退款记录。

### Strategy Service

负责：

- 日报和周报。
- 调价、下架、补货、加投建议。
- 策略执行结果追踪。

### Risk Service

负责：

- 类目合规。
- 关键词合规。
- IP 风险。
- 俄罗斯专项风控。
- 高风险动作拦截。

## 4. 数据流

### 机会发现流

```text
MarketProduct Import
  -> Normalize
  -> Match SupplierProduct
  -> Cost Calculation
  -> Opportunity Score
  -> Recommendation
  -> Human Review
```

### 上架流

```text
Opportunity Approved
  -> Generate Listing Draft
  -> Localize Content
  -> Risk Check
  -> Human Approval
  -> Publish or Export Template
```

### 订单流

```text
Platform Order
  -> Normalize Order
  -> Map SKU
  -> Create Purchase Task
  -> Logistics Tracking
  -> Profit Calculation
  -> Daily Report
```

## 5. 配置化设计

以下内容必须通过配置维护：

- 国家。
- 平台。
- 币种。
- 汇率。
- 平台佣金。
- 支付手续费。
- 物流模板。
- 评分权重。
- 风险规则。
- 审批阈值。

不允许硬编码到业务函数中。

## 6. 代码规范

### 命名

- 领域对象用业务名：`Opportunity`、`SupplierProduct`、`ListingDraft`。
- 函数名表达动作：`calculateOpportunityScore`、`matchSupplier`。
- 避免缩写，除非是通用词如 `SKU`、`GMV`。

### 模块

- UI 不直接写评分公式。
- API 层不直接写数据库 SQL 细节。
- 风险规则独立维护。
- 外部平台集成隔离在 adapters。

### 测试

- 评分公式必须有单元测试。
- 成本计算必须有边界测试。
- 风险规则必须有回归测试。
- API 同步必须有失败重试测试。

## 7. 推荐生产目录

```text
globaltrade-autopilot/
  apps/
    web/
    api/
  packages/
    domain/
    scoring/
    integrations/
    config/
  docs/
  infra/
  scripts/
```

