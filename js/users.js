// AICTE DCIM / Cybersecurity Portal - User Directory & Access Control
// Zero-Knowledge Security Policy: Passwords are encrypted and NEVER accessible to any Admin or Super Admin.

const USERS_STORAGE_KEY = "aicte_dcim_users";

// Initialize users by pulling from unified accounts store (passwords strictly omitted)
function getSynchronizedUsers() {
  const allAccounts = typeof getAllAccounts === "function" ? getAllAccounts() : [];
  return allAccounts.map(acc => ({
    id: acc.id || acc.username,
    username: acc.username,
    name: acc.name || acc.username,
    email: acc.email || `${acc.username}@aicte.gov.in`,
    role: acc.role || "IT Operator",
    status: acc.status || "Active",
    registeredAt: acc.registeredAt || "System Default",
    source: acc.source || "Pre-configured"
  }));
}

let users = getSynchronizedUsers();

function listUsers() { 
  users = getSynchronizedUsers();
  return users; 
}

function currentActor() {
  return sessionStorage.getItem("username") || "system";
}

function isSuperAdmin() {
  return sessionStorage.getItem("role") === "Super Admin";
}

/**
 * Adds a user locally and to persistent account storage.
 * Enforces 8-character password constraint and zero-knowledge storage.
 */
async function addUser(userData) {
  const cleanUsername = (userData.username || "").trim().toLowerCase();
  const cleanName = (userData.name || "").trim() || cleanUsername;
  const cleanEmail = (userData.email || "").trim() || `${cleanUsername}@aicte.gov.in`;
  const cleanRole = userData.role || "IT Operator";
  const password = userData.password || "User@888"; // Standard 8-char default if empty

  // Validate 8-character password
  if (password.length !== 8) {
    toast(`Password must be exactly 8 characters long (got ${password.length} chars)`, "danger");
    return false;
  }

  // Register in centralized accounts store
  if (typeof registerAccount === "function") {
    const regResult = registerAccount({
      username: cleanUsername,
      password: password,
      name: cleanName,
      email: cleanEmail,
      role: cleanRole
    });

    if (!regResult.success) {
      toast(regResult.message, "danger");
      return false;
    }
  }

  users = getSynchronizedUsers();

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: currentActor(),
      action: "Create User",
      target: cleanUsername,
      ip: "127.0.0.1",
      result: "Success",
      details: `Created user ${cleanUsername} (${cleanRole}) under Zero-Knowledge Privacy Policy`
    });
  }

  // Supabase background sync if configured
  if (typeof supabaseConfigured !== "undefined" && supabaseConfigured && supabaseClient) {
    try {
      const { error } = await supabaseClient.from("users").insert([{
        username: cleanUsername,
        name: cleanName,
        email: cleanEmail,
        role: cleanRole,
        status: "Active"
      }]);
      if (error) console.warn("Supabase insert error:", error.message);
    } catch (e) {
      console.warn("Supabase sync failed:", e);
    }
  }

  toast(`User ${cleanUsername} saved securely under Zero-Knowledge policy!`, "success");
  return true;
}

/**
 * Update user status and synchronize with registered storage instantaneously
 */
function updateUser(id, updates) {
  const target = users.find(u => String(u.id) === String(id) || u.username.toLowerCase() === String(id).toLowerCase());
  if (!target) return;

  const newStatus = updates.status || target.status;
  target.status = newStatus;

  // Persist status change in central credentials store
  if (typeof updateAccountStatus === "function") {
    updateAccountStatus(target.id || target.username, newStatus);
  }

  // Update in localStorage accounts store
  if (typeof getRegisteredAccounts === "function" && typeof saveRegisteredAccounts === "function") {
    const regAccounts = getRegisteredAccounts();
    const updated = regAccounts.map(a => {
      if (String(a.id) === String(id) || a.username.toLowerCase() === target.username.toLowerCase()) {
        return { ...a, ...updates, status: newStatus };
      }
      return a;
    });
    saveRegisteredAccounts(updated);
  }

  users = getSynchronizedUsers();

  // Immediate visual toast response
  if (newStatus === "Inactive") {
    toast(`🔒 Account "${target.username}" has been deactivated.`, "warning");
  } else if (newStatus === "Active") {
    toast(`✅ Account "${target.username}" is now active!`, "success");
  } else {
    toast(`Updated ${target.username} to ${newStatus}`, "info");
  }

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: currentActor(),
      action: newStatus === "Inactive" ? "Deactivate User" : "Activate User",
      target: target.username,
      ip: "127.0.0.1",
      result: "Success",
      details: `User account status set to ${newStatus}`
    });
  }

  if (typeof supabaseConfigured !== "undefined" && supabaseConfigured && supabaseClient && target) {
    try {
      supabaseClient.from("users").update({ status: newStatus }).eq("username", target.username).catch(() => {});
    } catch (e) {}
  }
}

/**
 * Deletes user from local storage and syncs audit log
 */
async function deleteUser(id) {
  const target = users.find(u => String(u.id) === String(id) || u.username === id);
  if (!target) return;

  if (typeof getRegisteredAccounts === "function" && typeof saveRegisteredAccounts === "function") {
    const regAccounts = getRegisteredAccounts();
    const filtered = regAccounts.filter(a => String(a.id) !== String(id) && a.username.toLowerCase() !== target.username.toLowerCase());
    saveRegisteredAccounts(filtered);
  }

  users = getSynchronizedUsers();

  if (typeof addLog === "function") {
    addLog({
      timestamp: Date.now(),
      user: currentActor(),
      action: "Delete User",
      target: target.username,
      ip: "127.0.0.1",
      result: "Success",
      details: `Removed user record ${target.username}`
    });
  }

  if (typeof supabaseConfigured !== "undefined" && supabaseConfigured && supabaseClient && target) {
    try {
      await supabaseClient.from("users").delete().eq("username", target.username);
    } catch (e) {
      console.warn("Supabase delete failed:", e);
    }
  }
}

/**
 * Main renderer for Users Section (Single Unified Directory & Zero-Knowledge Security)
 */
function renderUsers(app) {
  users = getSynchronizedUsers();
  const superAdmin = isSuperAdmin();

  app.appendChild(sectionHeader(
    "User Directory & Access Control",
    `${users.length} total portal accounts · Zero-Knowledge password protection active`
  ));

  // Zero-Knowledge Security Policy Banner
  const privacyBanner = el("div", {
    class: "card spotlight-card",
    style: "background:linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(56,189,248,0.05) 100%);border:1px solid rgba(16,185,129,0.3);margin-bottom:var(--space-4);padding:14px 18px;display:flex;align-items:center;gap:14px;border-radius:var(--radius-card);"
  }, [
    el("div", { style: "font-size:1.6rem;" }, "🛡️"),
    el("div", { style: "flex:1;" }, [
      el("div", { style: "font-weight:700;font-size:0.92rem;color:var(--text-primary);display:flex;align-items:center;gap:8px;" }, [
        el("span", {}, "Zero-Knowledge Password Protection Enforced"),
        el("span", { class: "badge badge-success", style: "font-size:0.65rem;" }, "ACTIVE")
      ]),
      el("div", { style: "font-size:0.78rem;color:var(--text-secondary);margin-top:2px;" }, 
        "Account passwords are cryptographically hashed and private to each user. No administrator, operator, or Super Admin can view, inspect, export, or modify any user's password."
      )
    ])
  ]);
  app.appendChild(privacyBanner);

  // Quick Metric Cards
  const activeUsersCount = users.filter(u => u.status === "Active").length;
  const superAdminsCount = users.filter(u => u.role === "Super Admin").length;
  const standardUsersCount = users.length - superAdminsCount;

  app.appendChild(el("div", { class: "metric-grid", style: "grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));margin-bottom:var(--space-4);" }, [
    statCard("Total Accounts", users.length, "Registered & System"),
    statCard("Active Status", activeUsersCount, `${users.length - activeUsersCount} Deactivated`, activeUsersCount === users.length ? "success" : "warning"),
    statCard("Super Admins", superAdminsCount, "Root privileges", "info"),
    statCard("Ops & Engineers", standardUsersCount, "Operational access")
  ]));

  // Single Unified Users Container
  const directoryCard = el("div", { class: "card", style: "padding:var(--space-4);" });

  // Search & Filter Toolbar
  const searchInput = el("input", {
    placeholder: "🔍 Search users by name, username, or role...",
    style: "flex:2;min-width:240px;background:var(--background);border:1px solid var(--border);color:var(--text-primary);padding:.55rem .75rem;border-radius:var(--radius-input);"
  });

  const statusFilter = el("select", {
    style: "flex:1;min-width:140px;background:var(--background);border:1px solid var(--border);color:var(--text-primary);padding:.55rem .75rem;border-radius:var(--radius-input);"
  }, [
    el("option", { value: "" }, "All Statuses"),
    el("option", { value: "Active" }, "Active Only"),
    el("option", { value: "Inactive" }, "Deactivated Only")
  ]);

  const toolbar = el("div", { style: "display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:var(--space-4);" }, [searchInput, statusFilter]);
  directoryCard.appendChild(toolbar);

  const tableHost = el("div", { id: "userTableHost" });
  directoryCard.appendChild(tableHost);

  // Define Columns for Single Unified Table (ZERO PASSWORD EXPOSURE)
  const columns = [
    {
      key: "username",
      label: "User / Account",
      render: r => el("div", {}, [
        el("div", { style: "font-weight:600;font-family:var(--font-mono);display:flex;align-items:center;gap:6px;" }, [
          el("span", {}, r.username),
          r.username === currentActor() ? el("span", { class: "badge badge-info", style: "font-size:0.62rem;" }, "YOU") : null
        ]),
        el("div", { style: "font-size:0.75rem;color:var(--text-secondary);" }, r.name)
      ])
    },
    { key: "email", label: "Email" },
    {
      key: "role",
      label: "Role",
      render: r => badge(r.role, r.role === "Super Admin" ? "info" : r.role === "Admin" ? "warning" : "neutral")
    },
    {
      key: "status",
      label: "Account Status",
      render: r => r.status === "Active"
        ? badge("● Active", "success")
        : badge("○ Deactivated", "danger")
    },
    {
      key: "security",
      label: "Credential Protection",
      render: () => el("span", { 
        style: "font-size:0.75rem;color:var(--text-muted);display:flex;align-items:center;gap:4px;",
        title: "Cryptographically hashed PBKDF2. Password cannot be viewed or retrieved by any admin."
      }, [
        el("span", {}, "🔒"),
        el("span", { style: "font-family:var(--font-mono);" }, "Salted Hash")
      ])
    }
  ];

  function drawTable() {
    tableHost.innerHTML = "";
    users = getSynchronizedUsers();

    const term = (searchInput.value || "").trim().toLowerCase();
    const stFilter = statusFilter.value;

    const filtered = users.filter(u => {
      if (term) {
        const matches = [u.username, u.name, u.email, u.role].some(v => v && String(v).toLowerCase().includes(term));
        if (!matches) return false;
      }
      if (stFilter) {
        if (u.status !== stFilter) return false;
      }
      return true;
    });

    tableHost.appendChild(dataTable(columns, filtered, row => [
      // Fast, Instant Activate / Deactivate Toggle Button
      row.status === "Active"
        ? el("button", {
            class: "btn btn-sm",
            style: "background:rgba(239, 68, 68, 0.15);border:1px solid rgba(239, 68, 68, 0.4);color:#fca5a5;cursor:pointer;font-weight:500;padding:3px 10px;border-radius:4px;",
            title: `Deactivate ${row.username}`,
            onclick: () => {
              updateUser(row.id || row.username, { status: "Inactive" });
              drawTable();
            }
          }, "🚫 Deactivate")
        : el("button", {
            class: "btn btn-sm btn-primary",
            style: "background:rgba(16, 185, 129, 0.25);border:1px solid rgba(16, 185, 129, 0.6);color:#6ee7b7;cursor:pointer;font-weight:600;padding:3px 10px;border-radius:4px;",
            title: `Activate ${row.username}`,
            onclick: () => {
              updateUser(row.id || row.username, { status: "Active" });
              drawTable();
            }
          }, "⚡ Activate"),
      
      superAdmin && row.username !== "superadmin" ? button("Delete", {
        variant: "danger",
        small: true,
        onClick: () => {
          if (confirm(`Are you sure you want to delete user "${row.username}"?`)) {
            deleteUser(row.id || row.username);
            toast("User removed", "warning");
            drawTable();
          }
        }
      }) : null
    ].filter(Boolean)));
  }

  searchInput.addEventListener("input", drawTable);
  statusFilter.addEventListener("change", drawTable);
  drawTable();

  app.appendChild(directoryCard);
}
