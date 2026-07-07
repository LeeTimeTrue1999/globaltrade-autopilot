# 开发说明

## 当前原型

当前版本是零依赖静态原型：

```text
app/index.html
```

用浏览器直接打开即可。

## 测试

需要 Node.js。运行：

```bash
npm test
```

测试覆盖：

- 示例商品和供应商是否能形成机会。
- 毛利计算是否包含平台和履约成本。
- 俄罗斯高风险类目是否进入人工复核。

## 代码结构

```text
app/src/scoring.js
```

核心评分引擎。后续应保持为纯函数，输入商品、供应商和配置，输出评分、利润和推荐动作。

```text
app/src/sample-data.js
```

示例配置和数据。正式版本迁移到数据库和后台配置。

```text
app/src/app.js
```

页面渲染和交互逻辑。不要在这里新增业务公式。

## 后续工程化建议

正式 MVP 建议迁移为：

- `apps/web`：Next.js。
- `apps/api`：FastAPI 或 NestJS。
- `packages/scoring`：评分引擎共享包。
- `packages/domain`：领域类型。
- `packages/integrations`：平台适配器。

## 本地安全约束

- 不安装来源不明依赖。
- 不保存真实密钥。
- 不把 API Key 写入前端。
- 不运行未知脚本。
- 外部平台数据优先用官方 API 或手动导出文件。

