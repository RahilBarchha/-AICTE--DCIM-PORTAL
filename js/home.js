// ---------------------------------------------------------------------------
// AICTE DCIM Dashboard Overview — Home Page
// SIH System Health, Live Role Status & API Connectivity Verification
// ---------------------------------------------------------------------------

function renderDashboard(app) {
  app.innerHTML = "";
  const aiLaunchBtn = button("🤖 Launch AI Copilot", {
    variant: "primary",
    small: true,
    onClick: () => {
      const aiNav = document.querySelector('.sidebar li[data-section="ai-assistant"]');
      if (aiNav) aiNav.click();
      else loadSection('ai-assistant');
    }
  });

  const monitorBtn = button("📡 Live Monitoring", {
    small: true,
    onClick: () => {
      const monNav = document.querySelector('.sidebar li[data-section="monitoring"]');
      if (monNav) monNav.click();
      else loadSection('monitoring');
    }
  });

  const btnGroup = el("div", { style: "display:flex;gap:8px;" }, [aiLaunchBtn, monitorBtn]);
  app.appendChild(sectionHeader("Overview", "SIH Infrastructure Dashboard · Real-time health & telemetry snapshot", btnGroup));

  const onlineServers = servers.filter(s => s.status === "Online").length;
  const openAlerts = alerts.filter(a => a.status === "Open").length;
  const expiringLicenses = licenses.filter(l => new Date(l.expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length;

  const grid = el("div", { class: "grid" }, [
    statCard("Servers", `${onlineServers}/${servers.length}`, "online / total", onlineServers === servers.length ? "success" : "warning"),
    statCard("Open Alerts", openAlerts, "requires attention", openAlerts > 0 ? "danger" : "success"),
    statCard("Hardware Assets", hardwareAssets.length, "tracked in inventory"),
    statCard("Licenses Expiring", expiringLicenses, "within 30 days", expiringLicenses > 0 ? "warning" : "success"),
    statCard("Firewall Rules", firewallRules.length, "active rules", "info"),
    statCard("Load Balancers", typeof listLoadBalancers === "function" ? `${listLoadBalancers().length} Active` : "3 Active", "HAProxy & NGINX ADC", "success")
  ]);
  app.appendChild(grid);

  // ── SIH System Health & API Key Verification Card ────────────────────────
  const currentRole = sessionStorage.getItem("role") || "—";
  const currentUser = sessionStorage.getItem("username") || "—";

  // Determine permissions for current role
  const rolePermMap = {
    "Super Admin":       { badge: "danger",  icon: "👑", perms: ["Full System Control", "Zero-Knowledge Directory", "Firewall & Network", "Load Balancers (ADC)", "Server & Infrastructure", "User Management", "Audit Logs"] },
    "Admin":             { badge: "warning", icon: "🛡️", perms: ["Firewall & Network Config", "Load Balancer Management", "Server & Infrastructure Config", "User Management", "View All Modules"] },
    "Network Engineer":  { badge: "info",    icon: "🌐", perms: ["🔥 Firewall Rule Management", "⚖️ Load Balancer (ADC) Policies", "🌐 Network Settings & Subnets", "🔀 VLAN / Port Config", "📊 View Monitoring"] },
    "IT Operator":       { badge: "info",    icon: "🖥️", perms: ["🖥️ Server Provisioning & Settings", "⚖️ Load Balancer Backend Pools", "⚙️ Server Config (IP / OS / Name)", "🔄 Power Actions (Reboot/Stop)", "📊 View Monitoring"] },
    "Auditor":           { badge: "neutral", icon: "📋", perms: ["Read-Only Access", "Audit Trail Inspection", "Compliance Reporting"] }
  };
  const roleInfo = rolePermMap[currentRole] || { badge: "neutral", icon: "👤", perms: ["Basic Access"] };

  // Subsystem checks
  const subsystems = [
    { name: "Servers Module",       ok: typeof listServers === "function" && servers.length > 0,    icon: "🖥️" },
    { name: "Load Balancers (ADC)", ok: typeof listLoadBalancers === "function" && loadBalancers.length > 0, icon: "⚖️" },
    { name: "Network / Firewall",   ok: typeof listRules === "function" && firewallRules.length > 0, icon: "🔥" },
    { name: "Live Monitoring",      ok: typeof startMonitoring === "function",                        icon: "📡" },
    { name: "AI Copilot (Groq)",    ok: typeof isAiAvailable === "function" ? isAiAvailable() : true, icon: "🤖" },
    { name: "Hardware Inventory",   ok: typeof hardwareAssets !== "undefined" && hardwareAssets.length > 0, icon: "🔩" },
    { name: "Licenses Manager",     ok: typeof licenses !== "undefined" && licenses.length > 0,       icon: "📄" },
    { name: "Audit Trail Logger",   ok: typeof addLog === "function",                                  icon: "📋" },
    { name: "Authentication (RBAC)",ok: typeof canManageFirewall === "function",                       icon: "🔐" }
  ];

  const allOk = subsystems.every(s => s.ok);
  const failCount = subsystems.filter(s => !s.ok).length;

  const healthCard = el("div", {
    class: "card",
    style: `
      background: linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.95) 100%);
      border: 1px solid ${allOk ? "rgba(16,185,129,0.4)" : "rgba(245,158,11,0.4)"};
      margin-bottom: var(--space-4);
      position: relative;
      overflow: hidden;
    `
  }, []);

  // Glow accent line top
  healthCard.insertAdjacentHTML("afterbegin", `
    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,${allOk ? '#10b981,#38bdf8,#6366f1' : '#f59e0b,#ef4444,#f59e0b'});border-radius:var(--radius-card) var(--radius-card) 0 0;"></div>
  `);

  // Header row
  const headerRow = el("div", { style: "display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px;" }, [
    el("div", {}, [
      el("div", { style: "font-weight:700;font-size:1.05rem;display:flex;align-items:center;gap:8px;" }, [
        el("span", {}, "🏥"),
        el("span", {}, "SIH System Health & API Status")
      ]),
      el("div", { style: "font-size:0.78rem;color:var(--text-secondary);margin-top:3px;" }, "Live verification of all subsystems, API keys & role permissions")
    ]),
    el("div", { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap;" }, [
      el("span", {
        style: `padding:4px 12px;border-radius:20px;font-size:0.72rem;font-weight:700;letter-spacing:0.05em;background:${allOk ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"};color:${allOk ? "#10b981" : "#f59e0b"};border:1px solid ${allOk ? "rgba(16,185,129,0.4)" : "rgba(245,158,11,0.4)"};`
      }, allOk ? "✅ ALL SYSTEMS OPERATIONAL" : `⚠️ ${failCount} CHECK(S) NEED ATTENTION`),
      button("📡 Go to Monitoring", {
        small: true,
        onClick: () => {
          const nav = document.querySelector('.sidebar li[data-section="monitoring"]');
          if (nav) nav.click(); else loadSection("monitoring");
        }
      })
    ])
  ]);
  healthCard.appendChild(headerRow);

  // Two-column body
  const bodyGrid = el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:16px;" });

  // Left: Subsystem integrity checklist
  const subsysDiv = el("div", {
    style: "background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-card);padding:14px;"
  }, [
    el("div", { style: "font-size:0.78rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;" }, "Subsystem Integrity Checks")
  ]);
  subsystems.forEach(sub => {
    const row = el("div", { style: "display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);" }, [
      el("span", { style: "font-size:0.82rem;display:flex;align-items:center;gap:6px;" }, [
        el("span", {}, sub.icon),
        el("span", { style: "color:var(--text-primary);" }, sub.name)
      ]),
      el("span", {
        style: `font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:10px;background:${sub.ok ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"};color:${sub.ok ? "#10b981" : "#ef4444"};`
      }, sub.ok ? "✓ OK" : "✗ FAIL")
    ]);
    subsysDiv.appendChild(row);
  });
  bodyGrid.appendChild(subsysDiv);

  // Right: Role info + API Key status
  const rightCol = el("div", { style: "display:flex;flex-direction:column;gap:12px;" });

  // Role + Permissions block
  const roleDiv = el("div", {
    style: "background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-card);padding:14px;flex:1;"
  }, [
    el("div", { style: "font-size:0.78rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;" }, "Active Role & Permissions"),
    el("div", { style: "display:flex;align-items:center;gap:10px;margin-bottom:12px;" }, [
      el("div", { style: `font-size:1.8rem;line-height:1;` }, roleInfo.icon),
      el("div", {}, [
        el("div", { style: "font-weight:700;font-size:0.95rem;" }, currentRole),
        el("div", { style: "font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono);" }, `@${currentUser}`)
      ])
    ])
  ]);
  roleInfo.perms.forEach(p => {
    const permRow = el("div", {
      style: "display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--text-secondary);padding:3px 0;"
    }, [
      el("span", { style: "color:#10b981;font-weight:700;" }, "✓"),
      el("span", {}, p)
    ]);
    roleDiv.appendChild(permRow);
  });
  rightCol.appendChild(roleDiv);

  // API Key / Connection status block
  const apiDiv = el("div", {
    style: "background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-card);padding:14px;"
  }, [
    el("div", { style: "font-size:0.78rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;" }, "API Key & Connection Status"),
  ]);
  const apiChecks = [
    {
      name: "Groq AI Engine",
      status: (window.location.port === "5000" || (typeof GROQ_DIRECT_KEY !== "undefined" && Boolean(GROQ_DIRECT_KEY))) ? "active" : "offline",
      note: window.location.port === "5000" ? "Backend Proxied (.env)" : (typeof GROQ_DIRECT_KEY !== "undefined" && GROQ_DIRECT_KEY ? "Client Configured" : "Backend Proxy Mode")
    },
    { name: "Supabase Client",  status: (typeof supabase !== "undefined") ? "active" : "offline",                                                note: typeof supabase !== "undefined" ? "Connected" : "Offline/Skipped" },
    { name: "Express Server",   status: window.location.port === "5000" ? "running" : "static",                                                  note: window.location.port === "5000" ? "localhost:5000" : "File / Static Mode" },
    { name: "Live Telemetry",   status: monitoringEnabled ? "streaming" : "paused",                                                               note: monitoringEnabled ? `Every ${AUTOMATION_INTERVAL_MS / 1000}s` : "Paused" }
  ];

  const statusColors = { valid: "#10b981", active: "#10b981", running: "#10b981", streaming: "#38bdf8", paused: "#f59e0b", missing: "#ef4444", offline: "#94a3b8", static: "#94a3b8" };

  apiChecks.forEach(check => {
    const color = statusColors[check.status] || "#94a3b8";
    apiDiv.appendChild(el("div", { style: "display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);" }, [
      el("span", { style: "font-size:0.82rem;color:var(--text-primary);" }, check.name),
      el("div", { style: "display:flex;align-items:center;gap:8px;" }, [
        el("span", { style: `font-size:0.72rem;color:var(--text-muted);font-family:var(--font-mono);` }, check.note),
        el("span", { style: `font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:10px;background:${color}20;color:${color};border:1px solid ${color}40;` }, check.status.toUpperCase())
      ])
    ]));
  });

  rightCol.appendChild(apiDiv);
  bodyGrid.appendChild(rightCol);
  healthCard.appendChild(bodyGrid);
  app.appendChild(healthCard);

  // ── Recent Alerts Table ───────────────────────────────────────────────────
  app.appendChild(el("div", { class: "card" }, [
    el("div", { style: "font-weight:600;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;" }, [
      el("span", {}, "Recent Alerts"),
      el("span", { style: "font-size:0.72rem;color:var(--text-muted);" }, `${openAlerts} open`)
    ]),
    dataTable(
      [
        { key: "severity", label: "Severity", render: r => badge(r.severity, r.severity === "Critical" ? "danger" : r.severity === "Warning" ? "warning" : "info") },
        { key: "source",  label: "Source" },
        { key: "message", label: "Message" },
        { key: "status",  label: "Status",   render: r => statusBadge(r.status) }
      ],
      alerts.slice(0, 6)
    )
  ]));
}
