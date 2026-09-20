// ---------------------------------------------------------------------------
// AICTE DCIM Load Balancer & Application Delivery Controller (ADC) Subsystem
// Features: Dynamic Algorithms, Backend Pool Controls, Health Checks & Failover
// ---------------------------------------------------------------------------

let loadBalancers = [
  {
    id: "lb-01",
    name: "LB-01",
    label: "Web Tier Ingress Cluster",
    vip: "192.168.10.100",
    port: 443,
    vendor: "HAProxy Enterprise (L7)",
    status: "Healthy", // "Healthy" | "Degraded" | "Critical"
    algorithm: "Least Connections", // "Round Robin" | "Least Connections" | "IP Hash" | "Weighted"
    activeConnections: 1284,
    trafficMbps: 842,
    healthCheck: {
      status: "Passed",
      protocol: "HTTP GET /healthz",
      intervalSec: 5,
      timeoutMs: 800,
      lastLatencyMs: 1.2
    },
    failover: {
      mode: "Active-Standby",
      role: "Primary (Node-A)",
      peerIp: "192.168.10.101",
      syncStatus: "Synchronized",
      lastHeartbeat: "0.2s ago"
    },
    scaling: {
      minNodes: 2,
      maxNodes: 8,
      cpuThreshold: 80,
      autoScaleEnabled: true
    },
    backendServers: [
      { id: 1, name: "Server-01", ip: "192.168.1.10", port: 8080, weight: 10, enabled: true, status: "Healthy", activeConns: 410, trafficShare: 32 },
      { id: 2, name: "Server-02", ip: "192.168.1.11", port: 8080, weight: 10, enabled: true, status: "Healthy", activeConns: 450, trafficShare: 35 },
      { id: 3, name: "Server-03", ip: "192.168.1.12", port: 8080, weight: 10, enabled: true, status: "Warning", activeConns: 424, trafficShare: 33 }
    ]
  },
  {
    id: "lb-02",
    name: "LB-02",
    label: "API Gateway & Microservices",
    vip: "192.168.20.100",
    port: 8443,
    vendor: "NGINX Plus ADC",
    status: "Healthy",
    algorithm: "Round Robin",
    activeConnections: 3410,
    trafficMbps: 1450,
    healthCheck: {
      status: "Passed",
      protocol: "TCP SYN / 8443",
      intervalSec: 3,
      timeoutMs: 500,
      lastLatencyMs: 0.8
    },
    failover: {
      mode: "Active-Active",
      role: "Node-1 (Active)",
      peerIp: "192.168.20.101",
      syncStatus: "Synchronized",
      lastHeartbeat: "0.1s ago"
    },
    scaling: {
      minNodes: 2,
      maxNodes: 12,
      cpuThreshold: 75,
      autoScaleEnabled: true
    },
    backendServers: [
      { id: 4, name: "Server-04", ip: "192.168.1.13", port: 8443, weight: 15, enabled: true, status: "Healthy", activeConns: 1705, trafficShare: 50 },
      { id: 101, name: "VM-Server-01", ip: "192.168.56.101", port: 8443, weight: 15, enabled: true, status: "Healthy", activeConns: 1705, trafficShare: 50 }
    ]
  },
  {
    id: "lb-03",
    name: "LB-03",
    label: "AI Inference & Compute Cluster",
    vip: "192.168.30.100",
    port: 9000,
    vendor: "F5 BIG-IP Virtual",
    status: "Degraded",
    algorithm: "IP Hash",
    activeConnections: 820,
    trafficMbps: 560,
    healthCheck: {
      status: "Warning (High Latency)",
      protocol: "HTTP POST /v1/ping",
      intervalSec: 10,
      timeoutMs: 2000,
      lastLatencyMs: 48.5
    },
    failover: {
      mode: "Active-Standby",
      role: "Standby (Ready)",
      peerIp: "192.168.30.101",
      syncStatus: "Synchronized",
      lastHeartbeat: "0.4s ago"
    },
    scaling: {
      minNodes: 1,
      maxNodes: 6,
      cpuThreshold: 85,
      autoScaleEnabled: false
    },
    backendServers: [
      { id: 102, name: "VM-Server-02", ip: "192.168.56.102", port: 9000, weight: 10, enabled: true, status: "Healthy", activeConns: 426, trafficShare: 52 },
      { id: 103, name: "VM-Server-03", ip: "192.168.56.103", port: 9000, weight: 10, enabled: true, status: "Warning", activeConns: 394, trafficShare: 48 }
    ]
  }
];

function listLoadBalancers() {
  return loadBalancers;
}

function canManageLoadBalancers() {
  const role = sessionStorage.getItem("role");
  return role === "Super Admin" || role === "Admin" || role === "Network Engineer" || role === "IT Operator";
}

/**
 * Recalculates traffic share percentages across enabled backend servers
 */
function recalculateTrafficShares(lb) {
  const enabledServers = lb.backendServers.filter(s => s.enabled);
  if (enabledServers.length === 0) {
    lb.backendServers.forEach(s => s.trafficShare = 0);
    return;
  }

  if (lb.algorithm === "Weighted") {
    const totalWeight = enabledServers.reduce((acc, s) => acc + (s.weight || 1), 0) || 1;
    lb.backendServers.forEach(s => {
      s.trafficShare = s.enabled ? Math.round(((s.weight || 1) / totalWeight) * 100) : 0;
    });
  } else if (lb.algorithm === "Least Connections") {
    // Inverse proportion of active connections or baseline distribution
    const totalConns = enabledServers.reduce((acc, s) => acc + (s.activeConns || 1), 0) || 1;
    let distributed = 0;
    enabledServers.forEach((s, idx) => {
      if (idx === enabledServers.length - 1) {
        s.trafficShare = Math.max(0, 100 - distributed);
      } else {
        const share = Math.round(((s.activeConns || 1) / totalConns) * 100);
        s.trafficShare = share;
        distributed += share;
      }
    });
    lb.backendServers.filter(s => !s.enabled).forEach(s => s.trafficShare = 0);
  } else {
    // Equal distribution for Round Robin & IP Hash baseline
    const baseShare = Math.floor(100 / enabledServers.length);
    const remainder = 100 - (baseShare * enabledServers.length);
    enabledServers.forEach((s, idx) => {
      s.trafficShare = baseShare + (idx === 0 ? remainder : 0);
    });
    lb.backendServers.filter(s => !s.enabled).forEach(s => s.trafficShare = 0);
  }
}

/**
 * Changes Load Balancing Algorithm live
 */
function setLoadBalancerAlgorithm(lbId, newAlgorithm) {
  if (!canManageLoadBalancers()) {
    toast("Permission Denied: Only Network Engineers and Administrators can modify Load Balancer policies.", "danger");
    return;
  }

  const lb = loadBalancers.find(l => l.id === lbId);
  if (!lb) return;

  const oldAlgo = lb.algorithm;
  lb.algorithm = newAlgorithm;
  recalculateTrafficShares(lb);

  toast(`⚖️ ${lb.name} algorithm switched to [${newAlgorithm}]`, "success");

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "admin",
      role: sessionStorage.getItem("role") || "Network Engineer",
      action: "Change LB Algorithm",
      target: lb.name,
      ip: lb.vip,
      result: "Success",
      details: `Switched load balancing algorithm from ${oldAlgo} to ${newAlgorithm} on VIP ${lb.vip}`
    });
  }

  const app = document.getElementById("app");
  if (app && currentSection === "loadbalancers") {
    renderLoadBalancers(app);
  }
}

/**
 * Toggles a backend server between Enabled and Disabled (draining)
 */
function toggleBackendServer(lbId, serverId) {
  if (!canManageLoadBalancers()) {
    toast("Permission Denied: Insufficient privileges.", "danger");
    return;
  }

  const lb = loadBalancers.find(l => l.id === lbId);
  if (!lb) return;

  const backend = lb.backendServers.find(s => s.id === serverId);
  if (!backend) return;

  backend.enabled = !backend.enabled;
  if (!backend.enabled) {
    backend.activeConns = 0;
  } else {
    backend.activeConns = Math.round(lb.activeConnections / (lb.backendServers.filter(s => s.enabled).length || 1));
  }

  recalculateTrafficShares(lb);
  toast(`Backend server ${backend.name} is now ${backend.enabled ? "ACTIVE (Serving traffic)" : "DRAINED (Disabled)"}`, backend.enabled ? "success" : "warning");

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "admin",
      role: sessionStorage.getItem("role") || "Network Engineer",
      action: backend.enabled ? "Enable LB Backend" : "Drain LB Backend",
      target: `${lb.name} -> ${backend.name}`,
      ip: backend.ip,
      result: "Success",
      details: `${backend.enabled ? "Enabled" : "Disabled & drained"} backend node ${backend.name} (${backend.ip}:${backend.port}) in pool ${lb.name}`
    });
  }

  const app = document.getElementById("app");
  if (app && currentSection === "loadbalancers") {
    renderLoadBalancers(app);
  }
}

/**
 * Removes a backend server from the pool
 */
function removeBackendServer(lbId, serverId) {
  if (!canManageLoadBalancers()) {
    toast("Permission Denied: Insufficient privileges.", "danger");
    return;
  }

  const lb = loadBalancers.find(l => l.id === lbId);
  if (!lb) return;

  const target = lb.backendServers.find(s => s.id === serverId);
  if (!target) return;

  if (lb.backendServers.length <= 1) {
    toast("Cannot remove server: A load balancer pool requires at least 1 backend server.", "danger");
    return;
  }

  if (confirm(`Remove backend server ${target.name} (${target.ip}) from ${lb.name} pool?`)) {
    lb.backendServers = lb.backendServers.filter(s => s.id !== serverId);
    recalculateTrafficShares(lb);
    toast(`Removed ${target.name} from ${lb.name} pool`, "info");

    if (typeof addLog === "function") {
      addLog({
        timestamp: Date.now(),
        user: sessionStorage.getItem("username") || "admin",
        role: sessionStorage.getItem("role") || "Network Engineer",
        action: "Remove LB Backend",
        target: `${lb.name} -> ${target.name}`,
        ip: target.ip,
        result: "Success",
        details: `Detached backend server ${target.name} from pool ${lb.name}`
      });
    }

    const app = document.getElementById("app");
    if (app && currentSection === "loadbalancers") {
      renderLoadBalancers(app);
    }
  }
}

/**
 * Adds an existing server or custom host to the load balancer pool
 */
function addBackendServerToPool(lbId, serverData) {
  if (!canManageLoadBalancers()) {
    toast("Permission Denied: Insufficient privileges.", "danger");
    return;
  }

  const lb = loadBalancers.find(l => l.id === lbId);
  if (!lb) return;

  const newBackend = {
    id: serverData.id || Date.now(),
    name: serverData.name || `Node-${lb.backendServers.length + 1}`,
    ip: serverData.ip || "192.168.1.50",
    port: Number(serverData.port) || lb.port || 80,
    weight: Number(serverData.weight) || 10,
    enabled: true,
    status: "Healthy",
    activeConns: Math.round(lb.activeConnections / (lb.backendServers.length + 1)),
    trafficShare: 0
  };

  lb.backendServers.push(newBackend);
  recalculateTrafficShares(lb);
  toast(`Added ${newBackend.name} (${newBackend.ip}:${newBackend.port}) to ${lb.name} backend pool`, "success");

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "admin",
      role: sessionStorage.getItem("role") || "Network Engineer",
      action: "Add LB Backend",
      target: `${lb.name} -> ${newBackend.name}`,
      ip: newBackend.ip,
      result: "Success",
      details: `Attached new backend server ${newBackend.name} to ${lb.name} (Port ${newBackend.port}, Weight ${newBackend.weight})`
    });
  }

  const app = document.getElementById("app");
  if (app && currentSection === "loadbalancers") {
    renderLoadBalancers(app);
  }
}

/**
 * Triggers a simulated failover switch (Active <-> Standby)
 */
function triggerFailoverTest(lbId) {
  if (!canManageLoadBalancers()) {
    toast("Permission Denied: Insufficient privileges.", "danger");
    return;
  }

  const lb = loadBalancers.find(l => l.id === lbId);
  if (!lb) return;

  const isPrimary = lb.failover.role.includes("Primary") || lb.failover.role.includes("Active");
  lb.failover.role = isPrimary ? "Standby (Secondary Takeover Complete)" : "Primary (Node-A Active)";
  toast(`⚡ Failover switch triggered on ${lb.name}: VIP routed to ${lb.failover.role}`, "warning");

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "admin",
      role: sessionStorage.getItem("role") || "Network Engineer",
      action: "Trigger LB Failover",
      target: lb.name,
      ip: lb.vip,
      result: "Warning",
      details: `Manual failover drill executed for ${lb.name}. VIP transferred to ${lb.failover.role}.`
    });
  }

  const app = document.getElementById("app");
  if (app && currentSection === "loadbalancers") {
    renderLoadBalancers(app);
  }
}

/**
 * Modal to add a server to LB pool
 */
function renderAddBackendModal(lb, onClose) {
  const overlay = el("div", {
    style: "position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;"
  });

  const availableServers = (typeof listServers === "function" ? listServers() : []).filter(
    s => !lb.backendServers.some(b => b.id === s.id || b.ip === s.ip)
  );

  const serverSelect = el("select", {
    style: "width:100%;padding:10px;border-radius:var(--radius-input);background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);margin-top:6px;"
  });

  if (availableServers.length > 0) {
    availableServers.forEach(s => {
      const opt = el("option", { value: s.id }, `${s.name} (${s.ip}) — ${s.isVM ? 'VM Demo Server' : s.os}`);
      serverSelect.appendChild(opt);
    });
  }
  const customOpt = el("option", { value: "custom" }, "➕ Custom Server Node (Enter IP manually)");
  serverSelect.appendChild(customOpt);

  const nameInput = el("input", { placeholder: "e.g. Server-05 / App-Node-3", style: "margin-top:6px;" });
  const ipInput = el("input", { placeholder: "e.g. 192.168.1.15", style: "margin-top:6px;" });
  const portInput = el("input", { type: "number", value: lb.port || 80, placeholder: "8080", style: "margin-top:6px;" });
  const weightInput = el("input", { type: "number", value: 10, placeholder: "10", style: "margin-top:6px;" });

  const customFieldsWrapper = el("div", { style: "display:none;margin-top:10px;" }, [
    el("label", {}, ["Custom Server Name", nameInput]),
    el("label", {}, ["IP Address", ipInput])
  ]);

  serverSelect.addEventListener("change", () => {
    if (serverSelect.value === "custom") {
      customFieldsWrapper.style.display = "block";
    } else {
      customFieldsWrapper.style.display = "none";
    }
  });

  const modalBox = el("div", {
    class: "card",
    style: "max-width:520px;width:100%;background:var(--bg-card);border:1px solid var(--border);padding:24px;border-radius:var(--radius-card);box-shadow:0 20px 40px rgba(0,0,0,0.6);"
  }, [
    el("div", { style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;" }, [
      el("h3", { style: "margin:0;font-size:1.15rem;display:flex;align-items:center;gap:8px;" }, [
        el("span", {}, "➕"),
        el("span", {}, `Add Backend Server to ${lb.name}`)
      ]),
      button("✕", { small: true, onClick: () => { document.body.removeChild(overlay); if (onClose) onClose(); } })
    ]),
    el("div", { style: "display:flex;flex-direction:column;gap:12px;" }, [
      el("label", {}, ["Select Target Server Node", serverSelect]),
      customFieldsWrapper,
      el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:10px;" }, [
        el("label", {}, ["Port", portInput]),
        el("label", {}, ["Weight", weightInput])
      ])
    ]),
    el("div", { style: "display:flex;justify-content:flex-end;gap:10px;margin-top:20px;" }, [
      button("Cancel", { small: true, onClick: () => { document.body.removeChild(overlay); if (onClose) onClose(); } }),
      button("Attach to Pool", {
        variant: "primary",
        small: true,
        onClick: () => {
          if (serverSelect.value === "custom") {
            if (!nameInput.value || !ipInput.value) {
              return toast("Please enter both server name and IP address.", "danger");
            }
            addBackendServerToPool(lb.id, {
              name: nameInput.value,
              ip: ipInput.value,
              port: Number(portInput.value) || 80,
              weight: Number(weightInput.value) || 10
            });
          } else {
            const selected = availableServers.find(s => String(s.id) === String(serverSelect.value));
            if (!selected) return toast("Please select a valid server.", "danger");
            addBackendServerToPool(lb.id, {
              id: selected.id,
              name: selected.name,
              ip: selected.ip,
              port: Number(portInput.value) || 80,
              weight: Number(weightInput.value) || 10
            });
          }
          document.body.removeChild(overlay);
        }
      })
    ])
  ]);

  overlay.appendChild(modalBox);
  document.body.appendChild(overlay);
}

/**
 * Modal to create a new Load Balancer
 */
function renderCreateLoadBalancerModal(onClose) {
  const overlay = el("div", {
    style: "position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;"
  });

  const nameInput = el("input", { placeholder: `LB-0${loadBalancers.length + 1}`, value: `LB-0${loadBalancers.length + 1}`, style: "margin-top:6px;" });
  const labelInput = el("input", { placeholder: "e.g. Database Read Replicas / Edge Proxy", style: "margin-top:6px;" });
  const vipInput = el("input", { placeholder: "192.168.40.100", value: `192.168.${40 + loadBalancers.length}.100`, style: "margin-top:6px;" });
  const portInput = el("input", { type: "number", value: 443, style: "margin-top:6px;" });

  const vendorSelect = el("select", { style: "width:100%;padding:10px;border-radius:var(--radius-input);background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);margin-top:6px;" });
  ["HAProxy Enterprise (L7)", "NGINX Plus ADC", "F5 BIG-IP Virtual", "Envoy Gateway / Service Mesh", "AWS Application Load Balancer"].forEach(v => {
    vendorSelect.appendChild(el("option", { value: v }, v));
  });

  const algoSelect = el("select", { style: "width:100%;padding:10px;border-radius:var(--radius-input);background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);margin-top:6px;" });
  ["Least Connections", "Round Robin", "IP Hash", "Weighted"].forEach(a => {
    algoSelect.appendChild(el("option", { value: a }, a));
  });

  const modalBox = el("div", {
    class: "card",
    style: "max-width:540px;width:100%;background:var(--bg-card);border:1px solid var(--border);padding:24px;border-radius:var(--radius-card);box-shadow:0 20px 40px rgba(0,0,0,0.6);"
  }, [
    el("div", { style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;" }, [
      el("h3", { style: "margin:0;font-size:1.15rem;display:flex;align-items:center;gap:8px;" }, [
        el("span", {}, "⚖️"),
        el("span", {}, "Provision Load Balancer (ADC)")
      ]),
      button("✕", { small: true, onClick: () => { document.body.removeChild(overlay); if (onClose) onClose(); } })
    ]),
    el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:12px;" }, [
      el("label", {}, ["LB Name", nameInput]),
      el("label", {}, ["Cluster Label", labelInput]),
      el("label", {}, ["Virtual IP (VIP)", vipInput]),
      el("label", {}, ["Port", portInput]),
      el("label", {}, ["Type / Vendor", vendorSelect]),
      el("label", {}, ["Balancing Algorithm", algoSelect])
    ]),
    el("div", { style: "display:flex;justify-content:flex-end;gap:10px;margin-top:24px;" }, [
      button("Cancel", { small: true, onClick: () => { document.body.removeChild(overlay); if (onClose) onClose(); } }),
      button("Deploy Load Balancer", {
        variant: "primary",
        small: true,
        onClick: () => {
          if (!nameInput.value || !vipInput.value) return toast("Name and Virtual IP are required.", "danger");

          const newLb = {
            id: `lb-0${loadBalancers.length + 1}`,
            name: nameInput.value,
            label: labelInput.value || "Application Traffic Pool",
            vip: vipInput.value,
            port: Number(portInput.value) || 443,
            vendor: vendorSelect.value,
            status: "Healthy",
            algorithm: algoSelect.value,
            activeConnections: 0,
            trafficMbps: 0,
            healthCheck: {
              status: "Passed",
              protocol: "HTTP GET /health",
              intervalSec: 5,
              timeoutMs: 1000,
              lastLatencyMs: 1.0
            },
            failover: {
              mode: "Active-Standby",
              role: "Primary (Node-A)",
              peerIp: vipInput.value.replace(/\.\d+$/, ".101"),
              syncStatus: "Synchronized",
              lastHeartbeat: "0.1s ago"
            },
            scaling: {
              minNodes: 2,
              maxNodes: 6,
              cpuThreshold: 80,
              autoScaleEnabled: true
            },
            backendServers: [
              { id: 1, name: "Server-01", ip: "192.168.1.10", port: Number(portInput.value) || 443, weight: 10, enabled: true, status: "Healthy", activeConns: 0, trafficShare: 100 }
            ]
          };

          loadBalancers.push(newLb);
          toast(`Load balancer ${newLb.name} deployed on VIP ${newLb.vip}`, "success");

          if (typeof addLog === "function") {
            addLog({
              timestamp: Date.now(),
              user: sessionStorage.getItem("username") || "admin",
              role: sessionStorage.getItem("role") || "Network Engineer",
              action: "Deploy Load Balancer",
              target: newLb.name,
              ip: newLb.vip,
              result: "Success",
              details: `Provisioned new load balancer ${newLb.name} (${newLb.vendor}) on VIP ${newLb.vip}`
            });
          }

          document.body.removeChild(overlay);
          const app = document.getElementById("app");
          if (app && currentSection === "loadbalancers") renderLoadBalancers(app);
        }
      })
    ])
  ]);

  overlay.appendChild(modalBox);
  document.body.appendChild(overlay);
}

/**
 * Main Render Function for Load Balancers Section
 */
function renderLoadBalancers(app) {
  app.innerHTML = "";
  const isAuthorized = canManageLoadBalancers();

  const totalConns = loadBalancers.reduce((acc, lb) => acc + (lb.activeConnections || 0), 0);
  const totalTraffic = loadBalancers.reduce((acc, lb) => acc + (lb.trafficMbps || 0), 0);
  const totalBackends = loadBalancers.reduce((acc, lb) => acc + lb.backendServers.length, 0);

  const addBtn = isAuthorized ? button("➕ Provision Load Balancer", {
    variant: "primary",
    small: true,
    onClick: () => renderCreateLoadBalancerModal(() => renderLoadBalancers(app))
  }) : null;

  app.appendChild(sectionHeader(
    "Load Balancers & Application Delivery Controllers",
    `${loadBalancers.length} active load balancers · ${totalBackends} backend servers · ${totalConns.toLocaleString()} active connections`,
    addBtn
  ));

  // Top Stat Summary Cards
  const statGrid = el("div", { class: "grid", style: "margin-bottom:var(--space-4);" }, [
    statCard("Active Load Balancers", `${loadBalancers.length} Clusters`, "HAProxy / NGINX / F5", "success"),
    statCard("Total Active Conns", totalConns.toLocaleString(), "live TCP/HTTP sessions", "info"),
    statCard("Aggregated Throughput", `${(totalTraffic / 1000).toFixed(2)} Gbps`, `${totalTraffic} Mbps bandwidth`, "success"),
    statCard("Backend Pool Nodes", `${totalBackends} Nodes`, "distributed across cluster", "neutral")
  ]);
  app.appendChild(statGrid);

  // Role permissions notice
  if (!isAuthorized) {
    app.appendChild(el("div", {
      class: "badge badge-neutral",
      style: "margin-bottom:var(--space-4);padding:8px 12px;display:inline-block;"
    }, "🛡️ Read-Only Mode: Load balancer policy configuration and backend server pool modifications are restricted to Network Engineers and Administrators."));
  }

  // Render Each Load Balancer in Detailed Interactive Card
  const lbContainer = el("div", { style: "display:flex;flex-direction:column;gap:20px;" });

  loadBalancers.forEach(lb => {
    recalculateTrafficShares(lb);

    const isHealthy = lb.status === "Healthy";
    const statusColor = isHealthy ? "#10b981" : lb.status === "Degraded" ? "#f59e0b" : "#ef4444";

    const lbCard = el("div", {
      class: "card",
      style: `background:linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.92) 100%);border:1px solid ${isHealthy ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'};border-radius:var(--radius-card);position:relative;overflow:hidden;`
    });

    // Top Accent line
    lbCard.insertAdjacentHTML("afterbegin", `
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,${statusColor},#38bdf8,#818cf8);"></div>
    `);

    // LB Card Header
    const cardHeader = el("div", {
      style: "display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:14px;margin-bottom:16px;"
    }, [
      el("div", {}, [
        el("div", { style: "display:flex;align-items:center;gap:10px;" }, [
          el("span", { style: "font-size:1.3rem;font-weight:700;letter-spacing:0.02em;" }, lb.name),
          el("span", {
            style: `font-size:0.75rem;font-weight:700;padding:3px 10px;border-radius:20px;background:${statusColor}20;color:${statusColor};border:1px solid ${statusColor}40;`
          }, `● Status: ${lb.status}`),
          el("span", { class: "badge badge-neutral", style: "font-size:0.72rem;" }, lb.vendor)
        ]),
        el("div", { style: "font-size:0.84rem;color:var(--text-secondary);margin-top:4px;" }, [
          el("span", { style: "font-weight:600;color:var(--text-primary);" }, lb.label),
          el("span", { style: "margin:0 8px;opacity:0.4;" }, "•"),
          el("span", { style: "font-family:var(--font-mono);color:#38bdf8;" }, `Virtual IP: ${lb.vip}:${lb.port}`)
        ])
      ]),
      el("div", { style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap;" }, [
        isAuthorized ? button("⚡ Failover Drill", {
          small: true,
          onClick: () => triggerFailoverTest(lb.id)
        }) : null,
        isAuthorized ? button("➕ Add Backend", {
          variant: "primary",
          small: true,
          onClick: () => renderAddBackendModal(lb, () => renderLoadBalancers(app))
        }) : null
      ])
    ]);
    lbCard.appendChild(cardHeader);

    // Live Metrics Strip (Active Conns, Traffic, Health Check, Failover)
    const metricsStrip = el("div", {
      style: "display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin-bottom:16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:var(--radius-card);padding:12px 16px;"
    }, [
      el("div", {}, [
        el("div", { style: "font-size:0.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;" }, "Active Connections"),
        el("div", { style: "font-size:1.25rem;font-weight:700;color:var(--text-primary);margin-top:2px;font-family:var(--font-mono);" }, lb.activeConnections.toLocaleString())
      ]),
      el("div", {}, [
        el("div", { style: "font-size:0.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;" }, "Traffic Throughput"),
        el("div", { style: "font-size:1.25rem;font-weight:700;color:#38bdf8;margin-top:2px;font-family:var(--font-mono);" }, `${lb.trafficMbps} Mbps`)
      ]),
      el("div", {}, [
        el("div", { style: "font-size:0.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;" }, "Health Check Probe"),
        el("div", { style: "font-size:0.88rem;font-weight:600;color:#10b981;margin-top:4px;display:flex;align-items:center;gap:6px;" }, [
          el("span", {}, "✓"),
          el("span", {}, `${lb.healthCheck.status} (${lb.healthCheck.lastLatencyMs}ms)`)
        ])
      ]),
      el("div", {}, [
        el("div", { style: "font-size:0.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em;" }, "HA Failover State"),
        el("div", { style: "font-size:0.85rem;font-weight:600;color:var(--text-primary);margin-top:4px;display:flex;align-items:center;gap:6px;" }, [
          el("span", { style: "color:#818cf8;" }, "🔄"),
          el("span", {}, `${lb.failover.role}`)
        ])
      ])
    ]);
    lbCard.appendChild(metricsStrip);

    // Algorithm Selector Bar
    const algoBar = el("div", {
      style: "display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;background:rgba(15,23,42,0.6);border:1px solid var(--border);border-radius:var(--radius-card);padding:10px 14px;margin-bottom:16px;"
    }, [
      el("div", { style: "display:flex;align-items:center;gap:8px;" }, [
        el("span", { style: "font-size:0.85rem;font-weight:600;color:var(--text-secondary);" }, "Balancing Algorithm:"),
        el("span", { style: "font-weight:700;color:#38bdf8;font-size:0.92rem;" }, lb.algorithm)
      ]),
      isAuthorized ? el("div", { style: "display:flex;align-items:center;gap:6px;flex-wrap:wrap;" }, [
        ...["Round Robin", "Least Connections", "IP Hash", "Weighted"].map(algo => {
          const isActive = lb.algorithm === algo;
          return button(algo, {
            variant: isActive ? "primary" : "neutral",
            small: true,
            onClick: () => setLoadBalancerAlgorithm(lb.id, algo)
          });
        })
      ]) : null
    ]);
    lbCard.appendChild(algoBar);

    // Backend Servers Table
    const tableHeader = el("div", {
      style: "font-size:0.88rem;font-weight:700;letter-spacing:0.03em;color:var(--text-primary);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;"
    }, [
      el("span", {}, `Backend Server Pool (${lb.backendServers.length} Servers)`),
      el("span", { style: "font-size:0.75rem;color:var(--text-muted);" }, "Real-time Traffic Distribution & Node Health")
    ]);
    lbCard.appendChild(tableHeader);

    const tableWrapper = el("div", { class: "table-container", style: "margin-bottom:8px;" });
    const table = el("table", { style: "width:100%;border-collapse:collapse;" });
    
    // Thead
    table.appendChild(el("thead", {}, [
      el("tr", {}, [
        el("th", { style: "text-align:left;padding:10px;" }, "Backend Server"),
        el("th", { style: "text-align:left;padding:10px;" }, "IP Address & Port"),
        el("th", { style: "text-align:left;padding:10px;" }, "Health"),
        el("th", { style: "text-align:left;padding:10px;" }, "Active Conns"),
        el("th", { style: "text-align:left;padding:10px;" }, "Traffic Share %"),
        el("th", { style: "text-align:center;padding:10px;" }, "Pool State"),
        isAuthorized ? el("th", { style: "text-align:right;padding:10px;" }, "Actions") : null
      ])
    ]));

    // Tbody
    const tbody = el("tbody", {});
    lb.backendServers.forEach(server => {
      const isServerHealthy = server.status === "Healthy";
      const sColor = isServerHealthy ? "#10b981" : "#f59e0b";

      const tr = el("tr", { style: `border-bottom:1px solid rgba(255,255,255,0.04);opacity:${server.enabled ? '1' : '0.5'};` }, [
        el("td", { style: "padding:10px;font-weight:600;" }, [
          el("div", { style: "display:flex;align-items:center;gap:8px;" }, [
            el("span", {}, server.enabled ? "🖥️" : "⏸️"),
            el("span", {}, server.name)
          ])
        ]),
        el("td", { style: "padding:10px;font-family:var(--font-mono);font-size:0.82rem;color:var(--text-secondary);" }, `${server.ip}:${server.port}`),
        el("td", { style: "padding:10px;" }, [
          el("span", {
            style: `font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:10px;background:${sColor}20;color:${sColor};border:1px solid ${sColor}40;`
          }, server.status)
        ]),
        el("td", { style: "padding:10px;font-family:var(--font-mono);font-size:0.85rem;" }, (server.activeConns || 0).toLocaleString()),
        el("td", { style: "padding:10px;min-width:140px;" }, [
          el("div", { style: "display:flex;align-items:center;gap:8px;" }, [
            el("div", {
              style: "flex:1;height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;"
            }, [
              el("div", {
                style: `height:100%;width:${server.trafficShare || 0}%;background:linear-gradient(90deg,#38bdf8,#818cf8);border-radius:4px;transition:width 0.3s ease;`
              })
            ]),
            el("span", { style: "font-size:0.78rem;font-weight:700;font-family:var(--font-mono);min-width:32px;text-align:right;" }, `${server.trafficShare || 0}%`)
          ])
        ]),
        el("td", { style: "padding:10px;text-align:center;" }, [
          el("span", {
            style: `font-size:0.72rem;font-weight:700;padding:3px 8px;border-radius:4px;background:${server.enabled ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'};color:${server.enabled ? '#10b981' : '#ef4444'};`
          }, server.enabled ? "ACTIVE" : "DRAINED")
        ]),
        isAuthorized ? el("td", { style: "padding:10px;text-align:right;" }, [
          el("div", { style: "display:flex;align-items:center;justify-content:flex-end;gap:6px;" }, [
            button(server.enabled ? "Drain" : "Enable", {
              variant: server.enabled ? "warning" : "success",
              small: true,
              onClick: () => toggleBackendServer(lb.id, server.id)
            }),
            button("Remove", {
              variant: "danger",
              small: true,
              onClick: () => removeBackendServer(lb.id, server.id)
            })
          ])
        ]) : null
      ]);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    lbCard.appendChild(tableWrapper);

    lbContainer.appendChild(lbCard);
  });

  app.appendChild(lbContainer);
}
