function drawBarChart(ctx, data, labels, color) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  const padding = 28;
  const chartH = h - padding * 2;
  const max = Math.max(...data, 1);
  const barWidth = (w - padding * 2) / data.length - 12;

  data.forEach((val, i) => {
    const barH = (val / max) * chartH;
    const x = padding + i * ((w - padding * 2) / data.length) + 6;
    const y = h - padding - barH;

    ctx.fillStyle = color || "#3d8de3";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, barWidth, barH, 4) : ctx.rect(x, y, barWidth, barH);
    ctx.fill();

    ctx.fillStyle = "#e8ebf0";
    ctx.font = "600 11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(val), x + barWidth / 2, y - 6);

    if (labels && labels[i]) {
      ctx.fillStyle = "#8b93a3";
      ctx.font = "500 10px Inter, sans-serif";
      ctx.fillText(labels[i], x + barWidth / 2, h - padding + 14);
    }
  });

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(padding, h - padding);
  ctx.lineTo(w - padding, h - padding);
  ctx.stroke();
}

function renderReports(app) {
  const aiReportBtn = button("📊 Generate AI Executive Report", {
    variant: "primary",
    small: true,
    onClick: () => openAiExecutiveReportModal()
  });
  app.appendChild(sectionHeader("Reports", "Rolling snapshot of infrastructure health", aiReportBtn));

  const grid = el("div", { class: "chart-grid" });

  // CPU usage per server
  const cpuCard = el("div", { class: "chart-card" }, [
    el("div", { style: "font-weight:600;margin-bottom:8px" }, "CPU usage by server"),
    el("canvas", { width: "320", height: "200" })
  ]);
  grid.appendChild(cpuCard);

  // Alerts by severity
  const severities = ["Critical", "Warning", "Info"];
  const counts = severities.map(sev => alerts.filter(a => a.severity === sev).length);
  const alertCard = el("div", { class: "chart-card" }, [
    el("div", { style: "font-weight:600;margin-bottom:8px" }, "Open alerts by severity"),
    el("canvas", { width: "320", height: "200" })
  ]);
  grid.appendChild(alertCard);

  // License seat usage
  const licNames = licenses.map(l => l.name.split(" ")[0]);
  const licUsage = licenses.map(l => l.seatsTotal ? Math.round((l.seatsUsed / l.seatsTotal) * 100) : 0);
  const licCard = el("div", { class: "chart-card" }, [
    el("div", { style: "font-weight:600;margin-bottom:8px" }, "License seat usage (%)"),
    el("canvas", { width: "320", height: "200" })
  ]);
  grid.appendChild(licCard);

  app.appendChild(grid);

  requestAnimationFrame(() => {
    drawBarChart(cpuCard.querySelector("canvas").getContext("2d"), servers.map(s => s.cpu), servers.map(s => s.name.replace("Server-", "S")), "#3d8de3");
    drawBarChart(alertCard.querySelector("canvas").getContext("2d"), counts, severities, "#e35555");
    drawBarChart(licCard.querySelector("canvas").getContext("2d"), licUsage, licNames, "#2fae7a");
  });
}
