import { config, listingDrafts, marketProducts, orders, supplierProducts } from "./sample-data.js";
import { buildOpportunities, buildStrategySummary } from "./scoring.js";

const viewTitles = {
  dashboard: "总览",
  opportunities: "机会池",
  listings: "上架审核",
  orders: "订单履约",
  suppliers: "供应商",
  reports: "经营复盘",
  settings: "配置中心"
};

const state = {
  view: "dashboard",
  country: "all",
  platform: "all",
  category: "all",
  marginThreshold: config.defaultMarginThreshold,
  selectedId: null
};

const elements = {
  viewTitle: document.querySelector("#viewTitle"),
  navItems: [...document.querySelectorAll(".nav-item")],
  countryFilter: document.querySelector("#countryFilter"),
  platformFilter: document.querySelector("#platformFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  marginThreshold: document.querySelector("#marginThreshold"),
  copyReportButton: document.querySelector("#copyReportButton"),
  createDraftButton: document.querySelector("#createDraftButton"),
  views: {
    dashboard: document.querySelector("#dashboardView"),
    opportunities: document.querySelector("#opportunitiesView"),
    listings: document.querySelector("#listingsView"),
    orders: document.querySelector("#ordersView"),
    suppliers: document.querySelector("#suppliersView"),
    reports: document.querySelector("#reportsView"),
    settings: document.querySelector("#settingsView")
  }
};

const money = (value) => `¥${Number(value).toFixed(2)}`;
const percent = (value) => `${Math.round(value * 100)}%`;
const score = (value) => Math.round(value);

function uniqueValues(items, key) {
  return [...new Set(items.map((item) => item[key]))].sort();
}

function fillSelect(select, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
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

function metricCard(label, value, note) {
  return `
    <article class="metric-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${note}</small>
    </article>
  `;
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
        <p class="eyebrow">Decision Brief</p>
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
            <p class="eyebrow">Priority Queue</p>
            <h2>今日优先处理</h2>
          </div>
          <button class="small-button" type="button" data-go="opportunities">查看全部</button>
        </div>
        <div class="panel-body opportunity-list">
          ${opportunities.slice(0, 4).map(opportunityCard).join("")}
        </div>
      </section>
      ${detailPanel(selected)}
    </div>

    <div class="three-column">
      ${summary.actions
        .map(
          (item) => `
            <article class="kanban-card">
              <p class="eyebrow">Strategy</p>
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
    <div class="two-column">
      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Opportunity Pool</p>
            <h2>商品机会池</h2>
          </div>
          <button class="small-button" type="button">导入候选商品</button>
        </div>
        <div class="panel-body opportunity-list">
          ${opportunities.map(opportunityCard).join("")}
        </div>
      </section>
      ${detailPanel(selected)}
    </div>
  `;
}

function renderListings() {
  elements.views.listings.innerHTML = `
    <div class="kanban">
      ${["待运营审核", "待合规复核", "俄罗斯专项复核"]
        .map((status) => {
          const items = listingDrafts.filter((item) => item.status === status);
          return `
            <section class="kanban-column">
              <div class="kanban-title"><strong>${status}</strong><span>${items.length}</span></div>
              ${items
                .map(
                  (item) => `
                    <article class="kanban-card">
                      <h3>${item.title}</h3>
                      <p class="muted">${item.country} · ${item.platform} · ${item.price} ${item.currency}</p>
                      <div class="tag-row">
                        <span class="tag ${statusClass(item.status)}">${item.status}</span>
                        <span class="tag">审核人 ${item.reviewer}</span>
                      </div>
                      <div class="progress"><span style="width:${item.completeness}%"></span></div>
                    </article>
                  `
                )
                .join("")}
            </section>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderOrders() {
  elements.views.orders.innerHTML = `
    <section class="table-panel">
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
                  <td><span class="tag ${statusClass(order.status)}">${order.status}</span></td>
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

function renderSuppliers() {
  elements.views.suppliers.innerHTML = `
    <section class="table-panel">
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
                  <td>${supplier.supplierName}<br><span class="muted">${supplier.sourcePlatform}</span></td>
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

function renderReports(opportunities) {
  const summary = buildStrategySummary(opportunities);
  elements.views.reports.innerHTML = `
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

function copyReport(opportunities) {
  const lines = opportunities.map((item) => {
    const product = item.marketProduct;
    return `${product.country}/${product.platform} ${product.localTitle}: ${item.recommendedAction}, 分数 ${score(
      item.scores.final
    )}, 毛利率 ${percent(item.cost.grossMargin)}, 风险 ${score(item.scores.risk)}`;
  });
  const report = [`GlobalTrade Autopilot 策略摘要`, `生成时间：${new Date().toLocaleString()}`, "", ...lines].join("\n");
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

  document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.go;
      render();
    });
  });
}

function setActiveView() {
  elements.viewTitle.textContent = viewTitles[state.view];
  elements.navItems.forEach((item) => item.classList.toggle("is-active", item.dataset.view === state.view));
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
  renderOpportunities(opportunities);
  renderListings();
  renderOrders();
  renderSuppliers();
  renderReports(opportunities);
  renderSettings();
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
    render();
  });

  elements.platformFilter.addEventListener("change", (event) => {
    state.platform = event.target.value;
    state.selectedId = null;
    render();
  });

  elements.categoryFilter.addEventListener("change", (event) => {
    state.category = event.target.value;
    state.selectedId = null;
    render();
  });

  elements.marginThreshold.addEventListener("input", (event) => {
    state.marginThreshold = Number(event.target.value) / 100;
    render();
  });

  elements.copyReportButton.addEventListener("click", () => copyReport(getOpportunities()));
  elements.createDraftButton.addEventListener("click", () => {
    state.view = "listings";
    render();
  });
}

fillSelect(elements.countryFilter, uniqueValues(marketProducts, "country"));
fillSelect(elements.platformFilter, uniqueValues(marketProducts, "platform"));
fillSelect(elements.categoryFilter, uniqueValues(marketProducts, "category"));
bindStaticEvents();
render();
