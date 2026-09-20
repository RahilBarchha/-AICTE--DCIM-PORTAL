let hardwareAssets = [
  { id: 1, type: "Server Rack", serial: "SR123", location: "Rack A1", warranty: "2027-01-01", status: "In-use" },
  { id: 2, type: "UPS Unit", serial: "UPS204", location: "Rack A2", warranty: "2026-11-15", status: "In-use" },
  { id: 3, type: "Core Switch", serial: "SW889", location: "Rack B1", warranty: "2027-06-30", status: "In-use" },
  { id: 4, type: "Backup NAS", serial: "NAS551", location: "Rack B2", warranty: "2026-09-01", status: "Maintenance" }
];

function listHardware() { return hardwareAssets; }

function canManageHardware() {
  const role = sessionStorage.getItem("role");
  return role === "Super Admin" || role === "Admin";
}

function addHardware(asset) {
  if (!canManageHardware()) {
    toast("Permission Denied: Only Super Admin and Admin can add hardware assets.", "danger");
    return false;
  }

  asset.id = Date.now();
  hardwareAssets.push(asset);

  if (typeof addLog === "function") {
    addLog({
      user: sessionStorage.getItem("username") || "admin",
      role: sessionStorage.getItem("role") || "Admin",
      action: "Add Asset",
      target: `${asset.type} (${asset.serial})`,
      ip: "—",
      result: "Success",
      details: `Registered ${asset.type} with serial ${asset.serial} in ${asset.location}`
    });
  }
  return true;
}

function updateHardware(id, updates) {
  if (!canManageHardware()) {
    toast("Permission Denied: Only Super Admin and Admin can update hardware assets.", "danger");
    return;
  }
  hardwareAssets = hardwareAssets.map(h => h.id === id ? { ...h, ...updates } : h);
}

function deleteHardware(id) {
  if (!canManageHardware()) {
    toast("Permission Denied: Only Super Admin and Admin can delete hardware assets.", "danger");
    return;
  }

  const target = hardwareAssets.find(h => h.id === id);
  hardwareAssets = hardwareAssets.filter(h => h.id !== id);

  if (typeof addLog === "function") {
    addLog({
      user: sessionStorage.getItem("username") || "admin",
      role: sessionStorage.getItem("role") || "Admin",
      action: "Delete Asset",
      target: target ? `${target.type} (${target.serial})` : String(id),
      ip: "—",
      result: "Success",
      details: target ? `Removed asset ${target.type} (${target.serial})` : "Asset deleted"
    });
  }
}

function renderHardware(app) {
  app.innerHTML = "";
  const hasPrivileges = canManageHardware();

  const addBtn = hasPrivileges
    ? button("+ Add asset", { variant: "primary", small: true, onClick: () => toggleForm(formPanel) })
    : null;

  app.appendChild(sectionHeader("Hardware", `${hardwareAssets.length} tracked assets`, addBtn));

  if (!hasPrivileges) {
    app.appendChild(el("div", {
      class: "badge badge-neutral",
      style: "margin-bottom:var(--space-4);padding:8px 12px;display:inline-block;"
    }, "🛡️ Read-Only Mode: Asset registration and deletion are restricted to Super Admin and Admin."));
  }

  const formPanel = el("div", { class: "card form-panel" }, []);
  const typeInput = el("input", { placeholder: "UPS Unit" });
  const serialInput = el("input", { placeholder: "SR456" });
  const locationInput = el("input", { placeholder: "Rack B2" });
  const warrantyInput = el("input", { type: "date" });
  const statusInput = el("select", {}, [
    el("option", { value: "In-use" }, "In-use"),
    el("option", { value: "Maintenance" }, "Maintenance"),
    el("option", { value: "Retired" }, "Retired")
  ]);
  formPanel.appendChild(el("div", { class: "form-grid" }, [
    el("label", {}, ["Type", typeInput]),
    el("label", {}, ["Serial", serialInput]),
    el("label", {}, ["Location", locationInput]),
    el("label", {}, ["Warranty until", warrantyInput]),
    el("label", {}, ["Status", statusInput])
  ]));
  formPanel.appendChild(button("Save asset", {
    variant: "primary",
    onClick: () => {
      if (!typeInput.value || !serialInput.value) return toast("Type and serial are required", "danger");
      const added = addHardware({
        type: typeInput.value, serial: serialInput.value, location: locationInput.value || "—",
        warranty: warrantyInput.value || "—", status: statusInput.value
      });
      if (added) {
        toast("Asset added", "success");
        renderHardware(app);
      }
    }
  }));

  if (hasPrivileges) {
    app.appendChild(formPanel);
  }

  const columns = [
    { key: "type", label: "Type" },
    { key: "serial", label: "Serial", mono: true },
    { key: "location", label: "Location" },
    { key: "warranty", label: "Warranty", mono: true },
    { key: "status", label: "Status", render: r => statusBadge(r.status) }
  ];

  const rowActions = hasPrivileges
    ? (row => [
        button("Delete", {
          variant: "danger", small: true,
          onClick: () => { 
            if (confirm(`Are you sure you want to delete asset ${row.type} (${row.serial})?`)) {
              deleteHardware(row.id); 
              toast("Asset removed", "warning"); 
              renderHardware(app); 
            }
          }
        })
      ])
    : null;

  app.appendChild(dataTable(columns, hardwareAssets, rowActions));
}

