# 信息收集与数据源调研台账

## 当前目标

先把 GlobalTrade Autopilot 的信息收集层做好，MVP 不追求自动抓全网数据，而是建立一套可追溯、可审计、可逐步自动化的数据源体系。

优先级：

1. 官方平台 API 或卖家后台导出。
2. 官方政策、费率、禁售和开发者文档。
3. 平台 CSV/Excel 导出。
4. 人工调研但保留来源链接和采集时间。
5. 第三方 API 或商业数据源。

禁止方向：

- 不使用来源不明的浏览器插件。
- 不绕过平台访问限制。
- 不把不可信脚本接入数据采集流程。
- 不把估算数据当成真实交易数据。

## GitHub 建仓状态

当前机器状态：

- 工作区存在空的 `.git/` 目录。
- 未发现可用 `git` 命令。
- 未发现可用 GitHub CLI `gh` 命令。
- `.git/config` 不存在，因此当前目录还不是一个完整可推送仓库。

要完成“新建 GitHub 仓库并推送”，需要先满足其一：

1. 安装 Git，并登录 GitHub。
2. 安装 GitHub CLI，并完成 `gh auth login`。
3. 提供 GitHub Personal Access Token，用 GitHub REST API 创建仓库后再配置 remote。

建议仓库名：

```text
globaltrade-autopilot
```

建议建仓后第一批操作：

```bash
git init
git add .
git commit -m "Initial GlobalTrade Autopilot prototype"
git branch -M main
git remote add origin https://github.com/<owner>/globaltrade-autopilot.git
git push -u origin main
```

## L1 必须数据源

### 1. Shopee

用途：

- 海外商品机会。
- 商品刊登。
- 订单同步。
- 店铺运营数据。

优先接入方式：

1. 卖家后台 CSV/Excel 导出。
2. Shopee Open Platform API。

需要采集字段：

```text
platform
country
shop_id
item_id
sku
title
category
price
currency
stock
rating
review_count
sales_signal
listing_status
order_id
fulfillment_status
updated_at
```

当前处理建议：

- M1 先做 CSV/Excel 导入模板。
- API 接入放到 M3。
- 所有平台侧 ID 与内部 ID 分开保存。

待验证：

- 当前账号是否有 Shopee Open Platform 权限。
- 各目标国家店铺是否共用同一套授权。
- 商品、订单、物流接口的调用频率和字段权限。

参考入口：

- https://open.shopee.com/

### 2. TikTok Shop

用途：

- 内容电商商品机会。
- 商品、订单、履约和广告数据。
- 后续可结合内容互动数据判断需求。

优先接入方式：

1. Seller Center 导出。
2. TikTok Shop Open Platform API。

需要采集字段：

```text
platform
country
shop_id
product_id
sku
title
category
price
currency
inventory
rating
review_count
sales_signal
order_id
payment_status
fulfillment_status
created_at
updated_at
```

当前处理建议：

- M1 先支持手动导入商品和订单。
- 内容趋势数据先人工录入，不作为自动决策依据。
- 广告成本先用配置模板估算，真实投放后再接入广告数据。

待验证：

- 目标国家站点是否已开通卖家账号。
- Open Platform app 审核要求。
- 商品发布、订单、物流接口权限。
- 禁售、限售和类目准入规则。

参考入口：

- https://partner.tiktokshop.com/
- https://seller.tiktokglobalshop.com/

### 3. Ozon

用途：

- 俄罗斯方向商品机会。
- Ozon 商品、订单、物流状态。
- 俄罗斯专项风控验证。

优先接入方式：

1. Ozon Seller 后台导出。
2. Ozon Seller API。

需要采集字段：

```text
platform
country
seller_id
product_id
offer_id
sku
title
category
price
currency
stock
rating
review_count
posting_number
order_status
delivery_schema
logistics_status
updated_at
```

当前处理建议：

- 俄罗斯市场先进入机会分析和人工审核，不自动发布。
- 所有俄罗斯商品默认增加基础风险分。
- 电池、充电宝、儿童用品、品牌/IP 商品默认人工合规复核。

待验证：

- Ozon 卖家主体要求。
- API Key 获取方式。
- FBO/FBS/rFBS 不同履约模式字段差异。
- 俄罗斯支付、结算和物流限制。

参考入口：

- https://docs.ozon.ru/api/seller/
- https://seller.ozon.ru/

## 国内货源数据源

### 4. 1688 与自有供应商库

用途：

- 国内采购价。
- MOQ。
- 发货时效。
- 供应商评分。
- 备选供应商。
- 价格历史。

优先接入方式：

1. 自有供应商 Excel。
2. 1688 商品和供应商信息人工导入。
3. 后续再考虑 1688 开放平台或授权接入。

需要采集字段：

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
quote_file
last_checked_at
```

当前处理建议：

- M1 必须先做供应商 Excel 导入。
- 每个机会至少允许 1 个主供应商和 1 个备选供应商。
- 采购价必须保存历史快照，不能只覆盖最新价格。

待验证：

- 是否已有稳定 1688 供应商或工厂。
- 是否接受一件代发。
- 供应商报价单格式。
- 是否需要采购审批流。

参考入口：

- https://open.1688.com/
- https://www.1688.com/

## 汇率数据源

### 5. Frankfurter / ECB / 商业汇率 API

用途：

- 折算海外售价。
- 利润快照。
- 汇率风险缓冲。

优先接入方式：

1. Frankfurter API 或类似免费汇率 API。
2. ECB 官方参考汇率做校验。
3. RUB 使用实际结算渠道或商业汇率 API。

需要采集字段：

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

当前处理建议：

- 每天同步 1-2 次。
- 每次利润计算保存汇率快照。
- 不覆盖历史汇率。
- 允许财务手动覆盖，但必须写审计日志。

注意：

- 官方参考汇率不等于真实结算汇率。
- 俄罗斯卢布需要单独核实可靠来源。

参考入口：

- https://www.frankfurter.app/docs/
- https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html

## 物流和轨迹数据源

### 6. 物流商报价表 / AfterShip / 平台物流

用途：

- 估算履约成本。
- 跟踪订单状态。
- 识别异常物流。

优先接入方式：

1. 货代或物流商报价表 Excel。
2. 平台物流导出。
3. AfterShip 或物流商 API。

需要采集字段：

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

当前处理建议：

- M1 先做物流报价模板。
- 报价按国家、重量段、体积重、渠道维护。
- 真实订单履约后保存实际物流成本和时效。

参考入口：

- https://www.aftership.com/docs/tracking/quickstart/api-quick-start

## 趋势与关键词数据源

### 7. Google Trends / Keyword Planner / 平台搜索词

用途：

- 判断需求趋势。
- 发现当地语言关键词。
- 找类目机会。

优先接入方式：

1. Google Trends 人工导出或手动记录。
2. Google Ads Keyword Planner。
3. 平台后台搜索词和广告词。

需要采集字段：

```text
country
language
keyword
category
interest_score
period
trend_direction
related_queries
source
fetched_at
```

当前处理建议：

- 趋势数据只作为需求辅助信号。
- 不用趋势数据单独触发自动上架。
- 低数据量关键词必须标记低置信度。

参考入口：

- https://trends.google.com/
- https://support.google.com/trends/
- https://ads.google.com/home/tools/keyword-planner/

## 合规与风险数据源

### 8. 平台规则 / 目的国监管 / 内部违规记录

用途：

- 禁售和限售判断。
- 敏感词识别。
- 类目准入。
- IP 和品牌风险。
- 俄罗斯专项风控。

优先接入方式：

1. 平台官方规则人工维护。
2. 目的国监管网站人工维护。
3. 内部违规记录沉淀。
4. 第三方合规服务。

需要采集字段：

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
reviewed_by
```

当前处理建议：

- M1 先维护高风险类目和敏感词表。
- 高风险类目默认不自动发布。
- 每条规则必须保存来源和生效时间。
- 平台规则变更需要人工复核。

首批高风险类目：

```text
食品
保健品
药品
医疗器械
化妆品功效品
儿童用品
电池和充电宝
无线通信设备
品牌/IP 商品
军警、双用途或受限制物品
```

## 信息收集模块设计

## 外部网页与信息源可靠性审计

### 审计结论

当前信息源分成三类处理：

| 类型 | 稳定性 | 自动化策略 | 代表来源 |
| --- | --- | --- | --- |
| 官方开放平台 / 官方 API 文档 | 高，但常有登录、地区、权限限制 | 先登记入口和字段，API 接入前做账号权限验证 | Shopee Open Platform、TikTok Shop Open Platform、Ozon Seller API、1688 Open Platform |
| 官方公开数据 API / 帮助文档 | 高，适合自动化或半自动化 | 可优先做成配置项或同步任务 | Frankfurter、ECB、AfterShip、Google Trends Help |
| 平台规则、费率、禁售政策 | 中高，但变更频繁 | 必须人工复核，保存来源和生效日期 | Shopee/TikTok Shop/Ozon 卖家规则、目的国监管规则 |

不要把“网页可以打开”当成可靠性标准。很多平台开发者文档是动态页面、需要登录、按国家站点展示，或者不同账号看到的 API 权限不同。MVP 应把这些源作为“官方入口 + 待验证字段”，而不是直接写死接口。

### 推荐配置结构

每个外部信息源都应该在数据库或配置文件中保存：

```text
source_id
source_name
source_category
official_url
access_method
requires_login
requires_api_approval
stability_level
automation_level
owner_role
last_verified_at
next_review_at
notes
```

字段说明：

| 字段 | 建议值 |
| --- | --- |
| `source_category` | marketplace_api / seller_export / fx_rate / logistics / trend / compliance / supplier |
| `access_method` | api / csv_export / excel_import / manual_review / webhook |
| `stability_level` | high / medium / low |
| `automation_level` | auto / semi_auto / manual_only |
| `owner_role` | 选品运营 / 供应链运营 / 店铺运营 / 财务 / 合规负责人 |

### 首批来源可靠性配置

| source_id | 来源 | 官方入口 | 稳定性 | 自动化级别 | 当前使用方式 | 风险 |
| --- | --- | --- | --- | --- | --- | --- |
| shopee_open_platform | Shopee Open Platform | https://open.shopee.com/ | high | semi_auto | M1 先导入后台 CSV，M3 再接 API | API 权限、国家站点、字段权限需验证 |
| tiktok_shop_open_platform | TikTok Shop Open Platform | https://partner.tiktokshop.com/ | high | semi_auto | M1 先导入 Seller Center 数据 | App 审核、类目准入、国家站点差异 |
| ozon_seller_api | Ozon Seller API | https://docs.ozon.ru/api/seller/ | high | semi_auto | 俄罗斯方向先人工审核和导入 | 俄语文档、履约模式、结算和物流限制 |
| 1688_open_platform | 1688 开放平台 | https://open.1688.com/ | medium | manual_first | 先用供应商 Excel/报价单 | 授权、反作弊、商品匹配质量 |
| frankfurter_fx | Frankfurter 汇率 API | https://www.frankfurter.app/docs/ | high | auto | 可做每日汇率同步 | 不等同实际结算汇率 |
| ecb_fx_reference | ECB 汇率参考 | https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html | high | semi_auto | 做 EUR 参考汇率校验 | RUB 等币种覆盖需单独确认 |
| aftership_tracking | AfterShip Tracking API | https://www.aftership.com/docs/tracking/quickstart/api-quick-start | high | semi_auto | M1 先物流报价表，后续再接轨迹 API | 商业 API 成本和物流商覆盖 |
| google_trends | Google Trends | https://trends.google.com/ | high | manual_first | 先人工导出/记录趋势 | 趋势是相对指数，不是销量 |
| google_trends_help | Google Trends Help | https://support.google.com/trends/ | high | manual_first | 用于解释趋势数据口径 | 不能作为单独决策依据 |
| google_keyword_planner | Google Keyword Planner | https://ads.google.com/home/tools/keyword-planner/ | high | manual_first | 关键词和广告需求辅助 | 需要 Google Ads 账号 |

### 自动化接入前的验证清单

每个 API 源接入前必须完成：

- 官方账号已开通。
- API app 已审核或已创建。
- 测试环境或 sandbox 可用。
- 目标国家/站点权限明确。
- 商品、订单、物流、库存接口权限明确。
- 频率限制和分页规则明确。
- 错误码、重试和限流策略明确。
- 敏感字段和隐私字段明确。
- 数据是否允许存储、导出和二次分析已确认。

每个导入型来源接入前必须完成：

- 获取一份真实导出样例。
- 锁定字段名和字段类型。
- 明确日期、币种、金额、小数点格式。
- 明确平台订单 ID、SKU、商品 ID 的唯一性。
- 明确缺失字段如何标记。
- 明确来源文件保存和审计策略。

### 不稳定信息的处理规则

- 平台费率、支付手续费、类目佣金：必须配置生效日期，不能覆盖历史。
- 禁售/限售规则：必须保存官方来源链接、审核人和审核时间。
- 物流报价：必须保存报价单版本、渠道、重量段和有效期。
- 汇率：保存快照，不覆盖历史；实际结算汇率优先于参考汇率。
- 搜索趋势：只作为需求信号，不触发自动发布或采购。
- 人工观察数据：默认置信度 C 或 D，必须带备注。

### 当前待人工确认

- Shopee、TikTok Shop、Ozon 是否已有可用卖家账号和 API 权限。
- 各目标国家是否允许当前商品类目上架。
- 俄罗斯方向实际支付、结算、物流方案。
- 1688 或自有供应商是否能提供稳定报价单格式。
- RUB 汇率最终采用哪个实际结算来源。
- 平台费率是否按平台、国家、类目拆分。

### M1 采集方式

```text
CSV/Excel import
  -> schema validation
  -> source metadata
  -> staging table
  -> manual review
  -> normalized business table
  -> scoring
  -> report
```

### 每条数据必须带来源

```text
source
source_type
source_url_or_file
fetched_at
created_by
confidence_level
notes
```

### 置信度等级

| 等级 | 含义 | 示例 |
| --- | --- | --- |
| A | 官方 API 或后台导出 | 平台订单、平台刊登 |
| B | 官方网页或正式报价单 | 物流报价、平台费率 |
| C | 人工录入但有来源 | 供应商报价、竞品观察 |
| D | 估算值 | 广告成本率、退货损耗率 |

规则：

- D 级数据不能触发自动高影响动作。
- 订单利润必须保存快照。
- 汇率、采购价、平台费率、物流费不能覆盖历史。
- 手动覆盖必须写审计日志。

## 下一步执行清单

### 必须先做

- [ ] 确认 GitHub 仓库 owner 和仓库名。
- [ ] 安装或恢复 Git 命令。
- [ ] 创建完整 Git 仓库并推送 GitHub。
- [ ] 为市场商品导入设计 CSV 模板。
- [ ] 为供应商导入设计 Excel/CSV 模板。
- [ ] 为物流报价设计 Excel/CSV 模板。
- [ ] 为汇率快照设计数据表。
- [ ] 为数据源元信息设计统一字段。

### 信息源验证

- [ ] 验证 Shopee Open Platform 商品、订单、刊登接口。
- [ ] 验证 TikTok Shop Open Platform 商品、订单、履约接口。
- [ ] 验证 Ozon Seller API 商品、订单、物流接口。
- [ ] 验证 1688 开放平台是否适合 MVP。
- [ ] 验证 RUB 汇率可用来源。
- [ ] 收集目标国家和平台禁售规则。
- [ ] 收集平台费率和支付手续费规则。
- [ ] 收集目标国家常用物流报价。

### M1 数据导入验收

- [ ] 可以导入 100 个海外候选商品。
- [ ] 可以导入 100 个供应商商品。
- [ ] 可以导入物流报价模板。
- [ ] 可以保存汇率快照。
- [ ] 可以为每条导入数据显示来源和置信度。
- [ ] 可以对缺失字段、低置信度数据和高风险类目标记人工复核。
