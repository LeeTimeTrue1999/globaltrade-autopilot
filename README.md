# GlobalTrade Autopilot

中国商品出海交易内部工具，从市场需求发现、国内货源匹配、利润测算、上架审核到日/周策略复盘，帮助团队以可控方式测试东南亚与俄罗斯市场机会。

当前仓库包含：

- `docs/PRD.md`：完整产品需求文档。
- `docs/ROADMAP.md`：从 MVP 到完整版的开发路线。
- `docs/ARCHITECTURE.md`：工程架构、模块边界、数据流。
- `docs/DATA_MODEL.md`：核心数据模型和字段说明。
- `docs/DATA_REQUIREMENTS_AND_SOURCES.md`：所需数据、字段、接入优先级和推荐数据源。
- `docs/PRODUCT_RESEARCH_AUTOMATION.md`：选品调研自动化流程、评分模型和报告模板。
- `docs/CROSS_BORDER_OPERATIONS_REVIEW.md`：跨境电商现实运转方式和当前框架问题清单。
- `docs/PAYMENT_SETTLEMENT_DESIGN.md`：支付、结算、支付宝 MCP、跨境收款和对账方案。
- `docs/API_CONTRACT.md`：后端接口契约草案。
- `docs/BACKEND_PERSISTENCE_DESIGN.md`：多人可用业务系统所需的后端持久化、对象存储、权限和审计设计。
- `docs/SECURITY.md`：安全、合规、访问控制设计。
- `docs/ENGINEERING_PLAN.md`：数据库、部署、多人共享、服务器和运维方案。
- `docs/DEPLOYMENT_PLAN.md`：服务器部署、HTTPS、备份、监控和发布流程。
- `docs/INFRASTRUCTURE_CHECKLIST.md`：从本地到生产的基础设施检查清单。
- `docs/TODO_DECISIONS.md`：需要业务负责人后续拍板的问题。
- `docs/WORK_TODO.md`：项目长期 TODO、运营日志、决策、数据和基础设施后续工作台。
- `app/`：无外部依赖的 MVP 原型，可直接用浏览器打开。

## 项目运营要求

`docs/WORK_TODO.md` 是后续工作的统一运营文档。以后所有产品、设计、工程、数据、基础设施和文档工作，开始前必须先检查这个文档；结束前必须更新 TODO 状态、决策、工作日志、验证结果和新增后续任务。

## 快速预览

直接打开：

```text
app/index.html
```

这个原型不会访问互联网，不会调用外部接口，所有示例数据都在本地文件中，便于先确认业务流程和评分逻辑。

## MVP 目标

第一版内部工具只做半自动闭环：

1. 录入或导入海外候选商品。
2. 录入或导入国内供应商商品。
3. 自动计算需求分、毛利分、竞争分、履约分、风险分和总机会分。
4. 输出建议动作：测试、观察、下架、补供应商、人工复核。
5. 生成商品上架草稿和日/周经营动作。

## 技术原则

- 内部工具优先，先保证安全、可调、可审计。
- MVP 使用本地静态应用，避免不必要的依赖和供应链风险。
- 核心评分规则独立为纯函数，方便后续迁移到后端服务。
- 所有自动执行动作都必须保留人工审核节点。
