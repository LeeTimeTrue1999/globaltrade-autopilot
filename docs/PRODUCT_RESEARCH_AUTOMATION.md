# 选品调研自动化方案

## 1. 选品团队通常怎么操作

成熟一点的跨境选品一般不是只看“平台热销榜”，而是做五层验证：

1. 需求验证：目标国家是否有人搜索、浏览、下单、评论。
2. 竞品验证：海外平台是否有同类商品在卖，价格、评分、评论和竞争强度如何。
3. 供货验证：国内是否有稳定供应商，价格、MOQ、发货时效和质量是否可控。
4. 利润验证：扣除采购、物流、平台费、支付费、广告、退货、汇率缓冲后是否还有毛利。
5. 风险验证：是否涉及禁售、认证、品牌/IP、敏感物流、俄罗斯专项限制。

人工流程通常是：

```text
确定目标国家/平台/类目
  -> 找热词和热品
  -> 看竞品价格、评论、销量线索
  -> 到 1688/供应商库找同款
  -> 算毛利
  -> 看合规和物流风险
  -> 输出选品表
  -> 小单测试
  -> 根据 7/14/30 天数据复盘
```

系统要自动化的不是“直接替人决定卖什么”，而是把每个候选商品自动打分、解释和排序，让运营只审核高价值候选。

## 2. 自动化选品的总体流程

```text
数据采集
  -> 标准化
  -> 商品聚类
  -> 国内货源匹配
  -> 成本和利润测算
  -> 风险识别
  -> 机会评分
  -> 报告生成
  -> 人工审核
  -> 小单测试
  -> 复盘调参
```

MVP 阶段优先做：

- CSV/Excel 导入海外竞品。
- CSV/Excel 导入国内供应商。
- 汇率每日同步或手动导入。
- 物流报价模板。
- 自动评分。
- 自动生成选品报告。

第二阶段再做：

- 平台 API 同步。
- 关键词趋势监控。
- 图片找同款。
- 评论情感分析。
- 自动本地化上架草稿。

## 3. 需要自动化研究的信号

### 3.1 需求信号

判断“是否有人买”。

字段：

```text
country
platform
keyword
category
search_interest
sales_signal
review_count
review_growth
rating
rank
rank_trend
content_views
content_engagement
```

可用数据源：

- Google Trends：判断搜索趋势和地区热度。
- Google Keyword Planner：查关键词建议、月搜索估算和广告成本。
- 平台后台：搜索词、曝光、点击、转化。
- 平台商品列表：价格、评论、评分、排名。
- TikTok 内容数据：视频互动、直播热度、带货商品。

自动化方法：

- 每天拉取目标关键词趋势。
- 对目标国家分别计算 7/30/90 天趋势。
- 识别 rising keywords。
- 把关键词映射到类目和商品簇。
- 对高热度关键词生成商品候选。

### 3.2 竞品信号

判断“是否有机会进入”。

字段：

```text
competitor_count
price_min
price_median
price_max
rating_avg
review_median
low_rating_high_sales_count
listing_quality_score
promotion_intensity
```

自动化方法：

- 同关键词抓取/导入 Top N 竞品。
- 计算价格带。
- 找低评分但高销量的改良机会。
- 找高售价但国内低成本的价差机会。
- 找评论集中抱怨点，用于改良卖点。

### 3.3 供货信号

判断“是否能供货”。

字段：

```text
supplier_count
purchase_price_min
purchase_price_median
moq
dispatch_days
supplier_rating
monthly_sales
supports_dropship
backup_supplier_count
```

可用数据源：

- 1688。
- 自有供应商库。
- 工厂报价单。
- 阿里巴巴国际站。

自动化方法：

- 标题翻译成中文后检索。
- 图片相似度匹配同款。
- 聚合同款供应商。
- 自动计算主供应商和备选供应商。
- 保存采购价历史。

### 3.4 利润信号

判断“是否有差价”。

字段：

```text
sale_price
currency
fx_rate
purchase_price_cny
logistics_cost_cny
platform_fee
payment_fee
ad_cost
return_loss
tax_cost
fx_buffer
gross_profit
gross_margin
```

自动化方法：

- 每个商品生成利润快照。
- 汇率不覆盖历史。
- 物流按国家、重量、体积重、渠道计算。
- 平台费按平台、国家、类目配置。
- 输出安全毛利率和最低售价。

### 3.5 风险信号

判断“能不能安全做”。

字段：

```text
risk_category
restricted_keywords
ip_risk
certification_required
logistics_sensitive
country_special_risk
platform_policy_risk
manual_review_required
```

自动化方法：

- 高风险类目直接进入人工复核。
- 品牌词、功效词、医疗词、电池词敏感识别。
- 俄罗斯方向单独增加基础风险。
- 物流敏感货单独标记。

## 4. 机会评分模型

推荐先用可解释规则模型，不要一开始上黑盒 AI。

```text
OpportunityScore =
  DemandScore * 0.30 +
  MarginScore * 0.30 +
  CompetitionScore * 0.15 +
  SupplyScore * 0.10 +
  FulfillmentScore * 0.10 -
  RiskScore * 0.20
```

评分解释：

| 分数 | 含义 |
| --- | --- |
| 80+ | 优先小单测试 |
| 65-79 | 可观察，补数据 |
| 50-64 | 只进入备选池 |
| < 50 | 暂不建议 |
| 风险分 60+ | 不自动发布，人工复核 |

必须输出解释：

- 为什么推荐。
- 利润来自哪里。
- 风险是什么。
- 缺哪些数据。
- 建议下一步动作。

## 5. 自动报告怎么产出

### 5.1 日报

每天自动生成：

```text
今日新增机会数
高分机会 Top 20
需要合规复核商品
需要补供应商商品
毛利率不足商品
趋势上升关键词
价格异常商品
建议小单测试清单
```

### 5.2 单品研究报告

每个候选商品生成：

```text
商品名称
目标国家/平台
需求证据
竞品摘要
国内供应商摘要
利润测算
物流可行性
风险检查
评分明细
推荐动作
缺失数据
人工审核项
```

### 5.3 周报

每周自动生成：

```text
本周机会池变化
国家/平台/类目表现
小单测试结果
放大商品
观察商品
下架商品
换供应商商品
策略调整建议
下周研究方向
```

## 6. 报告模板

### 单品报告模板

```text
# 单品机会报告

商品：{local_title}
平台：{platform}
国家：{country}
类目：{category}

## 结论
推荐动作：{recommended_action}
机会分：{opportunity_score}
风险分：{risk_score}

## 需求证据
- 搜索趋势：{trend_summary}
- 竞品销量线索：{sales_signal}
- 评论数/评分：{review_count} / {rating}
- 排名变化：{rank_trend}

## 竞品分析
- 价格区间：{price_min} - {price_max}
- 中位价：{price_median}
- 主要竞品数量：{competitor_count}
- 低评分高销量机会：{low_rating_opportunity}

## 供应链
- 主供应商：{supplier_name}
- 采购价：{purchase_price_cny}
- MOQ：{moq}
- 发货时效：{dispatch_days}
- 备选供应商：{backup_supplier}

## 利润测算
- 海外折算售价：{sale_price_cny}
- 综合成本：{landed_cost_cny}
- 预估毛利：{gross_profit_cny}
- 预估毛利率：{gross_margin}
- 最低可接受售价：{min_acceptable_price}

## 风险
- 类目风险：{category_risk}
- 平台风险：{platform_risk}
- 物流风险：{logistics_risk}
- IP/品牌风险：{ip_risk}

## 下一步
{next_actions}
```

## 7. 自动化任务设计

### 每日任务

```text
sync_fx_rates
import_market_products
import_supplier_quotes
refresh_opportunity_scores
generate_daily_report
notify_pending_reviews
```

### 每周任务

```text
generate_weekly_report
detect_category_trends
evaluate_test_products
suggest_supplier_switches
suggest_price_changes
```

### 人工触发任务

```text
generate_product_report
create_listing_draft
run_risk_check
recalculate_profit_snapshot
export_research_pack
```

## 8. 数据源优先级

### MVP

| 数据 | 来源 | 方式 |
| --- | --- | --- |
| 海外竞品 | 平台后台/人工收集 | CSV/Excel |
| 国内供应商 | 1688/自有供应商 | Excel |
| 汇率 | Frankfurter/ExchangeRate-API/人工 | API/CSV |
| 物流 | 货代报价表 | Excel |
| 平台费率 | 平台后台规则 | 手动配置 |
| 趋势 | Google Trends/Keyword Planner | 人工导出 |

### 正式版

| 数据 | 来源 | 方式 |
| --- | --- | --- |
| 平台商品/订单 | Shopee/TikTok Shop/Ozon | 官方 API |
| 汇率 | 商业汇率 API + 结算渠道 | API |
| 物流轨迹 | 平台物流/AfterShip/物流商 | API/Webhook |
| 广告数据 | 平台广告后台 | API/导出 |
| 合规规则 | 平台规则 + 内部规则库 | 人工维护/API |

## 9. 开发模块

建议拆成：

```text
ResearchSourceAdapter
KeywordTrendService
CompetitorAnalysisService
SupplierMatchService
ProfitSnapshotService
RiskCheckService
OpportunityScoringService
ReportGeneratorService
```

前端页面：

```text
选品研究台
关键词趋势
竞品分析
供应商匹配
单品报告
日报/周报
数据源配置
```

## 10. MVP 验收标准

第一版自动化选品研究做到：

1. 导入 100 个海外候选商品。
2. 导入 100 个国内供应商商品。
3. 自动匹配至少 60% 的候选商品到供应商。
4. 自动生成机会分。
5. 自动输出 Top 20 机会清单。
6. 自动生成单品研究报告。
7. 自动标记缺失数据和高风险项。
8. 人工可审核、通过、驳回、备注。

