// ---------------------------------------------------------------------------
// AICTE DCIM Live Server Telemetry & Real-Time Monitoring Subsystem
// SIH Live Operations Center with Real VM Telemetry & Supabase Cloud Sync
// ---------------------------------------------------------------------------

function drawRingChart(ctx, percent, color, label) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const radius = Math.min(w, h) / 2 - 14;
  ctx.clearRect(0, 0, w, h);

  // Background Ring Track
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
  ctx.lineWidth = 10;
  ctx.stroke();

  // Dynamic Glow for High Utilization
  if (percent >= 85) {
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(239, 68, 68, 0.6)";
  } else if (percent >= 65) {
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(245, 158, 11, 0.5)";
  } else {
    ctx.shadowBlur = 6;
    ctx.shadowColor = "rgba(56, 189, 248, 0.4)";
  }

  // Active Progress Arc
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, radius, -Math.PI / 2, (2 * Math.PI * percent / 100) - Math.PI / 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.shadowBlur = 0; // reset shadow

  // Center Value & Subtext
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 18px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${percent}%`, w / 2, h / 2 - (label ? 4 : 0));

  if (label) {
    ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
    ctx.font = "600 9px 'Inter', sans-serif";
    ctx.fillText(label.toUpperCase(), w / 2, h / 2 + 14);
  }
}

function ringColor(percent) {
  if (percent >= 88) return "#ef4444"; // Critical Red
  if (percent >= 65) return "#f59e0b"; // Warning Amber
  if (percent >= 45) return "#38bdf8"; // Active Sky Blue
  return "#10b981";                   // Optimal Emerald Green
}

function drawClusterTimelineChart() {
  const canvas = document.getElementById("clusterTimelineCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const history = typeof telemetryHistory !== "undefined" ? telemetryHistory : null;
  if (!history || !history.aggregatedCpu.length) return;

  const dataLen = history.aggregatedCpu.length;
  const step = w / Math.max(1, dataLen - 1);

  // Background Grid Lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let y = 20; y < h; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Draw Smooth Line Series
  function plotSeries(data, color, fillGrad, maxVal = 100) {
    ctx.beginPath();
    ctx.moveTo(0, h - (data[0] / maxVal) * (h - 25));
    for (let i = 1; i < data.length; i++) {
      const x = i * step;
      const y = h - (data[i] / maxVal) * (h - 25);
      const prevX = (i - 1) * step;
      const prevY = h - (data[i - 1] / maxVal) * (h - 25);
      const cx = (prevX + x) / 2;
      ctx.bezierCurveTo(cx, prevY, cx, y, x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Fill under curve
    ctx.lineTo((data.length - 1) * step, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = fillGrad;
    ctx.fill();
  }

  // CPU Waveform
  const cpuGrad = ctx.createLinearGradient(0, 0, 0, h);
  cpuGrad.addColorStop(0, "rgba(56, 189, 248, 0.35)");
  cpuGrad.addColorStop(1, "rgba(56, 189, 248, 0.0)");
  plotSeries(history.aggregatedCpu, "#38bdf8", cpuGrad, 100);

  // RAM Waveform
  const ramGrad = ctx.createLinearGradient(0, 0, 0, h);
  ramGrad.addColorStop(0, "rgba(168, 85, 247, 0.25)");
  ramGrad.addColorStop(1, "rgba(168, 85, 247, 0.0)");
  plotSeries(history.aggregatedRam, "#c084fc", ramGrad, 100);
}

function renderMonitoring(app) {
  app.innerHTML = "";
  const online = servers.filter(s => s.status === "Online");
  const vmServers = online.filter(s => s.isVM);

  const liveBadge = el("span", {
    id: "monitoring-live-badge",
    class: `badge ${monitoringEnabled ? "badge-success" : "badge-neutral"}`,
    style: "margin-left:10px;vertical-align:middle;font-size:0.75rem;"
  }, monitoringEnabled ? "● Live Telemetry Stream" : "⏸️ Telemetry Paused");

  const toggleBtn = button(monitoringEnabled ? "Pause Stream" : "Resume Stream", {
    small: true,
    onClick: () => {
      monitoringEnabled ? stopMonitoring() : startMonitoring();
      renderMonitoring(app);
    }
  });

  const header = sectionHeader(
    "Live Server Telemetry & Real-Time Monitoring",
    `Auto-refreshing every ${AUTOMATION_INTERVAL_MS / 1000}s · Autonomous incident watchdog & Supabase cloud telemetry for SIH`,
    toggleBtn
  );
  header.querySelector("h2").appendChild(liveBadge);
  app.appendChild(header);

  // SIH Interactive Load Simulation & VM Demo Control Bar
  const sihControlPanel = el("div", {
    class: "card",
    style: "background:linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);border:1px solid rgba(56, 189, 248, 0.3);margin-bottom:var(--space-4);padding:16px 20px;"
  }, [
    el("div", { style: "display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:12px;" }, [
      el("div", {}, [
        el("span", { style: "font-weight:700;font-size:0.95rem;color:#38bdf8;display:flex;align-items:center;gap:6px;" }, "⚡ SIH Real-Time Load & Stress Test Simulator"),
        el("div", { style: "font-size:0.75rem;color:var(--text-secondary);margin-top:2px;" }, "Demonstrate dynamic server loading, auto-alert triggers, and self-healing to the evaluation panel")
      ]),
      el("div", { style: "display:flex;align-items:center;gap:8px;font-size:0.75rem;" }, [
        el("span", { style: "color:var(--text-muted);" }, "Polling Rate:"),
        button("1.5s (Fast)", { small: true, variant: AUTOMATION_INTERVAL_MS === 1500 ? "primary" : "", onClick: () => { setTelemetryInterval(1500); renderMonitoring(app); } }),
        button("2.5s (Standard)", { small: true, variant: AUTOMATION_INTERVAL_MS === 2500 ? "primary" : "", onClick: () => { setTelemetryInterval(2500); renderMonitoring(app); } }),
        button("5.0s (Eco)", { small: true, variant: AUTOMATION_INTERVAL_MS === 5000 ? "primary" : "", onClick: () => { setTelemetryInterval(5000); renderMonitoring(app); } })
      ])
    ]),
    el("div", { style: "display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;" }, [
      button("⚡ Inject Load on VM Server 1 (+50% Spike)", {
        variant: "primary",
        small: true,
        onClick: () => {
          injectServerLoad(101, 94, 88);
          renderMonitoring(app);
        }
      }),
      button("🛡️ Normalize VM Server 1 (Auto-Resolve)", {
        small: true,
        onClick: () => {
          normalizeServerLoad(101);
          renderMonitoring(app);
        }
      }),
      button("⚡ Simulate Cluster Surge", {
        small: true,
        onClick: () => setSimulationMode("spike")
      }),
      button("🚨 Simulate Cyber Attack / DDoS", {
        variant: "danger",
        small: true,
        onClick: () => setSimulationMode("attack")
      }),
      button("🛡️ Self-Healing Auto-Scale", {
        small: true,
        onClick: () => setSimulationMode("cooling")
      }),
      button("🔄 Reset Normal Baseline", {
        small: true,
        onClick: () => setSimulationMode("normal")
      })
    ]),
    el("div", {
      style: "font-size:0.72rem;color:var(--text-muted);display:flex;align-items:center;gap:10px;border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;"
    }, [
      el("span", { style: "color:#c084fc;font-weight:600;" }, `VM Machines Connected: ${vmServers.length}`),
      el("span", {}, "·"),
      el("span", {}, "External VM Telemetry Ingestion Endpoint: POST /api/telemetry/push"),
      el("span", {}, "·"),
      el("span", { style: `color:${supabaseClient ? '#10b981' : '#f59e0b'};` }, supabaseClient ? "Cloud Sync: Supabase Active" : "Cloud Sync: Local Cache Mode")
    ])
  ]);
  app.appendChild(sihControlPanel);

  // Live Cluster Summary Metrics
  const avgCpu = Math.round(servers.filter(s=>s.status==="Online").reduce((a,b)=>a+(b.cpu||0),0)/Math.max(1, online.length));
  const avgRam = Math.round(servers.filter(s=>s.status==="Online").reduce((a,b)=>a+(b.ram||0),0)/Math.max(1, online.length));
  const totalIops = servers.filter(s=>s.status==="Online").reduce((a,b)=>a+(b.iops||0),0);

  const kpiGrid = el("div", { class: "grid", style: "margin-bottom:var(--space-4);" }, [
    statCard("Cluster CPU Load", `${avgCpu}%`, avgCpu > 80 ? "Surge in progress" : "Optimal operating range", avgCpu > 85 ? "danger" : avgCpu > 65 ? "warning" : "success"),
    statCard("Cluster Memory", `${avgRam}%`, "Allocated cluster RAM", avgRam > 85 ? "danger" : "info"),
    statCard("Aggregate I/O Rate", `${totalIops.toLocaleString()} IOPS`, "Storage SAN throughput", "info"),
    statCard("Active Nodes", `${online.length} / ${servers.length}`, `${vmServers.length} VM nodes live`, "success")
  ]);
  app.appendChild(kpiGrid);

  // Time-Series Chart Card
  const chartCard = el("div", { class: "card", style: "margin-bottom:var(--space-4);" }, [
    el("div", { style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3);" }, [
      el("div", {}, [
        el("div", { style: "font-weight:600;font-size:1rem;" }, "Live Cluster Telemetry Timeline (Real-Time Rolling Stream)"),
        el("div", { style: "font-size:0.75rem;color:var(--text-secondary);" }, "Synchronized CPU & Memory utilization history (ticking every cycle)")
      ]),
      el("div", { style: "display:flex;gap:12px;font-size:0.75rem;" }, [
        el("span", { style: "color:#38bdf8;display:flex;align-items:center;gap:4px;" }, "● Avg CPU %"),
        el("span", { style: "color:#c084fc;display:flex;align-items:center;gap:4px;" }, "● Avg RAM %")
      ])
    ]),
    el("canvas", { id: "clusterTimelineCanvas", width: "800", height: "160", style: "width:100%;height:160px;border-radius:var(--radius-input);background:var(--surface-raised);" }),
    el("div", {
      id: "monitoring-updated-at",
      style: "font-size:.72rem;color:var(--text-muted);margin-top:8px;font-family:var(--font-mono);display:flex;justify-content:space-between;"
    }, [
      el("span", {}, lastMonitoringTick ? `Last Telemetry Check: ${new Date(lastMonitoringTick).toLocaleTimeString()}` : "Initializing stream..."),
      el("span", { id: "sih-sim-status", style: "color:#38bdf8;font-weight:600;" }, `Profile: ${currentSimulationMode.toUpperCase()}`)
    ])
  ]);
  app.appendChild(chartCard);

  requestAnimationFrame(() => {
    drawClusterTimelineChart();
  });

  if (!online.length) {
    app.appendChild(el("div", { class: "card" }, el("div", { class: "empty-state" }, "No server hosts are currently online.")));
    return;
  }

  // Host Node Ring Gauges Grid
  const nodeHeader = el("div", { style: "font-weight:600;font-size:1rem;margin:var(--space-4) 0 var(--space-2);" }, "Online Host Node Telemetry Gauges");
  app.appendChild(nodeHeader);

  const grid = el("div", { class: "chart-grid", style: "margin-bottom:var(--space-4);" });
  online.forEach(server => {
    const card = el("div", { class: "chart-card" }, [
      el("div", { style: "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;" }, [
        el("div", { style: "display:flex;align-items:center;gap:6px;" }, [
          el("span", { style: "font-weight:600;font-size:0.95rem;" }, server.name),
          server.isVM ? el("span", { style: "padding:1px 5px;border-radius:3px;font-size:0.65rem;font-weight:700;background:rgba(168,85,247,0.2);color:#c084fc;border:1px solid rgba(168,85,247,0.4);" }, "VM") : null
        ]),
        el("span", { style: "font-size:0.72rem;font-family:var(--font-mono);color:#38bdf8;" }, server.ip)
      ]),
      el("div", { style: "display:flex;justify-content:center;gap:16px;flex-wrap:wrap" })
    ]);
    const row = card.querySelector("div:nth-child(2)");

    // CPU Gauge
    const cpuWrap = el("div", { style: "text-align:center;" });
    const cpuCanvas = el("canvas", { width: "120", height: "120", "data-server-id": server.id, "data-metric": "cpu" });
    cpuWrap.appendChild(cpuCanvas);
    cpuWrap.appendChild(el("div", { class: "chart-label" }, "CPU Core Load"));

    // RAM Gauge
    const ramWrap = el("div", { style: "text-align:center;" });
    const ramCanvas = el("canvas", { width: "120", height: "120", "data-server-id": server.id, "data-metric": "ram" });
    ramWrap.appendChild(ramCanvas);
    ramWrap.appendChild(el("div", { class: "chart-label" }, "RAM Utilization"));

    row.appendChild(cpuWrap);
    row.appendChild(ramWrap);

    // Host Metrics Footer
    const footer = el("div", {
      style: "border-top:1px solid var(--border);margin-top:10px;padding-top:8px;display:flex;justify-content:space-between;align-items:center;font-size:0.72rem;color:var(--text-secondary);font-family:var(--font-mono);"
    }, [
      el("span", {}, `🌡️ ${server.temp || 40}°C`),
      el("span", {}, `⚡ ${(server.iops || 800).toLocaleString()} IOPS`),
      el("span", {}, `⏱️ ${server.uptime || "99.99%"}`)
    ]);
    card.appendChild(footer);

    grid.appendChild(card);

    requestAnimationFrame(() => {
      drawRingChart(cpuCanvas.getContext("2d"), server.cpu, ringColor(server.cpu), "CPU");
      drawRingChart(ramCanvas.getContext("2d"), server.ram, ringColor(server.ram), "RAM");
    });
  });
  app.appendChild(grid);
}

/**
 * Redraws existing monitoring canvases in place, without rebuilding the DOM.
 */
function updateMonitoringViews() {
  // Update Gauges
  document.querySelectorAll("canvas[data-server-id]").forEach(canvas => {
    const server = servers.find(s => s.id === Number(canvas.dataset.serverId));
    if (!server) return;
    const metric = canvas.dataset.metric;
    const value = server[metric] || 0;
    drawRingChart(canvas.getContext("2d"), value, ringColor(value), metric.toUpperCase());
  });

  // Redraw Timeline
  drawClusterTimelineChart();

  // Update Timestamps
  const stamp = document.getElementById("monitoring-updated-at");
  if (stamp && lastMonitoringTick) {
    stamp.innerHTML = `<span>Last Telemetry Check: ${new Date(lastMonitoringTick).toLocaleTimeString()}</span><span style="color:#38bdf8;font-weight:600;">Profile: ${currentSimulationMode.toUpperCase()}</span>`;
  }
}

function updateMonitoringCanvases() {
  updateMonitoringViews();
}
