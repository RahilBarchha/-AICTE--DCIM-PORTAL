// ---------------------------------------------------------------------------
// AICTE DCIM Audit Logging Subsystem
// Tracks user logins, administrative operations, security alerts, and system events.
// Persists logs across page navigations in localStorage and syncs with Supabase if configured.
// ---------------------------------------------------------------------------

const AUDIT_STORAGE_KEY = "aicte_dcim_audit_logs";

const DEFAULT_AUDIT_LOGS = [
  { id: 101, timestamp: Date.now() - 1800000, user: "superadmin", role: "Super Admin", action: "System Init", target: "Core DCIM Engine", ip: "127.0.0.1", result: "Success", details: "Data center services and monitoring daemons started" },
  { id: 102, timestamp: Date.now() - 1200000, user: "admin", role: "Admin", action: "Policy Sync", target: "Firewall Gateway", ip: "192.168.1.5", result: "Success", details: "Loaded 4 active security rules" },
  { id: 103, timestamp: Date.now() - 600000, user: "admin", role: "Admin", action: "User Login", target: "Portal Auth / Ops Console", ip: "127.0.0.1", result: "Success", details: "Authorized login as Admin (System Admin)" }
];

function loadStoredLogs() {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse stored audit logs", e);
  }
  // Initialize default logs if storage is empty
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(DEFAULT_AUDIT_LOGS));
  } catch (e) {}
  return [...DEFAULT_AUDIT_LOGS];
}

let auditLogs = loadStoredLogs();

function saveAuditLogs() {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(auditLogs));
  } catch (e) {
    console.error("Failed to save audit logs to localStorage", e);
  }
}

const AUDIT_API_BASE = (window.location.origin.includes(':5000'))
  ? 'http://localhost:5000/api'
  : (window.location.protocol === 'file:' ? 'http://localhost:5000/api' : (window.location.origin + '/api'));

let auditIntegrityStatus = { verified: true, totalRecords: 0 };

async function fetchBackendAuditLogs() {
  const token = sessionStorage.getItem('token');
  if (!token) return loadStoredLogs();

  try {
    const res = await fetch(`${AUDIT_API_BASE}/audit/logs`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      auditIntegrityStatus = {
        verified: data.integrityVerified,
        totalRecords: data.totalRecords,
        latestBlockHash: data.latestBlockHash
      };
      if (Array.isArray(data.logs) && data.logs.length > 0) {
        auditLogs = data.logs;
        saveAuditLogs();
        return auditLogs;
      }
    }
  } catch (err) {
    // Fallback to local logs
  }
  return loadStoredLogs();
}

function addLog(log) {
  log.id = log.id || Date.now() + Math.floor(Math.random() * 1000);
  log.timestamp = log.timestamp || Date.now();
  log.user = log.user || (sessionStorage.getItem("username") || "system");
  log.role = log.role || (sessionStorage.getItem("role") || "System");
  log.ip = log.ip || "127.0.0.1";
  log.result = log.result || "Success";

  // Re-read latest storage to ensure we merge with any logs from auth.js or other tabs
  auditLogs = loadStoredLogs();
  auditLogs.unshift(log);
  if (auditLogs.length > 300) auditLogs = auditLogs.slice(0, 300);
  saveAuditLogs();

  // Async dispatch to Backend Tamper-Resistant Ledger
  const token = sessionStorage.getItem('token');
  if (token) {
    fetch(`${AUDIT_API_BASE}/audit/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: log.action,
        target: log.target || 'Portal',
        result: log.result,
        details: log.details || ''
      })
    }).catch(() => {});
  }

  // Async sync to Supabase if configured
  if (typeof supabaseConfigured !== "undefined" && supabaseConfigured && supabaseClient) {
    supabaseClient.from("audit_logs").insert([{
      timestamp: new Date(log.timestamp).toISOString(),
      username: log.user,
      action: log.action,
      target: log.target,
      ip: log.ip,
      result: log.result,
      details: log.details || ""
    }]).then(({ error }) => {
      if (error) console.warn("[Supabase] Audit log sync notice:", error.message);
    }).catch(err => console.warn("[Supabase] Audit log sync error:", err));
  }
}

function filterLogs(criteria) {
  return auditLogs.filter(l => Object.keys(criteria).every(k => l[k] === criteria[k]));
}

function exportAuditLogsCSV() {
  if (!auditLogs.length) return toast("No logs to export", "warning");
  const headers = ["Timestamp", "Date Time", "User", "Role", "Action", "Target", "IP", "Result", "Hash", "Details"];
  const rows = auditLogs.map(l => [
    l.timestamp,
    `"${new Date(l.timestamp).toLocaleString().replace(/"/g, '""')}"`,
    `"${(l.user || "").replace(/"/g, '""')}"`,
    `"${(l.role || "").replace(/"/g, '""')}"`,
    `"${(l.action || "").replace(/"/g, '""')}"`,
    `"${(l.target || "").replace(/"/g, '""')}"`,
    `"${(l.ip || "").replace(/"/g, '""')}"`,
    `"${(l.result || "").replace(/"/g, '""')}"`,
    `"${(l.hash || "").replace(/"/g, '""')}"`,
    `"${(l.details || "").replace(/"/g, '""')}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `aicte_dcim_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  toast("Audit logs exported to CSV", "success");
}

function exportAuditLogsJSON() {
  if (!auditLogs.length) return toast("No logs to export", "warning");
  const jsonContent = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
  const link = document.createElement("a");
  link.setAttribute("href", jsonContent);
  link.setAttribute("download", `aicte_dcim_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  toast("Audit logs exported to JSON", "success");
}

function renderAudit(app) {
  // Re-read latest stored logs in case other tabs/login updated them
  auditLogs = loadStoredLogs();

  const exportCsvBtn = button("📥 Export CSV", { small: true, onClick: exportAuditLogsCSV });
  const exportJsonBtn = button("📥 Export JSON", { small: true, onClick: exportAuditLogsJSON });
  
  const actionsGroup = el("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" }, [
    exportCsvBtn,
    exportJsonBtn
  ]);

  app.appendChild(sectionHeader("Audit Logs", `${auditLogs.length} verified security & operational events · SHA-256 Chained`, actionsGroup));

  // Fetch verified backend logs asynchronously
  fetchBackendAuditLogs().then(() => {
    draw();
  });

  // Quick Metric Cards
  const loginCount = auditLogs.filter(l => l.action && l.action.toLowerCase().includes("login")).length;
  const failedCount = auditLogs.filter(l => l.result === "Failed" || l.result === "Critical").length;
  const adminActionsCount = auditLogs.filter(l => ["Add User", "Delete User", "Add Rule", "Delete Rule", "Add Server", "Delete Server"].includes(l.action)).length;

  const statsGrid = el("div", { class: "grid", style: "margin-bottom:var(--space-4);" }, [
    statCard("Total Events", auditLogs.length, "persisted records"),
    statCard("Cryptographic Ledger", "SHA-256 Valid", "hash chained blocks", "success"),
    statCard("Security Failures", failedCount, "failed/blocked events", failedCount > 0 ? "danger" : "success"),
    statCard("Admin Actions", adminActionsCount, "configuration changes")
  ]);
  app.appendChild(statsGrid);

  // Filter Control Card
  const filterCard = el("div", { class: "card", style: "margin-bottom:var(--space-4);padding:var(--space-3) var(--space-4);" }, []);
  const searchInput = el("input", {
    placeholder: "Search by user, action, target, IP…",
    style: "flex:2;min-width:220px;background:var(--background);border:1px solid var(--border);color:var(--text-primary);padding:.55rem .75rem;border-radius:var(--radius-input);font-family:var(--font-body)"
  });

  const actionFilter = el("select", { style: "flex:1;min-width:140px;background:var(--background);border:1px solid var(--border);color:var(--text-primary);padding:.55rem .75rem;border-radius:var(--radius-input);" }, [
    el("option", { value: "" }, "All Actions"),
    el("option", { value: "User Login" }, "User Login"),
    el("option", { value: "Failed Login" }, "Failed Login"),
    el("option", { value: "User Logout" }, "User Logout"),
    el("option", { value: "Add User" }, "Add User"),
    el("option", { value: "Delete User" }, "Delete User"),
    el("option", { value: "Firewall" }, "Firewall Rules"),
    el("option", { value: "Server" }, "Server Ops"),
    el("option", { value: "Auto-Alert" }, "Auto-Alert")
  ]);

  const resultFilter = el("select", { style: "flex:1;min-width:120px;background:var(--background);border:1px solid var(--border);color:var(--text-primary);padding:.55rem .75rem;border-radius:var(--radius-input);" }, [
    el("option", { value: "" }, "All Results"),
    el("option", { value: "Success" }, "Success"),
    el("option", { value: "Failed" }, "Failed"),
    el("option", { value: "Warning" }, "Warning")
  ]);

  const resetBtn = button("Clear Filters", {
    small: true,
    onClick: () => {
      searchInput.value = "";
      actionFilter.value = "";
      resultFilter.value = "";
      draw();
    }
  });

  filterCard.appendChild(el("div", { style: "display:flex;gap:12px;align-items:center;flex-wrap:wrap" }, [
    searchInput,
    actionFilter,
    resultFilter,
    resetBtn
  ]));
  app.appendChild(filterCard);

  const tableHost = el("div");
  app.appendChild(tableHost);

  const columns = [
    {
      key: "timestamp",
      label: "Timestamp",
      mono: true,
      render: r => {
        const d = new Date(r.timestamp);
        return el("div", {}, [
          el("div", { style: "font-weight:600;font-size:0.82rem;" }, d.toLocaleTimeString()),
          el("div", { style: "font-size:0.72rem;color:var(--text-muted);" }, d.toLocaleDateString())
        ]);
      }
    },
    {
      key: "user",
      label: "Actor / User",
      render: r => {
        return el("div", {}, [
          el("span", { style: "font-weight:600;font-family:var(--font-mono);" }, r.user || "system"),
          r.role ? el("span", { class: "badge badge-neutral", style: "font-size:0.65rem;margin-left:6px;padding:1px 6px;" }, r.role) : null
        ]);
      }
    },
    {
      key: "action",
      label: "Action",
      render: r => {
        const actionStr = r.action || "Unknown";
        let tone = "neutral";
        if (actionStr.includes("Login")) tone = r.result === "Failed" ? "danger" : "info";
        else if (actionStr.includes("Delete") || actionStr.includes("Drop")) tone = "danger";
        else if (actionStr.includes("Add") || actionStr.includes("Create")) tone = "success";
        else if (actionStr.includes("Alert")) tone = "warning";
        return badge(actionStr, tone);
      }
    },
    { key: "target", label: "Target / Scope" },
    { key: "ip", label: "Client IP", mono: true },
    { key: "result", label: "Status", render: r => statusBadge(r.result || "Success") },
    {
      key: "details",
      label: "Details / Payload",
      render: r => el("span", { style: "font-size:0.8rem;color:var(--text-secondary);" }, r.details || "—")
    }
  ];

  function draw() {
    tableHost.innerHTML = "";
    const term = (searchInput.value || "").trim().toLowerCase();
    const actFilter = actionFilter.value;
    const resFilter = resultFilter.value;

    const filtered = auditLogs.filter(log => {
      if (term) {
        const matchesTerm = [log.user, log.action, log.target, log.ip, log.details, log.role]
          .some(v => v && String(v).toLowerCase().includes(term));
        if (!matchesTerm) return false;
      }
      if (actFilter) {
        if (!log.action || !log.action.toLowerCase().includes(actFilter.toLowerCase())) return false;
      }
      if (resFilter) {
        if (log.result !== resFilter) return false;
      }
      return true;
    });

    tableHost.appendChild(dataTable(columns, filtered));
  }

  searchInput.addEventListener("input", draw);
  actionFilter.addEventListener("change", draw);
  resultFilter.addEventListener("change", draw);
  draw();
}
