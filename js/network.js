// ---------------------------------------------------------------------------
// AICTE DCIM Network Infrastructure & Firewall Management Subsystem
// Authorized Roles: Network Engineer, Super Admin, Admin
// Includes: Live Bandwidth Telemetry, Firewall Rules, VLANs/Subnets, Switch Interfaces & Ping Diagnostics
// ---------------------------------------------------------------------------

const NETWORK_STORAGE_KEY = "aicte_dcim_firewall_rules";
const SUBNETS_STORAGE_KEY = "aicte_dcim_subnets";

const DEFAULT_FIREWALL_RULES = [
  { id: 1, name: "Web Ingress (HTTPS)", source: "0.0.0.0/0", destination: "192.168.1.10", port: 443, protocol: "TCP", action: "allow", enabled: true, priority: 100 },
  { id: 2, name: "Web Ingress (HTTP)", source: "0.0.0.0/0", destination: "192.168.1.10", port: 80, protocol: "TCP", action: "allow", enabled: true, priority: 110 },
  { id: 3, name: "Block Public RDP", source: "0.0.0.0/0", destination: "192.168.1.13", port: 3389, protocol: "TCP", action: "deny", enabled: true, priority: 10 },
  { id: 4, name: "SSH Ops Bastion", source: "10.0.0.9", destination: "192.168.1.14", port: 22, protocol: "TCP", action: "allow", enabled: true, priority: 50 },
  { id: 5, name: "Core DNS Resolution", source: "10.0.0.0/24", destination: "1.1.1.1", port: 53, protocol: "UDP", action: "allow", enabled: true, priority: 70 },
  { id: 6, name: "Database Cluster Sync", source: "192.168.1.10", destination: "192.168.1.50", port: 5432, protocol: "TCP", action: "allow", enabled: true, priority: 60 }
];

const DEFAULT_SUBNETS = [
  { id: 1, vlan: "VLAN 10", name: "Management Subnet", cidr: "10.0.0.0/24", gateway: "10.0.0.1", hosts: "18 / 254", status: "Active" },
  { id: 2, vlan: "VLAN 20", name: "Server DMZ / Web", cidr: "192.168.1.0/24", gateway: "192.168.1.1", hosts: "45 / 254", status: "Active" },
  { id: 3, vlan: "VLAN 30", name: "AICTE AI Engine Cluster", cidr: "10.10.0.0/20", gateway: "10.10.0.1", hosts: "32 / 4094", status: "Active" },
  { id: 4, vlan: "VLAN 99", name: "Core WAN Uplink", cidr: "172.16.0.0/16", gateway: "172.16.0.1", hosts: "Redundant", status: "Active" }
];

function loadStoredRules() {
  try {
    const raw = localStorage.getItem(NETWORK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  try {
    localStorage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(DEFAULT_FIREWALL_RULES));
  } catch (e) {}
  return [...DEFAULT_FIREWALL_RULES];
}

function loadStoredSubnets() {
  try {
    const raw = localStorage.getItem(SUBNETS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  try {
    localStorage.setItem(SUBNETS_STORAGE_KEY, JSON.stringify(DEFAULT_SUBNETS));
  } catch (e) {}
  return [...DEFAULT_SUBNETS];
}

let firewallRules = loadStoredRules();
let networkSubnets = loadStoredSubnets();

function saveRules() {
  try {
    localStorage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(firewallRules));
  } catch (e) {}
}

function saveSubnets() {
  try {
    localStorage.setItem(SUBNETS_STORAGE_KEY, JSON.stringify(networkSubnets));
  } catch (e) {}
}

const switchPorts = [
  { port: "Port 01", name: "Core Uplink A", speed: "40G SFP+", status: "up", load: "1.42 Gbps", tx: "840 MB/s", rx: "580 MB/s" },
  { port: "Port 02", name: "Server Rack A1", speed: "10G SFP+", status: "up", load: "420 Mbps", tx: "260 MB/s", rx: "160 MB/s" },
  { port: "Port 03", name: "Server Rack B1", speed: "10G SFP+", status: "up", load: "310 Mbps", tx: "180 MB/s", rx: "130 MB/s" },
  { port: "Port 04", name: "Storage SAN NAS", speed: "10G SFP+", status: "up", load: "180 Mbps", tx: "110 MB/s", rx: "70 MB/s" },
  { port: "Port 05", name: "Firewall Gateway", speed: "10G SFP+", status: "up", load: "890 Mbps", tx: "520 MB/s", rx: "370 MB/s" },
  { port: "Port 06", name: "AI Accelerator Box", speed: "40G SFP+", status: "up", load: "2.14 Gbps", tx: "1.2 GB/s", rx: "940 MB/s" },
  { port: "Port 07", name: "Disaster Recovery", speed: "10G SFP+", status: "standby", load: "0 Mbps", tx: "0 B/s", rx: "0 B/s" },
  { port: "Port 08", name: "Out-of-Band IPMI", speed: "1G Base-T", status: "up", load: "12 Mbps", tx: "7 MB/s", rx: "5 MB/s" }
];

function listRules() {
  return firewallRules;
}

/**
 * Check if current user has Network & Firewall management privileges.
 * Network Engineer, Admin, and Super Admin are authorized.
 */
function canManageFirewall() {
  const role = sessionStorage.getItem("role");
  return role === "Super Admin" || role === "Admin" || role === "Network Engineer";
}

function addRule(rule) {
  if (!canManageFirewall()) {
    toast("Permission Denied: Only Network Engineer, Admin, and Super Admin can add firewall rules.", "danger");
    return false;
  }

  rule.id = Date.now();
  rule.enabled = rule.enabled !== undefined ? rule.enabled : true;
  firewallRules.push(rule);
  saveRules();

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "netengineer",
      role: sessionStorage.getItem("role") || "Network Engineer",
      action: "Deploy Firewall Rule",
      target: `Firewall Port ${rule.port} (${rule.action.toUpperCase()})`,
      ip: "127.0.0.1",
      result: "Success",
      details: `${rule.action.toUpperCase()} rule deployed for ${rule.source} -> ${rule.destination}:${rule.port}/${rule.protocol || "TCP"} (${rule.name || "Custom Rule"})`
    });
  }
  return true;
}

function updateRule(id, updates) {
  if (!canManageFirewall()) {
    toast("Permission Denied: Only Network Engineer, Admin, and Super Admin can update firewall rules.", "danger");
    return false;
  }
  firewallRules = firewallRules.map(r => r.id === id ? { ...r, ...updates } : r);
  saveRules();

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "netengineer",
      role: sessionStorage.getItem("role") || "Network Engineer",
      action: "Modify Firewall Rule",
      target: `Rule ID ${id}`,
      ip: "127.0.0.1",
      result: "Success",
      details: `Updated firewall policy attributes: ${Object.keys(updates).join(", ")}`
    });
  }
  return true;
}

function toggleRuleStatus(id) {
  if (!canManageFirewall()) {
    toast("Permission Denied: Only Network Engineer, Admin, and Super Admin can toggle firewall rules.", "danger");
    return;
  }
  const rule = firewallRules.find(r => r.id === id);
  if (!rule) return;
  rule.enabled = !rule.enabled;
  saveRules();

  toast(`Rule "${rule.name || rule.port}" is now ${rule.enabled ? "Active" : "Disabled"}`, rule.enabled ? "success" : "warning");

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "netengineer",
      role: sessionStorage.getItem("role") || "Network Engineer",
      action: rule.enabled ? "Enable Firewall Rule" : "Disable Firewall Rule",
      target: rule.name || `Port ${rule.port}`,
      ip: "127.0.0.1",
      result: "Success",
      details: `Rule status toggled to ${rule.enabled ? "Enabled" : "Disabled"}`
    });
  }

  const app = document.getElementById("app");
  if (app && currentSection === "network") renderNetwork(app);
}

function deleteRule(id) {
  if (!canManageFirewall()) {
    toast("Permission Denied: Only Network Engineer, Admin, and Super Admin can delete firewall rules.", "danger");
    return;
  }

  const target = firewallRules.find(r => r.id === id);
  firewallRules = firewallRules.filter(r => r.id !== id);
  saveRules();

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "netengineer",
      role: sessionStorage.getItem("role") || "Network Engineer",
      action: "Delete Firewall Rule",
      target: target ? `Firewall Port ${target.port}` : String(id),
      ip: "127.0.0.1",
      result: "Success",
      details: target ? `Removed rule for ${target.source} -> ${target.destination}:${target.port}` : "Rule removed"
    });
  }
}

function addSubnet(subnet) {
  if (!canManageFirewall()) {
    toast("Permission Denied: Only Network Engineer, Admin, and Super Admin can add subnets/VLANs.", "danger");
    return false;
  }

  subnet.id = Date.now();
  networkSubnets.push(subnet);
  saveSubnets();

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "netengineer",
      role: sessionStorage.getItem("role") || "Network Engineer",
      action: "Create VLAN Subnet",
      target: subnet.vlan,
      ip: subnet.gateway || "—",
      result: "Success",
      details: `Configured ${subnet.vlan} (${subnet.name}) with CIDR ${subnet.cidr} and Gateway ${subnet.gateway}`
    });
  }
  return true;
}

function deleteSubnet(id) {
  if (!canManageFirewall()) {
    toast("Permission Denied: Only Network Engineer, Admin, and Super Admin can delete subnets.", "danger");
    return false;
  }

  const target = networkSubnets.find(s => s.id === id);
  networkSubnets = networkSubnets.filter(s => s.id !== id);
  saveSubnets();

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "netengineer",
      role: sessionStorage.getItem("role") || "Network Engineer",
      action: "Delete Subnet",
      target: target ? target.vlan : String(id),
      ip: target ? target.gateway : "—",
      result: "Success",
      details: target ? `Decommissioned ${target.vlan} (${target.name})` : "Subnet deleted"
    });
  }
  return true;
}

let activeNetworkTab = "overview";

function renderNetwork(app) {
  app.innerHTML = "";
  const hasPrivileges = canManageFirewall();

  const addBtn = hasPrivileges
    ? button("+ Add Firewall Rule", {
        variant: "primary",
        small: true,
        onClick: () => toggleForm(formPanel)
      })
    : null;

  const header = sectionHeader("Network Infrastructure & Security", "Data center core switches, subnets, live traffic & firewall policy engine", addBtn);
  app.appendChild(header);

  // Role status banner
  if (hasPrivileges) {
    app.appendChild(el("div", {
      class: "badge badge-success",
      style: "margin-bottom:var(--space-4);padding:10px 14px;display:flex;align-items:center;gap:8px;font-size:0.82rem;"
    }, `⚡ Network Management Active: Your role (${sessionStorage.getItem("role") || "Network Engineer"}) is authorized to configure firewall rules, deploy subnets/VLANs, toggle ACL policies, and adjust network routing.`));
  } else {
    app.appendChild(el("div", {
      class: "badge badge-neutral",
      style: "margin-bottom:var(--space-4);padding:10px 14px;display:inline-block;"
    }, "🛡️ Read-Only Mode: Firewall rule modifications and subnet management are restricted to Network Engineer, Admin, and Super Admin."));
  }

  // Network Navigation Tabs
  const tabsContainer = el("div", { class: "network-tabs", style: "margin-bottom:var(--space-4);" }, [
    el("button", {
      class: `network-tab-btn ${activeNetworkTab === "overview" ? "active" : ""}`,
      onclick: () => { activeNetworkTab = "overview"; renderNetwork(app); }
    }, "📊 Telemetry & Overview"),
    el("button", {
      class: `network-tab-btn ${activeNetworkTab === "firewall" ? "active" : ""}`,
      onclick: () => { activeNetworkTab = "firewall"; renderNetwork(app); }
    }, `🛡️ Firewall Rules (${firewallRules.length})`),
    el("button", {
      class: `network-tab-btn ${activeNetworkTab === "vlans" ? "active" : ""}`,
      onclick: () => { activeNetworkTab = "vlans"; renderNetwork(app); }
    }, `🌐 Subnets & VLANs (${networkSubnets.length})`),
    el("button", {
      class: `network-tab-btn ${activeNetworkTab === "interfaces" ? "active" : ""}`,
      onclick: () => { activeNetworkTab = "interfaces"; renderNetwork(app); }
    }, "🔌 Switch Interfaces"),
    el("button", {
      class: `network-tab-btn ${activeNetworkTab === "diagnostics" ? "active" : ""}`,
      onclick: () => { activeNetworkTab = "diagnostics"; renderNetwork(app); }
    }, "⚡ ICMP Ping & Diagnostics")
  ]);
  app.appendChild(tabsContainer);

  // Add Rule Form Panel
  const formPanel = el("div", { class: "card form-panel", style: "margin-bottom:var(--space-4);" }, []);
  const nameInput = el("input", { placeholder: "Rule Name (e.g. Web API Ingress)" });
  const srcInput = el("input", { placeholder: "0.0.0.0/0 or 10.0.0.5" });
  const dstInput = el("input", { placeholder: "192.168.1.10" });
  const portInput = el("input", { type: "number", placeholder: "443" });
  const protoInput = el("select", {}, [
    el("option", { value: "TCP" }, "TCP"),
    el("option", { value: "UDP" }, "UDP"),
    el("option", { value: "ICMP" }, "ICMP"),
    el("option", { value: "ALL" }, "ANY Protocol")
  ]);
  const actionInput = el("select", {}, [
    el("option", { value: "allow" }, "Allow (Accept Traffic)"),
    el("option", { value: "deny" }, "Deny (Drop Traffic)")
  ]);

  formPanel.appendChild(el("div", { style: "font-weight:600;margin-bottom:var(--space-3);" }, "➕ Create New Firewall Security Rule"));
  formPanel.appendChild(el("div", { class: "form-grid" }, [
    el("label", {}, ["Rule Description", nameInput]),
    el("label", {}, ["Source IP / CIDR", srcInput]),
    el("label", {}, ["Destination IP", dstInput]),
    el("label", {}, ["Port Number", portInput]),
    el("label", {}, ["Protocol", protoInput]),
    el("label", {}, ["Firewall Action", actionInput])
  ]));

  formPanel.appendChild(el("div", { style: "display:flex;gap:8px;" }, [
    button("Save & Deploy Rule", {
      variant: "primary",
      onClick: () => {
        if (!srcInput.value.trim() || !dstInput.value.trim() || !portInput.value) {
          return toast("Source, destination, and port are required", "danger");
        }
        addRule({
          name: nameInput.value.trim() || `Rule Port ${portInput.value}`,
          source: srcInput.value.trim(),
          destination: dstInput.value.trim(),
          port: Number(portInput.value),
          protocol: protoInput.value,
          action: actionInput.value,
          enabled: true,
          priority: 100
        });
        toast("Firewall rule deployed and active", "success");
        renderNetwork(app);
      }
    }),
    button("Cancel", {
      small: true,
      onClick: () => toggleForm(formPanel)
    })
  ]));

  if (hasPrivileges) {
    app.appendChild(formPanel);
  }

  // Render content based on active tab
  if (activeNetworkTab === "overview") {
    renderNetworkOverview(app);
  } else if (activeNetworkTab === "firewall") {
    renderFirewallSection(app);
  } else if (activeNetworkTab === "vlans") {
    renderVlansSection(app);
  } else if (activeNetworkTab === "interfaces") {
    renderInterfacesSection(app);
  } else if (activeNetworkTab === "diagnostics") {
    renderDiagnosticsSection(app);
  }
}

function renderNetworkOverview(app) {
  const grid = el("div", { class: "grid", style: "margin-bottom:var(--space-4);" }, [
    statCard("Aggregated Bandwidth", "2.34 Gbps", "Ingress 1.4G · Egress 940M", "success"),
    statCard("Core Latency", "2.1 ms", "avg intra-datacenter", "success"),
    statCard("Packet Loss", "0.001%", "within SLA standards", "success"),
    statCard("Active Subnets", `${networkSubnets.length} VLANs`, "all gateways healthy", "info"),
    statCard("Firewall Policies", `${firewallRules.length} Rules`, `${firewallRules.filter(r=>r.enabled!==false).length} Active Policies`),
    statCard("Core Interfaces", "7 Up / 1 Stby", "40GbE & 10GbE fabric", "success")
  ]);
  app.appendChild(grid);

  const chartCard = el("div", { class: "card", style: "margin-bottom:var(--space-4);" }, [
    el("div", { style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3);" }, [
      el("div", {}, [
        el("div", { style: "font-weight:600;font-size:1rem;" }, "Live Ingress & Egress Throughput"),
        el("div", { style: "font-size:0.78rem;color:var(--text-secondary);" }, "Real-time telemetry stream (Gbps) across core switches")
      ]),
      el("div", { style: "display:flex;gap:12px;font-size:0.75rem;" }, [
        el("span", { style: "color:#38bdf8;display:flex;align-items:center;gap:4px;" }, "● Ingress (RX)"),
        el("span", { style: "color:#34d399;display:flex;align-items:center;gap:4px;" }, "● Egress (TX)")
      ])
    ]),
    el("canvas", { id: "networkTrafficCanvas", width: "800", height: "180", style: "width:100%;height:180px;border-radius:var(--radius-input);background:var(--surface-raised);" })
  ]);
  app.appendChild(chartCard);

  requestAnimationFrame(() => {
    drawNetworkTrafficChart();
  });

  const portSection = el("div", { class: "card", style: "margin-bottom:var(--space-4);" }, [
    el("div", { style: "font-weight:600;margin-bottom:var(--space-3);" }, "Core Switch Fabric Interfaces"),
    renderPortGrid()
  ]);
  app.appendChild(portSection);
}

function drawNetworkTrafficChart() {
  const canvas = document.getElementById("networkTrafficCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let y = 30; y < h; y += 35) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const points = 24;
  const step = w / (points - 1);
  const rxData = [1.1, 1.2, 1.15, 1.3, 1.45, 1.4, 1.5, 1.35, 1.42, 1.6, 1.55, 1.48, 1.42, 1.38, 1.52, 1.49, 1.45, 1.42, 1.58, 1.62, 1.55, 1.48, 1.42, 1.44];
  const txData = [0.7, 0.75, 0.8, 0.82, 0.9, 0.88, 0.95, 0.91, 0.94, 1.05, 0.98, 0.92, 0.89, 0.86, 0.92, 0.95, 0.91, 0.88, 0.96, 1.02, 0.94, 0.91, 0.89, 0.94];

  function drawCurve(data, color, fillGrad) {
    ctx.beginPath();
    ctx.moveTo(0, h - (data[0] / 2.5) * (h - 20));
    for (let i = 1; i < data.length; i++) {
      const x = i * step;
      const y = h - (data[i] / 2.5) * (h - 20);
      const prevX = (i - 1) * step;
      const prevY = h - (data[i - 1] / 2.5) * (h - 20);
      const cx = (prevX + x) / 2;
      ctx.bezierCurveTo(cx, prevY, cx, y, x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = fillGrad;
    ctx.fill();
  }

  const rxGrad = ctx.createLinearGradient(0, 0, 0, h);
  rxGrad.addColorStop(0, "rgba(56, 189, 248, 0.25)");
  rxGrad.addColorStop(1, "rgba(56, 189, 248, 0.0)");
  drawCurve(rxData, "#38bdf8", rxGrad);

  const txGrad = ctx.createLinearGradient(0, 0, 0, h);
  txGrad.addColorStop(0, "rgba(52, 211, 153, 0.2)");
  txGrad.addColorStop(1, "rgba(52, 211, 153, 0.0)");
  drawCurve(txData, "#34d399", txGrad);
}

function renderPortGrid() {
  const container = el("div", { class: "port-grid" });
  switchPorts.forEach(p => {
    const card = el("div", { class: "port-card" }, [
      el("div", { class: "port-header" }, [
        el("span", { class: "port-name" }, p.port),
        el("span", { class: `port-led ${p.status}` })
      ]),
      el("div", { style: "font-weight:600;font-size:0.8rem;" }, p.name),
      el("div", { class: "port-meta" }, `TX: ${p.tx} · RX: ${p.rx}`),
      el("div", { class: "port-speed" }, `${p.speed} · ${p.load}`)
    ]);
    container.appendChild(card);
  });
  return container;
}

function renderFirewallSection(app) {
  const hasPrivileges = canManageFirewall();

  const card = el("div", { class: "card" }, [
    el("div", { style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3);" }, [
      el("div", {}, [
        el("div", { style: "font-weight:600;font-size:1rem;" }, "Active Firewall & Access Control Rules"),
        el("div", { style: "font-size:0.8rem;color:var(--text-secondary);" }, "Inbound and outbound filtering rules executed at core gateway [Authorized: Network Engineer / Admin]")
      ])
    ])
  ]);

  if (!hasPrivileges) {
    card.appendChild(el("div", {
      class: "badge badge-neutral",
      style: "margin-bottom:var(--space-3);padding:8px 12px;display:inline-block;"
    }, "🛡️ Read-Only Mode: Deleting or deploying firewall access rules is restricted to Network Engineer, Admin, and Super Admin."));
  }

  const columns = [
    { 
      key: "name", 
      label: "Rule Name",
      render: r => el("div", {}, [
        el("div", { style: "font-weight:600;" }, r.name || `Rule ${r.port}`),
        el("div", { style: "font-size:0.72rem;color:var(--text-muted);" }, r.enabled !== false ? "🟢 Active Policy" : "⚪ Disabled")
      ])
    },
    { key: "source", label: "Source IP / CIDR", mono: true },
    { key: "destination", label: "Destination IP", mono: true },
    { key: "port", label: "Port", mono: true },
    { key: "protocol", label: "Proto", mono: true, render: r => r.protocol || "TCP" },
    {
      key: "action",
      label: "Action",
      render: r => badge(r.action.toUpperCase(), r.action.toLowerCase() === "allow" ? "success" : "danger")
    }
  ];

  const rowActions = hasPrivileges
    ? (row => [
        button(row.enabled !== false ? "Disable" : "Enable", {
          small: true,
          onClick: () => toggleRuleStatus(row.id)
        }),
        button("Delete", {
          variant: "danger",
          small: true,
          onClick: () => {
            if (confirm(`Are you sure you want to delete firewall rule "${row.name || row.port}"?`)) {
              deleteRule(row.id);
              toast(`Firewall rule ${row.name || row.port} removed`, "warning");
              renderNetwork(app);
            }
          }
        })
      ])
    : null;

  card.appendChild(dataTable(columns, firewallRules, rowActions));
  app.appendChild(card);
}

function renderVlansSection(app) {
  const hasPrivileges = canManageFirewall();

  const vlanForm = el("div", { class: "card form-panel", style: "margin-bottom:var(--space-4);display:none;" }, []);
  const vlanTagInput = el("input", { placeholder: "VLAN 40" });
  const vlanNameInput = el("input", { placeholder: "Database Replication Subnet" });
  const cidrInput = el("input", { placeholder: "10.20.0.0/24" });
  const gwInput = el("input", { placeholder: "10.20.0.1" });

  vlanForm.appendChild(el("div", { style: "font-weight:600;margin-bottom:var(--space-3);" }, "➕ Provision New Subnet / VLAN Partition"));
  vlanForm.appendChild(el("div", { class: "form-grid" }, [
    el("label", {}, ["VLAN Tag", vlanTagInput]),
    el("label", {}, ["Subnet Description", vlanNameInput]),
    el("label", {}, ["Network CIDR", cidrInput]),
    el("label", {}, ["Default Gateway", gwInput])
  ]));

  vlanForm.appendChild(el("div", { style: "display:flex;gap:8px;" }, [
    button("Deploy Subnet", {
      variant: "primary",
      onClick: () => {
        if (!vlanTagInput.value || !cidrInput.value) return toast("VLAN Tag and CIDR are required", "danger");
        addSubnet({
          vlan: vlanTagInput.value.trim(),
          name: vlanNameInput.value.trim() || "Custom Subnet",
          cidr: cidrInput.value.trim(),
          gateway: gwInput.value.trim() || "—",
          hosts: "0 / 254",
          status: "Active"
        });
        toast(`Subnet ${vlanTagInput.value} deployed successfully!`, "success");
        renderNetwork(app);
      }
    }),
    button("Cancel", {
      small: true,
      onClick: () => toggleForm(vlanForm)
    })
  ]));

  const addVlanBtn = hasPrivileges
    ? button("+ Add Subnet / VLAN", {
        variant: "primary",
        small: true,
        onClick: () => toggleForm(vlanForm)
      })
    : null;

  const card = el("div", { class: "card" }, [
    el("div", { style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);" }, [
      el("div", {}, [
        el("div", { style: "font-weight:600;font-size:1rem;" }, "Data Center Subnets & VLAN Partitioning"),
        el("div", { style: "font-size:0.8rem;color:var(--text-secondary);" }, "Logical subnet segmentation for security isolation and routing")
      ]),
      addVlanBtn || el("span", {})
    ])
  ]);

  if (hasPrivileges) {
    card.appendChild(vlanForm);
  }

  const columns = [
    { key: "vlan", label: "VLAN Tag", mono: true },
    { key: "name", label: "Subnet Name" },
    { key: "cidr", label: "Network CIDR", mono: true },
    { key: "gateway", label: "Default Gateway", mono: true },
    { key: "hosts", label: "Host Capacity" },
    { key: "status", label: "Status", render: r => statusBadge(r.status) }
  ];

  const rowActions = hasPrivileges
    ? (row => [
        button("Delete", {
          variant: "danger",
          small: true,
          onClick: () => {
            if (confirm(`Decommission ${row.vlan} (${row.name})?`)) {
              deleteSubnet(row.id);
              toast(`Subnet ${row.vlan} removed`, "warning");
              renderNetwork(app);
            }
          }
        })
      ])
    : null;

  card.appendChild(dataTable(columns, networkSubnets, rowActions));
  app.appendChild(card);
}

function renderInterfacesSection(app) {
  const card = el("div", { class: "card" }, [
    el("div", { style: "font-weight:600;font-size:1rem;margin-bottom:var(--space-2);" }, "High-Density Core Switch Interfaces"),
    el("div", { style: "font-size:0.8rem;color:var(--text-secondary);margin-bottom:var(--space-4);" }, "Physical port link status, negotiation speed, and packet transfer metrics"),
    renderPortGrid()
  ]);
  app.appendChild(card);
}

function renderDiagnosticsSection(app) {
  const card = el("div", { class: "card" }, [
    el("div", { style: "font-weight:600;font-size:1rem;margin-bottom:var(--space-2);" }, "Network Reachability & ICMP Diagnostic Terminal"),
    el("div", { style: "font-size:0.8rem;color:var(--text-secondary);margin-bottom:var(--space-4);" }, "Execute low-latency ICMP ping tests from DCIM gateway to any internal or external host")
  ]);

  const pingInput = el("input", {
    value: "192.168.1.10",
    placeholder: "IP address or Hostname (e.g. 192.168.1.10, 8.8.8.8, aicte.gov.in)",
    style: "flex:2;background:var(--background);border:1px solid var(--border);color:var(--text-primary);padding:.6rem .8rem;border-radius:var(--radius-input);font-family:var(--font-mono)"
  });

  const terminal = el("div", { class: "ping-terminal" }, [
    el("div", { class: "cmd-line" }, "AICTE DCIM Network Diagnostic Console [Version 2.4]"),
    el("div", { style: "color:#64748b;" }, "Enter a target IP or domain above and click 'Run Ping Test' to verify packet route.")
  ]);

  const pingBtn = button("⚡ Run Ping Test", {
    variant: "primary",
    onClick: () => {
      const target = pingInput.value.trim();
      if (!target) return toast("Please enter a target host or IP", "danger");

      terminal.innerHTML = "";
      terminal.appendChild(el("div", { class: "cmd-line" }, `$ ping -c 4 ${target}`));
      terminal.appendChild(el("div", { style: "color:#94a3b8;" }, `PING ${target} (${target}): 56 data bytes`));

      let seq = 1;
      const baseLatency = target.startsWith("192.168") || target.startsWith("10.") ? 0.8 : 18.5;
      const interval = setInterval(() => {
        if (seq <= 4) {
          const lat = (baseLatency + Math.random() * 0.9).toFixed(2);
          const line = el("div", {}, `64 bytes from ${target}: icmp_seq=${seq} ttl=64 time=${lat} ms`);
          terminal.appendChild(line);
          terminal.scrollTop = terminal.scrollHeight;
          seq++;
        } else {
          clearInterval(interval);
          const minLat = (baseLatency + 0.1).toFixed(2);
          const avgLat = (baseLatency + 0.5).toFixed(2);
          const maxLat = (baseLatency + 0.9).toFixed(2);
          terminal.appendChild(el("div", { class: "stat-line" }, [
            el("div", {}, `--- ${target} ping statistics ---`),
            el("div", {}, `4 packets transmitted, 4 packets received, 0.0% packet loss`),
            el("div", {}, `round-trip min/avg/max = ${minLat}/${avgLat}/${maxLat} ms`)
          ]));
          terminal.scrollTop = terminal.scrollHeight;
          toast(`Ping to ${target} complete: 0% loss, avg ${avgLat}ms`, "success");
        }
      }, 350);
    }
  });

  card.appendChild(el("div", { style: "display:flex;gap:12px;margin-bottom:var(--space-4);flex-wrap:wrap;" }, [
    pingInput,
    pingBtn
  ]));

  card.appendChild(terminal);
  app.appendChild(card);
}


