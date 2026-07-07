export const config = {
  fxRatesToCny: {
    THB: 0.205,
    IDR: 0.00045,
    VND: 0.00028,
    PHP: 0.125,
    RUB: 0.085
  },
  platformFees: {
    Shopee: 0.105,
    "TikTok Shop": 0.095,
    Ozon: 0.13
  },
  paymentFeeRate: 0.025,
  adCostRate: 0.08,
  returnLossRate: 0.035,
  packagingCostCny: 1.2,
  defaultMarginThreshold: 0.25,
  scoringWeights: {
    demand: 0.35,
    margin: 0.35,
    competition: 0.15,
    fulfillment: 0.1,
    risk: -0.2
  },
  riskRules: {
    RussiaBaseRisk: 14,
    highRiskCategories: ["食品", "保健品", "医疗器械", "儿童用品", "电池", "品牌周边"]
  }
};

export const marketProducts = [
  {
    id: "mp-th-001",
    platform: "Shopee",
    country: "泰国",
    category: "家居收纳",
    title: "Foldable kitchen storage rack with drain tray",
    localTitle: "折叠厨房沥水收纳架",
    price: 329,
    currency: "THB",
    rating: 4.7,
    reviewCount: 1840,
    salesSignal: 6200,
    rankTrend: 18,
    competitionLevel: 55,
    logisticsCostCny: 12.5,
    productUrl: "#",
    owner: "选品运营 A"
  },
  {
    id: "mp-id-001",
    platform: "TikTok Shop",
    country: "印尼",
    category: "美妆工具",
    title: "Portable electric eyelash curler USB rechargeable",
    localTitle: "USB 充电便携睫毛夹",
    price: 119000,
    currency: "IDR",
    rating: 4.5,
    reviewCount: 920,
    salesSignal: 4800,
    rankTrend: 31,
    competitionLevel: 63,
    logisticsCostCny: 10.8,
    productUrl: "#",
    owner: "选品运营 B"
  },
  {
    id: "mp-vn-001",
    platform: "Shopee",
    country: "越南",
    category: "摩托车配件",
    title: "Waterproof motorcycle phone holder anti-shake",
    localTitle: "防水防震摩托车手机支架",
    price: 185000,
    currency: "VND",
    rating: 4.8,
    reviewCount: 1320,
    salesSignal: 5400,
    rankTrend: 22,
    competitionLevel: 48,
    logisticsCostCny: 11.6,
    productUrl: "#",
    owner: "选品运营 A"
  },
  {
    id: "mp-ph-001",
    platform: "TikTok Shop",
    country: "菲律宾",
    category: "宠物用品",
    title: "Pet grooming glove for cats and dogs",
    localTitle: "宠物除毛按摩手套",
    price: 269,
    currency: "PHP",
    rating: 4.4,
    reviewCount: 760,
    salesSignal: 2600,
    rankTrend: 11,
    competitionLevel: 44,
    logisticsCostCny: 9.8,
    productUrl: "#",
    owner: "供应链运营"
  },
  {
    id: "mp-ru-001",
    platform: "Ozon",
    country: "俄罗斯",
    category: "汽车配件",
    title: "Universal car seat gap organizer",
    localTitle: "汽车座椅缝隙收纳盒",
    price: 899,
    currency: "RUB",
    rating: 4.6,
    reviewCount: 1160,
    salesSignal: 3900,
    rankTrend: 9,
    competitionLevel: 57,
    logisticsCostCny: 24.5,
    productUrl: "#",
    owner: "俄罗斯专项"
  },
  {
    id: "mp-ru-002",
    platform: "Ozon",
    country: "俄罗斯",
    category: "电池",
    title: "Rechargeable mini hand warmer power bank",
    localTitle: "充电暖手宝移动电源",
    price: 1290,
    currency: "RUB",
    rating: 4.3,
    reviewCount: 540,
    salesSignal: 2200,
    rankTrend: 15,
    competitionLevel: 52,
    logisticsCostCny: 31,
    productUrl: "#",
    owner: "俄罗斯专项"
  }
];

export const supplierProducts = [
  {
    id: "sp-001",
    marketProductId: "mp-th-001",
    sourcePlatform: "1688",
    supplierName: "义乌优品家居厂",
    title: "折叠厨房沥水收纳架",
    purchasePriceCny: 18.6,
    moq: 2,
    dispatchDays: 2,
    supplierRating: 88,
    monthlySales: 3200,
    supportsDropship: true,
    backupSupplier: "金华厨房用品仓"
  },
  {
    id: "sp-002",
    marketProductId: "mp-id-001",
    sourcePlatform: "1688",
    supplierName: "深圳美妆小电器供应链",
    title: "USB 充电便携睫毛夹",
    purchasePriceCny: 21.5,
    moq: 5,
    dispatchDays: 3,
    supplierRating: 82,
    monthlySales: 2100,
    supportsDropship: true,
    backupSupplier: "东莞美妆电子厂"
  },
  {
    id: "sp-003",
    marketProductId: "mp-vn-001",
    sourcePlatform: "1688",
    supplierName: "广州骑行配件厂",
    title: "防水防震摩托车手机支架",
    purchasePriceCny: 19.2,
    moq: 3,
    dispatchDays: 2,
    supplierRating: 91,
    monthlySales: 4100,
    supportsDropship: true,
    backupSupplier: "佛山车品供应链"
  },
  {
    id: "sp-004",
    marketProductId: "mp-ph-001",
    sourcePlatform: "1688",
    supplierName: "宁波宠物用品批发",
    title: "宠物除毛按摩手套",
    purchasePriceCny: 8.4,
    moq: 10,
    dispatchDays: 2,
    supplierRating: 76,
    monthlySales: 1800,
    supportsDropship: false,
    backupSupplier: "义乌宠物百货"
  },
  {
    id: "sp-005",
    marketProductId: "mp-ru-001",
    sourcePlatform: "1688",
    supplierName: "台州汽车内饰用品",
    title: "汽车座椅缝隙收纳盒",
    purchasePriceCny: 16.8,
    moq: 4,
    dispatchDays: 3,
    supplierRating: 84,
    monthlySales: 2600,
    supportsDropship: true,
    backupSupplier: "广州车载用品档口"
  },
  {
    id: "sp-006",
    marketProductId: "mp-ru-002",
    sourcePlatform: "1688",
    supplierName: "深圳暖手宝工厂",
    title: "充电暖手宝移动电源",
    purchasePriceCny: 28.2,
    moq: 20,
    dispatchDays: 5,
    supplierRating: 79,
    monthlySales: 1600,
    supportsDropship: false,
    backupSupplier: "东莞小家电工厂"
  }
];

export const listingDrafts = [
  {
    id: "ld-001",
    marketProductId: "mp-th-001",
    platform: "Shopee",
    country: "泰国",
    title: "ชั้นวางของในครัวแบบพับได้ พร้อมถาดระบายน้ำ",
    status: "待运营审核",
    reviewer: "店铺运营",
    price: 329,
    currency: "THB",
    completeness: 92
  },
  {
    id: "ld-002",
    marketProductId: "mp-vn-001",
    platform: "Shopee",
    country: "越南",
    title: "Giá đỡ điện thoại xe máy chống nước, chống rung",
    status: "待合规复核",
    reviewer: "合规负责人",
    price: 185000,
    currency: "VND",
    completeness: 86
  },
  {
    id: "ld-003",
    marketProductId: "mp-ru-001",
    platform: "Ozon",
    country: "俄罗斯",
    title: "Органайзер для зазора между сиденьями автомобиля",
    status: "俄罗斯专项复核",
    reviewer: "俄罗斯专项",
    price: 899,
    currency: "RUB",
    completeness: 78
  }
];

export const orders = [
  {
    id: "od-1001",
    platform: "Shopee",
    country: "泰国",
    sku: "TH-KIT-RACK-01",
    product: "折叠厨房沥水收纳架",
    amountCny: 67.45,
    profitCny: 18.92,
    status: "国际运输中",
    owner: "店铺运营"
  },
  {
    id: "od-1002",
    platform: "TikTok Shop",
    country: "印尼",
    sku: "ID-BEAUTY-CURLER-01",
    product: "USB 充电便携睫毛夹",
    amountCny: 53.55,
    profitCny: 6.72,
    status: "待采购",
    owner: "供应链运营"
  },
  {
    id: "od-1003",
    platform: "Ozon",
    country: "俄罗斯",
    sku: "RU-CAR-GAP-01",
    product: "汽车座椅缝隙收纳盒",
    amountCny: 76.42,
    profitCny: 9.35,
    status: "物流待确认",
    owner: "俄罗斯专项"
  }
];
