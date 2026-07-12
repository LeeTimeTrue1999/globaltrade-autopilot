import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const appRoot = join(root, "app");
const port = Number(process.env.PORT || 4173);

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

const server = createServer((request, response) => {
  const requestedPath = new URL(request.url || "/", `http://localhost:${port}`).pathname;
  if (requestedPath === "/api/yiwugo/discover") {
    handleYiwugoDiscover(request, response);
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
