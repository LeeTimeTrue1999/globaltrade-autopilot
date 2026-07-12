const templateDefinitions = {
  market: {
    label: "market-products",
    headers: [
      "platform",
      "country",
      "category",
      "title",
      "local_title",
      "price",
      "currency",
      "rating",
      "review_count",
      "sales_signal",
      "rank",
      "rank_trend",
      "competition_level",
      "logistics_cost_cny",
      "product_url",
      "images",
      "collected_at",
      "source_type",
      "source_url_or_file",
      "confidence_level",
      "owner"
    ],
    sample: [
      "Shopee",
      "Thailand",
      "Home Storage",
      "Foldable kitchen storage rack with drain tray",
      "Foldable kitchen rack",
      "329",
      "THB",
      "4.7",
      "1840",
      "6200",
      "12",
      "18",
      "55",
      "12.5",
      "https://example.com/product",
      "https://example.com/image.jpg",
      "2026-07-11",
      "seller_export",
      "Shopee export 2026-07-11.csv",
      "A",
      "Selection Ops"
    ]
  },
  supplier: {
    label: "supplier-products",
    headers: [
      "market_product_id",
      "source_platform",
      "supplier_name",
      "supplier_id",
      "product_title",
      "purchase_price_cny",
      "moq",
      "dispatch_days",
      "supplier_rating",
      "monthly_sales",
      "supports_dropship",
      "stock_status",
      "product_url",
      "images",
      "last_checked_at",
      "source_type",
      "source_url_or_file",
      "confidence_level",
      "backup_supplier"
    ],
    sample: [
      "mp-th-001",
      "1688",
      "Yiwu Home Goods Factory",
      "SUP-001",
      "Foldable kitchen rack",
      "18.6",
      "2",
      "2",
      "88",
      "3200",
      "true",
      "in_stock",
      "https://example.com/supplier-product",
      "https://example.com/image.jpg",
      "2026-07-11",
      "supplier_quote",
      "Supplier quote 2026-07-11.xlsx",
      "B",
      "Jinhua Kitchen Supplies"
    ]
  },
  logistics: {
    label: "logistics-rate-cards",
    headers: [
      "provider",
      "route",
      "origin_country",
      "destination_country",
      "weight_kg",
      "volume_weight_kg",
      "price_cny",
      "estimated_days_min",
      "estimated_days_max",
      "tracking_no",
      "tracking_status",
      "last_checkpoint",
      "last_checked_at",
      "source_type",
      "source_url_or_file",
      "confidence_level"
    ],
    sample: [
      "YunExpress",
      "CN-TH standard",
      "China",
      "Thailand",
      "0.5",
      "0.6",
      "12.5",
      "6",
      "10",
      "",
      "",
      "",
      "2026-07-11",
      "logistics_quote",
      "YunExpress rate card.xlsx",
      "B"
    ]
  },
  orders: {
    label: "orders",
    headers: [
      "order_id",
      "platform",
      "country",
      "sku",
      "product",
      "quantity",
      "sale_price",
      "currency",
      "amount_cny",
      "profit_cny",
      "payment_status",
      "fulfillment_status",
      "refund_status",
      "created_at",
      "source_type",
      "source_url_or_file",
      "confidence_level",
      "owner"
    ],
    sample: [
      "OD-20260711-001",
      "Shopee",
      "Thailand",
      "SKU-KITCHEN-RACK",
      "Foldable kitchen rack",
      "1",
      "329",
      "THB",
      "67.8",
      "18.4",
      "paid",
      "pending_fulfillment",
      "none",
      "2026-07-11",
      "platform_order_export",
      "Shopee orders 2026-07-11.csv",
      "B",
      "订单运营"
    ]
  }
};

const aliases = {
  local_title: "localTitle",
  localtitle: "localTitle",
  review_count: "reviewCount",
  reviewcount: "reviewCount",
  sales_signal: "salesSignal",
  salessignal: "salesSignal",
  rank_trend: "rankTrend",
  ranktrend: "rankTrend",
  competition_level: "competitionLevel",
  competitionlevel: "competitionLevel",
  logistics_cost_cny: "logisticsCostCny",
  logisticscostcny: "logisticsCostCny",
  product_url: "productUrl",
  source_url_or_file: "sourceUrlOrFile",
  confidence_level: "confidenceLevel",
  market_product_id: "marketProductId",
  marketproductid: "marketProductId",
  source_platform: "sourcePlatform",
  sourceplatform: "sourcePlatform",
  supplier_name: "supplierName",
  suppliername: "supplierName",
  supplier_id: "supplierId",
  product_title: "title",
  purchase_price_cny: "purchasePriceCny",
  purchasepricecny: "purchasePriceCny",
  dispatch_days: "dispatchDays",
  dispatchdays: "dispatchDays",
  supplier_rating: "supplierRating",
  supplierrating: "supplierRating",
  monthly_sales: "monthlySales",
  monthlysales: "monthlySales",
  supports_dropship: "supportsDropship",
  supportsdropship: "supportsDropship",
  stock_status: "stockStatus",
  last_checked_at: "lastCheckedAt",
  backup_supplier: "backupSupplier",
  backupsupplier: "backupSupplier",
  origin_country: "originCountry",
  origincountry: "originCountry",
  destination_country: "destinationCountry",
  destinationcountry: "destinationCountry",
  weight_kg: "weightKg",
  weightkg: "weightKg",
  volume_weight_kg: "volumeWeightKg",
  volumeweightkg: "volumeWeightKg",
  price_cny: "priceCny",
  pricecny: "priceCny",
  estimated_days_min: "estimatedDaysMin",
  estimateddaysmin: "estimatedDaysMin",
  estimated_days_max: "estimatedDaysMax",
  estimateddaysmax: "estimatedDaysMax",
  tracking_no: "trackingNo",
  trackingno: "trackingNo",
  tracking_status: "trackingStatus",
  trackingstatus: "trackingStatus",
  last_checkpoint: "lastCheckpoint",
  lastcheckpoint: "lastCheckpoint",
  order_id: "orderId",
  orderid: "orderId",
  platform_order_id: "orderId",
  platformorderid: "orderId",
  buyer_country: "country",
  buyercountry: "country",
  sale_price: "salePrice",
  saleprice: "salePrice",
  amount_cny: "amountCny",
  amountcny: "amountCny",
  profit_cny: "profitCny",
  profitcny: "profitCny",
  payment_status: "paymentStatus",
  paymentstatus: "paymentStatus",
  fulfillment_status: "fulfillmentStatus",
  fulfillmentstatus: "fulfillmentStatus",
  refund_status: "refundStatus",
  refundstatus: "refundStatus",
  created_at: "createdAt",
  createdat: "createdAt"
};

const requiredFields = {
  market: ["platform", "country", "category", "title", "price", "currency", "rating", "reviewCount", "salesSignal"],
  supplier: ["sourcePlatform", "supplierName", "title", "purchasePriceCny", "moq", "dispatchDays", "supplierRating"],
  logistics: ["provider", "route", "originCountry", "destinationCountry", "priceCny"],
  orders: ["platform", "country", "sku", "amountCny"]
};

const fieldDefinitions = {
  market: {
    required: requiredFields.market,
    fields: templateDefinitions.market.headers.map((header) => normalizeHeader(header))
  },
  supplier: {
    required: requiredFields.supplier,
    fields: templateDefinitions.supplier.headers.map((header) => normalizeHeader(header))
  },
  logistics: {
    required: requiredFields.logistics,
    fields: templateDefinitions.logistics.headers.map((header) => normalizeHeader(header))
  },
  orders: {
    required: requiredFields.orders,
    fields: templateDefinitions.orders.headers.map((header) => normalizeHeader(header))
  }
};

const numericFields = new Set([
  "price",
  "rating",
  "reviewCount",
  "salesSignal",
  "rank",
  "rankTrend",
  "competitionLevel",
  "logisticsCostCny",
  "purchasePriceCny",
  "moq",
  "dispatchDays",
  "supplierRating",
  "monthlySales",
  "weightKg",
  "volumeWeightKg",
  "priceCny",
  "estimatedDaysMin",
  "estimatedDaysMax",
  "quantity",
  "salePrice",
  "amountCny",
  "profitCny"
]);

const truthyValues = new Set(["true", "yes", "y", "1", "support", "supports", "支持"]);

function sanitizeText(value) {
  return String(value ?? "").replace(/[<>]/g, "").trim();
}

function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function parseCsvLine(line, delimiter) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseDelimited(text) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return [];
  const lines = normalized.split("\n").filter((line) => line.trim().length > 0);
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = parseCsvLine(lines[0], delimiter).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function parseHtmlTable(text) {
  const tableMatch = text.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) return null;
  const rows = [...tableMatch[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((rowMatch) =>
    [...rowMatch[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cellMatch) =>
      cellMatch[1].replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim()
    )
  );
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

function normalizeHeader(key) {
  const canonical = key.trim().toLowerCase().replaceAll(" ", "_");
  return aliases[canonical] || canonical.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function normalizeKey(key) {
  return normalizeHeader(key);
}

export function getFieldSchema(kind) {
  return fieldDefinitions[kind];
}

export function buildFieldMapping(kind, rows, savedMapping = {}) {
  const sourceFields = Object.keys(rows[0] || {});
  const schema = getFieldSchema(kind);
  return Object.fromEntries(
    sourceFields.map((sourceField) => {
      const saved = savedMapping[sourceField];
      const inferred = normalizeHeader(sourceField);
      const canonical = schema.fields.includes(saved) ? saved : schema.fields.includes(inferred) ? inferred : "";
      return [sourceField, canonical];
    })
  );
}

export function mapRows(rows, fieldMapping = {}) {
  return rows.map((row) => {
    const mapped = {};
    Object.entries(row).forEach(([key, value]) => {
      const target = fieldMapping[key] || key;
      if (!target) return;
      mapped[target] = value;
    });
    return mapped;
  });
}

function normalizeRow(row) {
  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = normalizeKey(key);
    const trimmed = typeof value === "string" ? sanitizeText(value) : value;
    if (numericFields.has(normalizedKey)) {
      normalized[normalizedKey] = trimmed === "" ? undefined : Number(trimmed);
    } else if (normalizedKey === "supportsDropship") {
      normalized[normalizedKey] = truthyValues.has(String(trimmed).toLowerCase());
    } else {
      normalized[normalizedKey] = trimmed;
    }
  });
  return normalized;
}

function isBlank(value) {
  return value === undefined || value === null || value === "";
}

function validateRows(kind, rows, context) {
  const errors = [];
  const warnings = [];
  const normalizedRows = rows.map(normalizeRow);

  normalizedRows.forEach((row, index) => {
    const rowNumber = index + 2;
    requiredFields[kind].forEach((field) => {
      if (isBlank(row[field])) errors.push(`第 ${rowNumber} 行：缺少必填字段 "${field}"。`);
    });

    Object.entries(row).forEach(([field, value]) => {
      if (numericFields.has(field) && value !== undefined && !Number.isFinite(value)) {
        errors.push(`第 ${rowNumber} 行："${field}" 必须是数字。`);
      }
    });

    if (row.confidenceLevel && !["A", "B", "C", "D"].includes(String(row.confidenceLevel).toUpperCase())) {
      errors.push(`第 ${rowNumber} 行：confidence_level 必须是 A、B、C 或 D。`);
    }

    if (!row.sourceType) warnings.push(`第 ${rowNumber} 行：建议填写 source_type，便于后续审计。`);
    if (!row.sourceUrlOrFile) warnings.push(`第 ${rowNumber} 行：建议填写 source_url_or_file，便于追溯来源。`);

    if (kind === "supplier") {
      const hasDirectMatch = row.marketProductId && context.marketProducts.some((item) => item.id === row.marketProductId);
      const hasTitleMatch = context.marketProducts.some(
        (item) => [item.title, item.localTitle].filter(Boolean).some((title) => title.toLowerCase() === row.title?.toLowerCase())
      );
      if (!hasDirectMatch && !hasTitleMatch) {
        warnings.push(`第 ${rowNumber} 行：market_product_id 缺失，或没有匹配到已有市场商品。`);
      }
    }
  });

  return { rows: normalizedRows, errors, warnings };
}

function findLogisticsCost(country, logisticsRates) {
  const candidates = logisticsRates
    .filter((rate) => rate.destinationCountry?.toLowerCase() === country?.toLowerCase())
    .filter((rate) => Number.isFinite(rate.priceCny));
  if (candidates.length === 0) return undefined;
  return Math.min(...candidates.map((rate) => rate.priceCny));
}

function findMarketProductId(row, marketProducts) {
  if (row.marketProductId) return row.marketProductId;
  const match = marketProducts.find((item) =>
    [item.title, item.localTitle].filter(Boolean).some((title) => title.toLowerCase() === row.title?.toLowerCase())
  );
  return match?.id;
}

function nextId(prefix, items) {
  return `${prefix}-import-${String(items.length + 1).padStart(3, "0")}`;
}

export function getImportTemplate(kind, format = "csv") {
  const definition = templateDefinitions[kind];
  if (!definition) throw new Error(`未知导入模板：${kind}`);
  const rows = [definition.headers, definition.sample];

  if (format === "xls") {
    const tableRows = rows
      .map((row, rowIndex) => {
        const cell = rowIndex === 0 ? "th" : "td";
        return `<tr>${row.map((value) => `<${cell}>${String(value ?? "")}</${cell}>`).join("")}</tr>`;
      })
      .join("");
    return {
      filename: `${definition.label}-template.xls`,
      mimeType: "application/vnd.ms-excel",
      content: `<html><head><meta charset="utf-8"></head><body><table>${tableRows}</table></body></html>`
    };
  }

  return {
    filename: `${definition.label}-template.csv`,
    mimeType: "text/csv;charset=utf-8",
    content: rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")
  };
}

export async function parseImportFile(file) {
  if (file.name?.toLowerCase().endsWith(".xlsx")) {
    throw new Error("当前静态原型不支持二进制 .xlsx 文件，请使用电子表格 .xls 模板或逗号分隔文件。");
  }
  const text = await file.text();
  const htmlRows = parseHtmlTable(text);
  return htmlRows ?? parseDelimited(text);
}

export function previewImport(kind, rows, context = {}, fieldMapping = {}) {
  return validateRows(kind, mapRows(rows, fieldMapping), { marketProducts: [], ...context });
}

export function applyImport(kind, rows, context, metadata = {}, fieldMapping = {}) {
  const mappedRows = mapRows(rows, fieldMapping);
  const result = validateRows(kind, mappedRows, context);
  if (result.errors.length > 0) return { ...result, added: 0, updated: 0 };
  const importMeta = {
    importBatchId: metadata.importBatchId,
    importedAt: metadata.importedAt,
    sourceFile: metadata.sourceFile
  };

  if (kind === "market") {
    result.rows.forEach((row) => {
      const logisticsCost = Number.isFinite(row.logisticsCostCny)
        ? row.logisticsCostCny
        : findLogisticsCost(row.country, context.logisticsRates);
      context.marketProducts.push({
        id: row.id || nextId("mp", context.marketProducts),
        platform: row.platform,
        country: row.country,
        category: row.category,
        title: row.title,
        localTitle: row.localTitle || row.title,
        price: row.price,
        currency: row.currency,
        rating: row.rating,
        reviewCount: row.reviewCount,
        salesSignal: row.salesSignal,
        rank: row.rank || 0,
        rankTrend: row.rankTrend || 0,
        competitionLevel: Number.isFinite(row.competitionLevel) ? row.competitionLevel : 50,
        logisticsCostCny: Number.isFinite(logisticsCost) ? logisticsCost : 0,
        productUrl: row.productUrl || "#",
        images: row.images,
        sourceType: row.sourceType,
        sourceUrlOrFile: row.sourceUrlOrFile,
        confidenceLevel: row.confidenceLevel || "C",
        owner: row.owner || "导入",
        ...importMeta
      });
    });
    return { ...result, added: result.rows.length, updated: 0 };
  }

  if (kind === "supplier") {
    result.rows.forEach((row) => {
      context.supplierProducts.push({
        id: row.id || nextId("sp", context.supplierProducts),
        marketProductId: findMarketProductId(row, context.marketProducts),
        sourcePlatform: row.sourcePlatform,
        supplierName: row.supplierName,
        supplierId: row.supplierId,
        title: row.title,
        purchasePriceCny: row.purchasePriceCny,
        moq: row.moq,
        dispatchDays: row.dispatchDays,
        supplierRating: row.supplierRating,
        monthlySales: row.monthlySales || 0,
        supportsDropship: Boolean(row.supportsDropship),
        stockStatus: row.stockStatus,
        productUrl: row.productUrl,
        images: row.images,
        sourceType: row.sourceType,
        sourceUrlOrFile: row.sourceUrlOrFile,
        confidenceLevel: row.confidenceLevel || "C",
        backupSupplier: row.backupSupplier || "待定",
        ...importMeta
      });
    });
    return { ...result, added: result.rows.length, updated: 0 };
  }

  if (kind === "orders") {
    result.rows.forEach((row) => {
      context.orders.push({
        id: row.orderId || row.id || nextId("od", context.orders),
        platform: row.platform,
        country: row.country,
        sku: row.sku,
        product: row.product || row.title || row.sku,
        quantity: row.quantity || 1,
        salePrice: row.salePrice,
        currency: row.currency,
        amountCny: row.amountCny,
        profitCny: Number.isFinite(row.profitCny) ? row.profitCny : 0,
        paymentStatus: row.paymentStatus,
        fulfillmentStatus: row.fulfillmentStatus,
        refundStatus: row.refundStatus,
        createdAt: row.createdAt,
        status: row.fulfillmentStatus || row.paymentStatus || "imported",
        owner: row.owner || "订单运营",
        sourceType: row.sourceType,
        sourceUrlOrFile: row.sourceUrlOrFile,
        confidenceLevel: row.confidenceLevel || "C",
        ...importMeta
      });
    });
    return { ...result, added: result.rows.length, updated: 0 };
  }

  result.rows.forEach((row) => {
    context.logisticsRates.push({
      id: row.id || nextId("lr", context.logisticsRates),
      provider: row.provider,
      route: row.route,
      originCountry: row.originCountry,
      destinationCountry: row.destinationCountry,
      weightKg: row.weightKg,
      volumeWeightKg: row.volumeWeightKg,
      priceCny: row.priceCny,
      estimatedDaysMin: row.estimatedDaysMin,
      estimatedDaysMax: row.estimatedDaysMax,
      trackingNo: row.trackingNo,
      trackingStatus: row.trackingStatus,
      lastCheckpoint: row.lastCheckpoint,
      sourceType: row.sourceType,
      sourceUrlOrFile: row.sourceUrlOrFile,
      confidenceLevel: row.confidenceLevel || "B",
      ...importMeta
    });
  });

  let updated = 0;
  context.marketProducts.forEach((product) => {
    const logisticsCost = findLogisticsCost(product.country, context.logisticsRates);
    if (Number.isFinite(logisticsCost)) {
      product.logisticsCostCny = logisticsCost;
      updated += 1;
    }
  });

  return { ...result, added: result.rows.length, updated };
}

export function buildDataQualityIssues({ marketProducts, supplierProducts, logisticsRates }) {
  const issues = [];

  marketProducts.forEach((product) => {
    const label = product.localTitle || product.title || product.id;
    const hasSupplier = supplierProducts.some((supplier) => supplier.marketProductId === product.id);
    const hasLogistics = logisticsRates.some(
      (rate) => rate.destinationCountry?.toLowerCase() === product.country?.toLowerCase() && Number.isFinite(rate.priceCny)
    );

    if (!hasSupplier) {
      issues.push({
        severity: "high",
        type: "supplier_match",
        owner: "供应链",
        item: label,
        detail: "没有绑定供应商商品，这个市场商品暂时不能进入有效评分机会。"
      });
    }

    if (!hasLogistics && (!Number.isFinite(product.logisticsCostCny) || product.logisticsCostCny <= 0)) {
      issues.push({
        severity: "medium",
        type: "logistics_quote",
        owner: "物流",
        item: label,
        detail: "缺少目的国物流报价或商品级物流成本。"
      });
    }

    if (!product.sourceType || !product.sourceUrlOrFile) {
      issues.push({
        severity: "medium",
        type: "source_audit",
        owner: "选品运营",
        item: label,
        detail: "缺少来源类型或来源文件，审计追溯能力不足。"
      });
    }

    if (String(product.confidenceLevel || "C").toUpperCase() === "D") {
      issues.push({
        severity: "low",
        type: "confidence",
        owner: "选品运营",
        item: label,
        detail: "置信等级为 D，不应进入高影响自动决策。"
      });
    }
  });

  supplierProducts.forEach((supplier) => {
    const label = supplier.title || supplier.supplierName || supplier.id;
    const linked = marketProducts.some((product) => product.id === supplier.marketProductId);

    if (!linked) {
      issues.push({
        severity: "high",
        type: "supplier_match",
        owner: "供应链",
        item: label,
        detail: "供应商商品没有绑定到已知市场商品。"
      });
    }

    if (!supplier.backupSupplier || supplier.backupSupplier === "TBD" || supplier.backupSupplier === "待定") {
      issues.push({
        severity: "low",
        type: "backup_supplier",
        owner: "供应链",
        item: label,
        detail: "缺少备选供应商。"
      });
    }
  });

  return issues;
}
