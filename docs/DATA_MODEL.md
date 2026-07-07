# 数据模型

## MarketProduct

海外市场商品。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 内部 ID |
| platform | string | 平台 |
| country | string | 国家 |
| category | string | 类目 |
| title | string | 原始标题 |
| price | number | 售价 |
| currency | string | 币种 |
| rating | number | 评分 |
| reviewCount | number | 评论数 |
| salesSignal | number | 销量线索，非真实销量时必须标注来源 |
| rankTrend | number | 排名趋势，正数代表改善 |
| competitionLevel | number | 0-100，越高竞争越激烈 |
| productUrl | string | 商品链接 |
| images | string[] | 图片 |
| collectedAt | datetime | 采集时间 |

## SupplierProduct

国内供应商商品。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 内部 ID |
| sourcePlatform | string | 1688、自有供应商等 |
| supplierName | string | 供应商名称 |
| title | string | 商品标题 |
| purchasePriceCny | number | 采购价 |
| moq | number | 起订量 |
| dispatchDays | number | 国内发货天数 |
| supplierRating | number | 供应商评分 |
| monthlySales | number | 月销量或成交线索 |
| supportsDropship | boolean | 是否支持一件代发 |
| productUrl | string | 商品链接 |

## Opportunity

商品机会。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 内部 ID |
| marketProductId | string | 海外商品 |
| supplierProductId | string | 国内供应商商品 |
| landedCostCny | number | 综合成本 |
| expectedSalePriceCny | number | 折算人民币售价 |
| estimatedGrossProfitCny | number | 预估毛利 |
| estimatedGrossMargin | number | 预估毛利率 |
| demandScore | number | 需求分 |
| marginScore | number | 毛利分 |
| competitionScore | number | 竞争分 |
| fulfillmentScore | number | 履约分 |
| riskScore | number | 风险分 |
| finalScore | number | 总分 |
| recommendedAction | string | 推荐动作 |
| reviewStatus | string | draft/pending/approved/rejected |

## ListingDraft

上架草稿。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 内部 ID |
| opportunityId | string | 机会 ID |
| platform | string | 平台 |
| country | string | 国家 |
| localizedTitle | string | 本地化标题 |
| localizedDescription | string | 本地化描述 |
| attributes | object | 商品属性 |
| price | number | 上架价格 |
| currency | string | 币种 |
| inventory | number | 库存 |
| status | string | draft/pending/approved/published/rejected |

## StrategyAction

策略动作。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 动作 ID |
| type | string | test/raise_price/lower_price/delist/restock/switch_supplier/review |
| targetType | string | opportunity/listing/order |
| targetId | string | 目标 ID |
| reason | string | 触发原因 |
| expectedImpact | string | 预估影响 |
| approvalStatus | string | pending/approved/rejected/executed |
| createdAt | datetime | 创建时间 |
| executedAt | datetime | 执行时间 |

