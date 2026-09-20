// Shared UI helpers used by every section renderer.

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if (key === "class") node.className = val;
    else if (key === "html") node.innerHTML = val;
    else if (key.startsWith("on") && typeof val === "function") node.addEventListener(key.slice(2), val);
    else node.setAttribute(key, val);
  });
  (Array.isArray(children) ? children : [children]).forEach(child => {
    if (child === null || child === undefined) return;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  });
  return node;
}

function badge(text, tone = "neutral") {
  return el("span", { class: `badge badge-${tone}` }, text);
}

const STATUS_TONE = {
  Online: "success", Active: "success", Success: "success", Allow: "success", "In-use": "success", Open: "danger",
  Offline: "danger", Failed: "danger", Deny: "danger", Critical: "danger",
  Warning: "warning", Maintenance: "warning", Expiring: "warning",
  Info: "info", Investigating: "info",
  Resolved: "neutral", Retired: "neutral", Inactive: "neutral"
};

function statusBadge(status) {
  return badge(status, STATUS_TONE[status] || "neutral");
}

function meter(percent, label) {
  const tone = percent >= 85 ? "high" : percent >= 60 ? "mid" : "";
  const bar = el("div", { class: `meter ${tone}` }, el("span", { style: `width:${Math.min(percent, 100)}%` }));
  return el("div", {}, [
    el("div", { style: "display:flex;justify-content:space-between;font-size:.72rem;color:var(--text-secondary);margin-bottom:4px" }, [
      el("span", {}, label || ""), el("span", { class: "mono" }, `${percent}%`)
    ]),
    bar
  ]);
}

function sectionHeader(title, subtitle, actionBtn) {
  const header = el("div", { class: "section-header" }, [
    el("div", {}, [
      el("h2", {}, title),
      subtitle ? el("p", {}, subtitle) : null
    ])
  ]);
  if (actionBtn) header.appendChild(actionBtn);
  return header;
}

function statCard(label, value, sub, tone) {
  return el("div", { class: "stat-card" }, [
    el("div", { class: "stat-label" }, label),
    el("div", { class: `stat-value ${tone || ""}` }, String(value)),
    sub ? el("div", { class: "stat-sub" }, sub) : null
  ]);
}

function button(text, opts = {}) {
  const cls = ["btn"];
  if (opts.variant) cls.push(`btn-${opts.variant}`);
  if (opts.small) cls.push("btn-sm");
  return el("button", { class: cls.join(" "), onclick: opts.onClick || (() => {}) }, text);
}

// Builds a table with header columns, row data, and optional row-action renderer.
// columns: [{ key, label, render? }]
function dataTable(columns, rows, rowActions) {
  if (!rows.length) {
    return el("div", { class: "table-wrap" }, el("div", { class: "empty-state" }, "No records yet."));
  }
  const thead = el("thead", {}, el("tr", {}, [
    ...columns.map(c => el("th", {}, c.label)),
    rowActions ? el("th", {}, "Actions") : null
  ]));
  const tbody = el("tbody", {}, rows.map(row => {
    const cells = columns.map(c => {
      const content = c.render ? c.render(row) : (row[c.key] ?? "—");
      return el("td", { class: c.mono ? "mono" : "" }, typeof content === "string" ? content : content);
    });
    if (rowActions) cells.push(el("td", {}, el("div", { class: "row-actions" }, rowActions(row))));
    return el("tr", {}, cells);
  }));
  return el("div", { class: "table-wrap" }, el("table", {}, [thead, tbody]));
}

function toggleForm(panel) {
  panel.classList.toggle("open");
}

function toast(message, tone = "info") {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = el("div", { id: "toast-host", style: "position:fixed;bottom:16px;right:16px;z-index:100;display:flex;flex-direction:column;gap:8px;" });
    document.body.appendChild(host);
  }
  const node = el("div", {
    class: `badge badge-${tone}`,
    style: "padding:.6rem 1rem;font-size:.8rem;box-shadow:0 8px 24px hsl(220 60% 4% / .5);"
  }, message);
  host.appendChild(node);
  setTimeout(() => node.remove(), 2500);
}
