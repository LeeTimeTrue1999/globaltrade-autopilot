import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const appRoot = join(root, "app");
const port = Number(process.env.PORT || 4173);
const publicLookupRate = {
  lastRequestAt: 0,
  minIntervalMs: Number(process.env.PUBLIC_LEAD_LOOKUP_MIN_INTERVAL_MS || 20000)
};

function loadLocalEnv() {
  [".env.local", ".env"].forEach((fileName) => {
    const filePath = join(root, fileName);
    if (!existsSync(filePath)) return;
    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index <= 0) return;
      const key = trimmed.slice(0, index).trim();
      const rawValue = trimmed.slice(index + 1).trim();
      if (!key || process.env[key]) return;
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    });
  });
}

loadLocalEnv();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const yiwugoCategoryPresets = {
  artificial_flower: { label: "仿真花/绿植", m: "1001", f: "1", s: "1" },
  toys: { label: "玩具", m: "1001", f: "1", s: "115" },
  hair_accessories: { label: "头饰", m: "1001", f: "2", s: "6" },
  jewelry: { label: "珠宝首饰", m: "1001", f: "2", s: "7" },
  decorative_craft: { label: "装饰工艺", m: "1001", f: "3", s: "9" }
};

function resolvePath(url) {
  const requestedPath = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname);
  const relativePath = requestedPath === "/" ? "/index.html" : requestedPath;
  const filePath = normalize(join(appRoot, relativePath));

  if (!filePath.startsWith(appRoot)) {
    return null;
  }

  return filePath;
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function readRequestJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 128 * 1024) {
        reject(new Error("请求体过大。"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("请求 JSON 格式错误。"));
      }
    });
    request.on("error", reject);
  });
}

function extractJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const collectJsonObjects = (source) => {
    const candidates = [];
    for (let start = 0; start < source.length; start += 1) {
      if (source[start] !== "{") continue;
      let depth = 0;
      let inString = false;
      let escaped = false;
      for (let index = start; index < source.length; index += 1) {
        const char = source[index];
        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (char === "\\") {
            escaped = true;
          } else if (char === "\"") {
            inString = false;
          }
          continue;
        }
        if (char === "\"") {
          inString = true;
        } else if (char === "{") {
          depth += 1;
        } else if (char === "}") {
          depth -= 1;
          if (depth === 0) {
            candidates.push(source.slice(start, index + 1));
            break;
          }
        }
      }
    }
    return candidates;
  };

  const sources = [raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim(), raw].filter(Boolean);
  for (const source of sources) {
    try {
      return JSON.parse(source);
    } catch (error) {
      const candidates = collectJsonObjects(source);
      for (let index = candidates.length - 1; index >= 0; index -= 1) {
        try {
          return JSON.parse(candidates[index]);
        } catch (nestedError) {
          // Try the next candidate.
        }
      }
    }
  }
  return null;
}

function normalizeStringList(value, fallback = []) {
  const items = Array.isArray(value) ? value : String(value || "").split(/[,，、\n]/);
  const cleaned = items.map((item) => String(item || "").trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.slice(0, 8) : fallback;
}

function normalizeAiDemandSuggestion(payload, fallbackIntent) {
  const source = payload && typeof payload === "object" ? payload : {};
  const countries = Array.isArray(source.targetCountries) ? source.targetCountries : [];
  return {
    productIntent: String(source.productIntent || fallbackIntent || "").slice(0, 80),
    productType: String(source.productType || source.productIntent || fallbackIntent || "通用商品").slice(0, 80),
    customerTypes: normalizeStringList(source.customerTypes, ["专业零售店", "批发商", "经销商"]),
    searchTerms: normalizeStringList(source.searchTerms, [fallbackIntent || "retailer"]),
    targetCountries: countries
      .map((country) => ({
        country: String(country.country || "").trim(),
        region: String(country.region || "AI 推荐").trim(),
        cities: normalizeStringList(country.cities, []),
        demandSignals: normalizeStringList(country.demandSignals, []),
        retailKeywords: normalizeStringList(country.retailKeywords, []),
        baseScore: Math.max(60, Math.min(96, Number(country.baseScore || 78)))
      }))
      .filter((country) => country.country && country.cities.length > 0)
      .slice(0, 6),
    reasoning: normalizeStringList(source.reasoning, []),
    confidence: String(source.confidence || "B").slice(0, 10)
  };
}

async function handleAiDemandUnderstanding(request, response) {
  if (request.method !== "POST") {
    json(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      json(response, 200, {
        configured: false,
        mode: "local_fallback",
        error: "本机没有配置 MINIMAX_API_KEY，已回退到本地规则。"
      });
      return;
    }

    const body = await readRequestJson(request);
    const productIntent = String(body.productIntent || "").trim().slice(0, 120);
    const targetRegion = String(body.targetRegion || "东南亚").trim().slice(0, 40);
    const selectedCountries = String(body.selectedCountries || "").trim().slice(0, 160);
    if (!productIntent) {
      json(response, 400, { error: "缺少 productIntent。" });
      return;
    }

    const prompt = [
      "你是一个跨境 B2B 线索发现分析器。请只输出 JSON，不要解释。",
      "任务：根据商品意图判断目标客户类型、搜索词、优先国家城市和需求理由。",
      "要求：国家和城市用于地图/搜索/目录采集公开商家联系方式；不要生成个人隐私联系人。",
      "JSON schema:",
      `{"productIntent":"string","productType":"string","customerTypes":["string"],"searchTerms":["string"],"targetCountries":[{"country":"string","region":"string","cities":["string"],"demandSignals":["string"],"retailKeywords":["string"],"baseScore":80}],"reasoning":["string"],"confidence":"A|B|C"}`,
      `商品意图：${productIntent}`,
      `优先区域：${targetRegion}`,
      `指定国家：${selectedCountries || "未指定"}`
    ].join("\n");

    const aiPrompt = [
      "You are a B2B lead discovery analyst for cross-border wholesale.",
      "Return strict JSON only. Do not include markdown, explanations, or comments.",
      "Task: infer likely business customer types, search terms, priority countries/cities, and demand reasons from the product intent.",
      "The countries and cities will be used for map/search/directory discovery of public business contact information.",
      "Do not generate private personal contacts. Focus on public stores, distributors, wholesalers, and local businesses.",
      "JSON schema:",
      `{"productIntent":"string","productType":"string","customerTypes":["string"],"searchTerms":["string"],"targetCountries":[{"country":"string","region":"string","cities":["string"],"demandSignals":["string"],"retailKeywords":["string"],"baseScore":80}],"reasoning":["string"],"confidence":"A|B|C"}`,
      `Product intent: ${productIntent}`,
      `Preferred region: ${targetRegion}`,
      `Operator selected countries: ${selectedCountries || "not specified"}`
    ].join("\n");

    const model = process.env.MINIMAX_MODEL || "MiniMax-M2.7";
    const apiResponse = await fetch("https://api.minimaxi.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: aiPrompt
          }
        ],
        temperature: 0.2
      })
    });

    const apiPayload = await apiResponse.json().catch(() => ({}));
    if (!apiResponse.ok) {
      json(response, 502, {
        configured: true,
        mode: "local_fallback",
        error: apiPayload?.error?.message || apiPayload?.base_resp?.status_msg || "MiniMax API 调用失败。"
      });
      return;
    }

    const content =
      apiPayload?.choices?.[0]?.message?.content ||
      apiPayload?.choices?.[0]?.messages?.[0]?.text ||
      apiPayload?.reply ||
      "";
    const parsed = extractJsonObject(content);
    const suggestion = normalizeAiDemandSuggestion(parsed, productIntent);
    if (!suggestion.targetCountries.length) {
      json(response, 502, {
        configured: true,
        mode: "local_fallback",
        error: "MiniMax 返回内容缺少可用国家/城市，已回退到本地规则。"
      });
      return;
    }

    json(response, 200, {
      configured: true,
      mode: "minimax",
      model,
      suggestion
    });
  } catch (error) {
    json(response, 500, {
      configured: Boolean(process.env.MINIMAX_API_KEY),
      mode: "local_fallback",
      error: error.message || "AI 需求理解失败，已回退到本地规则。"
    });
  }
}

function collectCookies(headers) {
  const raw = headers.getSetCookie ? headers.getSetCookie() : headers.get("set-cookie")?.split(/,(?=\s*[^;]+?=)/) || [];
  return raw.map((cookie) => cookie.split(";")[0]).filter(Boolean).join("; ");
}

function extractCsrf(html) {
  return html.match(/"csrf":"([^"]+)"/)?.[1] || "";
}

function fenToYuan(value) {
  return Math.round(Number(value || 0)) / 100;
}

function productScore(item) {
  const price = fenToYuan(item.sellPrice || item.facePrice || item.vipPrice || 0);
  const moq = Number(item.startNum || 0);
  const sale = Number(item.saleNumber || item.dealQuantity || 0);
  const delivery = Number(item.deliveryPromise || 0);
  const credit = Number(item.credit || 0);
  const priceScore = Math.max(0, 36 - Math.min(price, 36));
  const moqScore = Math.max(0, 22 - Math.min(moq / 10, 22));
  const saleScore = Math.min(24, Math.log10(sale + 1) * 6);
  const deliveryScore = delivery > 0 ? Math.max(0, 10 - delivery) : 4;
  const creditScore = Math.min(8, credit * 2.5);
  return Math.round(priceScore + moqScore + saleScore + deliveryScore + creditScore);
}

function normalizeYiwugoItem(item, category) {
  const price = fenToYuan(item.sellPrice || item.facePrice || item.vipPrice || 0);
  const maxPrice = item.maxPrice ? fenToYuan(item.maxPrice) : price;
  const id = String(item.id);
  return {
    id,
    source: "义乌购",
    sourcePlatform: "义乌购",
    sourceUrl: `https://www.yiwugo.com/product/detail/${id}.html`,
    title: item.title,
    shopName: item.shopName || "未知店铺",
    shopId: item.shopId,
    category: category.label,
    imageUrl: item.picture2 || "",
    priceCny: price,
    maxPriceCny: maxPrice,
    priceText: price === maxPrice ? `¥${price.toFixed(2)}` : `¥${price.toFixed(2)}-${maxPrice.toFixed(2)}`,
    moq: Number(item.startNum || 0),
    metric: item.metric || "件",
    saleNumber: Number(item.saleNumber || 0),
    dealQuantity: Number(item.dealQuantity || 0),
    deliveryPromise: Number(item.deliveryPromise || 0),
    credit: Number(item.credit || 0),
    onlineOrderFlag: Number(item.onlineOrderFlag || 0),
    confidence: "公开列表接口",
    opportunityScore: productScore(item)
  };
}

async function handleYiwugoDiscover(request, response) {
  try {
    const url = new URL(request.url || "/", `http://localhost:${port}`);
    const categoryKey = url.searchParams.get("category") || "artificial_flower";
    const category = yiwugoCategoryPresets[categoryKey] || yiwugoCategoryPresets.artificial_flower;
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") || 20), 5), 60);
    const maxPrice = Number(url.searchParams.get("maxPrice") || 0);
    const maxMoq = Number(url.searchParams.get("maxMoq") || 0);
    const q = (url.searchParams.get("q") || "").trim();
    const listPageUrl = `https://www.yiwugo.com/product_list/i_1_${category.m}_${category.f}_${category.s}.html`;
    const page = await fetch(listPageUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 GlobalTradeMVP/0.1",
        accept: "text/html,application/xhtml+xml"
      }
    });
    const pageHtml = await page.text();
    const csrf = extractCsrf(pageHtml);
    const cookie = collectCookies(page.headers);
    if (!csrf) {
      json(response, 502, { error: "义乌购页面没有返回 csrf，暂时无法查询列表接口。" });
      return;
    }

    const apiUrl = new URL("https://www.yiwugo.com/api/product/list3.htm");
    apiUrl.searchParams.set("st", "0");
    apiUrl.searchParams.set("pageSize", String(pageSize));
    apiUrl.searchParams.set("appid", "6");
    apiUrl.searchParams.set("cpage", "1");
    apiUrl.searchParams.set("m", category.m);
    apiUrl.searchParams.set("f", category.f);
    apiUrl.searchParams.set("s", category.s);
    if (q) apiUrl.searchParams.set("q", q);
    const api = await fetch(apiUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 GlobalTradeMVP/0.1",
        accept: "application/json, text/plain, */*",
        referer: listPageUrl,
        "x-csrf-token": csrf,
        "x-requested-with": "XMLHttpRequest",
        cookie
      }
    });
    const payload = await api.json();
    const rawItems = payload?.content?.data?.prslist || payload?.data?.prslist || [];
    const candidates = rawItems
      .map((item) => normalizeYiwugoItem(item, category))
      .filter((item) => (maxPrice > 0 ? item.priceCny <= maxPrice : true))
      .filter((item) => (maxMoq > 0 ? item.moq <= maxMoq : true))
      .sort((a, b) => b.opportunityScore - a.opportunityScore);
    json(response, 200, {
      source: "义乌购",
      category: category.label,
      query: q,
      fetchedAt: new Date().toISOString(),
      total: payload?.content?.data?.numfound || payload?.data?.numfound || candidates.length,
      candidates
    });
  } catch (error) {
    json(response, 500, { error: error.message || "义乌购找货失败。" });
  }
}

function htmlToReadableText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, "\"")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isBlockedLookupHost(url) {
  const href = url.href.toLowerCase();
  const host = url.hostname.toLowerCase();
  return [
    "google.com/maps",
    "maps.google.",
    "facebook.com",
    "instagram.com",
    "tiktok.com",
    "linkedin.com"
  ].some((blocked) => href.includes(blocked) || host.includes(blocked));
}

async function handlePublicContactLookup(request, response) {
  if (request.method !== "POST") {
    json(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const now = Date.now();
    const waitMs = publicLookupRate.lastRequestAt + publicLookupRate.minIntervalMs - now;
    if (waitMs > 0) {
      json(response, 429, {
        mode: "rate_limited",
        error: `低频查询保护中，请 ${Math.ceil(waitMs / 1000)} 秒后再试。`,
        retryAfterSeconds: Math.ceil(waitMs / 1000)
      });
      return;
    }

    const body = await readRequestJson(request);
    const sourceUrl = String(body.sourceUrl || "").trim();
    let url;
    try {
      url = new URL(sourceUrl);
    } catch (error) {
      json(response, 400, { mode: "skipped", error: "来源 URL 无效。" });
      return;
    }

    if (!["http:", "https:"].includes(url.protocol)) {
      json(response, 400, { mode: "skipped", error: "只允许 http/https 公开页面。" });
      return;
    }

    if (isBlockedLookupHost(url)) {
      json(response, 200, {
        mode: "skipped",
        reason: "该来源属于地图、社交或登录/反自动化风险较高的平台，保留半自动浏览器可见页采集。"
      });
      return;
    }

    publicLookupRate.lastRequestAt = now;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.PUBLIC_LEAD_LOOKUP_TIMEOUT_MS || 12000));
    const upstream = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "GlobalTradeMVP/0.1 low-frequency public business contact lookup",
        accept: "text/html,text/plain;q=0.9,*/*;q=0.5"
      }
    }).finally(() => clearTimeout(timeout));

    const contentType = upstream.headers.get("content-type") || "";
    if (!upstream.ok) {
      json(response, 502, {
        mode: "failed",
        error: `来源页面返回 ${upstream.status}，已跳过。`
      });
      return;
    }
    if (!/text\/html|text\/plain|application\/xhtml\+xml/i.test(contentType)) {
      json(response, 200, {
        mode: "skipped",
        reason: `来源类型 ${contentType || "unknown"} 不适合文本线索提取。`
      });
      return;
    }

    const html = await upstream.text();
    const text = htmlToReadableText(html).slice(0, Number(process.env.PUBLIC_LEAD_LOOKUP_TEXT_LIMIT || 12000));
    json(response, 200, {
      mode: "public_page_lookup",
      sourceUrl: url.href,
      fetchedAt: new Date().toISOString(),
      text,
      textLength: text.length,
      safety: {
        minIntervalMs: publicLookupRate.minIntervalMs,
        noRecursiveCrawl: true,
        noLoginOrCookie: true
      }
    });
  } catch (error) {
    json(response, 500, {
      mode: "failed",
      error: error.name === "AbortError" ? "来源页面响应超时，已跳过。" : error.message || "公开联系方式查询失败。"
    });
  }
}

const server = createServer((request, response) => {
  const requestedPath = new URL(request.url || "/", `http://localhost:${port}`).pathname;
  if (requestedPath === "/api/yiwugo/discover") {
    handleYiwugoDiscover(request, response);
    return;
  }
  if (requestedPath === "/api/ai/understand-demand") {
    handleAiDemandUnderstanding(request, response);
    return;
  }
  if (requestedPath === "/api/leads/public-contact-lookup") {
    handlePublicContactLookup(request, response);
    return;
  }

  const filePath = resolvePath(request.url || "/");

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "cache-control": "no-store"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`GlobalTrade Autopilot running at http://127.0.0.1:${port}`);
});
