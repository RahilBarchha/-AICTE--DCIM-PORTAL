// ---------------------------------------------------------------------------
// AICTE DCIM Server Infrastructure & Search Engine Subsystem
// Authorized Roles: IT Operator, Super Admin, Admin
// Includes: Real VM Demo Servers, Live Load Injector, Hardware Settings Editor,
// and Advanced Real-Time Multi-Attribute Server Search Engine
// ---------------------------------------------------------------------------

let servers = [
  // ── User's 3 Live VM Demo Servers ───────────────────────────────────────
  { id: 101, name: "VM-Server-01", ip: "192.168.56.101", status: "Online", os: "Ubuntu Linux 22.04 LTS (VM)", cpu: 42, ram: 58, disk: 48, temp: 41, rack: "VM-Cluster-Node1", iops: 1850, uptime: "99.99%", maxCpu: "8 vCPU", maxRam: "32 GB", isVM: true, hasManualLoad: false },
  { id: 102, name: "VM-Server-02", ip: "192.168.56.102", status: "Online", os: "Debian Linux 12 (VM)",       cpu: 28, ram: 44, disk: 36, temp: 37, rack: "VM-Cluster-Node2", iops: 1200, uptime: "99.95%", maxCpu: "8 vCPU", maxRam: "32 GB", isVM: true, hasManualLoad: false },
  { id: 103, name: "VM-Server-03", ip: "192.168.56.103", status: "Online", os: "CentOS Stream 9 (VM)",       cpu: 34, ram: 50, disk: 42, temp: 39, rack: "VM-Cluster-Node3", iops: 1450, uptime: "100.0%", maxCpu: "8 vCPU", maxRam: "32 GB", isVM: true, hasManualLoad: false },

  // ── DCIM Bare-Metal Cluster Nodes ───────────────────────────────────────
  { id: 1, name: "Server-01", ip: "192.168.1.10", status: "Online", os: "Linux Ubuntu 22.04", cpu: 45, ram: 60, disk: 52, temp: 42, rack: "Rack-A01", iops: 1240, uptime: "99.99%", maxCpu: "32 Cores", maxRam: "128 GB", isVM: false },
  { id: 2, name: "Server-02", ip: "192.168.1.11", status: "Offline", os: "Windows Server 2022", cpu: 0, ram: 0, disk: 30, temp: 24, rack: "Rack-A02", iops: 0, uptime: "98.40%", maxCpu: "16 Cores", maxRam: "64 GB", isVM: false },
  { id: 3, name: "Server-03", ip: "192.168.1.12", status: "Online", os: "Linux RedHat 9", cpu: 32, ram: 48, disk: 44, temp: 39, rack: "Rack-B01", iops: 860, uptime: "99.95%", maxCpu: "64 Cores", maxRam: "256 GB", isVM: false },
  { id: 4, name: "Server-04", ip: "192.168.1.13", status: "Online", os: "Windows Server 2022", cpu: 58, ram: 71, disk: 68, temp: 48, rack: "Rack-B02", iops: 2150, uptime: "99.90%", maxCpu: "32 Cores", maxRam: "128 GB", isVM: false },
  { id: 5, name: "Server-05", ip: "192.168.1.14", status: "Online", os: "Linux Debian 12", cpu: 22, ram: 35, disk: 38, temp: 36, rack: "Rack-C01", iops: 620, uptime: "100.0%", maxCpu: "16 Cores", maxRam: "64 GB", isVM: false }
];

// Persistent search filter state
let serverSearchState = {
  query: "",
  activeFilter: "all", // "all", "online", "offline", "vm", "highload", "critical"
  rackFilter: "all",
  osFilter: "all",
  sortBy: "default"
};

function listServers() {
  return servers;
}

/**
 * Check if the currently logged in user has permissions to configure server settings.
 * IT Operator, Admin, and Super Admin are authorized.
 */
function canManageServers() {
  const role = sessionStorage.getItem("role");
  return role === "Super Admin" || role === "Admin" || role === "IT Operator";
}

/**
 * Injects instant realistic load on a target server (e.g. VM-Server-01) for live demonstration.
 */
function injectServerLoad(id, cpuPercent = 94, ramPercent = 88) {
  const target = servers.find(s => s.id === id);
  if (!target) return;

  target.status = "Online";
  target.cpu = Math.max(10, Math.min(100, cpuPercent));
  target.ram = Math.max(10, Math.min(100, ramPercent));
  target.temp = Math.min(88, (target.temp || 40) + 15);
  target.iops = Math.min(12000, (target.iops || 1000) + 3500);
  target.hasManualLoad = true;

  toast(`⚡ Heavy Load Injected on ${target.name}: CPU ${target.cpu}%, RAM ${target.ram}%`, target.cpu >= 88 ? "danger" : "warning");

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "itoperator",
      role: sessionStorage.getItem("role") || "IT Operator",
      action: "Inject Workload Spike",
      target: target.name,
      ip: target.ip || "—",
      result: "Success",
      details: `Workload applied to ${target.name}: CPU surged to ${target.cpu}%, RAM to ${target.ram}%. Threshold watchdog notified.`
    });
  }

  // Force threshold evaluation
  if (typeof checkThreshold === "function") {
    checkThreshold(target, "cpu");
    checkThreshold(target, "ram");
  }

  // Dispatch authorized load to backend if online
  const token = sessionStorage.getItem('token');
  if (token) {
    fetch(`/api/servers/${id}/load`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ cpu: target.cpu, ram: target.ram })
    }).catch(() => {});
  }

  if (typeof afterTick === "function") afterTick();
}

/**
 * Normalizes load on a target server and triggers auto-alert resolution.
 */
function normalizeServerLoad(id) {
  const target = servers.find(s => s.id === id);
  if (!target) return;

  target.cpu = 32;
  target.ram = 45;
  target.temp = 38;
  target.iops = 1200;
  target.hasManualLoad = false;

  toast(`🛡️ Normalized ${target.name}: CPU 32%, RAM 45% (Auto-resolving alerts)`, "success");

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "itoperator",
      role: sessionStorage.getItem("role") || "IT Operator",
      action: "Stabilize Host Workload",
      target: target.name,
      ip: target.ip || "—",
      result: "Success",
      details: `Workload normalized on ${target.name}. Triggered auto-alert resolution.`
    });
  }

  // Auto-resolve any open alerts for this host
  if (typeof autoResolveServerAlerts === "function") {
    autoResolveServerAlerts(target.id, target.name, "cpu", target.cpu);
    autoResolveServerAlerts(target.id, target.name, "ram", target.ram);
  }

  if (typeof checkThreshold === "function") {
    checkThreshold(target, "cpu");
    checkThreshold(target, "ram");
  }

  if (typeof afterTick === "function") afterTick();
}

function addServer(server) {
  if (!canManageServers()) {
    toast("Permission Denied: Only IT Operator, Admin, and Super Admin can add servers.", "danger");
    return false;
  }

  server.id = Date.now();
  server.cpu = server.cpu || 0;
  server.ram = server.ram || 0;
  server.disk = server.disk || 35;
  server.temp = server.temp || 38;
  server.uptime = "99.99%";
  server.iops = 800;
  server.rack = server.rack || "Rack-A01";
  server.maxCpu = server.maxCpu || "32 Cores";
  server.maxRam = server.maxRam || "128 GB";

  servers.push(server);

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "itoperator",
      role: sessionStorage.getItem("role") || "IT Operator",
      action: "Provision Server",
      target: server.name,
      ip: server.ip || "—",
      result: "Success",
      details: `Provisioned host ${server.name} (${server.os}) in ${server.rack} with IP ${server.ip}`
    });
  }

  if (typeof syncServersWithSupabase === "function") {
    syncServersWithSupabase(servers);
  }

  return true;
}

function updateServer(id, updates) {
  if (!canManageServers()) {
    toast("Permission Denied: Only IT Operator, Admin, and Super Admin can update server settings.", "danger");
    return false;
  }

  const target = servers.find(s => s.id === id);
  if (!target) return false;

  servers = servers.map(s => s.id === id ? { ...s, ...updates } : s);

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "itoperator",
      role: sessionStorage.getItem("role") || "IT Operator",
      action: "Modify Server Settings",
      target: target.name,
      ip: target.ip || "—",
      result: "Success",
      details: `Updated host configuration: ${Object.keys(updates).join(", ")}`
    });
  }

  if (typeof syncServersWithSupabase === "function") {
    syncServersWithSupabase(servers);
  }

  return true;
}

function changeServerStatus(id, newStatus) {
  if (!canManageServers()) {
    toast("Permission Denied: Only IT Operator, Admin, and Super Admin can change server power states.", "danger");
    return;
  }

  const target = servers.find(s => s.id === id);
  if (!target) return;

  const oldStatus = target.status;
  target.status = newStatus;

  if (newStatus === "Offline") {
    target.cpu = 0;
    target.ram = 0;
    target.temp = 22;
    target.iops = 0;
  } else if (newStatus === "Online" && oldStatus === "Offline") {
    target.cpu = 30;
    target.ram = 45;
    target.temp = 38;
    target.iops = 850;
  }

  toast(`${target.name} state changed to ${newStatus}`, newStatus === "Online" ? "success" : "warning");

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "itoperator",
      role: sessionStorage.getItem("role") || "IT Operator",
      action: `Power Action: ${newStatus}`,
      target: target.name,
      ip: target.ip || "—",
      result: "Success",
      details: `Changed state from ${oldStatus} to ${newStatus}`
    });
  }

  const app = document.getElementById("app");
  if (app && currentSection === "servers") renderServers(app);
}

function restartServer(id) {
  if (!canManageServers()) {
    toast("Permission Denied: Only IT Operator, Admin, and Super Admin can reboot servers.", "danger");
    return;
  }

  const target = servers.find(s => s.id === id);
  if (!target) return;

  target.status = "Rebooting";
  target.cpu = 15;
  target.ram = 20;

  toast(`🔄 Reboot sequence initialized on ${target.name}...`, "info");

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "itoperator",
      role: sessionStorage.getItem("role") || "IT Operator",
      action: "Reboot Host",
      target: target.name,
      ip: target.ip || "—",
      result: "Success",
      details: `Initiated graceful reboot of host ${target.name} (${target.ip})`
    });
  }

  const app = document.getElementById("app");
  if (app && currentSection === "servers") renderServers(app);

  setTimeout(() => {
    target.status = "Online";
    target.cpu = 35;
    target.ram = 48;
    toast(`✅ ${target.name} reboot completed and online.`, "success");
    if (app && currentSection === "servers") renderServers(app);
  }, 2500);
}

function deleteServer(id) {
  if (!canManageServers()) {
    toast("Permission Denied: Only IT Operator, Admin, and Super Admin can remove servers.", "danger");
    return;
  }

  const target = servers.find(s => s.id === id);
  servers = servers.filter(s => s.id !== id);

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "itoperator",
      role: sessionStorage.getItem("role") || "IT Operator",
      action: "Decommission Server",
      target: target ? target.name : String(id),
      ip: target ? target.ip : "—",
      result: "Success",
      details: target ? `Decommissioned ${target.name} (${target.os})` : "Removed host"
    });
  }

  if (typeof syncServersWithSupabase === "function") {
    syncServersWithSupabase(servers);
  }
}

// ── Server Settings Modal ──────────────────────────────────────────────────
function renderEditServerModal(server, onClose) {
  const overlay = el("div", { class: "modal-overlay" });
  
  const modal = el("div", { class: "modal spotlight-card", style: "max-width:560px;" }, [
    el("div", { class: "modal-header" }, [
      el("h3", { style: "display:flex;align-items:center;gap:8px;" }, [
        el("span", {}, "⚙️"),
        el("span", {}, `Configure Host: ${server.name}`)
      ]),
      button("×", { small: true, onClick: () => overlay.remove() })
    ]),
    el("div", { class: "modal-body" }, [
      el("div", { class: "form-group" }, [
        el("label", { class: "form-label" }, "Server Hostname"),
        el("input", { class: "form-input", id: "edit-server-name", value: server.name })
      ]),
      el("div", { class: "grid", style: "grid-template-columns:1fr 1fr;gap:12px;" }, [
        el("div", { class: "form-group" }, [
          el("label", { class: "form-label" }, "IP Address"),
          el("input", { class: "form-input mono", id: "edit-server-ip", value: server.ip })
        ]),
        el("div", { class: "form-group" }, [
          el("label", { class: "form-label" }, "Rack Location"),
          el("input", { class: "form-input", id: "edit-server-rack", value: server.rack || "Rack-A01" })
        ])
      ]),
      el("div", { class: "grid", style: "grid-template-columns:1fr 1fr;gap:12px;" }, [
        el("div", { class: "form-group" }, [
          el("label", { class: "form-label" }, "Operating System"),
          el("input", { class: "form-input", id: "edit-server-os", value: server.os })
        ]),
        el("div", { class: "form-group" }, [
          el("label", { class: "form-label" }, "Operational State"),
          el("select", { class: "form-input", id: "edit-server-status" }, [
            el("option", { value: "Online", selected: server.status === "Online" }, "Online (Active)"),
            el("option", { value: "Offline", selected: server.status === "Offline" }, "Offline (Powered Down)"),
            el("option", { value: "Maintenance", selected: server.status === "Maintenance" }, "Maintenance Mode")
          ])
        ])
      ]),
      el("div", { class: "grid", style: "grid-template-columns:1fr 1fr;gap:12px;" }, [
        el("div", { class: "form-group" }, [
          el("label", { class: "form-label" }, "CPU Cores / vCPU"),
          el("input", { class: "form-input", id: "edit-server-maxcpu", value: server.maxCpu || "32 Cores" })
        ]),
        el("div", { class: "form-group" }, [
          el("label", { class: "form-label" }, "Max RAM Capacity"),
          el("input", { class: "form-input", id: "edit-server-maxram", value: server.maxRam || "128 GB" })
        ])
      ]),
      el("div", {
        style: "background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.25);border-radius:var(--radius-input);padding:10px 14px;font-size:0.75rem;color:var(--text-secondary);"
      }, "🛡️ Authorized: IT Operator & System Admin can modify live cluster attributes. Changes apply immediately and are logged in the audit trail.")
    ]),
    el("div", { class: "modal-footer", style: "display:flex;justify-content:flex-end;gap:10px;" }, [
      button("Cancel", { small: true, onClick: () => overlay.remove() }),
      button("💾 Save Server Settings", {
        variant: "primary",
        small: true,
        onClick: () => {
          const name = document.getElementById("edit-server-name").value.trim();
          const ip = document.getElementById("edit-server-ip").value.trim();
          const rack = document.getElementById("edit-server-rack").value.trim();
          const os = document.getElementById("edit-server-os").value.trim();
          const status = document.getElementById("edit-server-status").value;
          const maxCpu = document.getElementById("edit-server-maxcpu").value.trim();
          const maxRam = document.getElementById("edit-server-maxram").value.trim();

          if (!name || !ip) {
            toast("Host Name and IP are required.", "danger");
            return;
          }

          updateServer(server.id, { name, ip, rack, os, status, maxCpu, maxRam });
          toast(`Updated settings for ${name}`, "success");
          overlay.remove();
          if (onClose) onClose();
        }
      })
    ])
  ]);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// ── Multi-Field Server Search Algorithm ────────────────────────────────────
function filterAndSearchServers() {
  const query = (serverSearchState.query || "").trim().toLowerCase();
  const filter = serverSearchState.activeFilter;
  const rack = serverSearchState.rackFilter;
  const os = serverSearchState.osFilter;
  const terms = query.split(/\s+/).filter(Boolean);

  let result = servers.filter(srv => {
    // 1. Filter pills
    if (filter === "online" && srv.status !== "Online") return false;
    if (filter === "offline" && srv.status !== "Offline") return false;
    if (filter === "vm" && !srv.isVM) return false;
    if (filter === "baremetal" && srv.isVM) return false;
    if (filter === "highload" && (srv.cpu < 70 && srv.ram < 70)) return false;
    if (filter === "critical" && (srv.cpu < 88 && srv.ram < 88)) return false;

    // 2. Dropdowns
    if (rack !== "all" && srv.rack !== rack) return false;
    if (os !== "all" && !srv.os.toLowerCase().includes(os.toLowerCase())) return false;

    // 3. Multi-word search query
    if (terms.length > 0) {
      const searchTarget = [
        srv.name,
        srv.ip,
        srv.os,
        srv.rack || "",
        srv.status,
        srv.maxCpu || "",
        srv.maxRam || "",
        srv.isVM ? "vm virtual node demo" : "bare metal cluster hardware",
        srv.cpu >= 88 ? "critical" : srv.cpu >= 70 ? "highload" : "healthy",
        srv.hasManualLoad ? "load active spike" : ""
      ].join(" ").toLowerCase();

      return terms.every(term => searchTarget.includes(term));
    }

    return true;
  });

  // Sorting
  if (serverSearchState.sortBy === "cpu-desc") {
    result.sort((a, b) => (b.cpu || 0) - (a.cpu || 0));
  } else if (serverSearchState.sortBy === "ram-desc") {
    result.sort((a, b) => (b.ram || 0) - (a.ram || 0));
  } else if (serverSearchState.sortBy === "name-asc") {
    result.sort((a, b) => a.name.localeCompare(b.name));
  } else if (serverSearchState.sortBy === "status") {
    result.sort((a, b) => a.status.localeCompare(b.status));
  }

  return result;
}

// ── Render Servers Table & Management Subsystem ────────────────────────────
function renderServers(app) {
  app.innerHTML = "";
  const isAuthorized = canManageServers();
  const onlineCount = servers.filter(s => s.status === "Online").length;
  const vmCount = servers.filter(s => s.isVM).length;
  const highLoadCount = servers.filter(s => (s.cpu || 0) >= 70).length;

  const addBtn = isAuthorized ? button("➕ Provision Server", {
    variant: "primary",
    small: true,
    onClick: () => {
      renderEditServerModal({ name: "Server-" + (servers.length + 1).toString().padStart(2, "0"), ip: "192.168.1." + (50 + servers.length), os: "Linux Ubuntu 22.04", rack: "Rack-A01", status: "Online", maxCpu: "32 Cores", maxRam: "128 GB" }, () => renderServers(app));
    }
  }) : null;

  app.appendChild(sectionHeader("Server Infrastructure & Settings", `${onlineCount} of ${servers.length} online · ${vmCount} VM Demo Servers connected`, addBtn));

  // Role Permissions & VM Demo Banner (React Bits Spotlight Card)
  const banner = el("div", {
    class: "card spotlight-card",
    style: "background:linear-gradient(135deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.9) 100%);border:1px solid rgba(56,189,248,0.3);margin-bottom:var(--space-4);padding:14px 18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-radius:var(--radius-card);"
  }, [
    el("div", { style: "display:flex;align-items:center;gap:12px;" }, [
      el("div", { style: "font-size:1.8rem;line-height:1;" }, "🖥️"),
      el("div", {}, [
        el("div", { style: "font-size:0.92rem;font-weight:700;color:var(--text-primary);letter-spacing:-0.01em;" }, "Real VM Controller & Infrastructure Management"),
        el("div", { style: "font-size:0.78rem;color:var(--text-secondary);margin-top:2px;" }, "Execute live workload simulations on VM machines, modify cluster hardware attributes, and reboot nodes.")
      ])
    ]),
    el("div", { style: "display:flex;gap:8px;flex-wrap:wrap;" }, [
      button("⚡ Inject Load on VM Server 1 (+50%)", {
        variant: "primary",
        small: true,
        onClick: () => {
          injectServerLoad(101, 94, 88);
          renderServers(app);
        }
      }),
      button("🛡️ Normalize VM Server 1", {
        small: true,
        onClick: () => {
          normalizeServerLoad(101);
          renderServers(app);
        }
      })
    ])
  ]);
  app.appendChild(banner);

  // ── 🔍 REACT BITS STYLE SERVER SEARCH ENGINE CARD ────────────────────────
  const searchEngineCard = el("div", {
    class: "card spotlight-card server-search-card",
    style: "margin-bottom:var(--space-4);padding:var(--space-4);background:rgba(20,27,45,0.75);backdrop-filter:blur(16px);border:1px solid var(--border);"
  });

  // Top Search Input & Controls
  const searchInputWrapper = el("div", {
    style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px;"
  });

  const searchBox = el("div", {
    style: "flex:2;min-width:280px;position:relative;display:flex;align-items:center;"
  });

  const searchIcon = el("span", {
    style: "position:absolute;left:12px;font-size:0.95rem;color:var(--text-muted);pointer-events:none;"
  }, "🔍");

  const searchInput = el("input", {
    type: "text",
    value: serverSearchState.query,
    placeholder: "Search servers by name, IP, OS, rack (e.g. 'Ubuntu', '192.168.56', 'Node1')...",
    style: "width:100%;padding:0.65rem 2.2rem 0.65rem 2.4rem;background:var(--background);border:1px solid var(--border);border-radius:var(--radius-input);color:var(--text-primary);font-size:0.9rem;outline:none;transition:border-color 0.2s, box-shadow 0.2s;"
  });

  const clearSearchBtn = el("button", {
    type: "button",
    style: `position:absolute;right:10px;background:transparent;border:none;color:var(--text-muted);font-size:0.9rem;cursor:pointer;display:${serverSearchState.query ? "block" : "none"};`,
    title: "Clear search query",
    onclick: () => {
      searchInput.value = "";
      serverSearchState.query = "";
      clearSearchBtn.style.display = "none";
      updateSearchResults();
    }
  }, "✕");

  searchBox.appendChild(searchIcon);
  searchBox.appendChild(searchInput);
  searchBox.appendChild(clearSearchBtn);

  // Rack Filter Dropdown
  const allRacks = Array.from(new Set(servers.map(s => s.rack).filter(Boolean)));
  const rackSelect = el("select", {
    style: "flex:1;min-width:140px;background:var(--background);border:1px solid var(--border);color:var(--text-primary);padding:0.65rem 0.75rem;border-radius:var(--radius-input);font-size:0.85rem;"
  }, [
    el("option", { value: "all", selected: serverSearchState.rackFilter === "all" }, "🏢 All Racks & Clusters"),
    ...allRacks.map(r => el("option", { value: r, selected: serverSearchState.rackFilter === r }, r))
  ]);

  // Sort By Dropdown
  const sortSelect = el("select", {
    style: "flex:1;min-width:140px;background:var(--background);border:1px solid var(--border);color:var(--text-primary);padding:0.65rem 0.75rem;border-radius:var(--radius-input);font-size:0.85rem;"
  }, [
    el("option", { value: "default", selected: serverSearchState.sortBy === "default" }, "↕️ Sort: Default"),
    el("option", { value: "cpu-desc", selected: serverSearchState.sortBy === "cpu-desc" }, "🔥 CPU Load (Highest)"),
    el("option", { value: "ram-desc", selected: serverSearchState.sortBy === "ram-desc" }, "📊 RAM Usage (Highest)"),
    el("option", { value: "name-asc", selected: serverSearchState.sortBy === "name-asc" }, "🔤 Hostname (A-Z)"),
    el("option", { value: "status", selected: serverSearchState.sortBy === "status" }, "⚡ Status (Active First)")
  ]);

  searchInputWrapper.appendChild(searchBox);
  searchInputWrapper.appendChild(rackSelect);
  searchInputWrapper.appendChild(sortSelect);
  searchEngineCard.appendChild(searchInputWrapper);

  // Quick Filter Badges / Chips
  const filterChipsContainer = el("div", {
    style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;"
  });

  const filterChipsData = [
    { id: "all", label: `All Servers (${servers.length})`, icon: "🌐" },
    { id: "online", label: `Online (${onlineCount})`, icon: "🟢" },
    { id: "offline", label: `Offline (${servers.length - onlineCount})`, icon: "🔴" },
    { id: "vm", label: `VM Nodes (${vmCount})`, icon: "📦" },
    { id: "baremetal", label: `Bare Metal (${servers.length - vmCount})`, icon: "🖥️" },
    { id: "highload", label: `High CPU (>70%)`, icon: "⚡" },
    { id: "critical", label: `Critical (>88%)`, icon: "🚨" }
  ];

  const chipElements = [];
  filterChipsData.forEach(chip => {
    const isActive = serverSearchState.activeFilter === chip.id;
    const chipBtn = el("button", {
      type: "button",
      class: `search-chip ${isActive ? "active" : ""}`,
      style: `
        padding: 5px 12px;
        font-size: 0.75rem;
        font-weight: 600;
        border-radius: var(--radius-badge);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: all var(--transition-fast);
        background: ${isActive ? "hsl(210 70% 45% / 0.25)" : "var(--background)"};
        border: 1px solid ${isActive ? "var(--primary-light)" : "var(--border)"};
        color: ${isActive ? "var(--primary-light)" : "var(--text-secondary)"};
      `,
      onclick: () => {
        serverSearchState.activeFilter = chip.id;
        chipElements.forEach(c => {
          c.node.style.background = c.id === chip.id ? "hsl(210 70% 45% / 0.25)" : "var(--background)";
          c.node.style.borderColor = c.id === chip.id ? "var(--primary-light)" : "var(--border)";
          c.node.style.color = c.id === chip.id ? "var(--primary-light)" : "var(--text-secondary)";
        });
        updateSearchResults();
      }
    }, [
      el("span", {}, chip.icon),
      el("span", {}, chip.label)
    ]);
    chipElements.push({ id: chip.id, node: chipBtn });
    filterChipsContainer.appendChild(chipBtn);
  });

  searchEngineCard.appendChild(filterChipsContainer);

  // Search Results Summary Banner
  const resultsSummary = el("div", {
    style: "display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--text-muted);padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);margin-top:8px;"
  });
  const summaryText = el("span", {}, "");
  const resetFiltersBtn = el("button", {
    style: "background:transparent;border:none;color:var(--primary-light);font-size:0.75rem;cursor:pointer;padding:0;text-decoration:underline;",
    onclick: () => {
      serverSearchState.query = "";
      serverSearchState.activeFilter = "all";
      serverSearchState.rackFilter = "all";
      serverSearchState.sortBy = "default";
      searchInput.value = "";
      rackSelect.value = "all";
      sortSelect.value = "default";
      clearSearchBtn.style.display = "none";
      chipElements.forEach(c => {
        c.node.style.background = c.id === "all" ? "hsl(210 70% 45% / 0.25)" : "var(--background)";
        c.node.style.borderColor = c.id === "all" ? "var(--primary-light)" : "var(--border)";
        c.node.style.color = c.id === "all" ? "var(--primary-light)" : "var(--text-secondary)";
      });
      updateSearchResults();
    }
  }, "Reset Search & Filters");

  resultsSummary.appendChild(summaryText);
  resultsSummary.appendChild(resetFiltersBtn);
  searchEngineCard.appendChild(resultsSummary);

  app.appendChild(searchEngineCard);

  // Table Container
  const tableContainer = el("div", { id: "serversTableContainer" });
  app.appendChild(tableContainer);

  // Table Column Definitions
  const columns = [
    { 
      key: "name", 
      label: "Host Name", 
      render: r => el("div", {}, [
        el("div", { style: "font-weight:600;display:flex;align-items:center;gap:6px;" }, [
          el("span", { style: "font-family:var(--font-mono);font-size:0.92rem;" }, r.name),
          r.isVM ? el("span", { class: "badge badge-info", style: "font-size:0.62rem;font-weight:700;" }, "VM NODE") : null,
          r.hasManualLoad ? el("span", { class: "badge badge-danger", style: "font-size:0.62rem;font-weight:700;animation:pulse 1.2s infinite;" }, "LOAD ACTIVE") : null
        ]),
        el("div", { style: "font-size:0.72rem;color:var(--text-muted);margin-top:2px;" }, `${r.rack || "—"} · ${r.maxCpu || "—"} / ${r.maxRam || "—"}`)
      ])
    },
    { key: "ip", label: "IP Address", mono: true },
    { key: "os", label: "OS Platform", render: r => el("span", { style: "font-size:0.8rem;color:var(--text-secondary);" }, r.os) },
    { 
      key: "status", 
      label: "Status", 
      render: r => r.status === "Rebooting" 
        ? el("span", { class: "badge badge-warning", style: "animation:pulse 1s infinite;" }, "🔄 Rebooting...") 
        : statusBadge(r.status) 
    },
    { 
      key: "cpu", 
      label: "CPU Core Load", 
      render: r => el("div", { style: "min-width:110px;" }, [
        el("div", { style: "display:flex;justify-content:space-between;font-size:0.72rem;margin-bottom:3px;" }, [
          el("span", { class: "mono", style: "font-weight:600;" }, `${r.cpu || 0}%`),
          el("span", { style: `color:${r.cpu >= 88 ? '#ef4444' : r.cpu >= 70 ? '#f59e0b' : '#10b981'};font-weight:600;font-size:0.68rem;` }, r.cpu >= 88 ? 'CRITICAL' : r.cpu >= 70 ? 'HIGH' : 'HEALTHY')
        ]),
        el("div", { style: "height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;" }, [
          el("div", { style: `width:${r.cpu || 0}%;height:100%;background:${r.cpu >= 88 ? '#ef4444' : r.cpu >= 70 ? '#f59e0b' : '#38bdf8'};transition:width 0.4s;` })
        ])
      ])
    },
    { 
      key: "ram", 
      label: "RAM Usage", 
      render: r => el("div", { style: "min-width:110px;" }, [
        el("div", { style: "display:flex;justify-content:space-between;font-size:0.72rem;margin-bottom:3px;" }, [
          el("span", { class: "mono", style: "font-weight:600;" }, `${r.ram || 0}%`),
          el("span", { style: "color:var(--text-muted);font-size:0.68rem;" }, r.maxRam || "")
        ]),
        el("div", { style: "height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;" }, [
          el("div", { style: `width:${r.ram || 0}%;height:100%;background:#c084fc;transition:width 0.4s;` })
        ])
      ])
    }
  ];

  function updateSearchResults() {
    tableContainer.innerHTML = "";
    const filteredServers = filterAndSearchServers();

    // Update summary text
    const activeFiltersStr = [];
    if (serverSearchState.query) activeFiltersStr.push(`query "${serverSearchState.query}"`);
    if (serverSearchState.activeFilter !== "all") activeFiltersStr.push(`filter "${serverSearchState.activeFilter}"`);
    if (serverSearchState.rackFilter !== "all") activeFiltersStr.push(`rack "${serverSearchState.rackFilter}"`);

    const filterDescriptor = activeFiltersStr.length > 0 ? ` (Filtered by ${activeFiltersStr.join(", ")})` : "";
    summaryText.textContent = `Displaying ${filteredServers.length} of ${servers.length} servers${filterDescriptor}`;

    if (filteredServers.length === 0) {
      // Empty Search State
      const emptyCard = el("div", {
        class: "card spotlight-card",
        style: "text-align:center;padding:48px 24px;margin-top:var(--space-3);"
      }, [
        el("div", { style: "font-size:2.5rem;margin-bottom:12px;" }, "🔍"),
        el("h3", { style: "margin:0 0 8px;font-size:1.1rem;color:var(--text-primary);" }, "No matching servers found"),
        el("p", { style: "font-size:0.85rem;color:var(--text-secondary);margin:0 0 16px;max-width:400px;margin-left:auto;margin-right:auto;" }, 
          "We couldn't find any server nodes matching your search query or filter parameters. Try checking for typos or resetting your filters."
        ),
        button("🔄 Reset Search Filters", {
          variant: "primary",
          small: true,
          onClick: () => {
            resetFiltersBtn.click();
          }
        })
      ]);
      tableContainer.appendChild(emptyCard);
      return;
    }

    tableContainer.appendChild(dataTable(columns, filteredServers, row => [
      // Live Load Injection & Normalization for SIH demonstration
      row.hasManualLoad ? button("🛡️ Normalize", {
        small: true,
        onClick: () => { normalizeServerLoad(row.id); renderServers(app); }
      }) : button("⚡ Load Spike", {
        small: true,
        onClick: () => { injectServerLoad(row.id, 94, 88); renderServers(app); }
      }),

      // Server Settings configuration
      isAuthorized ? button("⚙️ Settings", {
        small: true,
        onClick: () => renderEditServerModal(row, () => renderServers(app))
      }) : null,

      // Power Actions
      isAuthorized ? (row.status === "Online" ? button("🔄 Reboot", {
        small: true,
        onClick: () => restartServer(row.id)
      }) : button("▶️ Start", {
        small: true,
        onClick: () => changeServerStatus(row.id, "Online")
      })) : null,

      isAuthorized ? (row.status === "Online" ? button("⏹️ Stop", {
        variant: "danger",
        small: true,
        onClick: () => changeServerStatus(row.id, "Offline")
      }) : null) : null,

      isAuthorized ? button("🗑️", {
        variant: "danger",
        small: true,
        onClick: () => {
          if (confirm(`Are you sure you want to decommission ${row.name}?`)) {
            deleteServer(row.id);
            toast(`Decommissioned ${row.name}`, "warning");
            renderServers(app);
          }
        }
      }) : null
    ].filter(Boolean)));
  }

  // Event Listeners for Search Input & Dropdowns
  searchInput.addEventListener("input", (e) => {
    serverSearchState.query = e.target.value;
    clearSearchBtn.style.display = e.target.value ? "block" : "none";
    updateSearchResults();
  });

  rackSelect.addEventListener("change", (e) => {
    serverSearchState.rackFilter = e.target.value;
    updateSearchResults();
  });

  sortSelect.addEventListener("change", (e) => {
    serverSearchState.sortBy = e.target.value;
    updateSearchResults();
  });

  // Initial draw
  updateSearchResults();
}
