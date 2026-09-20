let licenses = [
  { id: 1, name: "Windows Server", vendor: "Microsoft", seatsUsed: 10, seatsTotal: 20, expiry: "2026-12-31" },
  { id: 2, name: "Office 365", vendor: "Microsoft", seatsUsed: 45, seatsTotal: 50, expiry: "2026-10-01" },
  { id: 3, name: "Antivirus Endpoint", vendor: "Symantec", seatsUsed: 60, seatsTotal: 60, expiry: "2027-02-15" }
];

function listLicenses() { return licenses; }

function canManageLicenses() {
  const role = sessionStorage.getItem("role");
  return role === "Super Admin" || role === "Admin";
}

function addLicense(license) {
  if (!canManageLicenses()) {
    toast("Permission Denied: Only Super Admin and Admin can add software licenses.", "danger");
    return false;
  }

  license.id = Date.now();
  licenses.push(license);

  if (typeof addLog === "function") {
    addLog({
      user: sessionStorage.getItem("username") || "admin",
      role: sessionStorage.getItem("role") || "Admin",
      action: "Add License",
      target: `${license.name} (${license.vendor})`,
      ip: "—",
      result: "Success",
      details: `Added ${license.name} with ${license.seatsTotal} seats (Vendor: ${license.vendor})`
    });
  }
  return true;
}

function updateLicense(id, updates) {
  if (!canManageLicenses()) {
    toast("Permission Denied: Only Super Admin and Admin can update software licenses.", "danger");
    return;
  }
  licenses = licenses.map(l => l.id === id ? { ...l, ...updates } : l);
}

function deleteLicense(id) {
  if (!canManageLicenses()) {
    toast("Permission Denied: Only Super Admin and Admin can delete software licenses.", "danger");
    return;
  }

  const target = licenses.find(l => l.id === id);
  licenses = licenses.filter(l => l.id !== id);

  if (typeof addLog === "function") {
    addLog({
      user: sessionStorage.getItem("username") || "admin",
      role: sessionStorage.getItem("role") || "Admin",
      action: "Delete License",
      target: target ? target.name : String(id),
      ip: "—",
      result: "Success",
      details: target ? `Removed license ${target.name}` : "License deleted"
    });
  }
}

function renderLicenses(app) {
  app.innerHTML = "";
  const hasPrivileges = canManageLicenses();

  const addBtn = hasPrivileges
    ? button("+ Add license", { variant: "primary", small: true, onClick: () => toggleForm(formPanel) })
    : null;

  app.appendChild(sectionHeader("Software & Cloud Licenses", `${licenses.length} tracked licenses`, addBtn));

  if (!hasPrivileges) {
    app.appendChild(el("div", {
      class: "badge badge-neutral",
      style: "margin-bottom:var(--space-4);padding:8px 12px;display:inline-block;"
    }, "🛡️ Read-Only Mode: License provisioning and deletion are restricted to Super Admin and Admin."));
  }

  const formPanel = el("div", { class: "card form-panel" }, []);
  const nameInput = el("input", { placeholder: "Office 365" });
  const vendorInput = el("input", { placeholder: "Microsoft" });
  const usedInput = el("input", { type: "number", placeholder: "0" });
  const totalInput = el("input", { type: "number", placeholder: "10" });
  const expiryInput = el("input", { type: "date" });
  formPanel.appendChild(el("div", { class: "form-grid" }, [
    el("label", {}, ["Name", nameInput]),
    el("label", {}, ["Vendor", vendorInput]),
    el("label", {}, ["Seats used", usedInput]),
    el("label", {}, ["Seats total", totalInput]),
    el("label", {}, ["Expiry", expiryInput])
  ]));
  formPanel.appendChild(button("Save license", {
    variant: "primary",
    onClick: () => {
      if (!nameInput.value || !totalInput.value) return toast("Name and seat total are required", "danger");
      const added = addLicense({
        name: nameInput.value, vendor: vendorInput.value || "—",
        seatsUsed: Number(usedInput.value) || 0, seatsTotal: Number(totalInput.value),
        expiry: expiryInput.value || "—"
      });
      if (added) {
        toast("License added", "success");
        renderLicenses(app);
      }
    }
  }));

  if (hasPrivileges) {
    app.appendChild(formPanel);
  }

  const grid = el("div", { class: "grid" });
  licenses.forEach(lic => {
    const percent = lic.seatsTotal ? Math.round((lic.seatsUsed / lic.seatsTotal) * 100) : 0;
    grid.appendChild(el("div", { class: "card" }, [
      el("div", { style: "display:flex;justify-content:space-between;align-items:flex-start;gap:8px" }, [
        el("div", {}, [
          el("div", { style: "font-weight:600" }, lic.name),
          el("div", { style: "font-size:.78rem;color:var(--text-secondary)" }, lic.vendor)
        ]),
        hasPrivileges ? button("Delete", {
          variant: "danger", small: true,
          onClick: () => { 
            if (confirm(`Are you sure you want to delete license "${lic.name}"?`)) {
              deleteLicense(lic.id); 
              toast("License removed", "warning"); 
              renderLicenses(app); 
            }
          }
        }) : null
      ]),
      el("div", { style: "margin-top:12px" }, meter(percent, `${lic.seatsUsed} / ${lic.seatsTotal} seats`)),
      el("div", { style: "margin-top:10px;font-size:.78rem;color:var(--text-secondary)" }, `Expires ${lic.expiry}`)
    ]));
  });
  app.appendChild(grid);
}

