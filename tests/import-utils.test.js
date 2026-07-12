import assert from "node:assert/strict";
import {
  applyImport,
  buildDataQualityIssues,
  buildFieldMapping,
  getImportTemplate,
  mapRows,
  previewImport
} from "../app/src/import-utils.js";
import { config } from "../app/src/sample-data.js";
import { buildOpportunities } from "../app/src/scoring.js";

const marketProducts = [];
const supplierProducts = [];
const logisticsRates = [];
const orders = [];
const context = { marketProducts, supplierProducts, logisticsRates, orders };

const logisticsRows = [
  {
    provider: "YunExpress",
    route: "CN-TH standard",
    origin_country: "China",
    destination_country: "Thailand",
    price_cny: "12.5",
    source_type: "logistics_quote",
    source_url_or_file: "rate-card.xls",
    confidence_level: "B"
  }
];

const marketRows = [
  {
    platform: "Shopee",
    country: "Thailand",
    category: "Home Storage",
    title: "<Foldable kitchen rack>",
    local_title: "Foldable kitchen rack",
    price: "329",
    currency: "THB",
    rating: "4.7",
    review_count: "1840",
    sales_signal: "6200",
    rank_trend: "18",
    competition_level: "55",
    source_type: "seller_export",
    source_url_or_file: "market-products.csv",
    confidence_level: "A"
  }
];

const supplierRows = [
  {
    market_product_id: "mp-import-001",
    source_platform: "1688",
    supplier_name: "Yiwu Home Goods Factory",
    product_title: "Foldable kitchen rack",
    purchase_price_cny: "18.6",
    moq: "2",
    dispatch_days: "2",
    supplier_rating: "88",
    monthly_sales: "3200",
    supports_dropship: "true",
    source_type: "supplier_quote",
    source_url_or_file: "supplier-products.xls",
    confidence_level: "B"
  }
];

const orderRows = [
  {
    order_id: "OD-20260711-001",
    platform: "Shopee",
    country: "Thailand",
    sku: "SKU-KITCHEN-RACK",
    product: "Foldable kitchen rack",
    quantity: "1",
    sale_price: "329",
    currency: "THB",
    amount_cny: "67.8",
    profit_cny: "18.4",
    payment_status: "paid",
    fulfillment_status: "pending_fulfillment",
    source_type: "platform_order_export",
    source_url_or_file: "orders.csv",
    confidence_level: "B"
  }
];

const template = getImportTemplate("market", "csv");
assert.equal(template.filename, "market-products-template.csv");
assert.ok(template.content.includes("platform,country,category"), "market template should include canonical headers");

const orderTemplate = getImportTemplate("orders", "csv");
assert.equal(orderTemplate.filename, "orders-template.csv");
assert.ok(orderTemplate.content.includes("order_id,platform,country"), "order template should include order headers");

const invalidMarket = previewImport("market", [{ platform: "Shopee" }], context);
assert.ok(invalidMarket.errors.some((error) => error.includes("缺少必填字段")), "missing fields should fail validation");

const customHeaderRows = [
  {
    平台: "Shopee",
    国家: "Thailand",
    类目: "Home Storage",
    商品名称: "Shelf",
    售价: "99",
    币种: "THB",
    评分: "4.6",
    评论数: "20",
    销售信号: "300"
  }
];
const customMapping = {
  平台: "platform",
  国家: "country",
  类目: "category",
  商品名称: "title",
  售价: "price",
  币种: "currency",
  评分: "rating",
  评论数: "reviewCount",
  销售信号: "salesSignal"
};
const inferredMapping = buildFieldMapping("market", customHeaderRows, customMapping);
assert.equal(inferredMapping.商品名称, "title");
assert.equal(mapRows(customHeaderRows, inferredMapping)[0].price, "99");
assert.equal(previewImport("market", customHeaderRows, context, inferredMapping).errors.length, 0);

const logisticsResult = applyImport("logistics", logisticsRows, context, {
  importBatchId: "batch-logistics",
  importedAt: "2026-07-11T00:00:00.000Z",
  sourceFile: "rate-card.xls"
});
assert.equal(logisticsResult.added, 1);
assert.equal(logisticsRates[0].priceCny, 12.5);
assert.equal(logisticsRates[0].importBatchId, "batch-logistics");

const marketResult = applyImport("market", marketRows, context, {
  importBatchId: "batch-market",
  importedAt: "2026-07-11T00:00:00.000Z",
  sourceFile: "market-products.csv"
});
assert.equal(marketResult.added, 1);
assert.equal(marketProducts[0].logisticsCostCny, 12.5, "market import should use matched logistics quote");
assert.equal(marketProducts[0].title, "Foldable kitchen rack", "imported text should strip unsafe angle brackets");
assert.equal(marketProducts[0].importBatchId, "batch-market");

const supplierResult = applyImport("supplier", supplierRows, context);
assert.equal(supplierResult.added, 1);
assert.equal(supplierProducts[0].marketProductId, marketProducts[0].id);

const orderResult = applyImport("orders", orderRows, context, {
  importBatchId: "batch-orders",
  importedAt: "2026-07-11T00:00:00.000Z",
  sourceFile: "orders.csv"
});
assert.equal(orderResult.added, 1);
assert.equal(orders[0].amountCny, 67.8);
assert.equal(orders[0].status, "pending_fulfillment");
assert.equal(orders[0].importBatchId, "batch-orders");

const opportunities = buildOpportunities(marketProducts, supplierProducts, config, config.defaultMarginThreshold);
assert.equal(opportunities.length, 1, "imported market and supplier products should enter opportunity scoring");
assert.ok(opportunities[0].cost.grossMargin > 0, "imported opportunity should calculate margin");

const qualityIssues = buildDataQualityIssues({
  marketProducts: [
    ...marketProducts,
    {
      id: "mp-unmatched",
      country: "Malaysia",
      title: "Unmatched market product",
      logisticsCostCny: 0,
      confidenceLevel: "D"
    }
  ],
  supplierProducts,
  logisticsRates
});
assert.ok(qualityIssues.some((issue) => issue.type === "supplier_match"), "quality pool should flag missing supplier links");
assert.ok(qualityIssues.some((issue) => issue.type === "logistics_quote"), "quality pool should flag missing logistics quotes");
assert.ok(qualityIssues.some((issue) => issue.type === "confidence"), "quality pool should flag low-confidence rows");

console.log("import tests passed");
