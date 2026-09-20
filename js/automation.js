// ---------------------------------------------------------------------------
// AICTE DCIM Live Telemetry & Monitoring Automation Engine
// Designed for Real-Time SIH Demonstrations & Supabase Cloud Integration
// ---------------------------------------------------------------------------

let AUTOMATION_INTERVAL_MS = 2500; // Fast responsive live feed for hackathon
const ALERT_THRESHOLD = 88;
const ALERT_CLEAR_THRESHOLD = 72; // Load below this automatically auto-resolves alerts

let monitoringEnabled = false;
let automationTimer = null;
let lastMonitoringTick = null;
let alertState = {}; // `${serverId}-${metric}` -> already alerted?
let currentSimulationMode = "normal"; // "normal" | "spike" | "attack" | "cooling"
let telemetrySyncCounter = 0;

// Rolling 30-sample time-series telemetry buffer for real-time charting
const telemetryHistory = {
  timestamps: [],
  aggregatedCpu: [],
  aggregatedRam: [],
  aggregatedNet: [],
  aggregatedReqRate: []
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampPercent(v) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/**
 * Set SIH Live Load Simulation mode
 */
function setSimulationMode(mode) {
  currentSimulationMode = mode;
  toast(`SIH Simulation Mode: ${mode.toUpperCase()} activated`, mode === "attack" ? "danger" : mode === "spike" ? "warning" : "success");

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: sessionStorage.getItem("username") || "system",
      role: sessionStorage.getItem("role") || "System",
      action: "Load Simulation Trigger",
      target: "Data Center Workload Generator",
      ip: "127.0.0.1",
      result: "Success",
      details: `Switched telemetry simulation profile to [${mode.toUpperCase()}]`
    });
  }

  // Immediately step the simulation
  tickMonitoring();
}

/**
 * Check resource thresholds and fire automated incident alerts OR auto-resolve when healed.
 */
function checkThreshold(server, metric) {
  const key = `${server.id}-${metric}`;
  const value = server[metric];

  // 1. Trigger Alert when threshold exceeded
  if (value >= ALERT_THRESHOLD) {
    if (!alertState[key]) {
      const alertPayload = {
        id: Date.now() + Math.floor(Math.random() * 100),
        severity: value >= 94 ? "Critical" : "Warning",
        source: server.name,
        serverId: server.id,
        metric: metric,
        peakValue: value,
        message: `${metric.toUpperCase()} load surged to ${value}% on ${server.name} (${server.ip})`,
        status: "Open",
        timestamp: Date.now()
      };

      if (typeof addAlert === "function") {
        addAlert(alertPayload);
      }

      if (typeof addLog === "function") {
        addLog({
          timestamp: Date.now(),
          user: "system-watchdog",
          role: "Automated Watchdog",
          action: "Auto-Alert Threshold Breach",
          target: server.name,
          ip: server.ip || "—",
          result: "Warning",
          details: `${metric.toUpperCase()} crossed safety ceiling at ${value}% on ${server.name}`
        });
      }

      alertState[key] = true;
      toast(`🚨 Alert: ${server.name} ${metric.toUpperCase()} load at ${value}%!`, "danger");
    }
  } 
  // 2. Auto-Resolve Alert when load normalizes below recovery threshold
  else if (value <= ALERT_CLEAR_THRESHOLD) {
    if (alertState[key]) {
      alertState[key] = false;

      // Automatically resolve any open alerts for this server and metric
      if (typeof autoResolveServerAlerts === "function") {
        autoResolveServerAlerts(server.id, server.name, metric, value);
      }
    }
  }
}

/**
 * Ingest live external telemetry push from a real VM / Python agent
 */
function ingestExternalTelemetry(data) {
  if (!data || !data.serverId && !data.ip && !data.name) return false;

  const server = servers.find(s => 
    (data.serverId && s.id === data.serverId) ||
    (data.name && s.name.toLowerCase() === data.name.toLowerCase()) ||
    (data.ip && s.ip === data.ip)
  );

  if (server) {
    if (data.cpu !== undefined) server.cpu = clampPercent(data.cpu);
    if (data.ram !== undefined) server.ram = clampPercent(data.ram);
    if (data.disk !== undefined) server.disk = clampPercent(data.disk);
    if (data.temp !== undefined) server.temp = Number(data.temp);
    if (data.iops !== undefined) server.iops = Number(data.iops);
    server.lastTelemetryAt = Date.now();
    server.isLiveStream = true;

    checkThreshold(server, "cpu");
    checkThreshold(server, "ram");
    
    afterTick();
    return true;
  }
  return false;
}

/**
 * Executes a single real-time telemetry cycle
 */
function tickMonitoring() {
  servers.forEach(server => {
    if (server.status === "Offline") {
      server.cpu = 0;
      server.ram = 0;
      server.temp = 22;
      server.iops = 0;
      return;
    }
    if (server.status === "Maintenance" || server.status === "Rebooting") {
      return;
    }

    // If server has custom manual load injected or real live agent, adjust gently
    if (server.hasManualLoad) {
      // Natural decay or oscillation around target
      server.cpu = clampPercent(server.cpu + rand(-2, 2));
      server.ram = clampPercent(server.ram + rand(-1, 1));
      server.temp = Math.min(85, Math.max(45, (server.temp || 55) + rand(-1, 1)));
    } else if (currentSimulationMode === "spike") {
      // Traffic surge scenario (high CPU/RAM on web servers)
      server.cpu = clampPercent(server.cpu + rand(4, 15));
      server.ram = clampPercent(server.ram + rand(2, 8));
      server.temp = Math.min(78, (server.temp || 40) + rand(1, 3));
      server.iops = Math.min(8500, (server.iops || 1000) + rand(300, 800));
    } else if (currentSimulationMode === "attack") {
      // DDoS attack scenario (saturates hosts above 90%)
      server.cpu = clampPercent(server.cpu + rand(8, 22));
      server.ram = clampPercent(server.ram + rand(5, 14));
      server.temp = Math.min(88, (server.temp || 45) + rand(2, 5));
      server.iops = Math.min(15000, (server.iops || 2000) + rand(800, 2000));
    } else if (currentSimulationMode === "cooling") {
      // Recovery / auto-scaling stabilization scenario
      server.cpu = clampPercent(server.cpu - rand(8, 18));
      server.ram = clampPercent(server.ram - rand(4, 12));
      server.temp = Math.max(34, (server.temp || 50) - rand(1, 3));
      server.iops = Math.max(500, (server.iops || 2000) - rand(400, 1000));
      if (server.cpu <= 38 && server.ram <= 48) {
        currentSimulationMode = "normal";
      }
    } else {
      // Normal realistic ambient load
      server.cpu = clampPercent(server.cpu + rand(-5, 5));
      server.ram = clampPercent(server.ram + rand(-2, 2));
      // Keep baseline in healthy range
      if (server.cpu < 15) server.cpu = 24;
      if (server.ram < 25) server.ram = 36;
      if (server.cpu > 76) server.cpu = 68;
      server.temp = Math.max(32, Math.min(55, (server.temp || 38) + rand(-1, 1)));
      server.iops = Math.max(300, Math.min(3200, (server.iops || 900) + rand(-80, 80)));
    }

    checkThreshold(server, "cpu");
    checkThreshold(server, "ram");
  });

  // Calculate aggregated cluster statistics for time-series chart
  const onlineServers = servers.filter(s => s.status === "Online");
  const count = onlineServers.length || 1;
  const avgCpu = Math.round(onlineServers.reduce((a, b) => a + (b.cpu || 0), 0) / count);
  const avgRam = Math.round(onlineServers.reduce((a, b) => a + (b.ram || 0), 0) / count);
  const totalIops = onlineServers.reduce((a, b) => a + (b.iops || 0), 0);
  const estNetGbps = Number(((avgCpu * 0.035) + (totalIops * 0.00015)).toFixed(2));
  const estReqRate = Math.round(totalIops * 1.8 + avgCpu * 15);

  const now = new Date();
  const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

  telemetryHistory.timestamps.push(timeLabel);
  telemetryHistory.aggregatedCpu.push(avgCpu);
  telemetryHistory.aggregatedRam.push(avgRam);
  telemetryHistory.aggregatedNet.push(estNetGbps);
  telemetryHistory.aggregatedReqRate.push(estReqRate);

  // Keep rolling window of 25 data points
  if (telemetryHistory.timestamps.length > 25) {
    telemetryHistory.timestamps.shift();
    telemetryHistory.aggregatedCpu.shift();
    telemetryHistory.aggregatedRam.shift();
    telemetryHistory.aggregatedNet.shift();
    telemetryHistory.aggregatedReqRate.shift();
  }

  // Sync to Supabase server_metrics every 3rd tick to avoid rate-limiting
  telemetrySyncCounter++;
  if (telemetrySyncCounter % 3 === 0) {
    if (typeof syncTelemetryToSupabase === "function") {
      syncTelemetryToSupabase(onlineServers);
    }
  }

  lastMonitoringTick = Date.now();
  afterTick();
}

function afterTick() {
  updateAlertsBadge();

  if (currentSection === "monitoring") {
    if (typeof updateMonitoringViews === "function") {
      updateMonitoringViews();
    } else if (typeof updateMonitoringCanvases === "function") {
      updateMonitoringCanvases();
    }
  }
}

function updateAlertsBadge() {
  const badge = document.getElementById("alerts-badge");
  if (!badge) return;
  const openCount = alerts.filter(a => a.status === "Open").length;
  badge.textContent = openCount;
  badge.style.display = openCount > 0 ? "inline-flex" : "none";
}

function syncLiveBadge() {
  const badge = document.getElementById("monitoring-live-badge");
  if (badge) {
    badge.textContent = monitoringEnabled ? "● Live Telemetry Stream" : "⏸️ Telemetry Paused";
    badge.className = `badge ${monitoringEnabled ? "badge-success" : "badge-neutral"}`;
  }
}

function setTelemetryInterval(ms) {
  AUTOMATION_INTERVAL_MS = ms;
  if (monitoringEnabled) {
    stopMonitoring();
    startMonitoring();
  }
  toast(`Telemetry refresh set to ${ms / 1000}s`, "info");
}

function startMonitoring() {
  if (monitoringEnabled) return;
  monitoringEnabled = true;
  tickMonitoring();
  automationTimer = setInterval(tickMonitoring, AUTOMATION_INTERVAL_MS);
  syncLiveBadge();
}

function stopMonitoring() {
  monitoringEnabled = false;
  clearInterval(automationTimer);
  automationTimer = null;
  syncLiveBadge();
}
