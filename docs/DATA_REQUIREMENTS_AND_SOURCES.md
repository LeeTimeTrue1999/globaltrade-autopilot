# 数据需求与数据源方案

## 1. 数据分层

系统需要的数据分三层：

| 层级 | 作用 | 是否必须 |
| --- | --- | --- |
| L1 交易闭环数据 | 支撑选品、利润、上架、订单、履约 | 必须 |
| L2 决策增强数据 | 提升需求判断、风险判断和策略建议 | 强烈建议 |
| L3 自动化和预测数据 | 支持自动调价、备货、广告和趋势预测 | 后续增强 |

MVP 不追求一次接完所有数据源。先把 L1 做稳定，再逐步接 L2 和 L3。

## 2. L1 必须数据

### 2.1 海外市场商品数据

用途：

- 判断是否有人买。
- 判断海外售价。
- 判断竞争强度。
- 生成机会池。

字段：

```text
platform
country
category
title
price
currency
rating
review_count
sales_signal
rank
rank_trend
product_url
images
collected_at
source_type
```

推荐数据源：

| 数据源 | 接入方式 | 优先级 | 说明 |
| --- | --- | --- | --- |
| Shopee Open Platform | 官方 API / 店铺后台导出 | 高 | 优先用于商品、订单、刊登和店铺数据 |
| TikTok Shop Open Platform | 官方 API / 店铺后台导出 | 高 | 适合内容电商和订单/商品同步 |
| Lazada Open Platform | 官方 API / 后台导出 | 中 | 第二阶段接入 |
| Ozon Seller API | 官方 API / 后台导出 | 高 | 俄罗斯方向重点 |
| Wildberries Seller API | 官方 API / 后台导出 | 中 | 俄罗斯第二阶段 |
| 手动 CSV/Excel | 人工导入 | 高 | MVP 最稳妥，不受 API 权限限制 |

MVP 建议：

- 先做 CSV/Excel 导入。
- 字段和官方 API 返回结构保持兼容。
- 后续 API 接入时只替换数据采集层，不改业务模型。

### 2.2 国内供应商和货源数据

用途：

- 匹配国内采购成本。
- 判断是否有价差。
- 判断供货稳定性。
- 生成采购和备选供应商策略。

字段：

```text
source_platform
supplier_name
supplier_id
product_title
purchase_price_cny
moq
dispatch_days
supplier_rating
monthly_sales
supports_dropship
stock_status
product_url
images
last_checked_at
```

推荐数据源：

| 数据源 | 接入方式 | 优先级 | 说明 |
| --- | --- | --- | --- |
| 1688 | 手动导入 / 开放平台授权 / 供应商报价单 | 高 | MVP 首选 |
| 阿里巴巴国际站 | 手动导入 / API | 中 | 更适合外贸现货和工厂 |
| 自有供应商库 | Excel / 后台录入 | 高 | 最可靠，应优先建设 |
| 拼多多/淘宝 | 人工调研 / 谨慎使用 | 低 | 价格参考可以，供应稳定性较弱 |

MVP 建议：

- 先支持供应商 Excel 导入。
- 每个机会至少维护 1 个主供应商和 1 个备选供应商。
- 供应商价格必须保存历史快照。

### 2.3 汇率数据

用途：

- 折算海外售价。
- 计算毛利。
- 做汇率风险缓冲。
- 生成利润快照。

字段：

```text
base_currency
quote_currency
rate
source
fetched_at
effective_at
is_manual_override
risk_buffer_rate
```

推荐数据源：

| 数据源 | 接入方式 | 优先级 | 说明 |
| --- | --- | --- | --- |
| Frankfurter | 免费 API | 高 | 适合 MVP，基于参考汇率 |
| ECB | 官方网页 / CSV / XML | 高 | 官方参考价，适合作为备份和校验 |
| ExchangeRate-API | API Key | 中 | 免费/付费 API，支持常用币种 |
| Open Exchange Rates | API Key | 中 | 成熟商业 API，正式版可考虑 |
| Wise | API / 结算参考 | 中 | 如果实际使用 Wise 收付款，可作为结算参考 |

注意：

- ECB 不发布代表性 EUR/RUB 参考价，俄罗斯卢布需要额外数据源。
- 参考汇率不能完全等同实际结算汇率。
- 每次利润计算必须保存汇率快照，不能只保存最新汇率。

MVP 建议：

```text
主数据源：Frankfurter 或 ExchangeRate-API
备份数据源：ECB
俄罗斯 RUB：使用实际结算渠道或商业汇率 API
更新频率：每天 1-2 次
下单前：可手动刷新或使用最近一次快照
```

### 2.4 成本模板数据

用途：

- 计算真实毛利。
- 统一平台、物流、广告、退货口径。

字段：

```text
platform
country
category
platform_fee_rate
payment_fee_rate
ad_cost_rate
return_loss_rate
tax_rate
packaging_cost_cny
fx_risk_buffer_rate
effective_from
effective_to
```

推荐数据源：

| 数据源 | 接入方式 | 优先级 | 说明 |
| --- | --- | --- | --- |
| 平台费率规则 | 平台后台 / 官方文档 / 人工配置 | 高 | 必须人工确认 |
| 历史订单数据 | 系统计算 | 中 | 用于校准退货率和广告成本 |
| 财务实付记录 | 财务导入 | 中 | 用于校准实际手续费 |

MVP 建议：

- 先配置平台级费率。
- 第二阶段升级到 `平台 + 国家 + 类目` 费率。
- 所有费率调整必须写审计日志。

### 2.5 物流费用和轨迹数据

用途：

- 计算履约成本。
- 判断时效。
- 识别异常订单。

字段：

```text
provider
route
origin_country
destination_country
weight_kg
volume_weight_kg
price_cny
estimated_days_min
estimated_days_max
tracking_no
tracking_status
last_checkpoint
last_checked_at
```

推荐数据源：

| 数据源 | 接入方式 | 优先级 | 说明 |
| --- | --- | --- | --- |
| 物流商报价表 | Excel / 后台配置 | 高 | MVP 首选 |
| 物流商 API | API | 中 | 第二阶段接入 |
| AfterShip Tracking API | API / Webhook | 中 | 适合统一物流跟踪 |
| 平台物流数据 | 平台 API / 后台导出 | 高 | 对接平台后优先使用 |

MVP 建议：

- 先用物流报价模板。
- 按国家、重量段、体积重、渠道维护。
- 订单履约后保存真实物流成本和时效。

### 2.6 上架和订单数据

用途：

- 形成真实交易闭环。
- 计算真实收入、成本和利润。
- 生成日/周复盘。

字段：

```text
listing_id
platform_listing_id
sku
platform
country
price
currency
inventory
listing_status
review_status

order_id
platform_order_id
buyer_country
sku
quantity
sale_price
currency
payment_status
fulfillment_status
refund_status
created_at
```

推荐数据源：

| 数据源 | 接入方式 | 优先级 | 说明 |
| --- | --- | --- | --- |
| 平台官方 API | API | 高 | 正式版必须 |
| 平台后台导出 | CSV/Excel | 高 | MVP 首选 |
| 手工录入 | 后台表单 | 中 | 少量订单可用 |

MVP 建议：

- 先支持订单 CSV 导入。
- 后续接平台 API。
- 所有订单收入、汇率、成本必须保存快照。

## 3. L2 决策增强数据

### 3.1 搜索趋势和关键词数据

用途：

- 判断需求增长。
- 找当地语言关键词。
- 找类目机会。

推荐数据源：

| 数据源 | 接入方式 | 优先级 | 说明 |
| --- | --- | --- | --- |
| Google Trends | 人工导出 / 趋势监控 | 高 | 适合需求趋势判断 |
| Google Ads Keyword Planner | 账号/API | 中 | 可看关键词规划和广告需求 |
| TikTok 热门内容 | 官方后台 / 人工观察 | 中 | 适合内容电商选品 |
| 平台站内搜索词 | 卖家后台 / 广告后台 | 高 | 有账号后价值很高 |

注意：

- Google Trends 是相对热度，不是绝对销量。
- 低搜索量关键词可能显示为 0。
- 趋势数据只能作为一个信号，不能单独决定选品。

### 3.2 商品合规和风险数据

用途：

- 阻止高风险商品自动发布。
- 避免知识产权和平台违规。

字段：

```text
country
platform
category
restricted_keywords
restricted_attributes
certification_required
ip_risk_level
manual_review_required
source
effective_at
```

推荐数据源：

| 数据源 | 接入方式 | 优先级 | 说明 |
| --- | --- | --- | --- |
| 平台禁售规则 | 官方规则 / 人工维护 | 高 | 必须 |
| 目的国海关/监管规则 | 官方网站 / 人工维护 | 高 | 食品、美妆、电子、电池等必须 |
| 商标/IP 数据库 | 人工查询 / 第三方服务 | 中 | 品牌词和图片风险 |
| 内部违规记录 | 系统沉淀 | 高 | 最贴近业务 |

MVP 建议：

- 先维护高风险类目和敏感词表。
- 高风险类目默认不允许自动发布。
- 俄罗斯方向单独增加风险基础分。

### 3.3 广告和流量数据

用途：

- 计算获客成本。
- 判断是否加投或停投。

字段：

```text
platform
country
listing_id
impressions
clicks
ctr
ad_spend
orders
conversion_rate
acos
date
```

推荐数据源：

| 数据源 | 接入方式 | 优先级 | 说明 |
| --- | --- | --- | --- |
| 平台广告后台 | 导出 / API | 中 | 上架后接入 |
| Google Ads | 后续可选 | 低 | 独立站或站外投放才需要 |
| TikTok Ads | 后续可选 | 中 | 内容电商阶段有价值 |

MVP 建议：

- 先用固定广告成本率估算。
- 有真实投放后再接广告数据。

## 4. L3 自动化和预测数据

后续完整版本再做：

- 价格历史。
- 竞争对手价格变化。
- 库存预测。
- 海外仓库存。
- 广告回报预测。
- 季节性和节日数据。
- 退货原因分类。
- 客服和差评文本。

这些数据会支持：

- 自动调价。
- 自动补货。
- 下架预测。
- 商品生命周期管理。
- 国家扩展建议。

## 5. 推荐接入顺序

### M0 当前原型

数据：

- 本地样例数据。
- 手动配置汇率。
- 手动成本模板。

### M1 可用 MVP

数据：

- 商品机会 CSV 导入。
- 供应商 Excel 导入。
- 订单 CSV 导入。
- 汇率 API 每日同步。
- 物流报价模板。
- 平台佣金模板。

目标：

- 能真实录入。
- 能算利润。
- 能生成上架草稿。
- 能生成日报/周报。

### M2 小团队共享

数据：

- PostgreSQL 存储所有业务数据。
- 汇率历史表。
- 成本模板历史。
- 审计日志。
- 用户权限。

目标：

- 多人协作。
- 所有关键操作可追溯。

### M3 平台 API 接入

数据：

- Shopee API。
- TikTok Shop API。
- Ozon API。
- 平台订单同步。
- 平台上架状态同步。
- 平台物流状态同步。

目标：

- 减少手工导入。
- 建立真实交易闭环。

### M4 策略自动化

数据：

- 广告数据。
- 价格历史。
- 供应商价格历史。
- 退款和售后原因。
- 物流时效历史。

目标：

- 自动调价建议。
- 自动补货建议。
- 商品分层。
- 放大/下架策略。

## 6. 建议建表

第一批表：

```text
data_sources
market_products
supplier_products
fx_rates
cost_templates
logistics_rate_cards
opportunities
listing_drafts
orders
profit_snapshots
strategy_actions
audit_logs
```

第二批表：

```text
platform_accounts
platform_tokens
sync_jobs
sync_job_logs
tracking_events
supplier_price_history
platform_fee_history
risk_rules
restricted_keywords
ad_metrics_daily
```

## 7. 数据质量规则

每条关键数据必须记录：

```text
source
source_type
source_url_or_file
fetched_at
created_by
confidence_level
```

数据质量等级：

| 等级 | 含义 | 示例 |
| --- | --- | --- |
| A | 官方 API 或平台后台导出 | 平台订单、平台刊登 |
| B | 官方网页或正式报价单 | 物流报价、平台费率 |
| C | 人工录入但有来源 | 供应商报价、竞品观察 |
| D | 估算值 | 广告成本率、退货损耗率 |

业务规则：

- D 级数据不能自动触发高风险动作。
- 订单利润必须保存快照。
- 汇率不能覆盖历史。
- 供应商价格变化要保留历史。
- 手动覆盖必须写审计日志。

## 8. 默认数据源决策

当前建议默认：

```text
市场商品：CSV/Excel 导入，后续接 Shopee/TikTok Shop/Ozon API
国内货源：1688 + 自有供应商库，先 Excel 导入
汇率：Frankfurter/ExchangeRate-API + ECB 校验
RUB：实际结算渠道或商业 API，ECB 不能作为 RUB 来源
物流：报价表模板，后续接物流商 API 或 AfterShip
趋势：Google Trends + 平台后台搜索词
合规：内部风险规则表 + 平台规则人工维护
```

