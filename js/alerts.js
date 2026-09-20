// ---------------------------------------------------------------------------
// AICTE DCIM Security & Incident Alerts Subsystem
// Features: Auto-Resolving Watchdog, Supabase Sync & Incident Diagnostics
// ---------------------------------------------------------------------------

const ALERTS_STORAGE_KEY = "aicte_dcim_alerts";

const DEFAULT_ALERTS = [
  { id: 1, severity: "Critical", source: "Firewall Gateway", message: "Unauthorized brute-force attempt blocked on Port 22 (SSH)", timestamp: Date.now() - 3600000, status: "Open" },
  { id: 2, severity: "Warning", source: "VM-Server-01", message: "CPU load surged above threshold during demo test", timestamp: Date.now() - 1800000, status: "Resolved", resolvedAt: Date.now() - 600000 }
];

function loadStoredAlerts() {
  try {
    const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(DEFAULT_ALERTS));
  } catch (e) {}
  return [...DEFAULT_ALERTS];
}

let alerts = loadStoredAlerts();

function saveAlerts() {
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  } catch (e) {}
}

function listAlerts() { return alerts; }

function canManageAlerts() {
  const role = sessionStorage.getItem("role");
  return role === "Super Admin" || role === "Admin" || role === "IT Operator";
}

function addAlert(alert) { 
  alert.id = alert.id || Date.now();
  alert.timestamp = alert.timestamp || Date.now();
  alert.status = alert.status || "Open";
  
  alerts.unshift(alert); 
  saveAlerts();

  if (typeof persistAlertToSupabase === "function") {
    persistAlertToSupabase(alert);
  }
}

function updateAlert(id, updates) { 
  alerts = alerts.map(a => {
    if (a.id === id) {
      const updated = { ...a, ...updates };
      if (updates.status === "Resolved" && !updated.resolvedAt) {
        updated.resolvedAt = Date.now();
      }
      if (typeof updateAlertInSupabase === "function") {
        updateAlertInSupabase(id, updated);
      }
      return updated;
    }
    return a;
  }); 
  saveAlerts();
}

/**
 * Automatically resolves active open alerts for a given server and metric when the load normalizes.
 */
function autoResolveServerAlerts(serverId, serverName, metric, currentValue) {
  let resolvedAny = false;

  alerts.forEach(a => {
    // Match open alerts for this server
    const isMatch = (a.serverId === serverId || (a.source && a.source.includes(serverName))) && 
                    a.status === "Open" &&
                    (!a.metric || a.metric.toLowerCase() === metric.toLowerCase() || a.message.toLowerCase().includes(metric.toLowerCase()));
    
    if (isMatch) {
      a.status = "Resolved";
      a.resolvedAt = Date.now();
      resolvedAny = true;

      if (typeof updateAlertInSupabase === "function") {
        updateAlertInSupabase(a.id, a);
      }

      if (typeof addLog === "function") {
        addLog({
          timestamp: Date.now(),
          user: "system-watchdog",
          role: "Automated Self-Healing",
          action: "Auto-Resolve Incident Alert",
          target: `${serverName} (${metric.toUpperCase()})`,
          ip: "127.0.0.1",
          result: "Success",
          details: `Autonomous incident recovery: ${metric.toUpperCase()} load normalized to ${currentValue}%. Alert #${a.id} automatically marked as Resolved.`
        });
      }
    }
  });

  if (resolvedAny) {
    saveAlerts();
    toast(`🛡️ Auto-Resolved: ${serverName} ${metric.toUpperCase()} recovered to ${currentValue}%`, "success");
    
    if (currentSection === "alerts") {
      const app = document.getElementById("app");
      if (app) renderAlerts(app);
    }
  }
}

function deleteAlert(id) { 
  if (!canManageAlerts()) {
    toast("Permission Denied: Only Super Admin, Admin, and IT Operator can remove alerts.", "danger");
    return;
  }

  const target = alerts.find(a => a.id === id);
  alerts = alerts.filter(a => a.id !== id); 
  saveAlerts();

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "admin",
      role: sessionStorage.getItem("role") || "Admin",
      action: "Delete Alert",
      target: target ? `Alert #${target.id} (${target.source})` : String(id),
      ip: "127.0.0.1",
      result: "Success",
      details: target ? `Dismissed alert: ${target.message}` : "Alert deleted"
    });
  }
}

function renderAlerts(app) {
  app.innerHTML = "";
  const openCount = alerts.filter(a => a.status === "Open").length;
  const resolvedCount = alerts.filter(a => a.status === "Resolved").length;
  const hasPrivileges = canManageAlerts();

  const resolveAllBtn = button("🛡️ Auto-Resolve All Open", {
    small: true,
    onClick: () => {
      alerts.forEach(a => {
        if (a.status === "Open") {
          a.status = "Resolved";
          a.resolvedAt = Date.now();
          if (typeof updateAlertInSupabase === "function") updateAlertInSupabase(a.id, a);
        }
      });
      saveAlerts();
      toast("All open incident alerts marked as Resolved", "success");
      renderAlerts(app);
    }
  });

  app.appendChild(sectionHeader("Security & Incident Alerts", `${openCount} open · ${resolvedCount} auto-resolved incidents`, resolveAllBtn));

  const infoBar = el("div", {
    class: "card",
    style: "background:rgba(30,41,59,0.7);border:1px solid rgba(56,189,248,0.2);margin-bottom:var(--space-4);padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;"
  }, [
    el("div", { style: "display:flex;align-items:center;gap:8px;font-size:0.82rem;" }, [
      el("span", {}, "⚡"),
      el("span", { style: "color:var(--text-primary);font-weight:600;" }, "Autonomous Incident Self-Healing Active:"),
      el("span", { style: "color:var(--text-secondary);" }, "Alerts automatically transition from Open to Resolved when server load normalizes below 72%.")
    ]),
    el("div", { style: "display:flex;gap:8px;" }, [
      el("span", { class: "badge badge-danger" }, `${openCount} Open`),
      el("span", { class: "badge badge-success" }, `${resolvedCount} Auto-Resolved`)
    ])
  ]);
  app.appendChild(infoBar);

  const columns = [
    { key: "severity", label: "Severity", render: r => badge(r.severity, r.severity === "Critical" ? "danger" : r.severity === "Warning" ? "warning" : "info") },
    { key: "source", label: "Source / Node" },
    { key: "message", label: "Incident Message" },
    { key: "timestamp", label: "Detected At", mono: true, render: r => new Date(r.timestamp).toLocaleTimeString() },
    { 
      key: "status", 
      label: "Status", 
      render: r => r.status === "Resolved" 
        ? el("span", { class: "badge badge-success", style: "display:inline-flex;align-items:center;gap:4px;" }, "✓ Resolved") 
        : statusBadge(r.status) 
    }
  ];

  app.appendChild(dataTable(columns, alerts, row => [
    button("🤖 AI Diagnose", {
      variant: "primary", small: true,
      onClick: () => { openAiIncidentDiagnosisModal(row); }
    }),
    row.status === "Open" ? button("Resolve", {
      small: true,
      onClick: () => { 
        updateAlert(row.id, { status: "Resolved" }); 
        toast("Alert marked as Resolved", "success"); 
        renderAlerts(app); 
      }
    }) : null,
    hasPrivileges ? button("Delete", {
      variant: "danger", small: true,
      onClick: () => { 
        if (confirm(`Remove alert record from ${row.source}?`)) {
          deleteAlert(row.id); 
          toast("Alert record removed", "warning"); 
          renderAlerts(app); 
        }
      }
    }) : null
  ].filter(Boolean)));
}
