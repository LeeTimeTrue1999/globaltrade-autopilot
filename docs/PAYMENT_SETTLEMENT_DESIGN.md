# 支付与结算方案设计

## 1. 设计结论

GlobalTrade Autopilot 不应该在 MVP 阶段做“自动付款系统”。支付能力应按“记录、测算、对账、审批、执行”的顺序逐步开放。

推荐边界：

1. 平台买家收款：由 Shopee、TikTok Shop、Ozon 等平台处理，本系统只记录订单、平台费用、结算批次和到账状态。
2. 国内采购付款：可接支付宝 MCP，但先用于付款草稿、付款凭证、对账和状态同步，不默认自动付款。
3. 跨境收款与换汇：优先使用平台官方结算、Payoneer、WorldFirst、Wise 等合规收款账户；本系统保存到账和汇率快照。
4. 俄罗斯方向：单独人工风控，不自动执行支付、换汇、退款或供应商付款。

## 2. 支付场景拆分

| 场景 | 谁发起 | 谁收款 | 系统职责 | 自动化级别 |
| --- | --- | --- | --- | --- |
| 买家支付订单 | 海外买家 | 平台/店铺账户 | 导入订单支付状态、平台费、结算状态 | 平台 API 或导入 |
| 平台结算到账 | 平台 | 跨境收款账户/银行卡 | 记录结算批次、币种、到账金额、手续费、汇率 | 半自动 |
| 国内采购付款 | 供应链/财务 | 国内供应商 | 生成付款申请、支付宝 MCP 对账、保存凭证 | 审批后半自动 |
| 退款 | 店铺运营/平台 | 买家 | 记录退款状态、退款金额、利润冲回 | 平台 API 或导入 |
| 物流付款 | 供应链/财务 | 物流商 | 记录报价、账单、付款状态 | 导入优先 |
| 换汇 | 财务 | 结算渠道 | 保存实际结算汇率和手续费 | 人工确认 |

## 3. 国内部分：支付宝 MCP 的使用边界

当前会话没有暴露可调用的支付宝 MCP 工具，所以这里先按适配器设计。

支付宝 MCP 可承担：

- 查询支付宝账户交易流水。
- 查询付款/转账状态。
- 拉取或登记付款凭证。
- 创建付款草稿或支付请求。
- 支持对账：供应商应付金额、实付金额、付款时间、交易号。

支付宝 MCP 暂不应承担：

- 未审批自动打款。
- 批量无人工确认付款。
- 保存明文密钥。
- 绕过财务复核修改付款金额。
- 对高风险商品、俄罗斯订单或异常订单自动付款。

建议执行流程：

```text
采购任务生成
  -> 供应链确认供应商、数量、采购价
  -> 系统生成 payment_intent
  -> 财务审核
  -> 支付宝 MCP 创建付款草稿或拉起付款
  -> 人工完成二次确认
  -> MCP/回单同步交易号和状态
  -> 系统写 audit_logs 和 profit_snapshot
```

付款阈值建议：

| 条件 | 处理 |
| --- | --- |
| 单笔 <= 500 CNY 且低风险 | 可审批后半自动 |
| 单笔 500-5000 CNY | 财务人工确认 |
| 单笔 > 5000 CNY | 财务 + 运营负责人双审批 |
| 商品风险分 >= 60 | 禁止自动付款 |
| 俄罗斯方向 | 仅人工付款和人工结算 |

## 4. 海外平台收款设计

### Shopee / TikTok Shop / Ozon

这些平台通常由平台侧处理买家支付、退款、结算和部分手续费。本系统不要替代平台支付链路，而是做经营和财务记录。

需要记录：

```text
platform
shop_id
platform_order_id
payment_status
settlement_status
sale_amount
currency
platform_fee
payment_fee
refund_amount
settlement_batch_id
settled_amount
settlement_currency
settled_at
source
source_file_or_api
```

M1 建议：

- 使用平台后台导出的订单和结算 CSV/Excel。
- 平台费、支付手续费先配置成模板。
- 每次结算导入时保存原始文件引用和导入人。

M3 再做：

- 平台订单 API。
- 平台结算/财务 API。
- 退款状态同步。
- 结算批次自动对账。

## 5. 跨境收款与换汇

跨境收款不建议自己从零做资金流。优先接入合规成熟服务或平台官方结算渠道。

候选方案：

| 方案 | 适合场景 | 系统定位 | 注意事项 |
| --- | --- | --- | --- |
| 平台官方结算 | Shopee/TikTok/Ozon 店铺经营 | 主路径 | 按平台规则、国家和主体配置 |
| Payoneer / WorldFirst | 跨境电商收款账户 | 结算账户和提现记录 | 需验证平台支持和主体要求 |
| Wise Business / Wise Platform | 多币种收款、付款、汇率参考 | 汇率和收付款补充 | 需确认所在主体、币种、API 权限 |
| PayPal | 独立站或部分海外买家付款 | Shopify/独立站后续可选 | 不作为平台订单首发路径 |
| Stripe Connect | 自建 marketplace 或独立站 | 后续独立站/平台化才考虑 | Connect 跨境可用区域有限，合规责任高 |

结算记录必须保存：

```text
settlement_provider
account_alias
currency
gross_amount
fee_amount
net_amount
fx_rate
fx_source
settled_at
withdrawn_at
bank_arrival_amount
bank_arrival_currency
reconciliation_status
```

## 6. 数据模型建议

第一批表：

```text
payment_providers
payment_accounts
payment_methods
payment_intents
payment_approvals
payment_transactions
settlement_batches
settlement_items
refund_records
reconciliation_entries
fx_snapshots
```

核心字段：

### payment_providers

```text
id
name
type                // alipay / marketplace / bank / wise / payoneer / worldfirst / paypal / stripe
region
access_method       // api / mcp / csv_import / manual
automation_level    // manual_only / semi_auto / auto_reconcile
status
```

### payment_intents

```text
id
purpose             // purchase / logistics / refund / service_fee
target_type
target_id
payee_name
payee_account_alias
amount
currency
risk_level
approval_status
execution_status
provider_id
external_payment_id
created_by
approved_by
executed_by
created_at
approved_at
executed_at
```

### settlement_batches

```text
id
provider_id
platform
shop_id
currency
gross_amount
fee_amount
refund_amount
net_amount
settlement_period_start
settlement_period_end
settled_at
source_type
source_file_or_api
reconciliation_status
```

## 7. 风控与权限

必须有的控制：

- 支付密钥和 token 加密保存。
- 支付执行和配置修改写审计日志。
- 付款金额、收款人、币种、订单来源不可被单人静默修改。
- 高风险商品、异常订单、俄罗斯方向默认阻断自动付款。
- 所有自动任务必须有幂等键，避免重复付款。
- Webhook 必须校验签名。
- 导入的账单文件必须保留原始文件哈希。

角色权限：

| 角色 | 权限 |
| --- | --- |
| 供应链运营 | 创建采购付款申请，不能执行付款 |
| 财务 | 审核付款、导入账单、确认到账 |
| 运营负责人 | 审批高金额或高风险付款 |
| 系统管理员 | 配置支付提供方，但不能跳过审批付款 |
| 老板/财务只读 | 查看资金和利润报表 |

## 8. 推荐实施路线

### M1：只做记录和对账

- 订单支付状态导入。
- 平台结算表导入。
- 国内采购付款申请。
- 支付宝交易流水/凭证人工或 MCP 同步。
- 利润快照记录实际支付手续费和汇率。

### M2：支付宝 MCP 半自动

- 创建付款草稿。
- 查询付款状态。
- 自动匹配供应商付款与采购单。
- 异常差额进入人工对账。

### M3：平台结算 API

- Shopee/TikTok Shop/Ozon 订单支付状态同步。
- 平台结算批次同步。
- 退款同步。
- 平台费用和结算到账自动对账。

### M4：跨境收款账户集成

- Wise/Payoneer/WorldFirst 等结算账户 API 或导入。
- 实际到账和汇率同步。
- 多币种资金报表。

## 9. 外部参考入口

- 支付宝开放平台：https://open.alipay.com/
- 支付宝文档中心：https://opendocs.alipay.com/
- Alipay+ 文档：https://docs.alipayplus.com/
- Wise Platform：https://docs.wise.com/
- Stripe Connect：https://docs.stripe.com/connect
- Stripe Cross-border payouts：https://docs.stripe.com/connect/cross-border-payouts
- PayPal Developer：https://developer.paypal.com/
- Payoneer：https://www.payoneer.com/
- WorldFirst：https://www.worldfirst.com/
