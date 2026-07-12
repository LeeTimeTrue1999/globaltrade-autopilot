const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const round = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export function calculateCost(marketProduct, supplierProduct, config) {
  const fxRate = config.fxRatesToCny[marketProduct.currency] || 1;
  const salePriceCny = marketProduct.price * fxRate;
  const platformFee = salePriceCny * (config.platformFees[marketProduct.platform] || 0.1);
  const paymentFee = salePriceCny * config.paymentFeeRate;
  const adCost = salePriceCny * config.adCostRate;
  const returnLoss = salePriceCny * config.returnLossRate;
  const landedCostCny =
    supplierProduct.purchasePriceCny +
    marketProduct.logisticsCostCny +
    config.packagingCostCny +
    platformFee +
    paymentFee +
    adCost +
    returnLoss;
  const grossProfitCny = salePriceCny - landedCostCny;
  const grossMargin = salePriceCny <= 0 ? 0 : grossProfitCny / salePriceCny;

  return {
    salePriceCny: round(salePriceCny),
    platformFee: round(platformFee),
    paymentFee: round(paymentFee),
    adCost: round(adCost),
    returnLoss: round(returnLoss),
    landedCostCny: round(landedCostCny),
    grossProfitCny: round(grossProfitCny),
    grossMargin: round(grossMargin, 4)
  };
}

export function calculateDemandScore(product) {
  const salesScore = clamp((Math.log10(product.salesSignal + 1) / 4) * 100);
  const reviewScore = clamp((Math.log10(product.reviewCount + 1) / 3.5) * 100);
  const ratingScore = clamp((product.rating / 5) * 100);
  const trendScore = clamp(50 + product.rankTrend * 1.4);
  return round(salesScore * 0.35 + reviewScore * 0.25 + ratingScore * 0.2 + trendScore * 0.2);
}

export function calculateMarginScore(cost) {
  if (cost.grossMargin <= 0) return 0;
  if (cost.grossMargin >= 0.45) return 100;
  return round(clamp((cost.grossMargin / 0.45) * 100));
}

export function calculateCompetitionScore(product) {
  return round(clamp(100 - product.competitionLevel));
}

export function calculateFulfillmentScore(supplier) {
  const dropshipScore = supplier.supportsDropship ? 15 : 0;
  const dispatchScore = clamp(45 - supplier.dispatchDays * 6, 0, 45);
  const supplierScore = clamp(supplier.supplierRating * 0.35);
  const moqPenalty = supplier.moq > 10 ? 12 : supplier.moq > 5 ? 6 : 0;
  return round(clamp(dropshipScore + dispatchScore + supplierScore - moqPenalty));
}

export function calculateRiskScore(product, supplier, config) {
  let risk = 12;

  if (product.country === "俄罗斯") {
    risk += config.riskRules.RussiaBaseRisk;
  }

  if (config.riskRules.highRiskCategories.includes(product.category)) {
    risk += 34;
  }

  if (product.rating < 4.4) risk += 8;
  if (supplier.dispatchDays > 4) risk += 8;
  if (supplier.moq > 10) risk += 8;
  if (!supplier.supportsDropship) risk += 6;
  if (product.competitionLevel > 70) risk += 6;

  return round(clamp(risk));
}

export function recommendAction(score, cost, riskScore, marginThreshold) {
  if (riskScore >= 60) return "人工合规复核";
  if (cost.grossMargin < 0.12) return "不建议测试";
  if (score >= 75 && cost.grossMargin >= marginThreshold && riskScore < 35) return "小单测试";
  if (score >= 60 && cost.grossMargin >= 0.18) return "观察并补数据";
  if (cost.grossMargin >= marginThreshold && score < 60) return "需求不足，暂缓";
  return "寻找更低成本供应商";
}

export function buildOpportunity(marketProduct, supplierProduct, config, marginThreshold = config.defaultMarginThreshold) {
  const cost = calculateCost(marketProduct, supplierProduct, config);
  const demandScore = calculateDemandScore(marketProduct);
  const marginScore = calculateMarginScore(cost);
  const competitionScore = calculateCompetitionScore(marketProduct);
  const fulfillmentScore = calculateFulfillmentScore(supplierProduct);
  const riskScore = calculateRiskScore(marketProduct, supplierProduct, config);
  const weights = config.scoringWeights;
  const finalScore = round(
    demandScore * weights.demand +
      marginScore * weights.margin +
      competitionScore * weights.competition +
      fulfillmentScore * weights.fulfillment +
      riskScore * weights.risk
  );

  return {
    id: `op-${marketProduct.id}`,
    marketProduct,
    supplierProduct,
    cost,
    scores: {
      demand: demandScore,
      margin: marginScore,
      competition: competitionScore,
      fulfillment: fulfillmentScore,
      risk: riskScore,
      final: clamp(finalScore)
    },
    recommendedAction: recommendAction(finalScore, cost, riskScore, marginThreshold),
    reviewStatus: riskScore >= 60 ? "pending_compliance" : "draft"
  };
}

export function buildOpportunities(marketProducts, supplierProducts, config, marginThreshold) {
  return marketProducts
    .map((marketProduct) => {
      const supplierProduct = supplierProducts.find((supplier) => supplier.marketProductId === marketProduct.id);
      if (!supplierProduct) return null;
      return buildOpportunity(marketProduct, supplierProduct, config, marginThreshold);
    })
    .filter(Boolean);
}

export function buildStrategySummary(opportunities) {
  const testItems = opportunities.filter((item) => item.recommendedAction === "小单测试");
  const complianceItems = opportunities.filter((item) => item.recommendedAction === "人工合规复核");
  const supplierItems = opportunities.filter((item) => item.recommendedAction === "寻找更低成本供应商");
  const averageMargin =
    opportunities.length === 0
      ? 0
      : opportunities.reduce((sum, item) => sum + item.cost.grossMargin, 0) / opportunities.length;
  const grossProfit = opportunities.reduce((sum, item) => sum + Math.max(item.cost.grossProfitCny, 0), 0);

  return {
    testItems,
    complianceItems,
    supplierItems,
    averageMargin,
    grossProfit: round(grossProfit),
    actions: [
      {
        title: "今日测试清单",
        value: `${testItems.length} 个商品`,
        description: testItems.length > 0 ? "优先生成上架草稿，首批控制在 5-20 单。" : "暂无满足测试阈值的商品。"
      },
      {
        title: "合规复核",
        value: `${complianceItems.length} 个商品`,
        description: complianceItems.length > 0 ? "高风险类目或俄罗斯方向需要人工确认。" : "当前无高风险复核项。"
      },
      {
        title: "供应链优化",
        value: `${supplierItems.length} 个商品`,
        description: supplierItems.length > 0 ? "毛利或履约不足，优先寻找备选供应商。" : "当前供应链风险可控。"
      }
    ]
  };
}
