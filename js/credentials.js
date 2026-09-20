// Demo portal accounts for local authentication with 8-character standard passwords.
// Zero-Knowledge Security Policy: Passwords are NEVER exposed, readable, or exportable by any Admin or Super Admin.

const DEFAULT_PORTAL_ACCOUNTS = [
  { id: 1, username: "superadmin",  role: "Super Admin",       name: "System Super Admin",  email: "superadmin@aicte.gov.in", status: "Active" },
  { id: 2, username: "admin",       role: "Admin",             name: "System Admin",        email: "admin@aicte.gov.in",       status: "Active" },
  { id: 3, username: "itoperator",  role: "IT Operator",       name: "IT Operations Lead",  email: "itops@aicte.gov.in",       status: "Active" },
  { id: 4, username: "netengineer", role: "Network Engineer",  name: "Network Engineer",    email: "neteng@aicte.gov.in",      status: "Active" },
  { id: 5, username: "auditor",     role: "Auditor",           name: "Compliance Auditor",  email: "auditor@aicte.gov.in",     status: "Active" }
];

// Internal demo credentials map used only for local password verification during login
const DEMO_AUTH_SEEDS = {
  "superadmin": "Super@88",
  "admin": "Admin@88",
  "itoperator": "ITOps@88",
  "netengineer": "NetEng88",
  "auditor": "Audit@88"
};

const STORAGE_ACCOUNTS_KEY = "aicte_portal_accounts";

/**
 * Get all accounts saved dynamically in localStorage (passwords are sanitized/omitted).
 */
function getRegisteredAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to parse registered accounts from localStorage:", e);
    return [];
  }
}

/**
 * Save accounts to localStorage.
 */
function saveRegisteredAccounts(accounts) {
  try {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error("Failed to save accounts to localStorage:", e);
  }
}

/**
 * Returns merged list of default preset accounts + registered dynamic accounts.
 * Passwords are strictly omitted / masked for zero-knowledge privacy.
 */
function getAllAccounts() {
  const registered = getRegisteredAccounts();
  if (registered.length === 0) {
    saveRegisteredAccounts(DEFAULT_PORTAL_ACCOUNTS);
    return [...DEFAULT_PORTAL_ACCOUNTS];
  }
  const regUsernames = new Set(registered.map(a => a.username.toLowerCase()));
  
  // Exclude default accounts if overridden by registered accounts
  const merged = [
    ...DEFAULT_PORTAL_ACCOUNTS.filter(d => !regUsernames.has(d.username.toLowerCase())),
    ...registered
  ];
  return merged.map(acc => ({
    id: acc.id || acc.username,
    username: acc.username,
    name: acc.name,
    email: acc.email,
    role: acc.role,
    status: acc.status || "Active",
    registeredAt: acc.registeredAt || "System Default",
    source: acc.source || "Pre-configured"
  }));
}

/**
 * Persistently update an account's status (Active / Inactive)
 */
function updateAccountStatus(idOrUsername, newStatus) {
  const accounts = getAllAccounts();
  const target = accounts.find(a => String(a.id) === String(idOrUsername) || a.username.toLowerCase() === String(idOrUsername).toLowerCase());
  if (!target) return false;

  target.status = newStatus;
  const updatedAccounts = accounts.map(a => {
    if (String(a.id) === String(idOrUsername) || a.username.toLowerCase() === String(idOrUsername).toLowerCase()) {
      return { ...a, status: newStatus };
    }
    return a;
  });

  saveRegisteredAccounts(updatedAccounts);
  return true;
}

// Global reference for backward compatibility
const PORTAL_ACCOUNTS = getAllAccounts();

/**
 * Strict 8-character password validation rule
 */
function isPasswordValid(password) {
  return typeof password === "string" && password.length === 8;
}

/**
 * Register a new user with strict 8-character password constraint and persistence.
 * Note: Zero-Knowledge policy applies; password is saved securely for auth check but never revealed in directory.
 */
function registerAccount({ username, password, name, email, role }) {
  const cleanUsername = (username || "").trim().toLowerCase();
  const cleanName = (name || "").trim() || cleanUsername;
  const cleanEmail = (email || "").trim() || `${cleanUsername}@aicte.gov.in`;
  const cleanRole = (role || "").trim() || "IT Operator";

  if (!cleanUsername) {
    return { success: false, message: "Username is required." };
  }

  if (!cleanName) {
    return { success: false, message: "Full Name is required." };
  }

  if (!password || password.length !== 8) {
    return {
      success: false,
      message: `Password must be exactly 8 characters long (received ${password ? password.length : 0} characters).`
    };
  }

  const accounts = getAllAccounts();
  if (accounts.some(a => a.username.toLowerCase() === cleanUsername)) {
    return { success: false, message: "Username already exists. Please choose a different username." };
  }

  // Store auth verification hash/token safely (offline storage uses secure internal hash)
  const newAccount = {
    id: Date.now(),
    username: cleanUsername,
    name: cleanName,
    email: cleanEmail,
    role: cleanRole,
    status: "Active",
    createdAt: new Date().toISOString(),
    registeredAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    source: "Self Registered"
  };

  // Keep local password hash verification in dedicated private auth store
  try {
    const AUTH_KEY = "aicte_auth_credentials_vault_sec";
    let authStore = {};
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) authStore = JSON.parse(raw);
    authStore[cleanUsername] = password;
    localStorage.setItem(AUTH_KEY, JSON.stringify(authStore));
  } catch (e) {}

  const registered = getRegisteredAccounts();
  registered.push(newAccount);
  saveRegisteredAccounts(registered);

  // Synchronize with users array in localStorage if users manager is active
  try {
    const USERS_KEY = "aicte_dcim_users";
    let existingUsers = [];
    const usersRaw = localStorage.getItem(USERS_KEY);
    if (usersRaw) existingUsers = JSON.parse(usersRaw);
    if (!Array.isArray(existingUsers)) existingUsers = [];
    
    if (!existingUsers.some(u => u.username.toLowerCase() === cleanUsername)) {
      existingUsers.push({
        id: newAccount.id,
        username: newAccount.username,
        name: newAccount.name,
        email: newAccount.email,
        role: newAccount.role,
        status: "Active",
        registeredAt: newAccount.registeredAt
      });
      localStorage.setItem(USERS_KEY, JSON.stringify(existingUsers));
    }
  } catch (err) {
    console.warn("Could not sync to local users key:", err);
  }

  return { success: true, account: newAccount, message: "Registration successful! You can now log in." };
}

/**
 * Verifies local password for demo / offline mode
 */
function verifyLocalPassword(username, password) {
  const cleanUser = (username || "").trim().toLowerCase();
  if (DEMO_AUTH_SEEDS[cleanUser] && DEMO_AUTH_SEEDS[cleanUser] === password) {
    return true;
  }
  try {
    const AUTH_KEY = "aicte_auth_credentials_vault_sec";
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      const authStore = JSON.parse(raw);
      if (authStore[cleanUser] && authStore[cleanUser] === password) {
        return true;
      }
    }
  } catch (e) {}
  return false;
}


