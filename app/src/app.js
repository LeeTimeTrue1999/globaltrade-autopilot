import { config, listingDrafts, marketProducts, orders, supplierProducts } from "./sample-data.js";
import {
  applyImport,
  buildFieldMapping,
  buildDataQualityIssues,
  getImportTemplate,
  getFieldSchema,
  parseImportFile,
  previewImport
} from "./import-utils.js";
import { buildOpportunities, buildStrategySummary } from "./scoring.js";

const STORAGE_KEY = "globaltrade-autopilot-state-v1";
const clone = (value) => JSON.parse(JSON.stringify(value));
const INITIAL_WORKSPACE = clone({ config, listingDrafts, marketProducts, orders, supplierProducts });
const DEFAULT_DATA_SOURCES = [
  {
    id: "source-market-products",
    name: "市场商品",
    domain: "market",
    mode: "manual_upload",
    owner: "选品运营",
    cadence: "每周",
    confidenceLevel: "B",
    status: "active",
    fields: "平台、国家、类目、标题、售价、评分、销量信号"
  },
  {
    id: "source-supplier-products",
    name: "供应商商品",
    domain: "supplier",
    mode: "manual_upload",
    owner: "供应链",
    cadence: "每周",
    confidenceLevel: "B",
    status: "active",
    fields: "供应商名称、商品标题、采购价、起订量、发货天数"
  },
  {
    id: "source-logistics-rates",
    name: "物流报价表",
    domain: "logistics",
    mode: "manual_upload",
    owner: "物流",
    cadence: "有变更时",
    confidenceLevel: "B",
    status: "active",
    fields: "物流商、线路、目的国、人民币价格、预计天数"
  },
  {
    id: "source-orders",
    name: "订单",
    domain: "orders",
    mode: "manual_upload",
    owner: "订单运营",
    cadence: "每日",
    confidenceLevel: "B",
    status: "active",
    fields: "订单号、平台、商品编码、人民币金额、利润、履约状态"
  },
  {
    id: "source-platform-api",
    name: "平台接口",
    domain: "mixed",
    mode: "api_candidate",
    owner: "待定",
    cadence: "暂未接入",
    confidenceLevel: "A",
    status: "candidate",
    fields: "确认权限后再接入商品、订单、结算、刊登等接口"
  }
];

const DATA_SOURCE_ADAPTER_CONTRACTS = [
  {
    mode: "manual_upload",
    label: "人工 CSV/Excel",
    status: "已接入",
    domains: "市场商品、供应商商品、物流报价、订单",
    handoff: "文件解析 -> 字段映射 -> 预览校验 -> 人工确认 -> 入库",
    credentialRule: "不需要账号凭证"
  },
  {
    mode: "visible_page_capture",
    label: "可见页面采集",
    status: "已接入",
    domains: "竞品价格",
    handoff: "粘贴可见结果 -> 价格解析 -> 样本预览 -> 人工确认 -> 回填机会池",
    credentialRule: "不保存 cookie，只处理用户确认的可见数据"
  },
  {
    mode: "public_discovery",
    label: "公开发现",
    status: "已接入",
    domains: "义乌购供应商候选",
    handoff: "公开列表查询 -> 候选评分 -> 人工确认 -> 加入供应商池",
    credentialRule: "不读取登录后数据"
  },
  {
    mode: "browser_assisted",
    label: "浏览器辅助",
    status: "待接入",
    domains: "平台搜索页、商品页、竞品结果",
    handoff: "用户打开页面 -> 明确触发采集 -> 预览 -> 人工确认",
    credentialRule: "用户控制登录状态，系统不保存 cookie"
  },
  {
    mode: "api_sync",
    label: "官方 API 同步",
    status: "暂缓",
    domains: "平台商品、订单、广告、物流、汇率",
    handoff: "授权 API -> 标准 envelope -> 校验 -> 任务审计 -> 应用",
    credentialRule: "需要后端 secret store，不能放 localStorage"
  }
];

const B2B_DEMAND_COUNTRY_PROFILES = [
  {
    country: "泰国",
    region: "东南亚",
    cities: ["曼谷", "清迈", "普吉", "春武里"],
    demandSignals: ["旅游和户外消费活跃", "线下零售密度高", "社媒和地图商家信息较丰富"],
    retailKeywords: ["fishing tackle shop", "outdoor shop", "sporting goods store", "camping store"],
    baseScore: 86
  },
  {
    country: "越南",
    region: "东南亚",
    cities: ["胡志明市", "河内", "岘港", "海防"],
    demandSignals: ["年轻消费群体增长", "本地零售店铺分散", "适合批发和经销商触达"],
    retailKeywords: ["fishing store", "outdoor equipment", "sports shop", "wholesale fishing gear"],
    baseScore: 82
  },
  {
    country: "菲律宾",
    region: "东南亚",
    cities: ["马尼拉", "宿务", "达沃", "奎松市"],
    demandSignals: ["海岛和休闲垂钓场景多", "英文商家信息较多", "电话和社媒触达相对友好"],
    retailKeywords: ["fishing tackle", "marine supply", "outdoor store", "sports retailer"],
    baseScore: 84
  },
  {
    country: "印尼",
    region: "东南亚",
    cities: ["雅加达", "泗水", "万隆", "棉兰"],
    demandSignals: ["人口基数大", "线下零售和批发渠道多", "需要更强去重和城市分批采集"],
    retailKeywords: ["toko pancing", "alat pancing", "outdoor store", "sports shop"],
    baseScore: 80
  },
  {
    country: "马来西亚",
    region: "东南亚",
    cities: ["吉隆坡", "槟城", "新山", "怡保"],
    demandSignals: ["英语信息可读性较好", "户外和休闲消费稳定", "适合小批量验证"],
    retailKeywords: ["fishing shop", "tackle store", "outdoor gear", "sports equipment"],
    baseScore: 78
  },
  {
    country: "美国",
    region: "北美",
    cities: ["洛杉矶", "休斯顿", "迈阿密", "西雅图"],
    demandSignals: ["垂钓用品市场成熟", "店铺联系方式公开度高", "竞争和合规要求更高"],
    retailKeywords: ["fishing tackle shop", "bait and tackle", "outdoor sporting goods", "marine supply"],
    baseScore: 76
  }
];

const B2B_CUSTOMER_TYPE_RULES = [
  {
    match: ["钓鱼", "鱼竿", "渔具", "fishing", "tackle"],
    productIntent: "钓鱼用品",
    customerTypes: ["钓具店", "渔具批发商", "户外用品店", "体育用品店", "船艇/海钓用品店"],
    searchTerms: ["钓具店", "渔具店", "fishing tackle shop", "bait and tackle", "outdoor sporting goods"]
  },
  {
    match: ["宠物", "狗", "猫", "pet"],
    productIntent: "宠物用品",
    customerTypes: ["宠物店", "宠物用品零售店", "宠物美容店", "兽医诊所", "宠物用品批发商"],
    searchTerms: ["宠物店", "pet store", "pet supplies", "pet grooming", "veterinary clinic"]
  },
  {
    match: ["户外", "露营", "帐篷", "camping", "outdoor"],
    productIntent: "户外用品",
    customerTypes: ["户外用品店", "露营用品店", "体育用品店", "旅游用品店"],
    searchTerms: ["户外用品店", "camping store", "outdoor gear", "sporting goods store"]
  },
  {
    match: ["汽配", "汽车", "车载", "auto", "car"],
    productIntent: "汽车用品",
    customerTypes: ["汽配店", "汽车美容店", "汽车维修店", "汽车用品批发商"],
    searchTerms: ["汽配店", "auto parts store", "car accessories", "auto repair shop"]
  }
];

const B2B_LEAD_SOURCE_PROFILES = [
  {
    id: "google-maps",
    platform: "Google Maps",
    sourceType: "地图 POI",
    coverage: "海外",
    parseMode: "浏览器辅助解析",
    cadence: "按任务人工触发",
    expectedFields: ["店名", "地址", "公开电话", "官网", "评分", "评论数", "地图链接"],
    safetyRule: "只读取当前页面公开可见内容，不保存 cookie，不绕过登录或验证码"
  },
  {
    id: "baidu-maps",
    platform: "百度地图",
    sourceType: "地图 POI",
    coverage: "中国/部分海外",
    parseMode: "浏览器辅助解析",
    cadence: "按任务人工触发",
    expectedFields: ["店名", "地址", "公开电话", "营业时间", "地图链接"],
    safetyRule: "低频定点搜索，只处理公开页面字段"
  },
  {
    id: "amap",
    platform: "高德地图",
    sourceType: "地图 POI",
    coverage: "中国/部分海外",
    parseMode: "浏览器辅助解析",
    cadence: "按任务人工触发",
    expectedFields: ["店名", "地址", "公开电话", "类目", "地图链接"],
    safetyRule: "低频定点搜索，只处理公开页面字段"
  },
  {
    id: "dianping",
    platform: "大众点评",
    sourceType: "点评/本地生活",
    coverage: "中国/部分海外城市",
    parseMode: "可见页解析",
    cadence: "按任务人工触发",
    expectedFields: ["店名", "地址", "评分", "评论数", "公开电话", "详情链接"],
    safetyRule: "不读取登录后数据，不批量翻页高频采集"
  },
  {
    id: "search-web",
    platform: "网页搜索",
    sourceType: "搜索结果",
    coverage: "全球",
    parseMode: "搜索结果解析",
    cadence: "按任务人工触发",
    expectedFields: ["店名", "官网", "公开电话", "地址", "目录来源", "搜索链接"],
    safetyRule: "优先行业目录和官网公开信息，排除隐私联系人"
  },
  {
    id: "industry-directory",
    platform: "行业目录",
    sourceType: "B2B/门店目录",
    coverage: "按国家变化",
    parseMode: "目录页解析",
    cadence: "按任务人工触发",
    expectedFields: ["公司/店铺名", "官网", "公开邮箱", "公开电话", "地址", "目录链接"],
    safetyRule: "只采集目录公开展示的企业联系方式"
  }
];

const managementViews = new Set([
  "dataSources",
  "products",
  "competitors",
  "suppliers",
  "orders",
  "finance",
  "supplierMatching",
  "logistics",
  "mvpReadiness",
  "settings"
]);

const viewTitles = {
  products: "商品管理",
  finance: "收入数据",
  dataSources: "数据源管理",
  demandResearch: "需求探查",
  supplierMatching: "供应商匹配",
  logistics: "物流报价",
  dashboard: "总览",
  opportunities: "机会池",
  listings: "上架草稿",
  fulfillment: "发货履约",
  orders: "订单履约",
  suppliers: "供应商",
  reports: "经营复盘",
  mvpReadiness: "MVP 初版",
  settings: "配置中心"
};
Object.assign(viewTitles, {
  dataSources: "数据导入",
  products: "商品管理",
  suppliers: "供应商管理",
  orders: "订单管理",
  finance: "收入数据",
  supplierMatching: "供应商匹配",
  logistics: "物流报价",
  listings: "上架草稿",
  fulfillment: "发货履约",
  mvpReadiness: "MVP 初版",
  settings: "配置中心"
});

Object.assign(viewTitles, {
  competitors: "竞品采集"
});

function ensureCompetitorNav() {
  const productNav = document.querySelector('[data-view="products"]');
  if (!productNav || document.querySelector('[data-view="competitors"]')) return;
  const button = document.createElement("button");
  button.className = "nav-item";
  button.type = "button";
  button.dataset.view = "competitors";
  button.textContent = "竞品采集";
  productNav.insertAdjacentElement("afterend", button);
}

ensureCompetitorNav();

const state = {
  view: "dashboard",
  country: "all",
  platform: "all",
  category: "all",
  marginThreshold: config.defaultMarginThreshold,
  selectedId: null,
  selectedDraftId: null,
  discoveryCandidates: [],
  demandResearches: [],
  leadSearchTasks: [],
  leadSourcePlans: [],
  leadSourceRuns: [],
  storeLeads: [],
  storeLeadDraft: null,
  selectedDemandResearchId: null,
  selectedLeadSourcePlanId: null,
  yiwugoCandidates: [],
  competitorSnapshots: [],
  competitorDraft: null,
  supplierDiscoveryConfigs: {},
  logisticsRates: [],
  shipments: [],
  dataSources: clone(DEFAULT_DATA_SOURCES),
  auditLogs: [],
  lastBackupAt: null,
  pendingImport: null,
  importHistory: [],
  fieldMappings: {
    market: {},
    supplier: {},
    logistics: {},
    orders: {}
  },
  importResults: {
    market: null,
    supplier: null,
    logistics: null,
    orders: null
  }
};

const elements = {
  viewTitle: document.querySelector("#viewTitle"),
  navItems: [...document.querySelectorAll(".nav-item")],
  countryFilter: document.querySelector("#countryFilter"),
  platformFilter: document.querySelector("#platformFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  marginThreshold: document.querySelector("#marginThreshold"),
  filterBar: document.querySelector(".filter-bar"),
  copyReportButton: document.querySelector("#copyReportButton"),
  createDraftButton: document.querySelector("#createDraftButton"),
  views: {
    dashboard: document.querySelector("#dashboardView"),
    demandResearch: document.querySelector("#demandResearchView"),
    dataSources: document.querySelector("#dataSourcesView"),
    products: document.querySelector("#productsView"),
    competitors: document.querySelector("#competitorsView"),
    opportunities: document.querySelector("#opportunitiesView"),
    listings: document.querySelector("#listingsView"),
    fulfillment: document.querySelector("#fulfillmentView"),
    orders: document.querySelector("#ordersView"),
    suppliers: document.querySelector("#suppliersView"),
    finance: document.querySelector("#financeView"),
    supplierMatching: document.querySelector("#supplierMatchingView"),
    logistics: document.querySelector("#logisticsView"),
    reports: document.querySelector("#reportsView"),
    mvpReadiness: document.querySelector("#mvpReadinessView"),
    settings: document.querySelector("#settingsView")
  }
};

const money = (value) => `¥${Number(value).toFixed(2)}`;
const percent = (value) => `${Math.round(value * 100)}%`;
const score = (value) => Math.round(value);
const importLabels = {
  market: "市场商品",
  supplier: "供应商商品",
  logistics: "物流报价",
  orders: "订单"
};

const shipmentStatuses = ["待发货", "已创建运单", "已发货", "运输中", "派送中", "已签收", "异常"];
const defaultCarriers = ["YunExpress", "4PX", "菜鸟国际", "顺丰国际", "平台物流"];
const DEFAULT_SUPPLIER_DISCOVERY_CONFIGS = {
  yiwugo: {
    source: "义乌购",
    mode: "public_list",
    status: "active",
    refreshCadenceHours: 24,
    overwritePolicy: "manual_review",
    autoAddToSupplierPool: false,
    allowedFields: "标题、图片、店铺、价格、MOQ、销量、发货承诺、店铺信用、原链接",
    blockedFields: "手机号、联系人、登录后报价、即时聊天、私密库存",
    lastFetchedAt: "",
    nextRefreshAt: ""
  },
  "1688": {
    source: "1688",
    mode: "link_register",
    status: "manual_required",
    refreshCadenceHours: 0,
    overwritePolicy: "manual_review",
    autoAddToSupplierPool: false,
    allowedFields: "商品链接、offerId、人工补充采购价/MOQ/规格/发货信息、表格导入字段",
    blockedFields: "验证码后数据、登录后报价、旺旺聊天、强风控页面",
    lastFetchedAt: "",
    nextRefreshAt: ""
  },
  manual_upload: {
    source: "手工上传",
    mode: "csv_excel",
    status: "active",
    refreshCadenceHours: 0,
    overwritePolicy: "batch_preview",
    autoAddToSupplierPool: false,
    allowedFields: "CSV/Excel 模板中的标准供应商商品字段",
    blockedFields: "未映射字段默认不入库",
    lastFetchedAt: "",
    nextRefreshAt: ""
  }
};
state.supplierDiscoveryConfigs = clone(DEFAULT_SUPPLIER_DISCOVERY_CONFIGS);
const mvpReadinessItems = [
  {
    area: "本地工作区存储",
    surface: "配置中心",
    status: "已完成",
    priority: "P0",
    note: "localStorage、JSON 备份、恢复和重置已经接入。"
  },
  {
    area: "CSV/Excel 数据导入",
    surface: "数据导入",
    status: "已完成",
    priority: "P0",
    note: "市场商品、供应商商品、物流报价和订单支持模板、预览、字段映射和校验。"
  },
  {
    area: "商品/供应商/物流管理",
    surface: "商品管理、供应商管理、供应商匹配、物流报价",
    status: "已完成",
    priority: "P0",
    note: "核心数据可以在前端管理，并接入机会评分。"
  },
  {
    area: "主动发现机会",
    surface: "机会池",
    status: "部分完成",
    priority: "P0",
    note: "链接/类目入口已存在；当前用本地模拟信号，真实平台解析和趋势数据还没接。"
  },
  {
    area: "机会详情审核",
    surface: "机会池",
    status: "已完成",
    priority: "P0",
    note: "能查看市场明细、成本拆解、评分因子、供应商履约、调研来源和风险记录。"
  },
  {
    area: "机会转上架草稿",
    surface: "机会池、上架草稿",
    status: "已完成",
    priority: "P0",
    note: "评分后的机会可以生成或打开草稿，并带入成本、评分、供应商和本地化初始信息。"
  },
  {
    area: "上架审核工作台",
    surface: "上架草稿",
    status: "已完成",
    priority: "P0",
    note: "审核面板已覆盖发布信息、翻译本地化编辑、清单、成本、供应商和物流；保存后更新本地状态和审计日志。"
  },
  {
    area: "成本依据和模板",
    surface: "配置中心、机会池",
    status: "部分完成",
    priority: "P0",
    note: "已有汇率、佣金、广告、退货、包装、供应商和物流成本；还需要按平台/国家/类目的来源模板。"
  },
  {
    area: "订单、收入和发货",
    surface: "订单管理、收入数据、发货履约",
    status: "部分完成",
    priority: "P0",
    note: "订单/收入和本地发货任务已可用；自动回传平台和真实物流轨迹同步暂未接入。"
  },
  {
    area: "数据源登记和审计",
    surface: "数据导入、配置中心",
    status: "已完成",
    priority: "P1",
    note: "可登记人工上传/API 候选数据源，配置中心有本地审计日志。"
  },
  {
    area: "KPI 周复盘",
    surface: "经营复盘",
    status: "待补",
    priority: "P1",
    note: "需要补 GMV、订单数、毛利、测试结果、供应商问题和物流异常的更完整看板。"
  },
  {
    area: "策略动作审批",
    surface: "前端尚未形成独立入口",
    status: "待补",
    priority: "P1",
    note: "现在只有推荐动作，还没有正式的批准、拒绝、执行和动作日志。"
  },
  {
    area: "真实 URL/API 解析",
    surface: "前端有入口，后端/接口未接",
    status: "暂缓",
    priority: "P1",
    note: "等确认数据来源是 API、人工上传还是混合模式后再做真实适配。"
  },
  {
    area: "多人权限和后端存储",
    surface: "前端不启用",
    status: "暂缓",
    priority: "P2",
    note: "当前 MVP 是本地浏览器工作区；多人协作、数据库、对象存储和权限后置。"
  }
];

mvpReadinessItems.splice(5, 0, {
  area: "机会证据与补数",
  surface: "机会池",
  status: "部分完成",
  priority: "P0",
  note:
    "机会详情已显示目标国售价依据、广告测算、重量体积缺口、物流成本依据、供应商备选和三档利润场景；真实竞品、广告、重量和路线报价仍需通过导入或后续适配器补齐。"
});

mvpReadinessItems.splice(6, 0, {
  area: "数据源适配器契约",
  surface: "数据导入 / docs",
  status: "已完成",
  priority: "P0",
  note:
    "已定义统一 intake envelope，覆盖人工上传、可见页面采集、公开发现、浏览器辅助和未来 API 同步；前端数据导入页展示接入方式、标准交接和凭证规则。"
});

mvpReadinessItems.splice(7, 0, {
  area: "B2B 信息源自动发现",
  surface: "需求探查",
  status: "已完成",
  priority: "P0",
  note:
    "需求探查页会自动生成地图、点评、行业目录和网页搜索入口，并记录解析方式、可读字段、合规边界和状态；真实页面抽取仍需浏览器辅助适配器。"
});

mvpReadinessItems.splice(8, 0, {
  area: "B2B 外部查询链路",
  surface: "需求探查",
  status: "已完成",
  priority: "P0",
  note:
    "信息源可以打开来源并记录查询批次，带入解析表单后自动填充来源 URL、平台、国家城市和关键词；线索预览和确认会回写解析数量与入池数量。"
});

function statusRank(status) {
  const rank = {
    待发货: 0,
    已创建运单: 1,
    已发货: 2,
    运输中: 3,
    派送中: 4,
    已签收: 5,
    异常: 6
  };
  return rank[status] ?? 0;
}

function shipmentStatusClass(status) {
  if (status === "已签收") return "good";
  if (status === "异常") return "danger";
  if (status === "待发货") return "warning";
  return "info";
}

function normalizeShipment(raw, order) {
  const currentStatus = raw?.status || (order.status.includes("运输") ? "运输中" : order.status.includes("待") ? "待发货" : "已发货");
  return {
    id: raw?.id || `ship-${order.id}`,
    orderId: raw?.orderId || order.id,
    platform: raw?.platform || order.platform,
    country: raw?.country || order.country,
    sku: raw?.sku || order.sku,
    product: raw?.product || order.product,
    carrier: raw?.carrier || "",
    trackingNo: raw?.trackingNo || "",
    status: currentStatus,
    autoSendReady: Boolean(raw?.autoSendReady),
    lastTrackingEvent: raw?.lastTrackingEvent || (currentStatus === "待发货" ? "等待创建运单" : "等待物流轨迹同步"),
    lastSyncedAt: raw?.lastSyncedAt || "",
    owner: raw?.owner || order.owner || "订单运营"
  };
}

function buildDefaultShipments(savedShipments = []) {
  const savedByOrder = new Map((Array.isArray(savedShipments) ? savedShipments : []).map((shipment) => [shipment.orderId, shipment]));
  return orders.map((order) => normalizeShipment(savedByOrder.get(order.id), order));
}

function syncShipmentsWithOrders() {
  state.shipments = buildDefaultShipments(state.shipments);
}

function h(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function replaceArray(target, source) {
  target.splice(0, target.length, ...(Array.isArray(source) ? source : []));
}

function replaceObject(target, source) {
  Object.keys(target).forEach((key) => {
    delete target[key];
  });
  Object.assign(target, clone(source || {}));
}

function normalizeDataSources(sources) {
  const savedById = new Map((Array.isArray(sources) ? sources : []).map((source) => [source.id, source]));
  const ownerLabels = {
    "Selection Ops": "选品运营",
    "Supply chain": "供应链",
    Logistics: "物流",
    "Order Ops": "订单运营",
    TBD: "待定"
  };
  return DEFAULT_DATA_SOURCES.map((defaultSource) => {
    const saved = savedById.get(defaultSource.id) || {};
    const owner = ownerLabels[saved.owner] || saved.owner || defaultSource.owner;
    return {
      ...defaultSource,
      mode: saved.mode || defaultSource.mode,
      status: saved.status || defaultSource.status,
      owner,
      confidenceLevel: saved.confidenceLevel || defaultSource.confidenceLevel
    };
  });
}

function buildWorkspaceSnapshot() {
  return {
    version: 2,
    savedAt: new Date().toISOString(),
    config,
    discoveryCandidates: state.discoveryCandidates,
    demandResearches: state.demandResearches,
    leadSearchTasks: state.leadSearchTasks,
    leadSourcePlans: state.leadSourcePlans,
    leadSourceRuns: state.leadSourceRuns,
    storeLeads: state.storeLeads,
    storeLeadDraft: state.storeLeadDraft,
    selectedDemandResearchId: state.selectedDemandResearchId,
    selectedLeadSourcePlanId: state.selectedLeadSourcePlanId,
    yiwugoCandidates: state.yiwugoCandidates,
    competitorSnapshots: state.competitorSnapshots,
    supplierDiscoveryConfigs: state.supplierDiscoveryConfigs,
    marketProducts,
    supplierProducts,
    logisticsRates: state.logisticsRates,
    shipments: state.shipments,
    dataSources: state.dataSources,
    listingDrafts,
    orders,
    importHistory: state.importHistory,
    fieldMappings: state.fieldMappings,
    auditLogs: state.auditLogs,
    lastBackupAt: state.lastBackupAt,
    marginThreshold: state.marginThreshold,
    country: state.country,
    platform: state.platform,
    category: state.category,
    selectedDraftId: state.selectedDraftId
  };
}

function applyWorkspaceSnapshot(saved) {
  if (saved.config) replaceObject(config, saved.config);
  state.discoveryCandidates = Array.isArray(saved.discoveryCandidates) ? saved.discoveryCandidates : [];
  state.demandResearches = Array.isArray(saved.demandResearches) ? saved.demandResearches : [];
  state.leadSearchTasks = Array.isArray(saved.leadSearchTasks) ? saved.leadSearchTasks : [];
  state.leadSourcePlans = Array.isArray(saved.leadSourcePlans) ? saved.leadSourcePlans : [];
  state.leadSourceRuns = Array.isArray(saved.leadSourceRuns) ? saved.leadSourceRuns : [];
  state.storeLeads = Array.isArray(saved.storeLeads) ? saved.storeLeads : [];
  state.storeLeadDraft = saved.storeLeadDraft || null;
  state.selectedDemandResearchId = saved.selectedDemandResearchId || null;
  state.selectedLeadSourcePlanId = saved.selectedLeadSourcePlanId || null;
  state.yiwugoCandidates = Array.isArray(saved.yiwugoCandidates) ? saved.yiwugoCandidates : [];
  state.competitorSnapshots = Array.isArray(saved.competitorSnapshots) ? saved.competitorSnapshots : [];
  state.competitorDraft = null;
  state.supplierDiscoveryConfigs = {
    ...clone(DEFAULT_SUPPLIER_DISCOVERY_CONFIGS),
    ...(saved.supplierDiscoveryConfigs || {})
  };
  if (Array.isArray(saved.marketProducts)) replaceArray(marketProducts, saved.marketProducts);
  if (Array.isArray(saved.supplierProducts)) replaceArray(supplierProducts, saved.supplierProducts);
  if (Array.isArray(saved.listingDrafts)) replaceArray(listingDrafts, saved.listingDrafts);
  if (Array.isArray(saved.orders)) replaceArray(orders, saved.orders);
  state.logisticsRates = Array.isArray(saved.logisticsRates) ? saved.logisticsRates : state.logisticsRates;
  state.shipments = buildDefaultShipments(saved.shipments);
  state.dataSources = normalizeDataSources(saved.dataSources);
  state.importHistory = Array.isArray(saved.importHistory) ? saved.importHistory : [];
  state.auditLogs = Array.isArray(saved.auditLogs) ? saved.auditLogs : [];
  state.fieldMappings = {
    market: saved.fieldMappings?.market || {},
    supplier: saved.fieldMappings?.supplier || {},
    logistics: saved.fieldMappings?.logistics || {},
    orders: saved.fieldMappings?.orders || {}
  };
  state.lastBackupAt = saved.lastBackupAt || null;
  state.marginThreshold = Number(saved.marginThreshold ?? config.defaultMarginThreshold ?? state.marginThreshold);
  state.country = saved.country || "all";
  state.platform = saved.platform || "all";
  state.category = saved.category || "all";
  state.selectedDraftId = saved.selectedDraftId || null;
}

function logAction(action, detail = {}) {
  state.auditLogs = [
    {
      id: `audit-${Date.now()}`,
      at: new Date().toISOString(),
      user: "local-mvp",
      action,
      detail
    },
    ...state.auditLogs
  ].slice(0, 80);
}

function loadWorkspaceState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved) return;
    applyWorkspaceSnapshot(saved);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function saveWorkspaceState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(buildWorkspaceSnapshot()));
}

function uniqueValues(items, key) {
  return [...new Set(items.map((item) => item[key]))].sort();
}

function fillSelect(select, values) {
  const currentValue = select.value;
  const firstOption = select.querySelector("option");
  select.replaceChildren(firstOption);
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
  select.value = [...select.options].some((option) => option.value === currentValue) ? currentValue : "all";
}

function refreshFilters() {
  fillSelect(elements.countryFilter, uniqueValues(marketProducts, "country"));
  fillSelect(elements.platformFilter, uniqueValues(marketProducts, "platform"));
  fillSelect(elements.categoryFilter, uniqueValues(marketProducts, "category"));
  elements.marginThreshold.value = Math.round(state.marginThreshold * 100);
}

function downloadTemplate(kind, format) {
  const template = getImportTemplate(kind, format);
  const blob = new Blob([template.content], { type: template.mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = template.filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importStatus(kind) {
  const result = state.importResults[kind];
  const pending = state.pendingImport?.kind === kind ? state.pendingImport : null;
  if (pending) {
    return `
      <div class="import-status">
        <span class="tag ${pending.preview.errors.length > 0 ? "danger" : "warning"}">已生成预览</span>
        <span class="tag">${pending.preview.rows.length} 行待确认</span>
      </div>
    `;
  }
  if (!result) return `<p class="muted">下载模板，填写后导入表格文件。</p>`;
  const tone = result.errors.length > 0 ? "danger" : "good";
  const messages = result.errors.length > 0 ? result.errors : result.warnings.slice(0, 3);
  return `
    <div class="import-status">
      <span class="tag ${tone}">${result.errors.length > 0 ? "校验失败" : `已导入 ${result.added} 行`}</span>
      ${result.updated ? `<span class="tag info">已刷新 ${result.updated} 个物流成本</span>` : ""}
      ${messages.length > 0 ? `<ul>${messages.map((message) => `<li>${h(message)}</li>`).join("")}</ul>` : ""}
    </div>
  `;
}

function importCard(kind, title, note) {
  return `
    <article class="import-card">
      <div>
        <h3>${title}</h3>
        <p class="muted">${note}</p>
      </div>
      <div class="import-actions">
        <button class="small-button" type="button" data-template="${kind}" data-format="csv">逗号分隔模板</button>
        <button class="small-button" type="button" data-template="${kind}" data-format="xls">电子表格模板</button>
        <label class="file-button">
          导入
          <input type="file" data-import-kind="${kind}" accept=".csv,.tsv,.txt,.xls,.xlsx,.html">
        </label>
      </div>
      ${importStatus(kind)}
    </article>
  `;
}

function renderImportPreview() {
  const pending = state.pendingImport;
  if (!pending) return "";
  const { preview } = pending;
  const sampleRows = preview.rows.slice(0, 5);
  const fields = [...new Set(sampleRows.flatMap((row) => Object.keys(row)))].slice(0, 8);
  const schema = getFieldSchema(pending.kind);
  const sourceFields = Object.keys(pending.rows[0] || {});
  const canConfirm = preview.errors.length === 0 && preview.rows.length > 0;

  return `
    <section class="panel import-preview-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">导入预览</p>
          <h2>${h(importLabels[pending.kind])}: ${h(pending.fileName)}</h2>
        </div>
        <div class="import-actions">
          <button class="small-button" type="button" data-discard-import>放弃</button>
          <button class="primary-button" type="button" data-confirm-import ${canConfirm ? "" : "disabled"}>确认导入</button>
        </div>
      </div>
      <div class="panel-body preview-stack">
        <div class="tag-row">
          <span class="tag ${preview.errors.length > 0 ? "danger" : "good"}">${preview.errors.length} 个错误</span>
          <span class="tag ${preview.warnings.length > 0 ? "warning" : "good"}">${preview.warnings.length} 个提醒</span>
          <span class="tag">解析 ${preview.rows.length} 行</span>
        </div>
        ${preview.errors.length > 0 ? `<div class="message-list danger">${preview.errors.slice(0, 6).map((message) => `<p>${h(message)}</p>`).join("")}</div>` : ""}
        ${preview.warnings.length > 0 ? `<div class="message-list warning">${preview.warnings.slice(0, 6).map((message) => `<p>${h(message)}</p>`).join("")}</div>` : ""}
        <section class="mapping-panel">
          <div>
            <h3>字段映射</h3>
            <p class="muted">必填字段：${schema.required.map(h).join(", ")}</p>
          </div>
          <div class="mapping-grid">
            ${sourceFields
              .map(
                (sourceField) => `
                  <label class="mapping-row">
                    <span>${h(sourceField)}</span>
                    <select data-map-field="${h(sourceField)}">
                      <option value="">忽略</option>
                      ${schema.fields
                        .map(
                          (field) =>
                            `<option value="${h(field)}" ${pending.fieldMapping[sourceField] === field ? "selected" : ""}>${h(field)}</option>`
                        )
                        .join("")}
                    </select>
                  </label>
                `
              )
              .join("")}
          </div>
        </section>
        ${
          sampleRows.length > 0
            ? `<div class="table-scroll"><table class="compact-table">
                <thead><tr>${fields.map((field) => `<th>${h(field)}</th>`).join("")}</tr></thead>
                <tbody>
                  ${sampleRows
                    .map((row) => `<tr>${fields.map((field) => `<td>${h(row[field])}</td>`).join("")}</tr>`)
                    .join("")}
                </tbody>
              </table></div>`
            : `<p class="muted">这个文件没有解析出数据行。</p>`
        }
      </div>
    </section>
  `;
}

function addImportHistoryEntry(entry) {
  state.importHistory = [
    {
      id: `hist-${Date.now()}`,
      importedAt: new Date().toLocaleString(),
      ...entry
    },
    ...state.importHistory
  ].slice(0, 12);
}

function removeImportedRows(items, batchId) {
  const before = items.length;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index].importBatchId === batchId) items.splice(index, 1);
  }
  return before - items.length;
}

function rollbackImportBatch(batchId) {
  const entry = state.importHistory.find((item) => item.batchId === batchId);
  if (!entry || entry.status !== "confirmed") return;
  const removed = {
    market: removeImportedRows(marketProducts, batchId),
    supplier: removeImportedRows(supplierProducts, batchId),
    logistics: removeImportedRows(state.logisticsRates, batchId),
    orders: removeImportedRows(orders, batchId)
  };
  entry.status = "rolled_back";
  entry.rolledBackAt = new Date().toLocaleString();
  entry.removed = removed;
  logAction("import.rolled_back", { batchId, kind: entry.kind, fileName: entry.fileName, removed });
  refreshMarketLogisticsCosts();
  refreshFilters();
  saveWorkspaceState();
  render();
}

function renderImportHistory() {
  if (state.importHistory.length === 0) {
    return `
      <section class="panel">
        <div class="panel-header"><h2>导入历史</h2></div>
        <div class="panel-body"><p class="muted">还没有确认过导入。</p></div>
      </section>
    `;
  }

  return `
    <section class="panel">
      <div class="panel-header"><h2>导入历史</h2></div>
      <div class="table-scroll">
        <table class="compact-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>类型</th>
              <th>文件</th>
              <th>行数</th>
              <th>状态</th>
              <th>问题</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${state.importHistory
              .map(
                (entry) => `
                  <tr>
                    <td>${h(entry.importedAt)}</td>
                    <td>${h(importLabels[entry.kind])}</td>
                    <td>${h(entry.fileName)}</td>
                    <td>${entry.rowCount}</td>
                    <td><span class="tag ${entry.status === "confirmed" ? "good" : entry.status === "rolled_back" ? "warning" : "danger"}">${h(importHistoryStatusLabel(entry.status))}</span></td>
                    <td>${entry.errorCount} 个错误 / ${entry.warningCount} 个提醒</td>
                    <td>
                      ${
                        entry.status === "confirmed" && entry.batchId
                          ? `<button class="small-button" type="button" data-rollback-import="${h(entry.batchId)}">回滚</button>`
                          : `<span class="muted">${h(entry.rolledBackAt || "-")}</span>`
                      }
                    </td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function severityClass(severity) {
  if (severity === "high") return "danger";
  if (severity === "medium") return "warning";
  return "info";
}

function renderDataQualityPanel() {
  const issues = buildDataQualityIssues({ marketProducts, supplierProducts, logisticsRates: state.logisticsRates });
  const visibleIssues = issues.slice(0, 8);
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">数据质量</p>
          <h2>待补数池</h2>
        </div>
        <span class="tag ${issues.length > 0 ? "warning" : "good"}">${issues.length} 个待处理</span>
      </div>
      <div class="panel-body quality-list">
        ${
          visibleIssues.length > 0
            ? visibleIssues
                .map(
                  (issue) => `
                    <article class="quality-item">
                      <div>
                        <strong>${h(issue.item)}</strong>
                        <p class="muted">${h(issue.detail)}</p>
                      </div>
                      <div class="tag-row">
                        <span class="tag ${severityClass(issue.severity)}">${h(issue.severity)}</span>
                        <span class="tag">${h(issue.owner)}</span>
                      </div>
                    </article>
                  `
                )
                .join("")
            : `<p class="muted">当前导入数据没有阻断性质量问题。</p>`
        }
      </div>
    </section>
  `;
}

function renderImportPanel() {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">数据导入</p>
          <h2>表格导入</h2>
        </div>
      </div>
      <div class="panel-body import-grid">
        ${importCard("market", "市场商品", "海外需求、售价、评分、销量信号、排名和竞争度。")}
        ${importCard("supplier", "供应商商品", "采购成本、MOQ、发货速度、供应商评分和一件代发能力。")}
        ${importCard("logistics", "物流报价", "按线路和目的国维护报价，最低匹配报价会进入毛利评分。")}
        ${importCard("orders", "订单", "平台订单导出，包含销售额、利润、支付、履约和退款状态。")}
      </div>
    </section>
    ${renderImportPreview()}
    <div class="two-column equal-columns">
      ${renderImportHistory()}
      ${renderDataQualityPanel()}
    </div>
  `;
}

function sourceModeLabel(mode) {
  const labels = {
    manual_upload: "人工上传",
    api_candidate: "接口候选",
    not_connected: "暂不接入"
  };
  return labels[mode] || mode;
}

function sourceDomainLabel(domain) {
  const labels = {
    market: "市场商品",
    supplier: "供应商商品",
    logistics: "物流报价",
    orders: "订单",
    mixed: "混合数据"
  };
  return labels[domain] || domain;
}

function sourceStatusLabel(status) {
  const labels = {
    active: "启用",
    candidate: "候选",
    paused: "暂停"
  };
  return labels[status] || status;
}

function importHistoryStatusLabel(status) {
  const labels = {
    confirmed: "已确认",
    rejected: "已拒绝",
    rolled_back: "已回滚"
  };
  return labels[status] || status;
}

function auditActionLabel(action) {
  const labels = {
    "import.confirmed": "确认导入",
    "import.rolled_back": "回滚导入",
    "supplier.match.updated": "更新供应商匹配",
    "logistics_rate.created": "新增物流报价",
    "shipment.updated": "更新发货信息",
    "shipment.tracking_refreshed": "刷新物流轨迹",
    "shipment.synced_from_orders": "同步发货任务",
    "workspace.backup.exported": "导出工作区备份",
    "workspace.backup.restored": "恢复工作区备份",
    "workspace.reset": "重置本地工作区",
    "config.updated": "更新配置",
    "data_source.mode_updated": "更新数据源接入方式",
    "data_source.owner_updated": "更新数据源负责人",
    "discovery.generated": "生成调研候选",
    "discovery.added_to_pool": "加入商品池",
    "discovery.listing_draft_created": "生成上架草稿",
    "yiwugo.discovery.generated": "义乌购自动找货",
    "yiwugo.candidate_added": "加入义乌购供应商候选",
    "supplier_discovery.config_updated": "更新供应商发现规则",
    "b2b.demand_research_created": "创建 ToB 需求探查",
    "b2b.lead_task_status_updated": "更新线索采集任务",
    "b2b.lead_sources_generated": "生成线索信息源",
    "b2b.lead_source_status_updated": "更新线索信息源状态",
    "b2b.lead_source_opened": "记录外部查询",
    "b2b.lead_source_parse_prepared": "带入外部查询解析",
    "b2b.store_leads_previewed": "预览店铺线索",
    "b2b.store_leads_confirmed": "确认店铺线索",
    "b2b.store_lead_status_updated": "更新店铺线索状态",
    "b2b.store_lead_removed": "移除店铺线索"
  };
  Object.assign(labels, {
    "competitor.previewed": "预览竞品价格",
    "competitor.confirmed": "确认竞品价格带",
    "listing.localization_saved": "保存上架本地化"
  });
  return labels[action] || action;
}

function auditDetailLabel(entry) {
  const detail = entry.detail || {};
  if (detail.fileName) return `文件：${detail.fileName}`;
  if (detail.sourceId) return `数据源：${detail.sourceId}`;
  if (detail.path) return `配置项：${detail.path}`;
  if (detail.provider || detail.route) return `报价：${[detail.provider, detail.route].filter(Boolean).join(" / ")}`;
  if (detail.orderId) return `订单：${detail.orderId}`;
  if (detail.title) return `商品：${detail.title}`;
  if (detail.query) return `关键词：${detail.query}`;
  return "详情已记录在本地工作区";
}

function sourceStatusClass(status) {
  if (status === "active") return "good";
  if (status === "candidate") return "info";
  return "warning";
}

function updateDataSourceMode(sourceId, mode) {
  const source = state.dataSources.find((item) => item.id === sourceId);
  if (!source) return;
  source.mode = mode;
  source.status = mode === "manual_upload" ? "active" : mode === "api_candidate" ? "candidate" : "paused";
  logAction("data_source.mode_updated", { sourceId, mode });
  saveWorkspaceState();
  render();
}

function updateDataSourceOwner(sourceId, owner) {
  const source = state.dataSources.find((item) => item.id === sourceId);
  if (!source) return;
  source.owner = owner.trim() || "待定";
  logAction("data_source.owner_updated", { sourceId, owner: source.owner });
  saveWorkspaceState();
  render();
}

function renderDataSourceManagement() {
  const activeManual = state.dataSources.filter((source) => source.mode === "manual_upload").length;
  const apiCandidates = state.dataSources.filter((source) => source.mode === "api_candidate").length;
  const paused = state.dataSources.filter((source) => source.mode === "not_connected").length;

  elements.views.dataSources.innerHTML = `
    ${pageGuide(
      "数据接入页",
      "这里统一管理人工上传、未来 API 候选和暂不接入的数据源。当前 MVP 以 CSV/Excel 上传为主，导入前会先预览、映射字段并校验。",
      [
        { view: "products", label: "看商品数据" },
        { view: "orders", label: "看订单数据" }
      ]
    )}
    <div class="metrics-grid">
      ${metricCard("数据源", state.dataSources.length, "人工上传和未来接口候选统一管理")}
      ${metricCard("人工上传", activeManual, "当前 MVP 的一等数据入口")}
      ${metricCard("接口候选", apiCandidates, "确认权限后再评估接入")}
      ${metricCard("暂不接入", paused, "已记录但当前不参与数据流")}
    </div>
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">快速入口</p>
          <h2>我要添加什么数据？</h2>
        </div>
      </div>
      <div class="panel-body source-grid">
        <article class="source-card">
          <h3>添加商品</h3>
          <p class="muted">下载“市场商品”模板，导入平台、国家、售价、评分、销量信号等商品数据。</p>
          <button class="small-button" type="button" data-template="market" data-format="csv">下载商品模板</button>
        </article>
        <article class="source-card">
          <h3>添加供应商</h3>
          <p class="muted">下载“供应商商品”模板，导入采购价、起订量、发货天数和供应商评分。</p>
          <button class="small-button" type="button" data-template="supplier" data-format="csv">下载供应商模板</button>
        </article>
        <article class="source-card">
          <h3>添加订单</h3>
          <p class="muted">下载“订单”模板，导入订单金额、利润、支付状态、履约状态和负责人。</p>
          <button class="small-button" type="button" data-template="orders" data-format="csv">下载订单模板</button>
        </article>
        <article class="source-card">
          <h3>添加收入信息</h3>
          <p class="muted">收入数据来自订单导入；导入订单后会自动进入“收入数据”页汇总。</p>
          <button class="small-button" type="button" data-go="finance">查看收入数据</button>
        </article>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">数据源台账</p>
          <h2>数据源管理</h2>
        </div>
      </div>
      <div class="panel-body source-grid">
        ${state.dataSources
          .map(
            (source) => `
              <article class="source-card">
                <div class="source-card-header">
                  <div>
                    <h3>${h(source.name)}</h3>
                    <p class="muted">${h(sourceDomainLabel(source.domain))} / ${h(source.cadence)}</p>
                  </div>
                  <span class="tag ${sourceStatusClass(source.status)}">${h(sourceStatusLabel(source.status))}</span>
                </div>
                <p class="muted">${h(source.fields)}</p>
                <div class="source-controls">
                  <label>
                    接入方式
                    <select data-source-mode="${h(source.id)}">
                      ${["manual_upload", "api_candidate", "not_connected"]
                        .map((mode) => `<option value="${mode}" ${source.mode === mode ? "selected" : ""}>${sourceModeLabel(mode)}</option>`)
                        .join("")}
                    </select>
                  </label>
                  <label>
                    负责人
                    <input type="text" value="${h(source.owner)}" data-source-owner="${h(source.id)}">
                  </label>
                  <div class="config-row compact-row"><span>置信等级</span><strong>${h(source.confidenceLevel)}</strong></div>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">统一契约</p>
          <h2>数据源适配器规范</h2>
          <p class="muted">所有数据源都先进入标准 envelope：采集来源、接入方式、字段映射、原始行、标准化行、质量状态、确认动作和审计记录。详细文档见 docs/DATA_SOURCE_ADAPTER_CONTRACT.md。</p>
        </div>
      </div>
      <div class="table-scroll">
        <table class="compact-table">
          <thead>
            <tr>
              <th>接入方式</th>
              <th>状态</th>
              <th>覆盖数据</th>
              <th>标准交接</th>
              <th>凭证规则</th>
            </tr>
          </thead>
          <tbody>
            ${DATA_SOURCE_ADAPTER_CONTRACTS.map(
              (item) => `
                <tr>
                  <td><strong>${h(item.label)}</strong><br><span class="muted">${h(item.mode)}</span></td>
                  <td><span class="tag ${item.status === "已接入" ? "good" : item.status === "待接入" ? "warning" : "info"}">${h(item.status)}</span></td>
                  <td class="wide-note">${h(item.domains)}</td>
                  <td class="wide-note">${h(item.handoff)}</td>
                  <td class="wide-note">${h(item.credentialRule)}</td>
                </tr>
              `
            ).join("")}
          </tbody>
        </table>
      </div>
    </section>
    ${renderImportPanel()}
  `;
}

async function handleImportFile(kind, file) {
  try {
    const rows = await parseImportFile(file);
    const context = { marketProducts, supplierProducts, logisticsRates: state.logisticsRates, orders };
    const fieldMapping = buildFieldMapping(kind, rows, state.fieldMappings[kind]);
    const preview = previewImport(kind, rows, context, fieldMapping);
    state.pendingImport = {
      id: `import-${Date.now()}`,
      kind,
      fileName: file.name,
      rows,
      fieldMapping,
      preview
    };
    state.importResults[kind] = { ...preview, added: 0, updated: 0 };
    if (preview.errors.length > 0) {
      addImportHistoryEntry({
        batchId: state.pendingImport.id,
        kind,
        fileName: file.name,
        rowCount: preview.rows.length,
        status: "rejected",
        errorCount: preview.errors.length,
        warningCount: preview.warnings.length,
        rawRows: rows,
        fieldMapping
      });
      saveWorkspaceState();
    }
    render();
  } catch (error) {
    state.importResults[kind] = {
      rows: [],
      errors: [error.message || "Unable to parse this file."],
      warnings: [],
      added: 0,
      updated: 0
    };
    state.pendingImport = null;
    addImportHistoryEntry({
      kind,
      fileName: file.name,
      rowCount: 0,
      status: "rejected",
      errorCount: 1,
      warningCount: 0
    });
    saveWorkspaceState();
    render();
  }
}

function confirmPendingImport() {
  if (!state.pendingImport || state.pendingImport.preview.errors.length > 0) return;
  const pending = state.pendingImport;
  const importedAt = new Date().toISOString();
  const context = { marketProducts, supplierProducts, logisticsRates: state.logisticsRates, orders };
  const result = applyImport(pending.kind, pending.rows, context, {
    importBatchId: pending.id,
    importedAt,
    sourceFile: pending.fileName
  }, pending.fieldMapping);
  state.importResults[pending.kind] = result;
  if (pending.kind === "orders") syncShipmentsWithOrders();
  state.fieldMappings[pending.kind] = { ...state.fieldMappings[pending.kind], ...pending.fieldMapping };
  addImportHistoryEntry({
    batchId: pending.id,
    kind: pending.kind,
    fileName: pending.fileName,
    rowCount: result.rows.length,
    status: "confirmed",
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
    rawRows: pending.rows,
    fieldMapping: pending.fieldMapping
  });
  logAction("import.confirmed", { kind: pending.kind, fileName: pending.fileName, rowCount: result.rows.length });
  state.pendingImport = null;
  refreshFilters();
  state.selectedId = null;
  saveWorkspaceState();
  render();
}

function updatePendingFieldMapping(sourceField, targetField) {
  if (!state.pendingImport) return;
  state.pendingImport.fieldMapping[sourceField] = targetField;
  const context = { marketProducts, supplierProducts, logisticsRates: state.logisticsRates, orders };
  state.pendingImport.preview = previewImport(
    state.pendingImport.kind,
    state.pendingImport.rows,
    context,
    state.pendingImport.fieldMapping
  );
  state.importResults[state.pendingImport.kind] = { ...state.pendingImport.preview, added: 0, updated: 0 };
  render();
}

function bindSupplierToMarket(supplierId, marketProductId) {
  const supplier = supplierProducts.find((item) => item.id === supplierId);
  if (!supplier) return;
  supplier.marketProductId = marketProductId || "";
  logAction("supplier.match.updated", { supplierId, marketProductId: supplier.marketProductId });
  saveWorkspaceState();
  state.selectedId = null;
  render();
}

function addLogisticsQuote(form) {
  const formData = new FormData(form);
  const quote = {
    id: `lr-manual-${Date.now()}`,
    provider: String(formData.get("provider") || "").trim(),
    route: String(formData.get("route") || "").trim(),
    originCountry: "China",
    destinationCountry: String(formData.get("destinationCountry") || "").trim(),
    priceCny: Number(formData.get("priceCny")),
    estimatedDaysMin: Number(formData.get("estimatedDaysMin")) || undefined,
    estimatedDaysMax: Number(formData.get("estimatedDaysMax")) || undefined,
    sourceType: "manual_rate_card",
    sourceFile: "手工维护",
    confidenceLevel: "B",
    importedAt: new Date().toISOString()
  };
  if (!quote.provider || !quote.route || !quote.destinationCountry || !Number.isFinite(quote.priceCny)) return;
  state.logisticsRates.unshift(quote);
  refreshMarketLogisticsCosts();
  logAction("logistics_rate.created", { provider: quote.provider, route: quote.route, destinationCountry: quote.destinationCountry });
  saveWorkspaceState();
  render();
}

function getOpportunities() {
  return buildOpportunities(marketProducts, supplierProducts, config, state.marginThreshold)
    .filter((item) => state.country === "all" || item.marketProduct.country === state.country)
    .filter((item) => state.platform === "all" || item.marketProduct.platform === state.platform)
    .filter((item) => state.category === "all" || item.marketProduct.category === state.category)
    .sort((a, b) => b.scores.final - a.scores.final);
}

function actionClass(action) {
  if (action === "小单测试") return "good";
  if (action === "人工合规复核" || action === "不建议测试") return "danger";
  if (action === "观察并补数据") return "info";
  return "warning";
}

function statusClass(status) {
  if (status.includes("复核") || status.includes("确认")) return "warning";
  if (status.includes("待")) return "info";
  if (status.includes("异常")) return "danger";
  return "good";
}

function businessStatusLabel(status) {
  const labels = {
    imported: "已导入",
    paid: "已支付",
    unpaid: "未支付",
    pending_fulfillment: "待履约",
    fulfilled: "已履约",
    shipped: "已发货",
    delivered: "已送达",
    refunded: "已退款",
    none: "无"
  };
  return labels[status] || status;
}

function metricCard(label, value, note) {
  return `
    <article class="metric-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${note}</small>
    </article>
  `;
}

function pageGuide(title, body, actions = []) {
  return `
    <section class="page-guide">
      <div>
        <p class="eyebrow">${title}</p>
        <p>${body}</p>
      </div>
      ${
        actions.length > 0
          ? `<div class="guide-actions">${actions
              .map((action) => `<button class="small-button" type="button" data-go="${action.view}">${action.label}</button>`)
              .join("")}</div>`
          : ""
      }
    </section>
  `;
}

function inferB2BCustomerRules(productIntent) {
  const input = String(productIntent || "").toLowerCase();
  return (
    B2B_CUSTOMER_TYPE_RULES.find((rule) => rule.match.some((keyword) => input.includes(keyword.toLowerCase()))) ||
    {
      productIntent: productIntent || "通用商品",
      customerTypes: ["专业零售店", "批发商", "经销商", "行业门店", "本地服务商"],
      searchTerms: [productIntent || "retailer", `${productIntent || "product"} store`, `${productIntent || "product"} wholesale`]
    }
  );
}

function buildB2BDemandCountries(productIntent, targetRegion, selectedCountries) {
  const rule = inferB2BCustomerRules(productIntent);
  const wantedCountries = selectedCountries
    .split(/[，,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const profiles = B2B_DEMAND_COUNTRY_PROFILES.filter((profile) => {
    if (wantedCountries.length > 0) return wantedCountries.includes(profile.country);
    if (targetRegion === "all") return true;
    return profile.region === targetRegion;
  });
  return profiles
    .map((profile, index) => {
      const scoreBoost = rule.productIntent === "钓鱼用品" && ["泰国", "菲律宾", "印尼", "马来西亚", "美国"].includes(profile.country) ? 7 : 0;
      const scoreValue = Math.min(96, profile.baseScore + scoreBoost - index);
      return {
        ...profile,
        score: scoreValue,
        scoreLabel: scoreValue >= 88 ? "优先验证" : scoreValue >= 80 ? "值得采集" : "观察补证据",
        customerTypes: rule.customerTypes,
        searchTerms: [...new Set([...rule.searchTerms, ...profile.retailKeywords])].slice(0, 7),
        evidence: [
          ...profile.demandSignals,
          `目标客户类型：${rule.customerTypes.slice(0, 3).join("、")}`,
          "需用地图/点评/行业目录采集公开联系方式验证真实店铺密度"
        ]
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function buildLeadSearchTasks(research) {
  const sourcePlatforms = ["Google Maps", "高德地图", "百度地图", "大众点评"];
  return research.countries.flatMap((country) =>
    country.cities.slice(0, 3).flatMap((city) =>
      country.searchTerms.slice(0, 3).map((term, termIndex) => {
        const platform = sourcePlatforms[termIndex % sourcePlatforms.length];
        return {
          id: `lead-task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          researchId: research.id,
          productIntent: research.productIntent,
          country: country.country,
          city,
          platform,
          keyword: `${term} ${city}`,
          targetCustomerType: country.customerTypes[termIndex % country.customerTypes.length],
          status: "待采集",
          collectionMode: platform === "大众点评" || platform.includes("地图") ? "可见页/低频定点采集" : "可见页/搜索结果采集",
          suggestedLimit: 30,
          createdAt: new Date().toISOString()
        };
      })
    )
  );
}

function createDemandResearch(form) {
  const formData = new FormData(form);
  const productIntent = String(formData.get("productIntent") || "").trim();
  if (!productIntent) return;
  const targetRegion = String(formData.get("targetRegion") || "东南亚");
  const selectedCountries = String(formData.get("selectedCountries") || "");
  const countries = buildB2BDemandCountries(productIntent, targetRegion, selectedCountries);
  const research = {
    id: `demand-${Date.now()}`,
    productIntent,
    targetRegion,
    selectedCountries,
    createdAt: new Date().toISOString(),
    status: "待采集线索",
    dataSources: ["搜索趋势/关键词", "地图 POI", "点评/本地生活平台", "行业目录", "网页搜索结果"],
    countries
  };
  const tasks = buildLeadSearchTasks(research);
  state.demandResearches = [research, ...state.demandResearches].slice(0, 20);
  state.leadSearchTasks = [...tasks, ...state.leadSearchTasks].slice(0, 300);
  state.selectedDemandResearchId = research.id;
  logAction("b2b.demand_research_created", { productIntent, countryCount: countries.length, taskCount: tasks.length });
  saveWorkspaceState();
  render();
}

function updateLeadSearchTaskStatus(taskId, status) {
  const task = state.leadSearchTasks.find((item) => item.id === taskId);
  if (!task) return;
  task.status = status;
  task.updatedAt = new Date().toISOString();
  logAction("b2b.lead_task_status_updated", { taskId, status, keyword: task.keyword });
  saveWorkspaceState();
  render();
}

function leadSourceSearchQuery(task, profile) {
  const baseKeyword = `${task.keyword || task.targetCustomerType || task.productIntent} ${task.city || ""} ${task.country || ""}`.trim();
  if (profile.id === "industry-directory") return `${task.country} ${task.targetCustomerType || task.productIntent} distributor directory contact`;
  if (profile.id === "search-web") return `${baseKeyword} phone address website`;
  return baseKeyword;
}

function leadSourceUrl(task, profile) {
  const query = encodeURIComponent(leadSourceSearchQuery(task, profile));
  const urls = {
    "google-maps": `https://www.google.com/maps/search/${query}`,
    "baidu-maps": `https://map.baidu.com/search/${query}`,
    amap: `https://ditu.amap.com/search?query=${query}`,
    dianping: `https://www.dianping.com/search/keyword/1/0_${query}`,
    "search-web": `https://www.google.com/search?q=${query}`,
    "industry-directory": `https://www.google.com/search?q=${query}`
  };
  return urls[profile.id] || `https://www.google.com/search?q=${query}`;
}

function preferredLeadSourceProfiles(task) {
  const overseas = !["中国", "China"].includes(task.country);
  const primaryIds = overseas ? ["google-maps", "search-web", "industry-directory"] : ["baidu-maps", "amap", "dianping"];
  const taskPlatform = String(task.platform || "").toLowerCase();
  const matchedPlatform = B2B_LEAD_SOURCE_PROFILES.find((profile) => taskPlatform && profile.platform.toLowerCase().includes(taskPlatform));
  return [
    ...(matchedPlatform ? [matchedPlatform] : []),
    ...primaryIds.map((id) => B2B_LEAD_SOURCE_PROFILES.find((profile) => profile.id === id)).filter(Boolean)
  ].filter((profile, index, list) => list.findIndex((item) => item.id === profile.id) === index);
}

function buildLeadSourcePlan(task, profile) {
  return {
    id: `lead-source-${task.id}-${profile.id}`,
    taskId: task.id,
    researchId: task.researchId,
    productIntent: task.productIntent,
    country: task.country,
    city: task.city,
    platform: profile.platform,
    sourceType: profile.sourceType,
    coverage: profile.coverage,
    keyword: leadSourceSearchQuery(task, profile),
    generatedUrl: leadSourceUrl(task, profile),
    parseMode: profile.parseMode,
    expectedFields: profile.expectedFields,
    safetyRule: profile.safetyRule,
    cadence: profile.cadence,
    status: "待打开",
    createdAt: new Date().toISOString()
  };
}

function generateLeadSourcePlans(researchId) {
  const tasks = state.leadSearchTasks.filter((task) => task.researchId === researchId).slice(0, 36);
  if (!tasks.length) return;
  const existingIds = new Set(state.leadSourcePlans.map((plan) => plan.id));
  const plans = tasks.flatMap((task) => preferredLeadSourceProfiles(task).map((profile) => buildLeadSourcePlan(task, profile))).filter((plan) => !existingIds.has(plan.id));
  state.leadSourcePlans = [...plans, ...state.leadSourcePlans].slice(0, 500);
  logAction("b2b.lead_sources_generated", { researchId, count: plans.length });
  saveWorkspaceState();
  render();
}

function updateLeadSourcePlanStatus(planId, status) {
  const plan = state.leadSourcePlans.find((item) => item.id === planId);
  if (!plan) return;
  plan.status = status;
  plan.updatedAt = new Date().toISOString();
  if (status === "已解析") {
    const task = state.leadSearchTasks.find((item) => item.id === plan.taskId);
    if (task && task.status === "待采集") task.status = "解析中";
  }
  logAction("b2b.lead_source_status_updated", { planId, status, platform: plan.platform, keyword: plan.keyword });
  saveWorkspaceState();
  render();
}

function latestLeadSourceRun(planId) {
  return state.leadSourceRuns.find((run) => run.planId === planId) || null;
}

function upsertLeadSourceRun(plan, updates = {}) {
  const existing = latestLeadSourceRun(plan.id);
  const now = new Date().toISOString();
  if (existing) {
    Object.assign(existing, updates, { updatedAt: now });
    return existing;
  }
  const run = {
    id: `lead-run-${plan.id}`,
    planId: plan.id,
    taskId: plan.taskId,
    researchId: plan.researchId,
    productIntent: plan.productIntent,
    country: plan.country,
    city: plan.city,
    platform: plan.platform,
    sourceType: plan.sourceType,
    keyword: plan.keyword,
    sourceUrl: plan.generatedUrl,
    parseMode: plan.parseMode,
    expectedFields: plan.expectedFields,
    status: "待打开",
    openedAt: "",
    parsedAt: "",
    confirmedAt: "",
    parsedLeadCount: 0,
    confirmedLeadCount: 0,
    createdAt: now,
    updatedAt: now,
    ...updates
  };
  state.leadSourceRuns = [run, ...state.leadSourceRuns].slice(0, 500);
  return run;
}

function openLeadSourcePlan(planId) {
  const plan = state.leadSourcePlans.find((item) => item.id === planId);
  if (!plan) return;
  const now = new Date().toISOString();
  plan.status = "已记录";
  plan.openedAt = now;
  plan.updatedAt = now;
  const run = upsertLeadSourceRun(plan, { status: "已记录", openedAt: now });
  state.selectedLeadSourcePlanId = plan.id;
  logAction("b2b.lead_source_opened", { planId, runId: run.id, platform: plan.platform, keyword: plan.keyword });
  saveWorkspaceState();
  render();
}

function prepareLeadSourceForParsing(planId) {
  const plan = state.leadSourcePlans.find((item) => item.id === planId);
  if (!plan) return;
  const now = new Date().toISOString();
  plan.status = "待解析";
  plan.updatedAt = now;
  const run = upsertLeadSourceRun(plan, { status: "待解析", openedAt: plan.openedAt || now });
  state.selectedLeadSourcePlanId = plan.id;
  logAction("b2b.lead_source_parse_prepared", { planId, runId: run.id, platform: plan.platform, keyword: plan.keyword });
  saveWorkspaceState();
  render();
}

function normalizeLeadPhone(text) {
  const phone = String(text || "").match(/(?:\+?\d[\d\s().-]{6,}\d)|(?:0\d{2,4}[-\s]?\d{6,8})|(?:1[3-9]\d{9})/);
  return phone ? phone[0].replace(/\s{2,}/g, " ").trim() : "";
}

function extractLeadUrl(text) {
  return (String(text || "").match(/https?:\/\/[^\s,，)）]+/i) || [])[0] || "";
}

function extractLeadRating(text) {
  const rating = String(text || "").match(/(?:评分|rating|stars?)[:：\s]*([1-5](?:\.\d)?)/i) || String(text || "").match(/\b([1-5]\.\d)\b/);
  return rating ? Number(rating[1]) : null;
}

function extractReviewCount(text) {
  const review = String(text || "").match(/(?:评论|评价|reviews?)[:：\s]*(\d{1,6})/i) || String(text || "").match(/(\d{1,6})\s*(?:条评论|reviews?)/i);
  return review ? Number(review[1]) : null;
}

function leadScoreForCandidate(candidate) {
  let value = 25;
  if (candidate.businessName) value += 10;
  if (candidate.phone) value += 20;
  if (candidate.website || candidate.sourceUrl) value += 12;
  if (candidate.address) value += 12;
  if (candidate.rating && candidate.rating >= 4) value += 8;
  if (candidate.reviewCount && candidate.reviewCount >= 20) value += 8;
  if (candidate.businessType && candidate.businessName && candidate.businessName.includes(candidate.businessType.slice(0, 2))) value += 5;
  return Math.min(100, value);
}

function splitLeadBlocks(rawText) {
  const text = String(rawText || "").replace(/\r/g, "").trim();
  if (!text) return [];
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length > 1) return blocks;
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseStoreLeadCandidates(rawText, context) {
  const blocks = splitLeadBlocks(rawText);
  const candidates = blocks
    .map((block, index) => {
      const parts = block
        .split(/\t|\||,|，/)
        .map((part) => part.trim())
        .filter(Boolean);
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const firstText = parts[0] || lines[0] || `店铺线索 ${index + 1}`;
      const phone = normalizeLeadPhone(block);
      const url = extractLeadUrl(block);
      const rating = extractLeadRating(block);
      const reviewCount = extractReviewCount(block);
      const address =
        parts.find((part) => /路|街|区|市|省|road|street|avenue|bangkok|manila|hanoi|jakarta|city/i.test(part) && part !== firstText) ||
        lines.find((line) => /地址|address|road|street|区|市|จังหวัด|ถนน/i.test(line)) ||
        "";
      const businessName = firstText.replace(/^店名[:：]\s*/, "").slice(0, 100);
      const candidate = {
        id: `lead-candidate-${Date.now()}-${index}`,
        sourcePlanId: context.sourcePlanId || "",
        queryRunId: context.queryRunId || "",
        productIntent: context.productIntent,
        country: context.country,
        city: context.city,
        businessName,
        businessType: context.targetCustomerType,
        address: address.replace(/^地址[:：]\s*/i, "").slice(0, 180),
        phone,
        website: url,
        socialUrl: /facebook|instagram|line|whatsapp/i.test(url) ? url : "",
        sourceUrl: context.sourceUrl || url,
        rating,
        reviewCount,
        sourcePlatform: context.sourcePlatform,
        sourceMode: "visible_page_capture",
        sourceKeyword: context.keyword,
        collectedAt: new Date().toISOString(),
        confidenceLevel: phone || url ? "B" : "C",
        matchReason: `${context.keyword || context.productIntent} 可见页结果，目标客户类型为 ${context.targetCustomerType}`,
        leadScore: 0,
        status: "待确认",
        rawText: block.slice(0, 600)
      };
      candidate.leadScore = leadScoreForCandidate(candidate);
      return candidate;
    })
    .filter((candidate) => candidate.businessName && candidate.businessName.length > 1);

  const unique = new Map();
  candidates.forEach((candidate) => {
    const key = `${candidate.businessName}-${candidate.phone || candidate.address || candidate.sourceUrl}`.toLowerCase();
    if (!unique.has(key)) unique.set(key, candidate);
  });
  return [...unique.values()].slice(0, 80);
}

function previewStoreLeadCollection(form) {
  const formData = new FormData(form);
  const taskId = String(formData.get("taskId") || "");
  const task = state.leadSearchTasks.find((item) => item.id === taskId);
  const productIntent = String(formData.get("productIntent") || task?.productIntent || "").trim();
  const context = {
    taskId,
    sourcePlanId: String(formData.get("sourcePlanId") || "").trim(),
    queryRunId: String(formData.get("queryRunId") || "").trim(),
    productIntent,
    country: String(formData.get("country") || task?.country || "").trim(),
    city: String(formData.get("city") || task?.city || "").trim(),
    sourcePlatform: String(formData.get("sourcePlatform") || task?.platform || "").trim(),
    keyword: String(formData.get("keyword") || task?.keyword || "").trim(),
    targetCustomerType: String(formData.get("targetCustomerType") || task?.targetCustomerType || "").trim(),
    sourceUrl: String(formData.get("sourceUrl") || "").trim()
  };
  const rawText = String(formData.get("rawText") || "");
  const candidates = parseStoreLeadCandidates(rawText, context);
  state.storeLeadDraft = {
    id: `store-lead-draft-${Date.now()}`,
    ...context,
    rawText: rawText.slice(0, 12000),
    candidates,
    createdAt: new Date().toISOString()
  };
  logAction("b2b.store_leads_previewed", { productIntent, count: candidates.length, keyword: context.keyword });
  if (context.sourcePlanId) {
    const plan = state.leadSourcePlans.find((item) => item.id === context.sourcePlanId);
    if (plan) {
      plan.status = "已解析";
      plan.parsedLeadCount = candidates.length;
      plan.parsedAt = new Date().toISOString();
      plan.updatedAt = plan.parsedAt;
      upsertLeadSourceRun(plan, {
        status: "已解析",
        parsedAt: plan.parsedAt,
        parsedLeadCount: candidates.length
      });
    }
  }
  saveWorkspaceState();
  render();
}

function confirmStoreLeadCollection() {
  const draft = state.storeLeadDraft;
  if (!draft?.candidates?.length) return;
  const existingKeys = new Set(
    state.storeLeads.map((lead) => `${lead.businessName}-${lead.phone || lead.address || lead.sourceUrl}`.toLowerCase())
  );
  const confirmedAt = new Date().toISOString();
  const newLeads = draft.candidates
    .filter((candidate) => !existingKeys.has(`${candidate.businessName}-${candidate.phone || candidate.address || candidate.sourceUrl}`.toLowerCase()))
    .map((candidate) => ({
      ...candidate,
      id: `store-lead-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      status: "待联系",
      confirmedAt
    }));
  state.storeLeads = [...newLeads, ...state.storeLeads].slice(0, 500);
  if (draft.taskId) {
    const task = state.leadSearchTasks.find((item) => item.id === draft.taskId);
    if (task) {
      task.status = "已采集";
      task.collectedLeadCount = (task.collectedLeadCount || 0) + newLeads.length;
      task.updatedAt = confirmedAt;
    }
  }
  if (draft.sourcePlanId) {
    const plan = state.leadSourcePlans.find((item) => item.id === draft.sourcePlanId);
    if (plan) {
      plan.status = "已入池";
      plan.confirmedLeadCount = (plan.confirmedLeadCount || 0) + newLeads.length;
      plan.updatedAt = confirmedAt;
      upsertLeadSourceRun(plan, {
        status: "已入池",
        confirmedAt,
        confirmedLeadCount: ((latestLeadSourceRun(plan.id)?.confirmedLeadCount || 0) + newLeads.length)
      });
    }
  }
  logAction("b2b.store_leads_confirmed", { count: newLeads.length, keyword: draft.keyword });
  state.storeLeadDraft = null;
  saveWorkspaceState();
  render();
}

function discardStoreLeadDraft() {
  state.storeLeadDraft = null;
  saveWorkspaceState();
  render();
}

function updateStoreLeadStatus(leadId, status) {
  const lead = state.storeLeads.find((item) => item.id === leadId);
  if (!lead) return;
  lead.status = status;
  lead.updatedAt = new Date().toISOString();
  logAction("b2b.store_lead_status_updated", { leadId, status, businessName: lead.businessName });
  saveWorkspaceState();
  render();
}

function removeStoreLead(leadId) {
  const lead = state.storeLeads.find((item) => item.id === leadId);
  if (!lead) return;
  state.storeLeads = state.storeLeads.filter((item) => item.id !== leadId);
  logAction("b2b.store_lead_removed", { leadId, businessName: lead.businessName });
  saveWorkspaceState();
  render();
}

function renderDemandCountryCard(country) {
  return `
    <article class="opportunity-card">
      <div class="card-row">
        <div>
          <div class="card-title">${h(country.country)}</div>
          <div class="card-meta">${h(country.region)} · ${h(country.scoreLabel)}</div>
        </div>
        <span class="score-badge">${score(country.score)}</span>
      </div>
      <div class="tag-row">
        ${country.customerTypes.slice(0, 4).map((type) => `<span class="tag">${h(type)}</span>`).join("")}
      </div>
      <div class="data-grid compact-data-grid">
        <div class="data-cell"><span>重点城市</span><strong>${h(country.cities.slice(0, 3).join(" / "))}</strong></div>
        <div class="data-cell"><span>搜索词</span><strong>${h(country.searchTerms.slice(0, 3).join(" / "))}</strong></div>
      </div>
      <p class="muted">${h(country.evidence.join("；"))}</p>
    </article>
  `;
}

function renderDemandResearch() {
  const selected = state.demandResearches.find((item) => item.id === state.selectedDemandResearchId) || state.demandResearches[0] || null;
  if (selected && state.selectedDemandResearchId !== selected.id) state.selectedDemandResearchId = selected.id;
  const tasks = selected ? state.leadSearchTasks.filter((task) => task.researchId === selected.id) : [];
  const sourcePlans = selected ? state.leadSourcePlans.filter((plan) => plan.researchId === selected.id) : [];
  const sourceRuns = selected ? state.leadSourceRuns.filter((run) => run.researchId === selected.id) : [];
  const selectedSourcePlan =
    sourcePlans.find((plan) => plan.id === state.selectedLeadSourcePlanId) || sourcePlans.find((plan) => plan.status === "待解析") || null;
  const readyTasks = tasks.filter((task) => task.status === "待采集").length;
  const selectedTask = selectedSourcePlan ? tasks.find((task) => task.id === selectedSourcePlan.taskId) || tasks[0] || {} : tasks.find((task) => task.status === "待采集") || tasks[0] || {};
  const selectedRun = selectedSourcePlan ? latestLeadSourceRun(selectedSourcePlan.id) : null;
  const relatedLeads = selected ? state.storeLeads.filter((lead) => lead.productIntent === selected.productIntent) : state.storeLeads;
  const draft = state.storeLeadDraft;
  const targetCountries = selected?.countries.length || 0;
  const targetCities = selected ? new Set(tasks.map((task) => `${task.country}-${task.city}`)).size : 0;

  elements.views.demandResearch.innerHTML = `
    ${pageGuide(
      "ToB 需求探查",
      "先通过网络需求信号判断哪些国家可能需要某类商品，再生成目标国家内的地图/点评/行业目录搜索任务。当前版本先做本地分析和低频定点采集任务，不自动绕过登录、验证码或隐藏联系方式。",
      [{ view: "dataSources", label: "查看数据源规则" }]
    )}
    <div class="metrics-grid">
      ${metricCard("需求项目", state.demandResearches.length, "已经创建的商品需求探查")}
      ${metricCard("推荐国家", targetCountries, "当前项目建议优先验证的国家")}
      ${metricCard("目标城市", targetCities, "会生成定点搜索任务的城市")}
      ${metricCard("待采集任务", readyTasks, "下一步进入地图/点评可见页采集")}
      ${metricCard("信息源", sourcePlans.length, "自动生成的地图/目录/搜索入口")}
      ${metricCard("查询记录", sourceRuns.length, "已记录或准备解析的外部来源")}
      ${metricCard("店铺线索", state.storeLeads.length, "已确认进入本地线索池")}
    </div>

    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">需求输入</p>
          <h2>输入商品，生成国家需求判断</h2>
        </div>
      </div>
      <form class="panel-body discovery-form demand-form" data-demand-form>
        <label>
          商品 / 类目
          <input name="productIntent" type="text" value="钓鱼竿" placeholder="例如：钓鱼竿、宠物梳、露营灯、车载收纳">
        </label>
        <label>
          目标区域
          <select name="targetRegion">
            <option value="东南亚">东南亚</option>
            <option value="北美">北美</option>
            <option value="all">全部样例国家</option>
          </select>
        </label>
        <label class="wide-field">
          指定国家，可选
          <input name="selectedCountries" type="text" placeholder="例如：泰国,菲律宾,越南；为空则按区域推荐">
        </label>
        <button class="primary-button" type="submit">生成需求分析</button>
      </form>
    </section>

    ${
      selected
        ? `
          <div class="two-column">
            <section class="panel">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">国家判断</p>
                  <h2>${h(selected.productIntent)} 的优先需求国家</h2>
                </div>
                <span class="tag info">${h(selected.status)}</span>
              </div>
              <div class="panel-body opportunity-list">
                ${selected.countries.map(renderDemandCountryCard).join("")}
              </div>
            </section>
            <section class="panel">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">采集任务</p>
                  <h2>从国家需求转成店铺联系方式搜索</h2>
                </div>
              </div>
              <div class="panel-body detail-stack">
                ${detailRows([
                  ["商品意图", selected.productIntent],
                  ["需求信号来源", selected.dataSources.join(" / ")],
                  ["采集原则", "低频、定点、公开可见、人工确认，不绕验证码或登录限制"],
                  ["线索字段", "店名、地址、公开电话、官网/社媒、评分、评论数、来源 URL、关键词、采集时间"]
                ])}
                <div class="checklist-grid">
                  <div class="check-item is-ok"><span>第 1 步</span><strong>需求国家</strong><p>用网络信号和场景规则筛出国家。</p></div>
                  <div class="check-item is-ok"><span>第 2 步</span><strong>目标店铺</strong><p>转成钓具店、户外店、批发商等客户类型。</p></div>
                  <div class="check-item is-missing"><span>第 3 步</span><strong>联系方式</strong><p>通过地图/点评/目录采集公开联系方式。</p></div>
                  <div class="check-item is-missing"><span>第 4 步</span><strong>销售跟进</strong><p>进入线索池和 CRM 状态流转。</p></div>
                </div>
              </div>
            </section>
          </div>
          <section class="table-panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">低频定点采集</p>
                <h2>地图 / 点评 / 搜索任务</h2>
              </div>
              <button class="small-button" type="button" data-generate-lead-sources="${h(selected.id)}">自动生成信息源</button>
            </div>
            <div class="panel-body subtle-panel">
              <p class="muted">每个任务建议 20-30 条，合计一两百条足够验证。点击自动生成信息源后，系统会为每个国家/城市/客户类型生成地图、点评、行业目录和网页搜索入口，并附带可解析字段规则。</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>国家 / 城市</th>
                  <th>来源平台</th>
                  <th>搜索关键词</th>
                  <th>目标客户</th>
                  <th>建议条数</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                ${tasks
                  .slice(0, 36)
                  .map(
                    (task) => `
                      <tr>
                        <td><strong>${h(task.country)}</strong><br><span class="muted">${h(task.city)}</span></td>
                        <td>${h(task.platform)}<br><span class="muted">${h(task.collectionMode)}</span></td>
                        <td>${h(task.keyword)}</td>
                        <td>${h(task.targetCustomerType)}</td>
                        <td>${h(task.suggestedLimit)}</td>
                        <td><span class="tag ${statusClass(task.status)}">${h(task.status)}</span></td>
                        <td>
                          <button class="small-button" type="button" data-lead-task-status="${h(task.id)}" data-status="已采集">标记已采集</button>
                        </td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </section>
          <section class="table-panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">信息源自动发现</p>
                <h2>系统生成来源入口和解析规则</h2>
              </div>
              <span class="muted">真实抓取阶段用浏览器辅助或官方 API 接入；当前先规范入口、字段和状态。</span>
            </div>
            <div class="table-scroll">
              <table class="compact-table">
                <thead>
                  <tr>
                    <th>国家 / 城市</th>
                    <th>信息源</th>
                    <th>搜索词</th>
                    <th>解析字段</th>
                    <th>方式 / 边界</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    sourcePlans.length === 0
                      ? `<tr><td colspan="7" class="muted">还没有生成信息源。先点“自动生成信息源”，系统会按当前采集任务生成地图、点评、目录和网页搜索入口。</td></tr>`
                      : sourcePlans
                          .slice(0, 90)
                          .map(
                            (plan) => `
                              <tr>
                                <td><strong>${h(plan.country)}</strong><br><span class="muted">${h(plan.city)}</span></td>
                                <td>${h(plan.platform)}<br><span class="muted">${h(plan.sourceType)} / ${h(plan.coverage)}</span></td>
                                <td class="wide-note">${h(plan.keyword)}<br><a href="${h(plan.generatedUrl)}" target="_blank" rel="noopener">打开来源</a></td>
                                <td class="wide-note">${h((plan.expectedFields || []).join("、"))}</td>
                                <td class="wide-note">${h(plan.parseMode)}<br><span class="muted">${h(plan.safetyRule)}</span></td>
                                <td><span class="tag ${statusClass(plan.status)}">${h(plan.status)}</span></td>
                                <td>
                                  <select class="inline-select" data-lead-source-status="${h(plan.id)}">
                                    ${["待打开", "已记录", "待解析", "已解析", "已入池", "失败", "跳过"].map((status) => `<option value="${status}" ${plan.status === status ? "selected" : ""}>${status}</option>`).join("")}
                                  </select>
                                  <button class="small-button" type="button" data-open-lead-source="${h(plan.id)}">记录查询</button>
                                  <button class="small-button" type="button" data-prepare-lead-source="${h(plan.id)}">带入解析</button>
                                </td>
                              </tr>
                            `
                          )
                          .join("")
                  }
                </tbody>
              </table>
            </div>
          </section>
          <section class="table-panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">查询记录</p>
                <h2>外部网站查询和解析链路</h2>
              </div>
              <span class="muted">记录每次打开来源、准备解析、预览解析和确认入池。</span>
            </div>
            <div class="table-scroll">
              <table class="compact-table">
                <thead>
                  <tr>
                    <th>来源</th>
                    <th>查询词</th>
                    <th>时间</th>
                    <th>结果</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    sourceRuns.length === 0
                      ? `<tr><td colspan="5" class="muted">还没有外部查询记录。打开来源后点击“记录查询”，这里会形成查询批次。</td></tr>`
                      : sourceRuns
                          .slice(0, 60)
                          .map(
                            (run) => `
                              <tr>
                                <td><strong>${h(run.platform)}</strong><br><span class="muted">${h(run.country)} / ${h(run.city)}</span></td>
                                <td class="wide-note">${h(run.keyword)}<br><a href="${h(run.sourceUrl)}" target="_blank" rel="noopener">来源链接</a></td>
                                <td>记录：${h(run.openedAt ? formatDateTime(run.openedAt) : "待记录")}<br><span class="muted">解析：${h(run.parsedAt ? formatDateTime(run.parsedAt) : "待解析")}</span></td>
                                <td>${h(run.parsedLeadCount || 0)} 预览<br><span class="muted">${h(run.confirmedLeadCount || 0)} 入池</span></td>
                                <td><span class="tag ${statusClass(run.status)}">${h(run.status)}</span></td>
                              </tr>
                            `
                          )
                          .join("")
                  }
                </tbody>
              </table>
            </div>
          </section>
          <section class="panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">可见页采集</p>
                <h2>粘贴地图/点评/目录结果，解析店铺线索</h2>
              </div>
              <span class="muted">先预览，确认后才进入线索池。</span>
            </div>
            <form class="panel-body competitor-form lead-collection-form" data-store-lead-form>
              <input type="hidden" name="sourcePlanId" value="${h(selectedSourcePlan?.id || "")}">
              <input type="hidden" name="queryRunId" value="${h(selectedRun?.id || "")}">
              <label>
                关联任务
                <select name="taskId">
                  ${tasks
                    .slice(0, 36)
                    .map(
                      (task) => `<option value="${h(task.id)}" ${task.id === selectedTask.id ? "selected" : ""}>${h(task.country)} / ${h(task.city)} / ${h(task.keyword)}</option>`
                    )
                    .join("")}
                </select>
              </label>
              <label>
                商品意图
                <input name="productIntent" type="text" value="${h(selected.productIntent)}">
              </label>
              <label>
                来源平台
                <input name="sourcePlatform" type="text" value="${h(selectedSourcePlan?.platform || selectedTask.platform || "Google Maps")}" placeholder="Google Maps / 高德地图 / 大众点评">
              </label>
              <label>
                国家
                <input name="country" type="text" value="${h(selectedSourcePlan?.country || selectedTask.country || selected.countries[0]?.country || "")}">
              </label>
              <label>
                城市
                <input name="city" type="text" value="${h(selectedSourcePlan?.city || selectedTask.city || selected.countries[0]?.cities?.[0] || "")}">
              </label>
              <label>
                搜索关键词
                <input name="keyword" type="text" value="${h(selectedSourcePlan?.keyword || selectedTask.keyword || "")}">
              </label>
              <label>
                目标客户
                <input name="targetCustomerType" type="text" value="${h(selectedTask.targetCustomerType || selected.countries[0]?.customerTypes?.[0] || "")}">
              </label>
              <label class="wide-field">
                来源 URL
                <input name="sourceUrl" type="url" value="${h(selectedSourcePlan?.generatedUrl || "")}" placeholder="地图、点评、行业目录或搜索结果页面 URL">
              </label>
              <label class="wide-field">
                粘贴可见内容
                <textarea name="rawText" rows="10" placeholder="支持一行一个店铺，或用空行分隔店铺块。例如：&#10;ABC Fishing Tackle | +66 2 123 4567 | Bangkok | 4.5 | 128 reviews | https://...&#10;曼谷渔具店 地址：Bangkok 电话：+66... 评分：4.3 评论：52"></textarea>
              </label>
              <div class="form-actions wide-field">
                <button class="primary-button" type="submit">解析店铺线索</button>
                <button class="small-button" type="button" data-discard-store-leads>清空预览</button>
              </div>
            </form>
          </section>
          ${
            draft
              ? `<section class="panel">
                  <div class="panel-header">
                    <div>
                      <p class="eyebrow">待确认</p>
                      <h2>店铺线索预览</h2>
                    </div>
                    <div class="tag-row">
                      <span class="tag ${draft.candidates.length > 0 ? "good" : "warning"}">${draft.candidates.length} 条</span>
                      <span class="tag info">${h(draft.sourcePlatform || "未标注来源")}</span>
                    </div>
                  </div>
                  <div class="panel-body detail-stack">
                    ${
                      draft.candidates.length === 0
                        ? `<div class="message-list warning"><p>没有解析到店铺线索。请粘贴店名、电话、地址、链接、评分等当前可见内容；一行一个店铺或用空行分隔。</p></div>`
                        : `<div class="table-scroll">
                            <table class="compact-table">
                              <thead><tr><th>店铺</th><th>联系方式</th><th>地址/来源</th><th>评分</th><th>线索分</th></tr></thead>
                              <tbody>
                                ${draft.candidates
                                  .map(
                                    (lead) => `
                                      <tr>
                                        <td><strong>${h(lead.businessName)}</strong><br><span class="muted">${h(lead.businessType)} / ${h(lead.city)}</span></td>
                                        <td>${h(lead.phone || "待补公开电话")}<br><span class="muted">${h(lead.website || lead.socialUrl || "待补网站/社媒")}</span></td>
                                        <td class="wide-note">${h(lead.address || lead.sourceUrl || lead.rawText)}</td>
                                        <td>${lead.rating || "-"}<br><span class="muted">${lead.reviewCount ? `${lead.reviewCount} 评论` : "评论数待补"}</span></td>
                                        <td><span class="score-badge">${h(lead.leadScore)}</span></td>
                                      </tr>
                                    `
                                  )
                                  .join("")}
                              </tbody>
                            </table>
                          </div>`
                    }
                    <div class="form-actions">
                      <button class="primary-button" type="button" data-confirm-store-leads ${draft.candidates.length > 0 ? "" : "disabled"}>确认加入线索池</button>
                      <button class="small-button" type="button" data-discard-store-leads>放弃预览</button>
                    </div>
                  </div>
                </section>`
              : ""
          }
          <section class="table-panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">线索池</p>
                <h2>已确认店铺线索</h2>
              </div>
              <span class="muted">下一步 T-053 会把这里接成 CRM 跟进流。</span>
            </div>
            <div class="table-scroll">
              <table class="compact-table">
                <thead>
                  <tr>
                    <th>店铺</th>
                    <th>国家/城市</th>
                    <th>联系方式</th>
                    <th>来源</th>
                    <th>线索分</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    relatedLeads.length === 0
                      ? `<tr><td colspan="7" class="muted">还没有确认店铺线索。先从地图/点评/目录页复制可见结果并解析。</td></tr>`
                      : relatedLeads
                          .slice(0, 80)
                          .map(
                            (lead) => `
                              <tr>
                                <td><strong>${h(lead.businessName)}</strong><br><span class="muted">${h(lead.businessType)}</span></td>
                                <td>${h(lead.country)}<br><span class="muted">${h(lead.city)}</span></td>
                                <td>${h(lead.phone || "待补公开电话")}<br><span class="muted">${h(lead.website || lead.socialUrl || "-")}</span></td>
                                <td>${h(lead.sourcePlatform)}<br><span class="muted">${h(lead.sourceKeyword)}</span></td>
                                <td><span class="score-badge">${h(lead.leadScore)}</span></td>
                                <td><span class="tag ${statusClass(lead.status)}">${h(lead.status)}</span></td>
                                <td>
                                  <select class="inline-select" data-store-lead-status="${h(lead.id)}">
                                    ${["待联系", "已联系", "有意向", "报价中", "成交", "无效"].map((status) => `<option value="${status}" ${lead.status === status ? "selected" : ""}>${status}</option>`).join("")}
                                  </select>
                                  <button class="small-button" type="button" data-remove-store-lead="${h(lead.id)}">移除</button>
                                </td>
                              </tr>
                            `
                          )
                          .join("")
                  }
                </tbody>
              </table>
            </div>
          </section>
        `
        : `<section class="panel"><div class="panel-body"><p class="muted">还没有需求探查项目。输入商品后，系统会先推荐国家和城市，再生成地图/点评搜索任务。</p></div></section>`
    }
  `;
}

function currencyOptions(selectedCurrency) {
  const currencies = Object.keys(config.fxRatesToCny);
  return currencies
    .map((currency) => `<option value="${h(currency)}" ${currency === selectedCurrency ? "selected" : ""}>${h(currency)}</option>`)
    .join("");
}

function currencyFromText(text, fallback) {
  if (/฿|THB/i.test(text)) return "THB";
  if (/Rp|IDR/i.test(text)) return "IDR";
  if (/₫|VND/i.test(text)) return "VND";
  if (/₱|PHP/i.test(text)) return "PHP";
  if (/₽|RUB/i.test(text)) return "RUB";
  return fallback;
}

function normalizePriceNumber(raw) {
  const cleaned = String(raw || "")
    .replace(/[^\d.,]/g, "")
    .replace(/,(?=\d{3}(\D|$))/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function extractCompetitorSamples(rawText, fallbackCurrency) {
  const lines = String(rawText || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const pricePattern =
    /((?:฿|₽|₱|₫|Rp|THB|IDR|VND|PHP|RUB)\s*[\d.,]+|[\d.,]+\s*(?:THB|IDR|VND|PHP|RUB))/gi;
  const urlPattern = /https?:\/\/\S+/i;
  const samples = [];

  lines.forEach((line, index) => {
    const matches = Array.from(line.matchAll(pricePattern));
    const match = matches[matches.length - 1];
    if (!match) return;
    const price = normalizePriceNumber(match[0]);
    if (!price || price <= 0) return;
    const currency = currencyFromText(match[0], fallbackCurrency);
    const url = (line.match(urlPattern) || [])[0] || "";
    const title = line
      .replace(urlPattern, "")
      .replace(match[0], "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 120);
    samples.push({
      id: `sample-${Date.now()}-${index}`,
      title: title || `竞品 ${samples.length + 1}`,
      price,
      currency,
      priceCny: Number((price * (config.fxRatesToCny[currency] || 1)).toFixed(2)),
      url,
      rawLine: line.slice(0, 260)
    });
  });

  const unique = new Map();
  samples.forEach((sample) => {
    const key = `${sample.title}-${sample.price}-${sample.currency}`;
    if (!unique.has(key)) unique.set(key, sample);
  });
  return [...unique.values()].slice(0, 40);
}

function priceBandFromSamples(samples) {
  const prices = samples.map((sample) => sample.priceCny).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (prices.length === 0) return null;
  const midIndex = Math.floor(prices.length / 2);
  const median = prices.length % 2 === 0 ? (prices[midIndex - 1] + prices[midIndex]) / 2 : prices[midIndex];
  return {
    low: Number(prices[0].toFixed(2)),
    mid: Number(median.toFixed(2)),
    high: Number(prices[prices.length - 1].toFixed(2)),
    count: prices.length
  };
}

function previewCompetitorCollection(form) {
  const formData = new FormData(form);
  const productId = String(formData.get("marketProductId") || "");
  const product = marketProducts.find((item) => item.id === productId);
  const currency = String(formData.get("currency") || product?.currency || "THB");
  const rawText = String(formData.get("rawText") || "");
  const samples = extractCompetitorSamples(rawText, currency);
  const band = priceBandFromSamples(samples);

  state.competitorDraft = {
    id: `competitor-draft-${Date.now()}`,
    marketProductId: productId,
    platform: String(formData.get("platform") || product?.platform || "").trim(),
    country: String(formData.get("country") || product?.country || "").trim(),
    keyword: String(formData.get("keyword") || product?.category || "").trim(),
    sourceUrl: String(formData.get("sourceUrl") || "").trim(),
    currency,
    rawText: rawText.slice(0, 12000),
    samples,
    band,
    createdAt: new Date().toISOString()
  };
  logAction("competitor.previewed", { title: product?.localTitle || productId, count: samples.length });
  saveWorkspaceState();
  render();
}

function confirmCompetitorCollection() {
  const draft = state.competitorDraft;
  if (!draft?.band || draft.samples.length === 0) return;
  const product = marketProducts.find((item) => item.id === draft.marketProductId);
  if (!product) return;
  const snapshot = {
    ...draft,
    id: `competitor-${Date.now()}`,
    confirmedAt: new Date().toISOString(),
    rawText: draft.rawText.slice(0, 4000)
  };
  state.competitorSnapshots.unshift(snapshot);
  state.competitorSnapshots = state.competitorSnapshots.slice(0, 80);
  product.competitorLowCny = snapshot.band.low;
  product.competitorMidCny = snapshot.band.mid;
  product.competitorHighCny = snapshot.band.high;
  product.competitorSampleCount = snapshot.samples.length;
  product.competitorSnapshotId = snapshot.id;
  product.competitorSourcePlatform = snapshot.platform;
  product.competitorKeyword = snapshot.keyword;
  product.competitorUpdatedAt = snapshot.confirmedAt;
  product.competitorSourceUrl = snapshot.sourceUrl;
  state.competitorDraft = null;
  state.selectedId = `op-${product.id}`;
  state.view = "opportunities";
  logAction("competitor.confirmed", { title: product.localTitle, count: snapshot.samples.length });
  saveWorkspaceState();
  render();
}

function discardCompetitorDraft() {
  state.competitorDraft = null;
  saveWorkspaceState();
  render();
}

function currencyForCountry(country) {
  const currencies = {
    泰国: "THB",
    印尼: "IDR",
    越南: "VND",
    菲律宾: "PHP",
    俄罗斯: "RUB"
  };
  return currencies[country] || "THB";
}

function platformForCountry(country) {
  if (country === "俄罗斯") return "Ozon";
  if (country === "印尼" || country === "菲律宾") return "TikTok Shop";
  return "Shopee";
}

function priceForCountry(country, baseCny) {
  const fx = config.fxRatesToCny[currencyForCountry(country)] || 1;
  return Math.max(1, Math.round(baseCny / fx));
}

function inferCategoryFromText(text) {
  const value = text.toLowerCase();
  if (value.includes("pet") || value.includes("cat") || value.includes("dog") || value.includes("宠")) return "宠物用品";
  if (value.includes("car") || value.includes("auto") || value.includes("车")) return "汽车配件";
  if (value.includes("beauty") || value.includes("makeup") || value.includes("lash") || value.includes("美妆")) return "美妆工具";
  if (value.includes("phone") || value.includes("mobile") || value.includes("charger") || value.includes("手机")) return "手机配件";
  if (value.includes("kitchen") || value.includes("storage") || value.includes("home") || value.includes("收纳")) return "家居收纳";
  if (value.includes("outdoor") || value.includes("camp") || value.includes("sport") || value.includes("户外")) return "户外运动";
  return "家居收纳";
}

function titleFromUrl(urlText) {
  try {
    const url = new URL(urlText);
    const tokens = decodeURIComponent(url.pathname)
      .replace(/\.[a-z0-9]+$/i, "")
      .split(/[-_/]+/)
      .filter((token) => token && !/^\d+$/.test(token))
      .slice(-6);
    return tokens.length > 0 ? tokens.join(" ") : url.hostname.replace(/^www\./, "");
  } catch {
    return urlText.trim();
  }
}

function discoveryTemplates(category, seedTitle) {
  const templates = {
    家居收纳: [
      ["折叠台面收纳架", "Foldable countertop organizer"],
      ["厨房水槽沥水篮", "Sink drain basket organizer"],
      ["免打孔墙面置物架", "No-drill wall storage shelf"]
    ],
    美妆工具: [
      ["便携充电睫毛夹", "Portable rechargeable eyelash curler"],
      ["旅行化妆刷清洁器", "Travel makeup brush cleaner"],
      ["LED 折叠化妆镜", "Foldable LED makeup mirror"]
    ],
    宠物用品: [
      ["宠物除毛按摩手套", "Pet grooming massage glove"],
      ["猫狗便携饮水杯", "Portable pet water bottle"],
      ["可折叠宠物外出包", "Foldable pet carrier bag"]
    ],
    汽车配件: [
      ["汽车座椅缝隙收纳盒", "Car seat gap organizer"],
      ["车载防滑手机支架", "Anti-slip car phone holder"],
      ["后备箱折叠收纳箱", "Foldable trunk storage box"]
    ],
    手机配件: [
      ["磁吸手机支架", "Magnetic phone stand"],
      ["多口快充数据线", "Multi-port fast charging cable"],
      ["防水骑行手机包", "Waterproof bike phone pouch"]
    ],
    户外运动: [
      ["露营折叠灯", "Foldable camping lantern"],
      ["便携户外餐具套装", "Portable outdoor cutlery set"],
      ["防水运动腰包", "Waterproof running waist bag"]
    ]
  };
  const base = templates[category] || templates.家居收纳;
  if (!seedTitle) return base;
  return [[`${seedTitle} 改良款`, `${seedTitle} upgraded model`], ...base].slice(0, 3);
}

function createDiscoveryCandidate({ sourceType, sourceInput, category, country, platform, index, seedTitle }) {
  const template = discoveryTemplates(category, seedTitle)[index];
  const baseCost = 12 + index * 4 + category.length;
  const priceCny = baseCost * (2.8 + index * 0.3);
  const salesSignal = 1800 + index * 1300 + category.length * 120;
  const competitionLevel = Math.min(78, 42 + index * 8 + category.length);
  return {
    id: `dc-${Date.now()}-${index}`,
    sourceType,
    sourceInput,
    category,
    country,
    platform,
    localTitle: template[0],
    translatedTitle: template[1],
    price: priceForCountry(country, priceCny),
    currency: currencyForCountry(country),
    estimatedPurchasePriceCny: baseCost,
    estimatedLogisticsCostCny: country === "俄罗斯" ? 24 + index * 3 : 9 + index * 2,
    rating: Number((4.4 + index * 0.1).toFixed(1)),
    reviewCount: 420 + index * 380,
    salesSignal,
    rankTrend: 8 + index * 7,
    competitionLevel,
    researchScore: Math.max(35, Math.round(88 - competitionLevel * 0.45 + Math.log10(salesSignal) * 8)),
    reason: sourceType === "url" ? "从商品链接解析关键词后生成相似机会" : "从类目趋势、轻小件和跨境履约友好度生成候选",
    riskNote: category === "电池" || country === "俄罗斯" ? "需要合规复核" : "常规类目，先做小单验证",
    status: "待决策",
    createdAt: new Date().toISOString()
  };
}

function runDiscovery(form) {
  const formData = new FormData(form);
  const urlText = String(formData.get("discoveryUrl") || "").trim();
  const categoryInput = String(formData.get("discoveryCategory") || "").trim();
  const country = String(formData.get("discoveryCountry") || "泰国");
  const platform = String(formData.get("discoveryPlatform") || "") || platformForCountry(country);
  const sourceInput = urlText || categoryInput || "家居收纳";
  const seedTitle = urlText ? titleFromUrl(urlText) : "";
  const category = categoryInput || inferCategoryFromText(sourceInput);
  const sourceType = urlText ? "url" : "category";
  const candidates = [0, 1, 2].map((index) =>
    createDiscoveryCandidate({ sourceType, sourceInput, category, country, platform, index, seedTitle })
  );
  state.discoveryCandidates = [...candidates, ...state.discoveryCandidates].slice(0, 12);
  logAction("discovery.generated", { sourceType, sourceInput, category, count: candidates.length });
  saveWorkspaceState();
  render();
}

function findDiscoveryCandidate(candidateId) {
  return state.discoveryCandidates.find((candidate) => candidate.id === candidateId);
}

function addDiscoveryToProductPool(candidateId) {
  const candidate = findDiscoveryCandidate(candidateId);
  if (!candidate) return null;
  const existing = marketProducts.find((product) => product.discoveryCandidateId === candidate.id);
  if (existing) return existing;
  const productId = `mp-dc-${Date.now()}`;
  const product = {
    id: productId,
    discoveryCandidateId: candidate.id,
    platform: candidate.platform,
    country: candidate.country,
    category: candidate.category,
    title: candidate.translatedTitle,
    localTitle: candidate.localTitle,
    price: candidate.price,
    currency: candidate.currency,
    rating: candidate.rating,
    reviewCount: candidate.reviewCount,
    salesSignal: candidate.salesSignal,
    rankTrend: candidate.rankTrend,
    competitionLevel: candidate.competitionLevel,
    logisticsCostCny: candidate.estimatedLogisticsCostCny,
    productUrl: candidate.sourceType === "url" ? candidate.sourceInput : "#",
    owner: "选品运营"
  };
  marketProducts.unshift(product);
  supplierProducts.unshift({
    id: `sp-dc-${Date.now()}`,
    marketProductId: productId,
    sourcePlatform: "待寻源",
    supplierName: "待确认供应商",
    title: candidate.localTitle,
    purchasePriceCny: candidate.estimatedPurchasePriceCny,
    moq: 5,
    dispatchDays: 4,
    supplierRating: 65,
    monthlySales: Math.round(candidate.salesSignal * 0.35),
    supportsDropship: false,
    backupSupplier: "待补充"
  });
  candidate.status = "已加入商品池";
  logAction("discovery.added_to_pool", { candidateId, productId, title: candidate.localTitle });
  refreshFilters();
  state.selectedId = `op-${productId}`;
  saveWorkspaceState();
  render();
  return product;
}

function createListingDraftFromDiscovery(candidateId) {
  const candidate = findDiscoveryCandidate(candidateId);
  if (!candidate) return;
  const product = addDiscoveryToProductPool(candidateId);
  const exists = listingDrafts.some((draft) => draft.marketProductId === product.id);
  if (!exists) {
    listingDrafts.unshift({
      id: `ld-dc-${Date.now()}`,
      marketProductId: product.id,
      platform: candidate.platform,
      country: candidate.country,
      title: candidate.translatedTitle,
      status: "待翻译确认",
      reviewer: "店铺运营",
      price: candidate.price,
      currency: candidate.currency,
      completeness: 72
    });
  }
  candidate.status = "已生成草稿";
  logAction("discovery.listing_draft_created", { candidateId, productId: product.id, title: candidate.localTitle });
  saveWorkspaceState();
  state.view = "listings";
  render();
}

function renderDiscoveryPanel() {
  const candidates = state.discoveryCandidates;
  return `
    <section class="panel discovery-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">主动发现</p>
          <h2>输入链接或类目发现机会</h2>
        </div>
      </div>
      <form class="panel-body discovery-form" data-discovery-form>
        <label>
          商品链接
          <input name="discoveryUrl" type="url" placeholder="https://shopee... 或竞品链接">
        </label>
        <label>
          产品类目 / 关键词
          <input name="discoveryCategory" type="text" placeholder="例如：家居收纳、宠物用品、汽车配件">
        </label>
        <label>
          目标国家
          <select name="discoveryCountry">
            ${["泰国", "印尼", "越南", "菲律宾", "俄罗斯"].map((country) => `<option value="${country}">${country}</option>`).join("")}
          </select>
        </label>
        <label>
          目标平台
          <select name="discoveryPlatform">
            ${["Shopee", "TikTok Shop", "Ozon"].map((platform) => `<option value="${platform}">${platform}</option>`).join("")}
          </select>
        </label>
        <button class="primary-button" type="submit">生成调研候选</button>
      </form>
      <div class="panel-body discovery-note">
        <span class="tag info">本地 MVP</span>
        <p class="muted">当前不会联网抓取页面，只解析链接关键词并生成模拟市场信号。后续可把这里替换成平台搜索、竞品抓取、关键词趋势和广告数据接口。</p>
      </div>
      ${
        candidates.length > 0
          ? `<div class="discovery-grid">
              ${candidates
                .map(
                  (candidate) => `
                    <article class="discovery-card">
                      <div class="card-row">
                        <div>
                          <p class="eyebrow">${candidate.sourceType === "url" ? "链接解析" : "类目发现"}</p>
                          <h3>${h(candidate.localTitle)}</h3>
                          <p class="muted">${h(candidate.translatedTitle)}</p>
                        </div>
                        <span class="score-badge">${candidate.researchScore}</span>
                      </div>
                      <div class="tag-row">
                        <span class="tag">${h(candidate.country)}</span>
                        <span class="tag">${h(candidate.platform)}</span>
                        <span class="tag">${h(candidate.category)}</span>
                        <span class="tag ${candidate.status === "待决策" ? "warning" : "good"}">${h(candidate.status)}</span>
                      </div>
                      <div class="data-grid compact-data-grid">
                        <div class="data-cell"><span>建议售价</span><strong>${h(candidate.price)} ${h(candidate.currency)}</strong></div>
                        <div class="data-cell"><span>采购预估</span><strong>${money(candidate.estimatedPurchasePriceCny)}</strong></div>
                        <div class="data-cell"><span>销量信号</span><strong>${h(candidate.salesSignal)}</strong></div>
                        <div class="data-cell"><span>竞争强度</span><strong>${h(candidate.competitionLevel)}</strong></div>
                      </div>
                      <p class="muted">${h(candidate.reason)}；${h(candidate.riskNote)}</p>
                      <div class="import-actions">
                        <button class="small-button" type="button" data-add-discovery="${h(candidate.id)}">加入商品池</button>
                        <button class="small-button" type="button" data-draft-discovery="${h(candidate.id)}">生成上架草稿</button>
                      </div>
                    </article>
                  `
                )
                .join("")}
            </div>`
          : `<div class="panel-body"><p class="muted">还没有主动发现候选。输入商品链接或类目后，系统会先生成待决策机会，再由你决定是否加品。</p></div>`
      }
    </section>
  `;
}

function findDraftOpportunity(draft, opportunities) {
  return opportunities.find((opportunity) => opportunity.marketProduct.id === draft.marketProductId) || null;
}

function draftReviewChecks(draft, opportunity) {
  const product = opportunity?.marketProduct || marketProducts.find((item) => item.id === draft.marketProductId);
  const supplier = opportunity?.supplierProduct || supplierProducts.find((item) => item.marketProductId === draft.marketProductId);
  const marginOk = opportunity ? opportunity.cost.grossMargin >= state.marginThreshold : draft.completeness >= 85;
  const riskOk = opportunity ? opportunity.scores.risk < 60 : !draft.status.includes("复核");
  const logisticsOk = Number(product?.logisticsCostCny || 0) > 0;
  const localization = draft.localization || {};
  const localizationOk = Boolean(
    localization.targetTitle &&
      localization.keywords &&
      localization.sellingPoints &&
      (localization.attributes || draft.assetStatus) &&
      draft.complianceNote
  );

  return [
    {
      label: "商品",
      ok: Boolean(product),
      detail: product ? "已关联商品数据" : "未关联商品池"
    },
    {
      label: "供应商",
      ok: Boolean(supplier),
      detail: supplier ? `${supplier.supplierName} / MOQ ${supplier.moq}` : "缺供应商绑定"
    },
    {
      label: "物流",
      ok: logisticsOk,
      detail: logisticsOk ? `物流成本 ${money(product.logisticsCostCny)}` : "缺物流报价"
    },
    {
      label: "毛利",
      ok: marginOk,
      detail: opportunity ? `预估毛利率 ${percent(opportunity.cost.grossMargin)}` : `资料完整度 ${draft.completeness}%`
    },
    {
      label: "本地化",
      ok: localizationOk,
      detail: localizationOk ? "标题、关键词、卖点、规格和合规备注已补齐" : "待补标题、关键词、卖点、图片/规格或合规备注"
    },
    {
      label: "风险",
      ok: riskOk,
      detail: opportunity ? `风险分 ${score(opportunity.scores.risk)}` : draft.status
    }
  ];
}

function draftStage(draft, checks, opportunity) {
  if (checks.some((item) => !item.ok && item.label !== "风险")) return "待补数据";
  if (!checks.find((item) => item.label === "风险")?.ok) return "待合规确认";
  if (opportunity?.recommendedAction === "小单测试") return "可小单测试";
  if (draft.status.includes("复核")) return draft.status;
  return "待运营确认";
}

function draftActionView(checks) {
  const missingSupplier = checks.some((item) => item.label === "供应商" && !item.ok);
  const missingLogistics = checks.some((item) => item.label === "物流" && !item.ok);
  const missingLocalization = checks.some((item) => item.label === "本地化" && !item.ok);
  if (missingSupplier) return { view: "supplierMatching", label: "去匹配供应商" };
  if (missingLogistics) return { view: "logistics", label: "去补物流报价" };
  if (missingLocalization) return { view: "listings", label: "补本地化" };
  return { view: "opportunities", label: "查看机会详情" };
}

function opportunityCard(opportunity) {
  const { marketProduct, supplierProduct, scores, cost, recommendedAction } = opportunity;
  return `
    <button class="opportunity-card${state.selectedId === opportunity.id ? " is-active" : ""}" type="button" data-id="${opportunity.id}">
      <div class="card-row">
        <div>
          <div class="card-title">${marketProduct.localTitle}</div>
          <div class="card-meta">${marketProduct.country} · ${marketProduct.platform} · ${marketProduct.category}</div>
        </div>
        <span class="score-badge">${score(scores.final)}</span>
      </div>
      <div class="tag-row">
        <span class="tag ${actionClass(recommendedAction)}">${recommendedAction}</span>
        <span class="tag">毛利 ${percent(cost.grossMargin)}</span>
        <span class="tag">销量线索 ${marketProduct.salesSignal}</span>
        <span class="tag">供应商 ${supplierProduct.supplierName}</span>
      </div>
    </button>
  `;
}

function scoreBar(label, value, isRisk = false) {
  return `
    <div class="score-bar">
      <span>${label}</span>
      <div class="bar-track"><div class="bar-fill ${isRisk ? "risk" : ""}" style="width:${value}%"></div></div>
      <strong>${score(value)}</strong>
    </div>
  `;
}

function detailPanel(opportunity) {
  if (!opportunity) {
    return `<div class="detail-card"><p class="muted">暂无机会数据。</p></div>`;
  }

  const { marketProduct, supplierProduct, cost, scores, recommendedAction } = opportunity;
  return `
    <div class="detail-card detail-stack">
      <section>
          <p class="eyebrow">决策摘要</p>
        <h2>${marketProduct.localTitle}</h2>
        <p class="muted">${marketProduct.title}</p>
        <div class="tag-row">
          <span class="tag ${actionClass(recommendedAction)}">${recommendedAction}</span>
          <span class="tag">负责人 ${marketProduct.owner}</span>
          <span class="tag ${scores.risk >= 60 ? "danger" : "good"}">风险 ${score(scores.risk)}</span>
        </div>
      </section>

      <section>
        <h3>利润测算</h3>
        <div class="data-grid">
          <div class="data-cell"><span>海外折算售价</span><strong>${money(cost.salePriceCny)}</strong></div>
          <div class="data-cell"><span>综合成本</span><strong>${money(cost.landedCostCny)}</strong></div>
          <div class="data-cell"><span>预估毛利</span><strong>${money(cost.grossProfitCny)}</strong></div>
          <div class="data-cell"><span>预估毛利率</span><strong>${percent(cost.grossMargin)}</strong></div>
        </div>
      </section>

      <section>
        <h3>评分解释</h3>
        <div class="score-bars">
          ${scoreBar("需求", scores.demand)}
          ${scoreBar("毛利", scores.margin)}
          ${scoreBar("竞争", scores.competition)}
          ${scoreBar("履约", scores.fulfillment)}
          ${scoreBar("风险", scores.risk, true)}
        </div>
      </section>

      <section>
        <h3>供应链</h3>
        <div class="data-grid">
          <div class="data-cell"><span>主供应商</span><strong>${supplierProduct.supplierName}</strong></div>
          <div class="data-cell"><span>采购价</span><strong>${money(supplierProduct.purchasePriceCny)}</strong></div>
          <div class="data-cell"><span>起订量</span><strong>${supplierProduct.moq}</strong></div>
          <div class="data-cell"><span>备选供应商</span><strong>${supplierProduct.backupSupplier}</strong></div>
        </div>
      </section>

      ${renderOpportunityEvidence(opportunity)}
    </div>
  `;
}

function currentOpportunities() {
  return buildOpportunities(marketProducts, supplierProducts, config, state.marginThreshold);
}

function findDiscoveryByProduct(product) {
  if (!product?.discoveryCandidateId) return null;
  return state.discoveryCandidates.find((candidate) => candidate.id === product.discoveryCandidateId) || null;
}

function valueOrDash(value, suffix = "") {
  if (value === undefined || value === null || value === "") return "—";
  return `${value}${suffix}`;
}

function detailRows(rows) {
  return `
    <div class="detail-row-grid">
      ${rows
        .map(
          ([label, value]) => `
            <div class="detail-row">
              <span>${h(label)}</span>
              <strong>${h(value)}</strong>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function miniTable(rows) {
  return `
    <div class="table-scroll">
      <table class="compact-table">
        <tbody>
          ${rows.map(([label, value]) => `<tr><th>${h(label)}</th><td>${h(value)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function estimateTargetPriceBand(opportunity) {
  const { marketProduct, cost } = opportunity;
  const salePriceCny = numberValue(cost.salePriceCny);
  const competitorLow = marketProduct.competitorLowCny || Math.max(salePriceCny * 0.88, 0);
  const competitorMid = marketProduct.competitorMidCny || salePriceCny;
  const competitorHigh = marketProduct.competitorHighCny || salePriceCny * 1.16;
  const source = marketProduct.competitorLowCny
    ? "已录入竞品价格带"
    : "暂按市场商品售价折算，待接入竞品价格";

  return {
    low: competitorLow,
    mid: competitorMid,
    high: competitorHigh,
    source
  };
}

function profitScenarioRows(opportunity) {
  const { marketProduct, supplierProduct, cost } = opportunity;
  const baseSale = numberValue(cost.salePriceCny);
  const baseLogistics = numberValue(marketProduct.logisticsCostCny);
  const purchase = numberValue(supplierProduct.purchasePriceCny);
  const baseFees =
    numberValue(config.packagingCostCny) +
    numberValue(cost.platformFee) +
    numberValue(cost.paymentFee) +
    numberValue(cost.returnLoss);
  const rows = [
    {
      name: "保守",
      salePrice: baseSale * 0.92,
      logistics: baseLogistics * 1.15,
      adRate: config.adCostRate + 0.04,
      note: "售价下探、运费上浮、广告更贵"
    },
    {
      name: "基准",
      salePrice: baseSale,
      logistics: baseLogistics,
      adRate: config.adCostRate,
      note: "沿用当前机会池测算"
    },
    {
      name: "乐观",
      salePrice: baseSale * 1.08,
      logistics: baseLogistics * 0.95,
      adRate: Math.max(config.adCostRate - 0.02, 0),
      note: "售价更好、广告效率更高"
    }
  ];

  return rows.map((row) => {
    const adCost = row.salePrice * row.adRate;
    const totalCost = purchase + row.logistics + baseFees + adCost;
    const profit = row.salePrice - totalCost;
    const margin = row.salePrice <= 0 ? 0 : profit / row.salePrice;
    return [row.name, money(row.salePrice), money(row.logistics), money(adCost), money(profit), percent(margin), row.note];
  });
}

function opportunityEvidenceChecks(opportunity, priceBand) {
  const { marketProduct, supplierProduct, cost } = opportunity;
  const hasCompetitorBand = Boolean(marketProduct.competitorLowCny || marketProduct.competitorMidCny || marketProduct.competitorHighCny);
  const weightKg = marketProduct.weightKg || supplierProduct.weightKg || supplierProduct.sourceSnapshot?.weightKg;
  const dimensions = marketProduct.dimensions || supplierProduct.dimensions || supplierProduct.sourceSnapshot?.dimensions;
  const hasLogistics = numberValue(marketProduct.logisticsCostCny) > 0;
  const hasAdAssumption = numberValue(config.adCostRate) > 0;
  const hasSupplierBackup = Boolean(supplierProduct.backupSupplier);

  return [
    {
      ok: hasCompetitorBand,
      label: "目标国合理售价",
      detail: hasCompetitorBand
        ? `竞品价格带 ${money(priceBand.low)}-${money(priceBand.high)}`
        : "当前只按市场商品售价折算，需要补竞品低/中/高价与平台链接"
    },
    {
      ok: hasAdAssumption,
      label: "广告投放假设",
      detail: `当前按售价 ${percent(config.adCostRate)} 作为单单广告成本，约 ${money(cost.adCost)}`
    },
    {
      ok: Boolean(weightKg || dimensions),
      label: "重量体积",
      detail: weightKg || dimensions ? `重量 ${weightKg || "待补"} kg，尺寸 ${dimensions || "待补"}` : "还缺实重、包装尺寸、材积重规则"
    },
    {
      ok: hasLogistics,
      label: "跨境运费",
      detail: hasLogistics ? `当前机会使用 ${money(marketProduct.logisticsCostCny)} 作为单件物流成本` : "缺物流报价或重量段匹配"
    },
    {
      ok: hasSupplierBackup,
      label: "供应商备选",
      detail: hasSupplierBackup ? `备选供应商：${supplierProduct.backupSupplier}` : "还缺第二供应商，价格和履约风险较难兜底"
    },
    {
      ok: cost.grossMargin >= state.marginThreshold,
      label: "利润空间",
      detail: `当前毛利率 ${percent(cost.grossMargin)}，最低目标 ${percent(state.marginThreshold)}`
    }
  ];
}

function renderOpportunityEvidence(opportunity) {
  const { marketProduct, cost } = opportunity;
  const priceBand = estimateTargetPriceBand(opportunity);
  const checks = opportunityEvidenceChecks(opportunity, priceBand);
  const firstTestBudget = Math.max(numberValue(cost.adCost) * 20, numberValue(cost.salePriceCny) * 0.5);

  return `
      <section>
        <h3>机会补数与投放测算</h3>
        <p class="muted">这里把“这个机会为什么能做、还缺什么证据”拆开。当前 MVP 不默认抓到真实海外竞品、广告和物流全量数据，缺口会在下面标出来。</p>
        ${detailRows([
          ["目标国售价依据", `${money(priceBand.low)} / ${money(priceBand.mid)} / ${money(priceBand.high)}（低 / 中 / 高）`],
          ["售价来源状态", priceBand.source],
          ["广告测算", `按配置广告率 ${percent(config.adCostRate)}，单单约 ${money(cost.adCost)}，首轮 20 单测试预算约 ${money(firstTestBudget)}`],
          ["物流测算", `${marketProduct.country} 单件成本 ${money(marketProduct.logisticsCostCny)}；后续应按重量段、渠道、时效更新`]
        ])}
        <div class="table-scroll">
          <table class="compact-table">
            <thead>
              <tr>
                <th>场景</th>
                <th>售价</th>
                <th>物流</th>
                <th>广告</th>
                <th>毛利</th>
                <th>毛利率</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              ${profitScenarioRows(opportunity)
                .map(
                  (row) => `
                    <tr>
                      ${row.map((cell) => `<td>${h(cell)}</td>`).join("")}
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <div class="checklist-grid">
          ${checks
            .map(
              (item) => `
                <div class="check-item ${item.ok ? "is-ok" : "is-missing"}">
                  <span>${item.ok ? "已具备" : "待补数"}</span>
                  <strong>${h(item.label)}</strong>
                  <p>${h(item.detail)}</p>
                </div>
              `
            )
            .join("")}
        </div>
      </section>
  `;
}

function listingDraftForProduct(productId) {
  return listingDrafts.find((draft) => draft.marketProductId === productId) || null;
}

function createListingDraftFromOpportunity(opportunityId) {
  const opportunity = currentOpportunities().find((item) => item.id === opportunityId);
  if (!opportunity) return;
  const { marketProduct, supplierProduct, cost, scores, recommendedAction } = opportunity;
  let draft = listingDraftForProduct(marketProduct.id);
  if (!draft) {
    draft = {
      id: `ld-op-${Date.now()}`,
      marketProductId: marketProduct.id,
      platform: marketProduct.platform,
      country: marketProduct.country,
      title: marketProduct.title,
      localTitle: marketProduct.localTitle,
      category: marketProduct.category,
      status: "待翻译确认",
      reviewer: "店铺运营",
      price: marketProduct.price,
      currency: marketProduct.currency,
      completeness: 78,
      recommendedAction,
      scoreSnapshot: clone(scores),
      costSnapshot: clone(cost),
      supplierSnapshot: {
        supplierName: supplierProduct.supplierName,
        purchasePriceCny: supplierProduct.purchasePriceCny,
        moq: supplierProduct.moq,
        dispatchDays: supplierProduct.dispatchDays,
        supplierRating: supplierProduct.supplierRating,
        supportsDropship: supplierProduct.supportsDropship
      },
      localization: {
        targetTitle: marketProduct.title,
        keywords: [marketProduct.category, marketProduct.platform, marketProduct.country].filter(Boolean).join(" / "),
        sellingPoints: "待运营补充本地化卖点、规格、图片和活动文案"
      }
    };
    listingDrafts.unshift(draft);
    logAction("discovery.listing_draft_created", { productId: marketProduct.id, title: marketProduct.localTitle });
  }
  state.selectedDraftId = draft.id;
  state.view = "listings";
  saveWorkspaceState();
  render();
}

function localizationCompleteness(draft) {
  const localization = draft.localization || {};
  const fields = [
    localization.targetTitle,
    localization.keywords,
    localization.sellingPoints,
    localization.attributes || draft.assetStatus,
    draft.complianceNote
  ];
  const filled = fields.filter((value) => String(value || "").trim()).length;
  return Math.min(100, 60 + filled * 8);
}

function saveListingLocalization(draftId, form) {
  const draft = listingDrafts.find((item) => item.id === draftId);
  if (!draft) return;
  const formData = new FormData(form);
  const value = (name) => String(formData.get(name) || "").trim();
  draft.localization = {
    ...(draft.localization || {}),
    targetTitle: value("targetTitle"),
    keywords: value("keywords"),
    sellingPoints: value("sellingPoints"),
    attributes: value("attributes")
  };
  draft.assetStatus = value("assetStatus");
  draft.complianceNote = value("complianceNote");
  draft.completeness = Math.max(Number(draft.completeness || 0), localizationCompleteness(draft));
  const missingRequired = [
    draft.localization.targetTitle,
    draft.localization.keywords,
    draft.localization.sellingPoints,
    draft.localization.attributes || draft.assetStatus,
    draft.complianceNote
  ].some((item) => !item);
  draft.status = missingRequired ? "待补本地化" : "待运营确认";
  logAction("listing.localization_saved", { draftId, title: draft.localTitle || draft.title });
  saveWorkspaceState();
  render();
}

function opportunityReviewCard(opportunity) {
  const { marketProduct, supplierProduct, scores, cost, recommendedAction } = opportunity;
  const draft = listingDraftForProduct(marketProduct.id);
  return `
    <button class="opportunity-card${state.selectedId === opportunity.id ? " is-active" : ""}" type="button" data-id="${opportunity.id}">
      <div class="card-row">
        <div>
          <div class="card-title">${h(marketProduct.localTitle)}</div>
          <div class="card-meta">${h(marketProduct.country)} · ${h(marketProduct.platform)} · ${h(marketProduct.category)}</div>
        </div>
        <span class="score-badge">${score(scores.final)}</span>
      </div>
      <div class="tag-row">
        <span class="tag ${actionClass(recommendedAction)}">${h(recommendedAction)}</span>
        <span class="tag">毛利 ${percent(cost.grossMargin)}</span>
        <span class="tag">风险 ${score(scores.risk)}</span>
        <span class="tag ${draft ? "good" : "warning"}">${draft ? "已有草稿" : "未生成草稿"}</span>
      </div>
      <div class="opportunity-card-data">
        <span>售价 ${h(marketProduct.price)} ${h(marketProduct.currency)}</span>
        <span>评分 ${h(marketProduct.rating)} / 评价 ${h(marketProduct.reviewCount)}</span>
        <span>销量信号 ${h(marketProduct.salesSignal)}</span>
        <span>供应商 ${h(supplierProduct.supplierName)}</span>
      </div>
    </button>
  `;
}

function opportunityReviewPanel(opportunity) {
  if (!opportunity) return `<div class="detail-card"><p class="muted">暂无机会数据。</p></div>`;
  const { marketProduct, supplierProduct, cost, scores, recommendedAction } = opportunity;
  const discovery = findDiscoveryByProduct(marketProduct);
  const draft = listingDraftForProduct(marketProduct.id);
  const totalFees = cost.platformFee + cost.paymentFee + cost.adCost + cost.returnLoss;
  return `
    <div class="detail-card detail-stack review-panel">
      ${renderOpportunityEvidence(opportunity)}

      <section>
        <p class="eyebrow">决策摘要</p>
        <h2>${h(marketProduct.localTitle)}</h2>
        <p class="muted">${h(marketProduct.title)}</p>
        <div class="tag-row">
          <span class="tag ${actionClass(recommendedAction)}">${h(recommendedAction)}</span>
          <span class="tag">负责人 ${h(marketProduct.owner)}</span>
          <span class="tag ${scores.risk >= 60 ? "danger" : "good"}">风险 ${score(scores.risk)}</span>
          <span class="tag ${draft ? "good" : "warning"}">${draft ? "已生成上架草稿" : "待生成上架草稿"}</span>
        </div>
        <div class="detail-actions">
          <button class="primary-button" type="button" data-create-draft-opportunity="${h(opportunity.id)}">${draft ? "查看上架草稿" : "生成上架草稿"}</button>
          <button class="small-button" type="button" data-go="supplierMatching">管理供应商</button>
          <button class="small-button" type="button" data-go="logistics">管理物流报价</button>
        </div>
      </section>

      <section>
        <h3>市场商品明细</h3>
        ${detailRows([
          ["平台 / 国家", `${marketProduct.platform} / ${marketProduct.country}`],
          ["类目", marketProduct.category],
          ["建议售价", `${marketProduct.price} ${marketProduct.currency}`],
          ["折算人民币售价", money(cost.salePriceCny)],
          ["评分 / 评价数", `${marketProduct.rating} / ${marketProduct.reviewCount}`],
          ["销量信号", marketProduct.salesSignal],
          ["排名趋势", marketProduct.rankTrend],
          ["竞争强度", marketProduct.competitionLevel],
          ["来源链接", marketProduct.productUrl && marketProduct.productUrl !== "#" ? marketProduct.productUrl : "本地样例或人工录入"]
        ])}
      </section>

      <section>
        <h3>成本与利润拆解</h3>
        ${miniTable([
          ["海外折算售价", money(cost.salePriceCny)],
          ["采购价", money(supplierProduct.purchasePriceCny)],
          ["物流成本", money(marketProduct.logisticsCostCny)],
          ["包装成本", money(config.packagingCostCny)],
          ["平台佣金", money(cost.platformFee)],
          ["支付手续费", money(cost.paymentFee)],
          ["广告预估", money(cost.adCost)],
          ["退货损耗", money(cost.returnLoss)],
          ["费用合计", money(totalFees)],
          ["综合成本", money(cost.landedCostCny)],
          ["预计毛利", money(cost.grossProfitCny)],
          ["预计毛利率", percent(cost.grossMargin)]
        ])}
      </section>

      <section>
        <h3>评分因子</h3>
        <div class="score-bars">
          ${scoreBar("需求", scores.demand)}
          ${scoreBar("毛利", scores.margin)}
          ${scoreBar("竞争", scores.competition)}
          ${scoreBar("履约", scores.fulfillment)}
          ${scoreBar("风险", scores.risk, true)}
        </div>
      </section>

      <section>
        <h3>供应商与履约明细</h3>
        ${detailRows([
          ["主供应商", supplierProduct.supplierName],
          ["货源平台", supplierProduct.sourcePlatform],
          ["供应商商品", supplierProduct.title],
          ["采购价", money(supplierProduct.purchasePriceCny)],
          ["起订量", supplierProduct.moq],
          ["发货天数", `${supplierProduct.dispatchDays} 天`],
          ["供应商评分", supplierProduct.supplierRating],
          ["月销参考", supplierProduct.monthlySales],
          ["是否支持一件代发", supplierProduct.supportsDropship ? "支持" : "不支持"],
          ["备选供应商", supplierProduct.backupSupplier]
        ])}
      </section>

      <section>
        <h3>调研来源与风险记录</h3>
        ${detailRows([
          ["来源类型", discovery ? (discovery.sourceType === "url" ? "链接解析" : "类目发现") : "导入/样例数据"],
          ["来源输入", discovery?.sourceInput || "暂无原始调研输入"],
          ["调研分", valueOrDash(discovery?.researchScore)],
          ["采购预估", discovery ? money(discovery.estimatedPurchasePriceCny) : "暂无"],
          ["物流预估", discovery ? money(discovery.estimatedLogisticsCostCny) : "暂无"],
          ["候选原因", discovery?.reason || "来自市场商品数据和供应商数据评分"],
          ["风险备注", discovery?.riskNote || (scores.risk >= 60 ? "需要人工合规复核" : "常规风险，按小单测试节奏推进")]
        ])}
      </section>
    </div>
  `;
}

function renderDashboard(opportunities) {
  const summary = buildStrategySummary(opportunities);
  const selected = opportunities.find((item) => item.id === state.selectedId) || opportunities[0];
  elements.views.dashboard.innerHTML = `
    <div class="metrics-grid">
      ${metricCard("候选机会", opportunities.length, "来自东南亚与俄罗斯样例市场池")}
      ${metricCard("建议小单测试", summary.testItems.length, "满足需求、毛利和风险阈值")}
      ${metricCard("平均毛利率", percent(summary.averageMargin), "含平台费、支付费、广告和退货损耗")}
      ${metricCard("高风险复核", summary.complianceItems.length, "俄罗斯或敏感类目进入人工审核")}
    </div>

    <div class="two-column">
      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">优先队列</p>
            <h2>今日优先处理</h2>
          </div>
          <button class="small-button" type="button" data-go="opportunities">查看全部</button>
        </div>
        <div class="panel-body opportunity-list">
          ${opportunities.slice(0, 4).map(opportunityReviewCard).join("")}
        </div>
      </section>
      ${opportunityReviewPanel(selected)}
    </div>

    <div class="three-column">
      ${summary.actions
        .map(
          (item) => `
            <article class="kanban-card">
              <p class="eyebrow">策略</p>
              <h3>${item.title}</h3>
              <p class="muted">${item.value}</p>
              <p class="muted">${item.description}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderOpportunities(opportunities) {
  const selected = opportunities.find((item) => item.id === state.selectedId) || opportunities[0];
  elements.views.opportunities.innerHTML = `
    ${pageGuide(
      "发现到决策",
      "机会池分两层：先通过链接或类目主动发现候选，再把你决定要做的商品加入商品池进行评分、翻译、上架和运营。外部平台/API 还没接入前，这里用本地模拟调研信号跑通流程。",
      [{ view: "dataSources", label: "管理数据源" }]
    )}
    ${renderDiscoveryPanel()}
    <div class="two-column">
      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">机会池</p>
            <h2>商品机会池</h2>
          </div>
          <button class="small-button" type="button" data-go="dataSources">管理数据源</button>
        </div>
        <div class="panel-body opportunity-list">
          ${opportunities.map(opportunityReviewCard).join("")}
        </div>
      </section>
      ${opportunityReviewPanel(selected)}
    </div>
  `;
}

function renderListings(opportunities) {
  const rows = listingDrafts.map((draft) => {
    const opportunity = findDraftOpportunity(draft, opportunities);
    const checks = draftReviewChecks(draft, opportunity);
    const stage = draftStage(draft, checks, opportunity);
    return { draft, opportunity, checks, stage, action: draftActionView(checks) };
  });
  const readyCount = rows.filter((row) => row.stage === "可小单测试").length;
  const missingCount = rows.filter((row) => row.stage === "待补数据").length;
  const reviewCount = rows.filter((row) => row.stage.includes("确认") || row.stage.includes("复核")).length;

  elements.views.listings.innerHTML = `
    ${pageGuide(
      "上架草稿工作台",
      "这里管理从机会池推进出来的上架候选商品。运营只在这里做标题、价格、风险和测试节奏确认；缺商品、供应商、物流或订单收入数据时，回到对应的数据管理页补齐。",
      [
        { view: "opportunities", label: "查看机会池" },
        { view: "dataSources", label: "导入数据" }
      ]
    )}
    <div class="metrics-grid">
      ${metricCard("草稿总数", rows.length, "当前等待推进或确认的上架候选商品")}
      ${metricCard("待补数据", missingCount, "缺供应商、物流或商品主数据，不能直接上架")}
      ${metricCard("待人工确认", reviewCount, "需要运营、合规或专项负责人确认")}
      ${metricCard("可小单测试", readyCount, "数据和风险检查已满足测试条件")}
    </div>
    <section class="table-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">人工确认队列</p>
          <h2>上架草稿清单</h2>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>草稿商品</th>
            <th>平台 / 国家</th>
            <th>建议售价</th>
            <th>评分与毛利</th>
            <th>审核检查项</th>
            <th>当前阶段</th>
            <th>负责人</th>
            <th>下一步</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              ({ draft, opportunity, checks, stage, action }) => `
                <tr>
                  <td><strong>${h(opportunity?.marketProduct.localTitle || draft.title)}</strong><br><span class="muted">${h(draft.title)}</span></td>
                  <td>${h(draft.platform)}<br><span class="muted">${h(draft.country)}</span></td>
                  <td>${h(draft.price)} ${h(draft.currency)}<br><span class="muted">完整度 ${draft.completeness}%</span></td>
                  <td>
                    ${
                      opportunity
                        ? `<strong>${score(opportunity.scores.final)} 分</strong><br><span class="muted">毛利 ${percent(opportunity.cost.grossMargin)} / ${opportunity.recommendedAction}</span>`
                        : `<span class="muted">未进入当前筛选机会池</span>`
                    }
                  </td>
                  <td>
                    <div class="draft-checks">
                      ${checks
                        .map(
                          (item) => `
                            <span class="tag ${item.ok ? "good" : "warning"}" title="${h(item.detail)}">${item.ok ? "已过" : "待补"} ${h(item.label)}</span>
                          `
                        )
                        .join("")}
                    </div>
                  </td>
                  <td><span class="tag ${statusClass(stage)}">${h(stage)}</span><br><span class="muted">${h(draft.status)}</span></td>
                  <td>${h(draft.reviewer)}</td>
                  <td><button class="small-button" type="button" data-go="${action.view}">${action.label}</button></td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function draftCard(row) {
  const { draft, opportunity, stage } = row;
  const product = opportunity?.marketProduct || marketProducts.find((item) => item.id === draft.marketProductId);
  return `
    <button class="listing-card${state.selectedDraftId === draft.id ? " is-active" : ""}" type="button" data-select-draft="${h(draft.id)}">
      <div class="card-row">
        <div>
          <div class="card-title">${h(product?.localTitle || draft.localTitle || draft.title)}</div>
          <div class="card-meta">${h(draft.platform)} · ${h(draft.country)} · ${h(product?.category || draft.category || "未标注类目")}</div>
        </div>
        <span class="tag ${statusClass(stage)}">${h(stage)}</span>
      </div>
      <div class="opportunity-card-data">
        <span>售价 ${h(draft.price)} ${h(draft.currency)}</span>
        <span>完整度 ${h(draft.completeness)}%</span>
        <span>${opportunity ? `评分 ${score(opportunity.scores.final)}` : "未进入当前机会池"}</span>
      </div>
    </button>
  `;
}

function listingReviewPanel(row) {
  if (!row) return `<section class="panel"><div class="panel-body"><p class="muted">暂无上架草稿。</p></div></section>`;
  const { draft, opportunity, checks, stage, action } = row;
  const product = opportunity?.marketProduct || marketProducts.find((item) => item.id === draft.marketProductId);
  const supplier = opportunity?.supplierProduct || supplierProducts.find((item) => item.marketProductId === draft.marketProductId);
  const cost = opportunity?.cost || draft.costSnapshot || null;
  const scores = opportunity?.scores || draft.scoreSnapshot || null;
  const localization = draft.localization || {};
  const sourceTitle = product?.title || draft.title;
  const localTitle = product?.localTitle || draft.localTitle || draft.title;
  return `
    <section class="panel review-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">草稿审核</p>
          <h2>${h(localTitle)}</h2>
          <p class="muted">${h(draft.platform)} / ${h(draft.country)} / ${h(product?.category || draft.category || "未标注类目")}</p>
        </div>
        <span class="tag ${statusClass(stage)}">${h(stage)}</span>
      </div>
      <div class="panel-body detail-stack">
        <section>
          <h3>发布信息</h3>
          ${detailRows([
            ["本地商品名", localTitle],
            ["原始/英文标题", sourceTitle],
            ["目标上架标题", localization.targetTitle || draft.title],
            ["目标平台", `${draft.platform} / ${draft.country}`],
            ["建议售价", `${draft.price} ${draft.currency}`],
            ["负责人", draft.reviewer],
            ["当前状态", draft.status],
            ["资料完整度", `${draft.completeness}%`]
          ])}
        </section>

        <section>
          <h3>翻译与本地化</h3>
          ${detailRows([
            ["关键词", localization.keywords || [product?.category, draft.platform, draft.country].filter(Boolean).join(" / ") || "待补充"],
            ["卖点文案", localization.sellingPoints || "待补充本地化卖点、规格、图片和活动文案"],
            ["属性/规格", localization.attributes || "待补充尺寸、材质、颜色、包装和适配场景"],
            ["图片/规格", draft.assetStatus || "待确认主图、详情图、尺寸、材质和包装规格"],
            ["合规文案", draft.complianceNote || (stage.includes("合规") ? "需要合规负责人复核后再发布" : "常规类目，发布前做关键词和素材复核")]
          ])}
          <form class="localization-form" data-localization-form="${h(draft.id)}">
            <label class="wide-field">
              目标上架标题
              <input name="targetTitle" type="text" value="${h(localization.targetTitle || draft.title)}" placeholder="面向目标国家用户的上架标题">
            </label>
            <label>
              关键词
              <textarea name="keywords" placeholder="搜索词、类目词、场景词，用逗号或换行分隔">${h(localization.keywords || "")}</textarea>
            </label>
            <label>
              属性/规格
              <textarea name="attributes" placeholder="尺寸、材质、颜色、包装、适配场景">${h(localization.attributes || "")}</textarea>
            </label>
            <label class="wide-field">
              卖点文案
              <textarea name="sellingPoints" placeholder="本地化卖点、使用场景、差异化理由">${h(localization.sellingPoints || "")}</textarea>
            </label>
            <label>
              图片/素材状态
              <textarea name="assetStatus" placeholder="主图、详情图、尺寸图、包装图、素材缺口">${h(draft.assetStatus || "")}</textarea>
            </label>
            <label>
              合规备注
              <textarea name="complianceNote" placeholder="禁限词、认证、侵权、平台规则、人工复核结论">${h(draft.complianceNote || "")}</textarea>
            </label>
            <div class="form-actions wide-field">
              <button class="primary-button" type="submit">保存本地化</button>
              <span class="muted">保存后写入本地工作区，并更新草稿审核状态。</span>
            </div>
          </form>
        </section>

        <section>
          <h3>审核清单</h3>
          <div class="checklist-grid">
            ${checks
              .map(
                (item) => `
                  <div class="check-item ${item.ok ? "is-ok" : "is-missing"}">
                    <span>${item.ok ? "已通过" : "待补齐"}</span>
                    <strong>${h(item.label)}</strong>
                    <p>${h(item.detail)}</p>
                  </div>
                `
              )
              .join("")}
          </div>
        </section>

        <section>
          <h3>机会与成本快照</h3>
          ${detailRows([
            ["机会评分", scores ? score(scores.final) : "暂无"],
            ["需求 / 毛利 / 竞争 / 履约 / 风险", scores ? `${score(scores.demand)} / ${score(scores.margin)} / ${score(scores.competition)} / ${score(scores.fulfillment)} / ${score(scores.risk)}` : "暂无"],
            ["推荐动作", opportunity?.recommendedAction || draft.recommendedAction || "待确认"],
            ["折算售价", cost ? money(cost.salePriceCny) : "暂无"],
            ["综合成本", cost ? money(cost.landedCostCny) : "暂无"],
            ["预计毛利", cost ? money(cost.grossProfitCny) : "暂无"],
            ["预计毛利率", cost ? percent(cost.grossMargin) : "暂无"]
          ])}
        </section>

        <section>
          <h3>供应商与物流</h3>
          ${detailRows([
            ["供应商", supplier?.supplierName || draft.supplierSnapshot?.supplierName || "待匹配"],
            ["采购价", supplier ? money(supplier.purchasePriceCny) : draft.supplierSnapshot?.purchasePriceCny ? money(draft.supplierSnapshot.purchasePriceCny) : "暂无"],
            ["起订量", supplier?.moq || draft.supplierSnapshot?.moq || "暂无"],
            ["发货天数", supplier?.dispatchDays ? `${supplier.dispatchDays} 天` : draft.supplierSnapshot?.dispatchDays ? `${draft.supplierSnapshot.dispatchDays} 天` : "暂无"],
            ["物流成本", product?.logisticsCostCny ? money(product.logisticsCostCny) : "暂无"],
            ["履约备注", supplier?.supportsDropship ? "支持一件代发，可走小单测试" : "不支持一件代发，测试前确认采购和发货节奏"]
          ])}
        </section>

        <div class="detail-actions">
          <button class="small-button" type="button" data-go="${action.view}">${h(action.label)}</button>
          <button class="small-button" type="button" data-go="opportunities">回到机会池</button>
          <button class="small-button" type="button" data-go="fulfillment">查看发货履约</button>
        </div>
      </div>
    </section>
  `;
}

function renderListingsReview(opportunities) {
  const rows = listingDrafts.map((draft) => {
    const opportunity = findDraftOpportunity(draft, opportunities);
    const checks = draftReviewChecks(draft, opportunity);
    const stage = draftStage(draft, checks, opportunity);
    return { draft, opportunity, checks, stage, action: draftActionView(checks) };
  });
  if (!state.selectedDraftId && rows[0]) state.selectedDraftId = rows[0].draft.id;
  const selected = rows.find((row) => row.draft.id === state.selectedDraftId) || rows[0] || null;
  const readyCount = rows.filter((row) => row.stage === "可小单测试").length;
  const missingCount = rows.filter((row) => row.stage === "待补数据").length;
  const reviewCount = rows.filter((row) => row.stage.includes("确认") || row.stage.includes("复核")).length;

  elements.views.listings.innerHTML = `
    ${pageGuide(
      "上架草稿审核台",
      "这里不是简单列表，而是把机会池里决定推进的商品变成可审核的发布材料。先看左侧草稿队列，再在右侧逐项确认翻译、本地化、价格、供应商、物流、成本和风险。",
      [
        { view: "opportunities", label: "查看机会池" },
        { view: "dataSources", label: "导入数据" }
      ]
    )}
    <div class="metrics-grid">
      ${metricCard("草稿总数", rows.length, "当前等待推进或确认的上架候选商品")}
      ${metricCard("待补数据", missingCount, "缺供应商、物流或商品主数据，不能直接上架")}
      ${metricCard("待人工确认", reviewCount, "需要运营、合规或专项负责人确认")}
      ${metricCard("可小单测试", readyCount, "数据和风险检查已满足测试条件")}
    </div>
    <div class="two-column listing-workbench">
      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">草稿队列</p>
            <h2>选择一个草稿查看审核明细</h2>
          </div>
        </div>
        <div class="panel-body opportunity-list">
          ${rows.length > 0 ? rows.map(draftCard).join("") : `<p class="muted">还没有上架草稿。先从机会池选择商品生成草稿。</p>`}
        </div>
      </section>
      ${listingReviewPanel(selected)}
    </div>
  `;
}

function renderProducts() {
  elements.views.products.innerHTML = `
    ${pageGuide(
      "商品主数据页",
      "这里查看进入评分模型的市场商品。新增商品从数据导入页上传；供应商缺口进入供应商匹配页处理。",
      [
        { view: "dataSources", label: "导入商品数据" },
        { view: "supplierMatching", label: "补供应商匹配" }
      ]
    )}
    <div class="metrics-grid">
      ${metricCard("市场商品", marketProducts.length, "当前用于评分和机会池的商品数据")}
      ${metricCard("覆盖平台", uniqueValues(marketProducts, "platform").length, "商品来自的平台数量")}
      ${metricCard("覆盖国家", uniqueValues(marketProducts, "country").length, "商品覆盖的销售国家")}
      ${metricCard("待补供应商", marketProducts.filter((product) => !supplierProducts.some((supplier) => supplier.marketProductId === product.id)).length, "还没有绑定供应商的商品")}
    </div>
    <section class="table-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">商品主数据</p>
          <h2>商品管理</h2>
        </div>
        <button class="small-button" type="button" data-go="dataSources">导入商品数据</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>商品</th>
            <th>平台 / 国家</th>
            <th>类目</th>
            <th>售价</th>
            <th>评分</th>
            <th>销量信号</th>
            <th>物流成本</th>
            <th>负责人</th>
          </tr>
        </thead>
        <tbody>
          ${marketProducts
            .map(
              (product) => `
                <tr>
                  <td><strong>${h(product.localTitle || product.title)}</strong><br><span class="muted">${h(product.title)}</span></td>
                  <td>${h(product.platform)}<br><span class="muted">${h(product.country)}</span></td>
                  <td>${h(product.category)}</td>
                  <td>${h(product.price)} ${h(product.currency)}</td>
                  <td>${h(product.rating)}</td>
                  <td>${h(product.salesSignal)}</td>
                  <td>${money(product.logisticsCostCny || 0)}</td>
                  <td>${h(product.owner)}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderCompetitorCollection() {
  const coveredProducts = marketProducts.filter((product) => product.competitorSnapshotId).length;
  const draft = state.competitorDraft;
  const selectedProduct = marketProducts[0] || {};
  elements.views.competitors.innerHTML = `
    ${pageGuide(
      "竞品价格采集",
      "这个页面用于把你在 Shopee、Lazada、TikTok Shop、Ozon 等平台当前可见的竞品价格转成价格带。MVP 不保存 cookie，不后台代替账号抓取；你复制搜索结果或表格文本，系统解析后由你确认入库。",
      [
        { view: "opportunities", label: "回到机会池" },
        { view: "products", label: "查看商品" }
      ]
    )}
    <div class="metrics-grid">
      ${metricCard("已确认价格带", state.competitorSnapshots.length, "人工确认后进入本地竞品证据库")}
      ${metricCard("覆盖商品", coveredProducts, "已回填竞品低/中/高价的市场商品")}
      ${metricCard("待确认预览", draft?.samples?.length || 0, "当前解析出来但尚未入库的竞品样本")}
      ${metricCard("Cookie 状态", "不保存", "只处理你粘贴或确认的可见页面数据")}
    </div>
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">采集入口</p>
          <h2>粘贴平台可见竞品结果</h2>
        </div>
      </div>
      <form class="panel-body competitor-form" data-competitor-form>
        <label>
          关联商品
          <select name="marketProductId">
            ${marketProducts
              .map((product) => `<option value="${h(product.id)}">${h(product.localTitle || product.title)} / ${h(product.country)} / ${h(product.platform)}</option>`)
              .join("")}
          </select>
        </label>
        <label>
          平台
          <input name="platform" type="text" value="${h(selectedProduct.platform || "Lazada")}" placeholder="Lazada / Shopee / TikTok Shop / Ozon">
        </label>
        <label>
          国家
          <input name="country" type="text" value="${h(selectedProduct.country || "")}" placeholder="泰国 / 印尼 / 越南">
        </label>
        <label>
          币种
          <select name="currency">${currencyOptions(selectedProduct.currency || "THB")}</select>
        </label>
        <label>
          关键词 / 类目
          <input name="keyword" type="text" value="${h(selectedProduct.category || "")}" placeholder="foldable kitchen storage rack">
        </label>
        <label>
          来源页面
          <input name="sourceUrl" type="url" placeholder="https://www.lazada.co.th/catalog/?q=...">
        </label>
        <label class="wide-field">
          粘贴内容
          <textarea name="rawText" rows="10" placeholder="从平台搜索结果页复制可见商品文本，或粘贴 CSV：标题, 价格, 链接。支持 ฿ / THB / Rp / IDR / ₫ / VND / ₱ / PHP / ₽ / RUB。"></textarea>
        </label>
        <div class="form-actions">
          <button class="primary-button" type="submit">解析价格</button>
          <button class="small-button" type="button" data-discard-competitor>清空预览</button>
        </div>
      </form>
    </section>
    ${
      draft
        ? `<section class="panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">待确认</p>
                <h2>竞品价格带预览</h2>
              </div>
              <div class="tag-row">
                <span class="tag ${draft.band ? "good" : "warning"}">${draft.samples.length} 个样本</span>
                ${draft.band ? `<span class="tag info">${money(draft.band.low)} / ${money(draft.band.mid)} / ${money(draft.band.high)}</span>` : ""}
              </div>
            </div>
            <div class="panel-body detail-stack">
              ${
                draft.band
                  ? detailRows([
                      ["低价 / 中位 / 高价", `${money(draft.band.low)} / ${money(draft.band.mid)} / ${money(draft.band.high)}`],
                      ["来源", `${draft.platform || "未标注"} / ${draft.country || "未标注"} / ${draft.keyword || "未标注"}`],
                      ["样本数", draft.samples.length],
                      ["确认后动作", "写入关联商品，并更新机会池目标国售价依据"]
                    ])
                  : `<div class="message-list warning"><p>没有解析到有效价格。请确认粘贴内容里包含价格符号或币种，例如 ฿299、THB 299、Rp 120000。</p></div>`
              }
              ${
                draft.samples.length > 0
                  ? `<div class="table-scroll">
                      <table class="compact-table">
                        <thead><tr><th>标题</th><th>价格</th><th>人民币折算</th><th>链接</th></tr></thead>
                        <tbody>
                          ${draft.samples
                            .map(
                              (sample) => `
                                <tr>
                                  <td class="wide-note">${h(sample.title)}</td>
                                  <td>${h(sample.price)} ${h(sample.currency)}</td>
                                  <td>${money(sample.priceCny)}</td>
                                  <td class="wide-note">${sample.url ? h(sample.url) : h(sample.rawLine)}</td>
                                </tr>
                              `
                            )
                            .join("")}
                        </tbody>
                      </table>
                    </div>`
                  : ""
              }
              <div class="form-actions">
                <button class="primary-button" type="button" data-confirm-competitor ${draft.band ? "" : "disabled"}>确认入库并更新机会池</button>
                <button class="small-button" type="button" data-discard-competitor>放弃预览</button>
              </div>
            </div>
          </section>`
        : ""
    }
    <section class="table-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">证据库</p>
          <h2>已确认竞品价格带</h2>
        </div>
      </div>
      <div class="table-scroll">
        <table class="compact-table">
          <thead>
            <tr>
              <th>商品</th>
              <th>平台 / 国家</th>
              <th>价格带</th>
              <th>样本</th>
              <th>确认时间</th>
            </tr>
          </thead>
          <tbody>
            ${
              state.competitorSnapshots.length === 0
                ? `<tr><td colspan="5" class="muted">还没有确认过竞品价格。先粘贴平台可见结果并解析。</td></tr>`
                : state.competitorSnapshots
                    .map((snapshot) => {
                      const product = marketProducts.find((item) => item.id === snapshot.marketProductId);
                      return `
                        <tr>
                          <td><strong>${h(product?.localTitle || snapshot.marketProductId)}</strong><br><span class="muted">${h(snapshot.keyword || "未标注关键词")}</span></td>
                          <td>${h(snapshot.platform || "-")}<br><span class="muted">${h(snapshot.country || "-")}</span></td>
                          <td>${money(snapshot.band.low)} / ${money(snapshot.band.mid)} / ${money(snapshot.band.high)}</td>
                          <td>${snapshot.samples.length} 个</td>
                          <td>${h(new Date(snapshot.confirmedAt).toLocaleString())}</td>
                        </tr>
                      `;
                    })
                    .join("")
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderOrders() {
  const totalAmount = orders.reduce((sum, order) => sum + Number(order.amountCny || 0), 0);
  const totalProfit = orders.reduce((sum, order) => sum + Number(order.profitCny || 0), 0);
  const avgOrder = orders.length > 0 ? totalAmount / orders.length : 0;
  elements.views.orders.innerHTML = `
    ${pageGuide(
      "订单台账页",
      "这里管理已导入订单和履约状态，收入数据页会基于订单金额和利润自动汇总。成交后的发货动作请进入发货履约工作台处理。",
      [
        { view: "dataSources", label: "导入订单数据" },
        { view: "fulfillment", label: "处理发货履约" }
      ]
    )}
    <div class="metrics-grid">
      ${metricCard("订单数", orders.length, "已导入或样例订单")}
      ${metricCard("收入金额", money(totalAmount), "订单销售额折算人民币")}
      ${metricCard("预估利润", money(totalProfit), "订单级利润汇总")}
      ${metricCard("客单价", money(avgOrder), "平均每单收入")}
    </div>
    <section class="table-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">订单主数据</p>
          <h2>订单管理</h2>
        </div>
        <button class="small-button" type="button" data-go="dataSources">导入订单数据</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>订单</th>
            <th>平台/国家</th>
            <th>商品</th>
            <th>金额</th>
            <th>预估毛利</th>
            <th>状态</th>
            <th>负责人</th>
          </tr>
        </thead>
        <tbody>
          ${orders
            .map(
              (order) => `
                <tr>
                  <td>${order.id}<br><span class="muted">${order.sku}</span></td>
                  <td>${order.platform}<br><span class="muted">${order.country}</span></td>
                  <td>${order.product}</td>
                  <td>${money(order.amountCny)}</td>
                  <td>${money(order.profitCny)}</td>
                  <td><span class="tag ${statusClass(order.status)}">${businessStatusLabel(order.status)}</span></td>
                  <td>${order.owner}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function shipmentReadiness(shipment) {
  const missing = [];
  if (!shipment.carrier) missing.push("承运商");
  if (!shipment.trackingNo) missing.push("运单号");
  if (!shipment.orderId) missing.push("订单号");
  if (!shipment.sku) missing.push("SKU");
  if (!shipment.country) missing.push("目的国");
  return {
    ready: missing.length === 0,
    missing
  };
}

function renderCarrierOptions(selected) {
  const carriers = [...new Set([...defaultCarriers, selected].filter(Boolean))];
  return carriers.map((carrier) => `<option value="${h(carrier)}" ${selected === carrier ? "selected" : ""}>${h(carrier)}</option>`).join("");
}

function addHoursToIso(hours, base = new Date()) {
  const value = Number(hours || 0);
  if (!value) return "";
  return new Date(base.getTime() + value * 60 * 60 * 1000).toISOString();
}

function formatDateTime(value) {
  if (!value) return "未设置";
  return new Date(value).toLocaleString();
}

function sourceStatusText(status) {
  const labels = {
    active: "可用",
    manual_required: "需人工确认",
    paused: "暂停"
  };
  return labels[status] || status;
}

function overwritePolicyText(policy) {
  const labels = {
    manual_review: "抓取后人工确认覆盖",
    never_overwrite_manual: "不覆盖人工修改",
    batch_preview: "批量预览后确认"
  };
  return labels[policy] || policy;
}

function updateSupplierDiscoveryConfig(sourceKey, key, value) {
  const configItem = state.supplierDiscoveryConfigs[sourceKey];
  if (!configItem) return;
  if (key === "refreshCadenceHours") {
    configItem[key] = Math.max(0, Number(value || 0));
  } else if (key === "autoAddToSupplierPool") {
    configItem[key] = value === "true";
  } else {
    configItem[key] = value;
  }
  logAction("supplier_discovery.config_updated", { source: sourceKey, key, value: configItem[key] });
  saveWorkspaceState();
  render();
}

function renderShipmentTimeline(shipment) {
  const currentRank = statusRank(shipment.status);
  return `
    <div class="shipment-timeline" aria-label="物流状态进度">
      ${shipmentStatuses
        .filter((status) => status !== "异常")
        .map((status) => `<span class="${statusRank(status) <= currentRank ? "is-done" : ""}">${status}</span>`)
        .join("")}
    </div>
  `;
}

function renderFulfillment() {
  syncShipmentsWithOrders();
  const pending = state.shipments.filter((shipment) => shipment.status === "待发货").length;
  const inTransit = state.shipments.filter((shipment) => ["已创建运单", "已发货", "运输中", "派送中"].includes(shipment.status)).length;
  const delivered = state.shipments.filter((shipment) => shipment.status === "已签收").length;
  const exceptions = state.shipments.filter((shipment) => shipment.status === "异常").length;

  elements.views.fulfillment.innerHTML = `
    ${pageGuide(
      "发货履约工作台",
      "这里承接成交后的发货动作：从订单生成发货任务，维护承运商和运单号，监控物流状态。当前 MVP 只做本地确认；后续可接平台发货接口自动回传运单，并接物流轨迹接口实时同步状态。",
      [
        { view: "orders", label: "看订单台账" },
        { view: "logistics", label: "看物流报价" }
      ]
    )}
    <div class="metrics-grid">
      ${metricCard("发货任务", state.shipments.length, "来自当前订单台账的履约任务")}
      ${metricCard("待发货", pending, "需要创建运单或等待供应链处理")}
      ${metricCard("运输中", inTransit, "已发货但尚未签收")}
      ${metricCard("异常件", exceptions, "需要人工联系平台、物流商或供应商")}
    </div>
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">自动化准备度</p>
          <h2>未来自动发货需要什么？</h2>
        </div>
        <button class="small-button" type="button" data-sync-shipments>同步订单任务</button>
      </div>
      <div class="panel-body automation-grid">
        <article class="automation-step">
          <strong>1. 生成发货任务</strong>
          <p class="muted">订单支付或待履约后自动进入发货队列，关联 SKU、国家、供应商和预计物流线路。</p>
        </article>
        <article class="automation-step">
          <strong>2. 回传发货信息</strong>
          <p class="muted">承运商和运单号齐全后，后端调用 Shopee、TikTok Shop、Ozon 等平台接口回传。</p>
        </article>
        <article class="automation-step">
          <strong>3. 同步物流轨迹</strong>
          <p class="muted">定时从物流商或平台轨迹接口拉取状态，异常件进入人工处理队列。</p>
        </article>
      </div>
    </section>
    <section class="table-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">发货任务</p>
          <h2>发货与物流监控</h2>
        </div>
        <button class="small-button" type="button" data-refresh-tracking>模拟刷新轨迹</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>订单 / 商品</th>
            <th>平台 / 目的国</th>
            <th>承运商</th>
            <th>运单号</th>
            <th>物流状态</th>
            <th>轨迹</th>
            <th>自动回传</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${state.shipments
            .map((shipment) => {
              const readiness = shipmentReadiness(shipment);
              return `
                <tr>
                  <td><strong>${h(shipment.orderId)}</strong><br><span class="muted">${h(shipment.sku)} / ${h(shipment.product)}</span></td>
                  <td>${h(shipment.platform)}<br><span class="muted">${h(shipment.country)}</span></td>
                  <td>
                    <select class="inline-select" data-shipment-carrier="${h(shipment.id)}">
                      <option value="">请选择</option>
                      ${renderCarrierOptions(shipment.carrier)}
                    </select>
                  </td>
                  <td><input class="inline-input" type="text" value="${h(shipment.trackingNo)}" placeholder="填写运单号" data-shipment-tracking="${h(shipment.id)}"></td>
                  <td>
                    <select class="inline-select" data-shipment-status="${h(shipment.id)}">
                      ${shipmentStatuses.map((status) => `<option value="${status}" ${shipment.status === status ? "selected" : ""}>${status}</option>`).join("")}
                    </select>
                  </td>
                  <td>
                    ${renderShipmentTimeline(shipment)}
                    <span class="muted">${h(shipment.lastTrackingEvent)}</span><br>
                    <span class="muted">${shipment.lastSyncedAt ? `同步 ${h(new Date(shipment.lastSyncedAt).toLocaleString())}` : "尚未同步"}</span>
                  </td>
                  <td>
                    <span class="tag ${readiness.ready ? "good" : "warning"}">${readiness.ready ? "可自动回传" : `缺 ${readiness.missing.join("、")}`}</span>
                  </td>
                  <td><button class="small-button" type="button" data-save-shipment="${h(shipment.id)}">保存</button></td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function saveShipment(shipmentId) {
  const shipment = state.shipments.find((item) => item.id === shipmentId);
  if (!shipment) return;
  shipment.carrier = document.querySelector(`[data-shipment-carrier="${CSS.escape(shipmentId)}"]`)?.value || "";
  shipment.trackingNo = document.querySelector(`[data-shipment-tracking="${CSS.escape(shipmentId)}"]`)?.value.trim() || "";
  shipment.status = document.querySelector(`[data-shipment-status="${CSS.escape(shipmentId)}"]`)?.value || shipment.status;
  shipment.autoSendReady = shipmentReadiness(shipment).ready;
  shipment.lastTrackingEvent = shipment.status === "待发货" ? "等待创建运单" : shipment.lastTrackingEvent || "等待物流轨迹同步";
  logAction("shipment.updated", { orderId: shipment.orderId, carrier: shipment.carrier, trackingNo: shipment.trackingNo, status: shipment.status });
  saveWorkspaceState();
  render();
}

function refreshTrackingStatus() {
  const nextStatus = {
    待发货: "已创建运单",
    已创建运单: "已发货",
    已发货: "运输中",
    运输中: "派送中",
    派送中: "已签收",
    已签收: "已签收",
    异常: "异常"
  };
  state.shipments.forEach((shipment) => {
    if (!shipment.trackingNo || shipment.status === "异常") return;
    shipment.status = nextStatus[shipment.status] || shipment.status;
    shipment.lastSyncedAt = new Date().toISOString();
    shipment.lastTrackingEvent = shipment.status === "已签收" ? "包裹已签收" : `轨迹已更新为：${shipment.status}`;
    shipment.autoSendReady = shipmentReadiness(shipment).ready;
  });
  logAction("shipment.tracking_refreshed", { count: state.shipments.length });
  saveWorkspaceState();
  render();
}

async function runYiwugoDiscovery(form) {
  const formData = new FormData(form);
  const configItem = state.supplierDiscoveryConfigs.yiwugo;
  configItem.refreshCadenceHours = Math.max(0, Number(formData.get("yiwugoRefreshHours") || configItem.refreshCadenceHours || 0));
  configItem.overwritePolicy = String(formData.get("yiwugoOverwritePolicy") || configItem.overwritePolicy);
  const params = new URLSearchParams({
    category: String(formData.get("yiwugoCategory") || "artificial_flower"),
    q: String(formData.get("yiwugoKeyword") || "").trim(),
    maxPrice: String(formData.get("yiwugoMaxPrice") || ""),
    maxMoq: String(formData.get("yiwugoMaxMoq") || ""),
    pageSize: String(formData.get("yiwugoPageSize") || "20")
  });
  const result = await fetch(`/api/yiwugo/discover?${params.toString()}`).then((response) => {
    if (!response.ok) throw new Error("义乌购找货接口暂时不可用");
    return response.json();
  });
  if (result.error) throw new Error(result.error);
  const fetchedAt = result.fetchedAt || new Date().toISOString();
  const nextRefreshAt = addHoursToIso(configItem.refreshCadenceHours, new Date(fetchedAt));
  configItem.lastFetchedAt = fetchedAt;
  configItem.nextRefreshAt = nextRefreshAt;
  state.yiwugoCandidates = (result.candidates || []).map((candidate) => ({
    ...candidate,
    sourceKey: "yiwugo",
    fetchedAt,
    nextRefreshAt,
    refreshCadenceHours: configItem.refreshCadenceHours,
    overwritePolicy: configItem.overwritePolicy,
    confirmationStatus: "候选待确认",
    storageStatus: "未入库"
  }));
  logAction("yiwugo.discovery.generated", {
    query: result.query || result.category,
    count: state.yiwugoCandidates.length,
    category: result.category,
    fetchedAt,
    nextRefreshAt
  });
  saveWorkspaceState();
  render();
}

function addYiwugoCandidateToSuppliers(candidateId) {
  const candidate = state.yiwugoCandidates.find((item) => item.id === candidateId);
  if (!candidate) return;
  const existing = supplierProducts.find((item) => item.sourceUrl === candidate.sourceUrl);
  if (existing) return;
  supplierProducts.unshift({
    id: `sp-ywg-${Date.now()}`,
    marketProductId: "",
    sourcePlatform: "义乌购",
    supplierName: candidate.shopName,
    title: candidate.title,
    purchasePriceCny: candidate.priceCny,
    moq: candidate.moq || 1,
    dispatchDays: candidate.deliveryPromise || 3,
    supplierRating: Math.min(95, 55 + candidate.credit * 10 + Math.min(20, Math.log10(candidate.saleNumber + 1) * 4)),
    monthlySales: candidate.saleNumber || candidate.dealQuantity || 0,
    supportsDropship: Boolean(candidate.onlineOrderFlag),
    backupSupplier: "待人工补充",
    sourceUrl: candidate.sourceUrl,
    imageUrl: candidate.imageUrl,
    sourceCategory: candidate.category,
    parseConfidence: candidate.confidence,
    yiwugoProductId: candidate.id,
    sourceFetchedAt: candidate.fetchedAt,
    nextRefreshAt: candidate.nextRefreshAt,
    refreshCadenceHours: candidate.refreshCadenceHours,
    overwritePolicy: candidate.overwritePolicy,
    dataStatus: "已入库，后续更新需人工确认",
    sourceSnapshot: {
      priceCny: candidate.priceCny,
      maxPriceCny: candidate.maxPriceCny,
      moq: candidate.moq,
      saleNumber: candidate.saleNumber,
      deliveryPromise: candidate.deliveryPromise,
      credit: candidate.credit,
      opportunityScore: candidate.opportunityScore
    }
  });
  candidate.storageStatus = "已加入供应商池";
  candidate.confirmationStatus = "已人工确认";
  logAction("yiwugo.candidate_added", { productId: candidate.id, title: candidate.title, supplierName: candidate.shopName });
  saveWorkspaceState();
  render();
}

function renderYiwugoDiscoveryPanel() {
  const candidates = state.yiwugoCandidates || [];
  const yiwugoConfig = state.supplierDiscoveryConfigs.yiwugo;
  const sourceCards = Object.entries(state.supplierDiscoveryConfigs)
    .map(
      ([key, item]) => `
        <article class="source-card">
          <div class="source-card-header">
            <div>
              <h3>${h(item.source)}</h3>
              <p class="muted">${h(item.mode)} · ${h(overwritePolicyText(item.overwritePolicy))}</p>
            </div>
            <span class="tag ${item.status === "active" ? "good" : "warning"}">${h(sourceStatusText(item.status))}</span>
          </div>
          <p class="muted">可读字段：${h(item.allowedFields)}</p>
          <p class="muted">不入库字段：${h(item.blockedFields)}</p>
          <div class="opportunity-card-data">
            <span>刷新周期 ${item.refreshCadenceHours ? `${item.refreshCadenceHours} 小时` : "手动"}</span>
            <span>上次抓取 ${h(formatDateTime(item.lastFetchedAt))}</span>
            <span>下次建议 ${h(formatDateTime(item.nextRefreshAt))}</span>
            <span>${key === "1688" ? "链接登记/人工补字段" : key === "manual_upload" ? "批量预览确认" : "公开列表接口"}</span>
          </div>
        </article>
      `
    )
    .join("");
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">供应商发现</p>
          <h2>多来源找货与更新规则</h2>
          <p class="muted">统一管理义乌购、1688、手工上传等来源。候选数据先进入待确认区，加入供应商池后保留来源快照；后续刷新只生成变更，不静默覆盖人工字段。</p>
        </div>
      </div>
      <div class="panel-body source-grid">${sourceCards}</div>
      <form class="panel-body discovery-form supplier-discovery-form" data-yiwugo-form>
        <label>
          来源
          <select name="supplierDiscoverySource">
            <option value="yiwugo">义乌购：自动找货</option>
            <option value="1688" disabled>1688：链接登记/人工补字段</option>
            <option value="manual_upload" disabled>手工上传：去数据导入</option>
          </select>
        </label>
        <label>
          类目
          <select name="yiwugoCategory">
            <option value="artificial_flower">仿真花/绿植</option>
            <option value="toys">玩具</option>
            <option value="hair_accessories">头饰</option>
            <option value="jewelry">珠宝首饰</option>
            <option value="decorative_craft">装饰工艺</option>
          </select>
        </label>
        <label>
          关键词
          <input name="yiwugoKeyword" type="text" placeholder="例如：盆栽、收纳、宠物">
        </label>
        <label>
          最高采购价
          <input name="yiwugoMaxPrice" type="number" min="0" step="0.1" value="30">
        </label>
        <label>
          起批量上限
          <input name="yiwugoMaxMoq" type="number" min="0" step="1" value="200">
        </label>
        <label>
          拉取数量
          <select name="yiwugoPageSize">
            <option value="20">20</option>
            <option value="40">40</option>
            <option value="60">60</option>
          </select>
        </label>
        <label>
          刷新周期
          <select name="yiwugoRefreshHours">
            ${[0, 6, 12, 24, 48, 72]
              .map(
                (hours) =>
                  `<option value="${hours}" ${Number(yiwugoConfig.refreshCadenceHours) === hours ? "selected" : ""}>${
                    hours ? `${hours} 小时` : "手动"
                  }</option>`
              )
              .join("")}
          </select>
        </label>
        <label>
          更新策略
          <select name="yiwugoOverwritePolicy">
            ${["manual_review", "never_overwrite_manual"]
              .map(
                (policy) =>
                  `<option value="${policy}" ${yiwugoConfig.overwritePolicy === policy ? "selected" : ""}>${overwritePolicyText(policy)}</option>`
              )
              .join("")}
          </select>
        </label>
        <button class="primary-button" type="submit">开始找货</button>
      </form>
      <div class="panel-body discovery-note">
        <span class="tag info">人工确认</span>
        <p class="muted">MVP 只使用公开商品列表字段。手机号、联系人、登录后报价和即时聊天信息不会自动入库。1688 当前作为链接登记和人工补字段来源，后续可接表格导入或 API。</p>
      </div>
      ${
        candidates.length > 0
          ? `<div class="supplier-candidate-grid">
              ${candidates
                .slice(0, 12)
                .map(
                  (candidate) => `
                    <article class="supplier-candidate-card">
                      ${candidate.imageUrl ? `<img src="${h(candidate.imageUrl)}" alt="${h(candidate.title)}">` : ""}
                      <div>
                        <div class="card-row">
                          <div>
                            <h3>${h(candidate.title)}</h3>
                            <p class="muted">${h(candidate.shopName)} · ${h(candidate.category)}</p>
                          </div>
                          <span class="score-badge">${h(candidate.opportunityScore)}</span>
                        </div>
                        <div class="tag-row">
                          <span class="tag good">${h(candidate.priceText)}</span>
                          <span class="tag">起批 ${h(candidate.moq)} ${h(candidate.metric)}</span>
                          <span class="tag">销量 ${h(candidate.saleNumber)}</span>
                          <span class="tag">发货 ${h(candidate.deliveryPromise || "待确认")} 天</span>
                        </div>
                        <div class="opportunity-card-data">
                          <span>店铺信用 ${h(candidate.credit)}</span>
                          <span>${candidate.onlineOrderFlag ? "支持线上下单" : "线上下单待确认"}</span>
                          <span>抓取 ${h(formatDateTime(candidate.fetchedAt))}</span>
                          <span>下次建议 ${h(formatDateTime(candidate.nextRefreshAt))}</span>
                          <span>状态 ${h(candidate.storageStatus || "未入库")}</span>
                          <span>数据源 ${h(candidate.confidence)}</span>
                          <span><a href="${h(candidate.sourceUrl)}" target="_blank" rel="noreferrer">打开原链接</a></span>
                        </div>
                        <div class="detail-actions">
                          <button class="small-button" type="button" data-add-yiwugo="${h(candidate.id)}">加入供应商池</button>
                        </div>
                      </div>
                    </article>
                  `
                )
                .join("")}
            </div>`
          : `<div class="panel-body"><p class="muted">还没有义乌购候选。设置类目和筛选条件后点击“开始找货”。</p></div>`
      }
    </section>
  `;
}

function renderSuppliers() {
  elements.views.suppliers.innerHTML = `
    ${pageGuide(
      "供应商主数据页",
      "这里查看供应商商品、采购价、MOQ 和履约能力。供应商与市场商品的人工绑定请去供应商匹配页完成。",
      [
        { view: "dataSources", label: "导入供应商数据" },
        { view: "supplierMatching", label: "管理匹配关系" }
      ]
    )}
    <div class="metrics-grid">
      ${metricCard("供应商商品", supplierProducts.length, "已导入或样例供应商商品")}
      ${metricCard("供应商数量", uniqueValues(supplierProducts, "supplierName").length, "可合作的供应商主体")}
      ${metricCard("已绑定商品", supplierProducts.filter((supplier) => marketProducts.some((product) => product.id === supplier.marketProductId)).length, "已匹配到市场商品")}
      ${metricCard("支持一件代发", supplierProducts.filter((supplier) => supplier.supportsDropship).length, "可直接履约的供应商商品")}
    </div>
    ${renderYiwugoDiscoveryPanel()}
    <section class="table-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">供应商主数据</p>
          <h2>供应商管理</h2>
        </div>
        <button class="small-button" type="button" data-go="dataSources">导入供应商数据</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>供应商</th>
            <th>商品</th>
            <th>采购价</th>
            <th>MOQ</th>
            <th>发货</th>
            <th>评分</th>
            <th>一件代发</th>
            <th>备选</th>
          </tr>
        </thead>
        <tbody>
          ${supplierProducts
            .map(
              (supplier) => `
                <tr>
                  <td>${supplier.supplierName}<br><span class="muted">${supplier.sourcePlatform}</span>${
                    supplier.sourceFetchedAt
                      ? `<br><span class="muted">抓取 ${h(formatDateTime(supplier.sourceFetchedAt))}</span><br><span class="muted">${h(
                          overwritePolicyText(supplier.overwritePolicy)
                        )}</span>`
                      : ""
                  }</td>
                  <td>${supplier.title}</td>
                  <td>${money(supplier.purchasePriceCny)}</td>
                  <td>${supplier.moq}</td>
                  <td>${supplier.dispatchDays} 天</td>
                  <td>${supplier.supplierRating}</td>
                  <td><span class="tag ${supplier.supportsDropship ? "good" : "warning"}">${supplier.supportsDropship ? "支持" : "不支持"}</span></td>
                  <td>${supplier.backupSupplier}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function marketProductLabel(product) {
  return `${product.localTitle || product.title} · ${product.country}/${product.platform}`;
}

function groupOrdersBy(keys) {
  const grouped = new Map();
  orders.forEach((order) => {
    const key = keys.map((field) => order[field] || "未填写").join(" / ");
    const current = grouped.get(key) || { key, count: 0, amount: 0, profit: 0 };
    current.count += 1;
    current.amount += Number(order.amountCny || 0);
    current.profit += Number(order.profitCny || 0);
    grouped.set(key, current);
  });
  return [...grouped.values()].sort((a, b) => b.amount - a.amount);
}

function renderFinance() {
  const totalAmount = orders.reduce((sum, order) => sum + Number(order.amountCny || 0), 0);
  const totalProfit = orders.reduce((sum, order) => sum + Number(order.profitCny || 0), 0);
  const profitRate = totalAmount > 0 ? totalProfit / totalAmount : 0;
  const byPlatform = groupOrdersBy(["platform"]);
  const byCountry = groupOrdersBy(["country"]);

  elements.views.finance.innerHTML = `
    ${pageGuide(
      "收入分析页",
      "这里不单独录入收入，收入来自订单导入后的金额和利润字段。用于快速查看平台、国家维度的收入与利润表现。",
      [
        { view: "orders", label: "看订单台账" },
        { view: "dataSources", label: "导入订单数据" }
      ]
    )}
    <div class="metrics-grid">
      ${metricCard("总收入", money(totalAmount), "来自订单数据的销售额")}
      ${metricCard("预估利润", money(totalProfit), "来自订单数据的利润")}
      ${metricCard("利润率", percent(profitRate), "预估利润 / 总收入")}
      ${metricCard("订单数", orders.length, "当前已导入订单")}
    </div>
    <div class="two-column equal-columns">
      <section class="table-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">按平台</p>
            <h2>按平台收入</h2>
          </div>
          <button class="small-button" type="button" data-go="dataSources">导入订单数据</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>平台</th>
              <th>订单数</th>
              <th>收入</th>
              <th>利润</th>
              <th>利润率</th>
            </tr>
          </thead>
          <tbody>
            ${byPlatform
              .map(
                (item) => `
                  <tr>
                    <td>${h(item.key)}</td>
                    <td>${item.count}</td>
                    <td>${money(item.amount)}</td>
                    <td>${money(item.profit)}</td>
                    <td>${percent(item.amount > 0 ? item.profit / item.amount : 0)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </section>
      <section class="table-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">按国家</p>
            <h2>按国家收入</h2>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>国家</th>
              <th>订单数</th>
              <th>收入</th>
              <th>利润</th>
              <th>利润率</th>
            </tr>
          </thead>
          <tbody>
            ${byCountry
              .map(
                (item) => `
                  <tr>
                    <td>${h(item.key)}</td>
                    <td>${item.count}</td>
                    <td>${money(item.amount)}</td>
                    <td>${money(item.profit)}</td>
                    <td>${percent(item.amount > 0 ? item.profit / item.amount : 0)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </section>
    </div>
  `;
}

function renderSupplierMatching() {
  const linkedCount = supplierProducts.filter((supplier) =>
    marketProducts.some((product) => product.id === supplier.marketProductId)
  ).length;

  elements.views.supplierMatching.innerHTML = `
    ${pageGuide(
      "供应商匹配工作台",
      "这里处理市场商品和供应商商品之间的人工绑定。匹配结果会回流机会池评分、上架草稿检查和供应链缺口判断。",
      [
        { view: "products", label: "看商品池" },
        { view: "suppliers", label: "看供应商" }
      ]
    )}
    <div class="metrics-grid">
      ${metricCard("供应商商品", supplierProducts.length, "已导入和样例供应商记录")}
      ${metricCard("已匹配", linkedCount, "已绑定到市场商品")}
      ${metricCard("待人工匹配", supplierProducts.length - linkedCount, "需要人工确认")}
      ${metricCard("市场商品池", marketProducts.length, "可匹配的市场商品")}
    </div>
    <section class="table-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">人工绑定</p>
          <h2>供应商匹配清单</h2>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>供应商商品</th>
            <th>成本</th>
            <th>当前匹配</th>
            <th>人工绑定</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          ${supplierProducts
            .map((supplier) => {
              const matched = marketProducts.find((product) => product.id === supplier.marketProductId);
              return `
                <tr>
                  <td>
                    <strong>${h(supplier.title)}</strong><br>
                    <span class="muted">${h(supplier.supplierName)} · ${h(supplier.sourcePlatform)}</span>
                  </td>
                  <td>${money(supplier.purchasePriceCny)}<br><span class="muted">MOQ ${supplier.moq}, ${supplier.dispatchDays} days</span></td>
                  <td>${matched ? h(marketProductLabel(matched)) : `<span class="muted">未绑定</span>`}</td>
                  <td>
                    <select class="inline-select" data-bind-supplier="${h(supplier.id)}">
                      <option value="">未分配</option>
                      ${marketProducts
                        .map(
                          (product) =>
                            `<option value="${h(product.id)}" ${supplier.marketProductId === product.id ? "selected" : ""}>${h(
                              marketProductLabel(product)
                            )}</option>`
                        )
                        .join("")}
                    </select>
                  </td>
                  <td><span class="tag ${matched ? "good" : "danger"}">${matched ? "已匹配" : "待复核"}</span></td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function bestLogisticsCost(country) {
  const matches = state.logisticsRates
    .filter((rate) => rate.destinationCountry?.toLowerCase() === country?.toLowerCase())
    .filter((rate) => Number.isFinite(rate.priceCny));
  if (matches.length === 0) return undefined;
  return Math.min(...matches.map((rate) => rate.priceCny));
}

function refreshMarketLogisticsCosts() {
  marketProducts.forEach((product) => {
    const bestCost = bestLogisticsCost(product.country);
    if (Number.isFinite(bestCost)) product.logisticsCostCny = bestCost;
  });
}

function renderLogisticsManagement() {
  const countries = uniqueValues(marketProducts, "country");
  elements.views.logistics.innerHTML = `
    ${pageGuide(
      "物流报价管理页",
      "这里维护目的国物流报价，并把最低可用报价刷新到商品成本。没有报价的国家会影响机会池毛利和上架草稿检查。",
      [
        { view: "dataSources", label: "导入物流报价" },
        { view: "products", label: "看商品成本" }
      ]
    )}
    <div class="metrics-grid">
      ${metricCard("报价条目", state.logisticsRates.length, "已导入或手工维护的物流报价")}
      ${metricCard("覆盖国家", uniqueValues(state.logisticsRates, "destinationCountry").length, "已有报价的目的国")}
      ${metricCard("未覆盖商品", marketProducts.filter((product) => !Number.isFinite(bestLogisticsCost(product.country))).length, "没有匹配目的国报价")}
      ${metricCard("商品池", marketProducts.length, "会受物流成本影响的商品")}
    </div>
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">手工报价</p>
          <h2>新增物流报价</h2>
        </div>
        <button class="small-button" type="button" data-refresh-logistics>刷新商品成本</button>
      </div>
      <form class="panel-body logistics-form" data-logistics-form>
        <label>物流商<input name="provider" required placeholder="YunExpress"></label>
        <label>线路<input name="route" required placeholder="CN-TH standard"></label>
        <label>目的国
          <select name="destinationCountry" required>
            <option value="">请选择</option>
            ${countries.map((country) => `<option value="${h(country)}">${h(country)}</option>`).join("")}
          </select>
        </label>
        <label>价格 CNY<input name="priceCny" type="number" min="0" step="0.01" required></label>
        <label>最快天数<input name="estimatedDaysMin" type="number" min="0" step="1"></label>
        <label>最慢天数<input name="estimatedDaysMax" type="number" min="0" step="1"></label>
        <button class="primary-button" type="submit">新增报价</button>
      </form>
    </section>
    <section class="table-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">报价台账</p>
          <h2>物流报价清单</h2>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>物流商 / 线路</th>
            <th>目的国</th>
            <th>重量</th>
            <th>价格</th>
            <th>时效</th>
            <th>使用商品</th>
            <th>来源</th>
          </tr>
        </thead>
        <tbody>
          ${state.logisticsRates
            .map((rate) => {
              const usedBy = marketProducts.filter((product) => bestLogisticsCost(product.country) === rate.priceCny && product.country === rate.destinationCountry);
              return `
                <tr>
                  <td><strong>${h(rate.provider)}</strong><br><span class="muted">${h(rate.route)}</span></td>
                  <td>${h(rate.destinationCountry)}</td>
                  <td>${h(rate.weightKg || "-")} kg / vol ${h(rate.volumeWeightKg || "-")}</td>
                  <td>${money(rate.priceCny)}</td>
                  <td>${h(rate.estimatedDaysMin || "-")} - ${h(rate.estimatedDaysMax || "-")} 天</td>
                  <td>${usedBy.length} 个商品</td>
                  <td>${h(rate.sourceFile || rate.sourceUrlOrFile || "手工维护")}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderReports(opportunities) {
  const summary = buildStrategySummary(opportunities);
  elements.views.reports.innerHTML = `
    ${pageGuide(
      "经营复盘页",
      "这里汇总当前机会池、上架草稿和履约信号，帮助团队安排本周动作；它不是数据录入入口，缺数据时回到数据管理平台补齐。",
      [
        { view: "listings", label: "看上架草稿" },
        { view: "orders", label: "看订单数据" }
      ]
    )}
    <div class="metrics-grid">
      ${metricCard("预估正毛利池", money(summary.grossProfit), "仅统计当前筛选范围内正毛利商品")}
      ${metricCard("可测试商品", summary.testItems.length, "建议进入小单测试和上架草稿")}
      ${metricCard("需补供应链", summary.supplierItems.length, "优先找低成本或更稳供应商")}
      ${metricCard("合规待处理", summary.complianceItems.length, "敏感类目或俄罗斯专项")}
    </div>
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Weekly Review</p>
          <h2>本周经营动作</h2>
        </div>
      </div>
      <div class="panel-body timeline">
        <div class="timeline-item"><strong>周一</strong><p>刷新机会池，筛掉毛利率低于 ${percent(state.marginThreshold)} 的商品。</p></div>
        <div class="timeline-item"><strong>周二</strong><p>为小单测试商品生成上架草稿，完成标题、属性、价格和图片检查。</p></div>
        <div class="timeline-item"><strong>周三</strong><p>供应链复核主供应商和备选供应商，确认 MOQ、发货时效和退换政策。</p></div>
        <div class="timeline-item"><strong>周四</strong><p>检查订单履约异常，优先处理待采购、物流待确认和退款风险。</p></div>
        <div class="timeline-item"><strong>周五</strong><p>根据转化、毛利和风险分层：放大、观察、降价、下架或换供应商。</p></div>
      </div>
    </section>
  `;
}

function mvpStatusClass(status) {
  if (status === "已完成") return "good";
  if (status === "部分完成") return "info";
  if (status === "待补") return "warning";
  return "danger";
}

function renderMvpReadiness() {
  const completed = mvpReadinessItems.filter((item) => item.status === "已完成").length;
  const partial = mvpReadinessItems.filter((item) => item.status === "部分完成").length;
  const missing = mvpReadinessItems.filter((item) => item.status === "待补").length;
  const deferred = mvpReadinessItems.filter((item) => item.status === "暂缓").length;
  const p0Open = mvpReadinessItems.filter((item) => item.priority === "P0" && item.status !== "已完成").length;
  elements.views.mvpReadiness.innerHTML = `
    ${pageGuide(
      "MVP 初版管理",
      "这个页面把初版必须做好的能力、当前前端能看到的位置、还缺什么、哪些暂缓集中管理。对应文档是 docs/MVP_READINESS.md，后续每次做功能都要同步更新这里和 TODO。",
      [
        { view: "opportunities", label: "查看机会池" },
        { view: "dataSources", label: "查看数据导入" }
      ]
    )}
    <div class="metrics-grid">
      ${metricCard("已完成", completed, "已经能在本地 MVP 中使用")}
      ${metricCard("部分完成", partial, "前端可见，但仍是简化或本地假设")}
      ${metricCard("待补", missing, "进入更强 MVP 演示前需要继续补")}
      ${metricCard("P0 未完全完成", p0Open, "P0 中非已完成项目，优先排查")}
    </div>
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">能力矩阵</p>
          <h2>MVP 初版要做好哪些</h2>
        </div>
        <span class="tag ${deferred > 0 ? "warning" : "good"}">${deferred} 项暂缓</span>
      </div>
      <div class="table-scroll">
        <table class="compact-table">
          <thead>
            <tr>
              <th>模块</th>
              <th>前端位置</th>
              <th>状态</th>
              <th>优先级</th>
              <th>说明 / 缺口</th>
            </tr>
          </thead>
          <tbody>
            ${mvpReadinessItems
              .map(
                (item) => `
                  <tr>
                    <td><strong>${h(item.area)}</strong></td>
                    <td>${h(item.surface)}</td>
                    <td><span class="tag ${mvpStatusClass(item.status)}">${h(item.status)}</span></td>
                    <td>${h(item.priority)}</td>
                    <td class="wide-note">${h(item.note)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">当前结论</p>
          <h2>初版还差什么</h2>
        </div>
      </div>
      <div class="panel-body readiness-summary">
        <article>
          <h3>可以演示的主链路</h3>
          <p class="muted">数据导入 / 本地存储 / 主动发现 / 机会评分 / 上架草稿 / 订单收入 / 发货履约 / 审计备份已经能串起来。</p>
        </article>
        <article>
          <h3>最需要补的 P0</h3>
          <p class="muted">成本依据要更清楚：按平台、国家、类目维护成本模板，并在机会池里标出每个成本来自模板、供应商报价还是物流报价。</p>
        </article>
        <article>
          <h3>不在本地 MVP 范围</h3>
          <p class="muted">真实平台 API、多人权限、数据库、对象存储、自动发货回传和真实物流追踪，等数据获取方式确定后再做。</p>
        </article>
      </div>
    </section>
  `;
}

function renderSettings() {
  elements.views.settings.innerHTML = `
    <div class="settings-grid">
      <section class="panel">
        <div class="panel-header"><h2>评分权重</h2></div>
        <div class="panel-body">
          ${Object.entries(config.scoringWeights)
            .map(([key, value]) => `<div class="config-row"><span>${key}</span><strong>${value}</strong></div>`)
            .join("")}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>成本参数</h2></div>
        <div class="panel-body">
          <div class="config-row"><span>支付手续费</span><strong>${percent(config.paymentFeeRate)}</strong></div>
          <div class="config-row"><span>广告成本预估</span><strong>${percent(config.adCostRate)}</strong></div>
          <div class="config-row"><span>退货损耗</span><strong>${percent(config.returnLossRate)}</strong></div>
          <div class="config-row"><span>包装成本</span><strong>${money(config.packagingCostCny)}</strong></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>平台佣金</h2></div>
        <div class="panel-body">
          ${Object.entries(config.platformFees)
            .map(([key, value]) => `<div class="config-row"><span>${key}</span><strong>${percent(value)}</strong></div>`)
            .join("")}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>风险规则</h2></div>
        <div class="panel-body">
          <div class="config-row"><span>俄罗斯基础风险</span><strong>${config.riskRules.RussiaBaseRisk}</strong></div>
          <div class="config-row"><span>高风险类目</span><strong>${config.riskRules.highRiskCategories.join("、")}</strong></div>
        </div>
      </section>
    </div>
  `;
}

function storageSizeKb() {
  return Math.round((localStorage.getItem(STORAGE_KEY)?.length || 0) / 10.24) / 100;
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportWorkspaceBackup() {
  state.lastBackupAt = new Date().toISOString();
  logAction("workspace.backup.exported", { savedAt: state.lastBackupAt });
  saveWorkspaceState();
  downloadJson(`globaltrade-autopilot-backup-${state.lastBackupAt.slice(0, 10)}.json`, buildWorkspaceSnapshot());
  render();
}

async function restoreWorkspaceBackup(file) {
  try {
    const snapshot = JSON.parse(await file.text());
    applyWorkspaceSnapshot(snapshot);
    state.lastBackupAt = new Date().toISOString();
    logAction("workspace.backup.restored", { fileName: file.name, savedAt: snapshot.savedAt });
    refreshMarketLogisticsCosts();
    refreshFilters();
    saveWorkspaceState();
    render();
  } catch (error) {
    alert(error.message || "备份恢复失败。");
  }
}

function resetLocalWorkspace() {
  const confirmed = window.confirm("确定把本地 MVP 数据重置为内置样例数据吗？这只会清空当前浏览器工作区。");
  if (!confirmed) return;
  replaceObject(config, INITIAL_WORKSPACE.config);
  replaceArray(marketProducts, INITIAL_WORKSPACE.marketProducts);
  replaceArray(supplierProducts, INITIAL_WORKSPACE.supplierProducts);
  replaceArray(listingDrafts, INITIAL_WORKSPACE.listingDrafts);
  replaceArray(orders, INITIAL_WORKSPACE.orders);
  state.discoveryCandidates = [];
  state.demandResearches = [];
  state.leadSearchTasks = [];
  state.leadSourcePlans = [];
  state.leadSourceRuns = [];
  state.storeLeads = [];
  state.storeLeadDraft = null;
  state.selectedDemandResearchId = null;
  state.selectedLeadSourcePlanId = null;
  state.yiwugoCandidates = [];
  state.competitorSnapshots = [];
  state.competitorDraft = null;
  state.logisticsRates = [];
  state.shipments = buildDefaultShipments();
  state.dataSources = clone(DEFAULT_DATA_SOURCES);
  state.importHistory = [];
  state.auditLogs = [];
  state.fieldMappings = { market: {}, supplier: {}, logistics: {}, orders: {} };
  state.importResults = { market: null, supplier: null, logistics: null, orders: null };
  state.pendingImport = null;
  state.marginThreshold = config.defaultMarginThreshold;
  state.country = "all";
  state.platform = "all";
  state.category = "all";
  state.selectedId = null;
  state.selectedDraftId = null;
  localStorage.removeItem(STORAGE_KEY);
  logAction("workspace.reset", {});
  saveWorkspaceState();
  refreshFilters();
  render();
}

function updateConfigNumber(path, value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return;
  const [group, key] = path.split(".");
  if (key) {
    config[group][key] = number;
  } else {
    config[path] = number;
    if (path === "defaultMarginThreshold") state.marginThreshold = number;
  }
  logAction("config.updated", { path, value: number });
  refreshFilters();
  saveWorkspaceState();
  render();
}

function renderNumberInput(path, value, label, step = "0.001") {
  return `
    <label class="config-input">
      <span>${h(label)}</span>
      <input type="number" min="0" step="${step}" value="${h(value)}" data-config-number="${h(path)}">
    </label>
  `;
}

function renderAuditLog() {
  if (state.auditLogs.length === 0) return `<p class="muted">还没有本地审计事件。</p>`;
  return state.auditLogs
    .slice(0, 8)
    .map(
      (entry) => `
        <article class="audit-item">
          <div>
            <strong>${h(auditActionLabel(entry.action))}</strong>
            <p class="muted">${h(new Date(entry.at).toLocaleString())} / 本地用户</p>
          </div>
          <p class="muted">${h(auditDetailLabel(entry))}</p>
        </article>
      `
    )
    .join("");
}

function renderSettingsConsole() {
  elements.views.settings.innerHTML = `
    ${pageGuide(
      "系统配置页",
      "这里管理本地 MVP 的备份恢复、成本参数、汇率、平台佣金和本地审计日志。多人权限和后端审计仍是后续任务。",
      [{ view: "dataSources", label: "回到数据导入" }]
    )}
    <div class="settings-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">本地最小版本</p>
            <h2>工作区备份</h2>
          </div>
        </div>
        <div class="panel-body backup-panel">
          <div class="tag-row">
            <span class="tag">${marketProducts.length} 个市场商品</span>
            <span class="tag">${supplierProducts.length} 个供应商商品</span>
            <span class="tag">${state.logisticsRates.length} 条物流报价</span>
            <span class="tag">${orders.length} 个订单</span>
            <span class="tag">${state.shipments.length} 个发货任务</span>
          </div>
          <div class="config-row"><span>本地存储大小</span><strong>${storageSizeKb()} 千字节</strong></div>
          <div class="config-row"><span>上次备份</span><strong>${state.lastBackupAt ? h(new Date(state.lastBackupAt).toLocaleString()) : "尚未导出"}</strong></div>
          <div class="backup-actions">
            <button class="primary-button" type="button" data-export-backup>导出备份文件</button>
            <label class="file-button">
              恢复备份文件
              <input type="file" data-restore-backup accept=".json,application/json">
            </label>
            <button class="small-button danger-button" type="button" data-reset-workspace>重置本地数据</button>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>成本配置</h2></div>
        <div class="panel-body config-form">
          ${renderNumberInput("paymentFeeRate", config.paymentFeeRate, "支付手续费率")}
          ${renderNumberInput("adCostRate", config.adCostRate, "广告成本率")}
          ${renderNumberInput("returnLossRate", config.returnLossRate, "退货损耗率")}
          ${renderNumberInput("packagingCostCny", config.packagingCostCny, "包装成本（人民币）", "0.01")}
          ${renderNumberInput("defaultMarginThreshold", config.defaultMarginThreshold, "默认最低毛利率")}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>兑人民币汇率</h2></div>
        <div class="panel-body config-form">
          ${Object.entries(config.fxRatesToCny)
            .map(([key, value]) => renderNumberInput(`fxRatesToCny.${key}`, value, key, "0.00001"))
            .join("")}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>平台佣金</h2></div>
        <div class="panel-body config-form">
          ${Object.entries(config.platformFees)
            .map(([key, value]) => renderNumberInput(`platformFees.${key}`, value, key))
            .join("")}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>审计日志</h2></div>
        <div class="panel-body audit-list">${renderAuditLog()}</div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>评分权重</h2></div>
        <div class="panel-body">
          ${Object.entries(config.scoringWeights)
            .map(([key, value]) => `<div class="config-row"><span>${key}</span><strong>${value}</strong></div>`)
            .join("")}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>风险规则</h2></div>
        <div class="panel-body">
          <div class="config-row"><span>俄罗斯基础风险</span><strong>${config.riskRules.RussiaBaseRisk}</strong></div>
          <div class="config-row"><span>高风险类目</span><strong>${config.riskRules.highRiskCategories.join(", ")}</strong></div>
        </div>
      </section>
    </div>
  `;
}

function copyReport(opportunities) {
  const lines = opportunities.map((item) => {
    const product = item.marketProduct;
    return `${product.country}/${product.platform} ${product.localTitle}: ${item.recommendedAction}, 分数 ${score(
      item.scores.final
    )}, 毛利率 ${percent(item.cost.grossMargin)}, 风险 ${score(item.scores.risk)}`;
  });
  const report = [`出海交易中台策略摘要`, `生成时间：${new Date().toLocaleString()}`, "", ...lines].join("\n");
  navigator.clipboard
    .writeText(report)
    .then(() => {
      elements.copyReportButton.textContent = "已复制";
      setTimeout(() => {
        elements.copyReportButton.textContent = "复制策略摘要";
      }, 1200);
    })
    .catch(() => {
      alert(report);
    });
}

function bindDynamicEvents() {
  document.querySelectorAll(".opportunity-card").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedId = card.dataset.id;
      render();
    });
  });

  document.querySelectorAll("[data-create-draft-opportunity]").forEach((button) => {
    button.addEventListener("click", () => createListingDraftFromOpportunity(button.dataset.createDraftOpportunity));
  });

  document.querySelectorAll("[data-select-draft]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDraftId = button.dataset.selectDraft;
      saveWorkspaceState();
      render();
    });
  });

  document.querySelectorAll("[data-localization-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      saveListingLocalization(form.dataset.localizationForm, form);
    });
  });

  document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.go;
      render();
    });
  });

  document.querySelectorAll("[data-template]").forEach((button) => {
    button.addEventListener("click", () => {
      downloadTemplate(button.dataset.template, button.dataset.format);
    });
  });

  document.querySelectorAll("[data-import-kind]").forEach((input) => {
    input.addEventListener("change", () => {
      const [file] = input.files;
      if (file) handleImportFile(input.dataset.importKind, file);
    });
  });

  document.querySelectorAll("[data-map-field]").forEach((select) => {
    select.addEventListener("change", () => {
      updatePendingFieldMapping(select.dataset.mapField, select.value);
    });
  });

  document.querySelectorAll("[data-confirm-import]").forEach((button) => {
    button.addEventListener("click", confirmPendingImport);
  });

  document.querySelectorAll("[data-discard-import]").forEach((button) => {
    button.addEventListener("click", () => {
      state.pendingImport = null;
      saveWorkspaceState();
      render();
    });
  });

  document.querySelectorAll("[data-rollback-import]").forEach((button) => {
    button.addEventListener("click", () => {
      rollbackImportBatch(button.dataset.rollbackImport);
    });
  });

  document.querySelectorAll("[data-bind-supplier]").forEach((select) => {
    select.addEventListener("change", () => {
      bindSupplierToMarket(select.dataset.bindSupplier, select.value);
    });
  });

  document.querySelectorAll("[data-logistics-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      addLogisticsQuote(form);
    });
  });

  document.querySelectorAll("[data-refresh-logistics]").forEach((button) => {
    button.addEventListener("click", () => {
      refreshMarketLogisticsCosts();
      saveWorkspaceState();
      render();
    });
  });

  document.querySelectorAll("[data-save-shipment]").forEach((button) => {
    button.addEventListener("click", () => saveShipment(button.dataset.saveShipment));
  });

  document.querySelectorAll("[data-sync-shipments]").forEach((button) => {
    button.addEventListener("click", () => {
      syncShipmentsWithOrders();
      logAction("shipment.synced_from_orders", { count: state.shipments.length });
      saveWorkspaceState();
      render();
    });
  });

  document.querySelectorAll("[data-refresh-tracking]").forEach((button) => {
    button.addEventListener("click", refreshTrackingStatus);
  });

  document.querySelectorAll("[data-discovery-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      runDiscovery(form);
    });
  });

  document.querySelectorAll("[data-demand-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      createDemandResearch(form);
    });
  });

  document.querySelectorAll("[data-lead-task-status]").forEach((button) => {
    button.addEventListener("click", () => {
      updateLeadSearchTaskStatus(button.dataset.leadTaskStatus, button.dataset.status);
    });
  });

  document.querySelectorAll("[data-generate-lead-sources]").forEach((button) => {
    button.addEventListener("click", () => {
      generateLeadSourcePlans(button.dataset.generateLeadSources);
    });
  });

  document.querySelectorAll("[data-lead-source-status]").forEach((select) => {
    select.addEventListener("change", () => {
      updateLeadSourcePlanStatus(select.dataset.leadSourceStatus, select.value);
    });
  });

  document.querySelectorAll("[data-open-lead-source]").forEach((button) => {
    button.addEventListener("click", () => {
      openLeadSourcePlan(button.dataset.openLeadSource);
    });
  });

  document.querySelectorAll("[data-prepare-lead-source]").forEach((button) => {
    button.addEventListener("click", () => {
      prepareLeadSourceForParsing(button.dataset.prepareLeadSource);
    });
  });

  document.querySelectorAll("[data-store-lead-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      previewStoreLeadCollection(form);
    });
  });

  document.querySelectorAll("[data-confirm-store-leads]").forEach((button) => {
    button.addEventListener("click", confirmStoreLeadCollection);
  });

  document.querySelectorAll("[data-discard-store-leads]").forEach((button) => {
    button.addEventListener("click", discardStoreLeadDraft);
  });

  document.querySelectorAll("[data-store-lead-status]").forEach((select) => {
    select.addEventListener("change", () => {
      updateStoreLeadStatus(select.dataset.storeLeadStatus, select.value);
    });
  });

  document.querySelectorAll("[data-remove-store-lead]").forEach((button) => {
    button.addEventListener("click", () => {
      removeStoreLead(button.dataset.removeStoreLead);
    });
  });

  document.querySelectorAll("[data-add-discovery]").forEach((button) => {
    button.addEventListener("click", () => addDiscoveryToProductPool(button.dataset.addDiscovery));
  });

  document.querySelectorAll("[data-draft-discovery]").forEach((button) => {
    button.addEventListener("click", () => createListingDraftFromDiscovery(button.dataset.draftDiscovery));
  });

  document.querySelectorAll("[data-yiwugo-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      runYiwugoDiscovery(form).catch((error) => {
        state.yiwugoCandidates = [];
        logAction("yiwugo.discovery.generated", { query: "失败", error: error.message });
        saveWorkspaceState();
        render();
        window.alert(error.message || "义乌购找货失败");
      });
    });
  });

  document.querySelectorAll("[data-add-yiwugo]").forEach((button) => {
    button.addEventListener("click", () => addYiwugoCandidateToSuppliers(button.dataset.addYiwugo));
  });

  document.querySelectorAll("[data-competitor-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      previewCompetitorCollection(form);
    });
  });

  document.querySelectorAll("[data-confirm-competitor]").forEach((button) => {
    button.addEventListener("click", confirmCompetitorCollection);
  });

  document.querySelectorAll("[data-discard-competitor]").forEach((button) => {
    button.addEventListener("click", discardCompetitorDraft);
  });

  document.querySelectorAll("[data-export-backup]").forEach((button) => {
    button.addEventListener("click", exportWorkspaceBackup);
  });

  document.querySelectorAll("[data-restore-backup]").forEach((input) => {
    input.addEventListener("change", () => {
      const [file] = input.files;
      if (file) restoreWorkspaceBackup(file);
    });
  });

  document.querySelectorAll("[data-reset-workspace]").forEach((button) => {
    button.addEventListener("click", resetLocalWorkspace);
  });

  document.querySelectorAll("[data-config-number]").forEach((input) => {
    input.addEventListener("change", () => {
      updateConfigNumber(input.dataset.configNumber, input.value);
    });
  });

  document.querySelectorAll("[data-source-mode]").forEach((select) => {
    select.addEventListener("change", () => {
      updateDataSourceMode(select.dataset.sourceMode, select.value);
    });
  });

  document.querySelectorAll("[data-source-owner]").forEach((input) => {
    input.addEventListener("change", () => {
      updateDataSourceOwner(input.dataset.sourceOwner, input.value);
    });
  });
}

function setActiveView() {
  elements.viewTitle.textContent = viewTitles[state.view];
  elements.navItems.forEach((item) => item.classList.toggle("is-active", item.dataset.view === state.view));
  elements.filterBar.classList.toggle("is-hidden", managementViews.has(state.view));
  Object.entries(elements.views).forEach(([key, element]) => {
    element.classList.toggle("is-active", key === state.view);
  });
}

function render() {
  const opportunities = getOpportunities();
  if (!state.selectedId && opportunities.length > 0) state.selectedId = opportunities[0].id;
  if (opportunities.length > 0 && !opportunities.some((item) => item.id === state.selectedId)) {
    state.selectedId = opportunities[0].id;
  }

  setActiveView();
  renderDashboard(opportunities);
  renderDemandResearch();
  renderDataSourceManagement();
  renderProducts();
  renderCompetitorCollection();
  renderOpportunities(opportunities);
  renderListingsReview(opportunities);
  renderFulfillment();
  renderOrders();
  renderSuppliers();
  renderFinance();
  renderSupplierMatching();
  renderLogisticsManagement();
  renderReports(opportunities);
  renderMvpReadiness();
  renderSettingsConsole();
  bindDynamicEvents();
}

function bindStaticEvents() {
  elements.navItems.forEach((item) => {
    item.addEventListener("click", () => {
      state.view = item.dataset.view;
      render();
    });
  });

  elements.countryFilter.addEventListener("change", (event) => {
    state.country = event.target.value;
    state.selectedId = null;
    saveWorkspaceState();
    render();
  });

  elements.platformFilter.addEventListener("change", (event) => {
    state.platform = event.target.value;
    state.selectedId = null;
    saveWorkspaceState();
    render();
  });

  elements.categoryFilter.addEventListener("change", (event) => {
    state.category = event.target.value;
    state.selectedId = null;
    saveWorkspaceState();
    render();
  });

  elements.marginThreshold.addEventListener("input", (event) => {
    state.marginThreshold = Number(event.target.value) / 100;
    saveWorkspaceState();
    render();
  });

  elements.copyReportButton.addEventListener("click", () => copyReport(getOpportunities()));
  elements.createDraftButton.addEventListener("click", () => {
    state.view = "listings";
    render();
  });
}

loadWorkspaceState();
syncShipmentsWithOrders();
refreshFilters();
bindStaticEvents();
render();
