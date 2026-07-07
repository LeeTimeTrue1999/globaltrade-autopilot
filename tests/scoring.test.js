import assert from "node:assert/strict";
import { config, marketProducts, supplierProducts } from "../app/src/sample-data.js";
import { buildOpportunities, calculateCost, calculateRiskScore } from "../app/src/scoring.js";

const opportunities = buildOpportunities(marketProducts, supplierProducts, config, config.defaultMarginThreshold);

assert.equal(opportunities.length, marketProducts.length, "每个示例市场商品都应该匹配一个供应商");
assert.equal(marketProducts[0].country, "泰国", "示例数据应保持 UTF-8 中文");
assert.ok(config.riskRules.highRiskCategories.includes("电池"), "高风险类目应包含电池");

const thailandStorage = opportunities.find((item) => item.marketProduct.id === "mp-th-001");
assert.ok(thailandStorage, "应生成泰国家居收纳机会");
assert.ok(thailandStorage.cost.grossMargin > 0.25, "泰国家居收纳应满足默认毛利阈值");
assert.ok(thailandStorage.scores.final > 60, "泰国家居收纳机会分应可进入观察或测试");

const russiaBatteryMarket = marketProducts.find((item) => item.id === "mp-ru-002");
const russiaBatterySupplier = supplierProducts.find((item) => item.marketProductId === "mp-ru-002");
const russiaBatteryRisk = calculateRiskScore(russiaBatteryMarket, russiaBatterySupplier, config);
assert.ok(russiaBatteryRisk >= 60, "俄罗斯电池类商品必须触发高风险复核");

const sampleCost = calculateCost(marketProducts[0], supplierProducts[0], config);
assert.ok(sampleCost.salePriceCny > 0, "折算售价必须大于 0");
assert.ok(sampleCost.landedCostCny > supplierProducts[0].purchasePriceCny, "综合成本必须包含采购以外的费用");

console.log("scoring tests passed");
