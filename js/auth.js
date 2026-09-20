// AICTE Cybersecurity Portal - Authentication & Registration Controller

function recordAuditLog(logEntry) {
  const STORAGE_KEY = "aicte_dcim_audit_logs";
  let logs = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) logs = JSON.parse(raw);
  } catch (e) {
    logs = [];
  }
  if (!Array.isArray(logs)) logs = [];
  logs.unshift(logEntry);
  // Keep up to 200 most recent logs
  if (logs.length > 200) logs = logs.slice(0, 200);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error("Failed to save audit log to localStorage", e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const linkToRegister = document.getElementById("linkToRegister");
  const linkToLogin = document.getElementById("linkToLogin");
  const authAlert = document.getElementById("authAlert");

  // Inputs
  const regPassword = document.getElementById("regPassword");
  const regConfirmPassword = document.getElementById("regConfirmPassword");
  const passwordCharCounter = document.getElementById("passwordCharCounter");

  // Show Alert Utility
  function showAlert(message, type = "danger", autoHide = true) {
    if (!authAlert) return;
    authAlert.className = `auth-alert ${type}`;
    authAlert.textContent = message;
    authAlert.style.display = "block";

    if (autoHide && type !== "danger") {
      setTimeout(() => {
        authAlert.style.display = "none";
      }, 5000);
    }
  }

  function hideAlert() {
    if (authAlert) authAlert.style.display = "none";
  }

  // Tab Switching
  function switchTab(mode) {
    hideAlert();
    if (mode === "login") {
      tabLogin.classList.add("active");
      tabLogin.setAttribute("aria-selected", "true");
      tabRegister.classList.remove("active");
      tabRegister.setAttribute("aria-selected", "false");
      loginForm.style.display = "flex";
      registerForm.style.display = "none";
    } else {
      tabRegister.classList.add("active");
      tabRegister.setAttribute("aria-selected", "true");
      tabLogin.classList.remove("active");
      tabLogin.setAttribute("aria-selected", "false");
      registerForm.style.display = "flex";
      loginForm.style.display = "none";
    }
  }

  if (tabLogin) tabLogin.addEventListener("click", () => switchTab("login"));
  if (tabRegister) tabRegister.addEventListener("click", () => switchTab("register"));
  if (linkToRegister) linkToRegister.addEventListener("click", () => switchTab("register"));
  if (linkToLogin) linkToLogin.addEventListener("click", () => switchTab("login"));

  // Toggle Password Visibility
  function setupPasswordToggle(btnId, inputId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.addEventListener("click", () => {
      if (input.type === "password") {
        input.type = "text";
        btn.textContent = "🙈";
      } else {
        input.type = "password";
        btn.textContent = "👁️";
      }
    });
  }

  setupPasswordToggle("toggleLoginPassword", "password");
  setupPasswordToggle("toggleRegPassword", "regPassword");
  setupPasswordToggle("toggleRegConfirmPassword", "regConfirmPassword");

  // Real-time 8-Character Password Length Tracking & Validation
  if (regPassword && passwordCharCounter) {
    regPassword.addEventListener("input", () => {
      const len = regPassword.value.length;
      passwordCharCounter.textContent = `${len} / 8 characters`;

      if (len === 8) {
        passwordCharCounter.className = "char-counter valid";
      } else if (len > 0) {
        passwordCharCounter.className = "char-counter invalid";
      } else {
        passwordCharCounter.className = "char-counter";
      }
    });
  }

  const AUTH_API_BASE = (window.location.origin.includes(':5000'))
    ? 'http://localhost:5000/api'
    : (window.location.protocol === 'file:' ? 'http://localhost:5000/api' : (window.location.origin + '/api'));

  // ---------- 1. REGISTRATION SUBMIT HANDLER ----------
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();

      const name = document.getElementById("regFullName").value.trim();
      const username = document.getElementById("regUsername").value.trim().toLowerCase();
      const email = document.getElementById("regEmail").value.trim();
      const role = document.getElementById("regRole").value;
      const pass = regPassword.value;
      const confirmPass = regConfirmPassword.value;

      // Validate required fields
      if (!name || !username) {
        showAlert("Full Name and Username are required.", "danger");
        return;
      }

      // STRICT 8-CHARACTER PASSWORD VALIDATION
      if (pass.length !== 8) {
        showAlert(`Password length must be exactly 8 characters. (Currently: ${pass.length} characters)`, "danger");
        regPassword.focus();
        return;
      }

      // Validate Password Match
      if (pass !== confirmPass) {
        showAlert("Password and Confirm Password do not match.", "danger");
        regConfirmPassword.focus();
        return;
      }

      const registerBtn = document.getElementById("registerBtn");
      if (registerBtn) registerBtn.disabled = true;

      try {
        // Attempt backend registration
        const response = await fetch(`${AUTH_API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, username, email, role, password: pass }),
          signal: AbortSignal.timeout(4000)
        });

        const data = await response.json();

        if (!response.ok) {
          showAlert(data.error || "Registration failed on server.", "danger");
          if (registerBtn) registerBtn.disabled = false;
          return;
        }

        // Switch to Login tab and populate credentials for immediate login
        switchTab("login");
        const usernameInput = document.getElementById("username");
        const passwordInput = document.getElementById("password");
        if (usernameInput) usernameInput.value = username;
        if (passwordInput) passwordInput.value = pass;

        showAlert(`🎉 Registration successful for ${username}! Stored securely with salted PBKDF2 hash. You can now Sign In.`, "success", false);
        registerForm.reset();
        if (passwordCharCounter) {
          passwordCharCounter.textContent = "0 / 8 characters";
          passwordCharCounter.className = "char-counter";
        }
      } catch (err) {
        // Fallback for offline local dev mode
        const result = registerAccount({ name, username, email, role, password: pass });
        if (!result.success) {
          showAlert(result.message, "danger");
          if (registerBtn) registerBtn.disabled = false;
          return;
        }

        switchTab("login");
        const usernameInput = document.getElementById("username");
        const passwordInput = document.getElementById("password");
        if (usernameInput) usernameInput.value = username;
        if (passwordInput) passwordInput.value = pass;

        showAlert(`🎉 Registration successful for ${username}! (Saved locally). You can now Sign In.`, "success", false);
        registerForm.reset();
      } finally {
        if (registerBtn) registerBtn.disabled = false;
      }
    });
  }

  // ---------- 2. LOGIN SUBMIT HANDLER ----------
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();

      const user = document.getElementById("username").value.trim().toLowerCase();
      const pass = document.getElementById("password").value;

      const loginBtn = document.getElementById("loginBtn");
      if (loginBtn) loginBtn.disabled = true;

      try {
        // Attempt backend authenticated login
        const response = await fetch(`${AUTH_API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, password: pass }),
          signal: AbortSignal.timeout(4000)
        });

        const data = await response.json();

        if (response.ok && data.success) {
          sessionStorage.setItem("loggedIn", "true");
          sessionStorage.setItem("token", data.token);
          sessionStorage.setItem("username", data.user.username);
          sessionStorage.setItem("name", data.user.name);
          sessionStorage.setItem("role", data.user.role);
          sessionStorage.setItem("sessionAuditLogged", "true");

          window.location.href = "dashboard.html";
          return;
        } else {
          showAlert(data.error || "Authentication failed.", "danger");
          if (loginBtn) loginBtn.disabled = false;
          return;
        }
      } catch (err) {
        // Offline development fallback
        const accounts = getAllAccounts();
        const account = accounts.find(a => a.username.toLowerCase() === user);

        if (account && typeof verifyLocalPassword === "function" && verifyLocalPassword(user, pass)) {
          if (account.status && account.status !== "Active") {
            showAlert("This account has been deactivated by Super Admin.", "danger");
            if (loginBtn) loginBtn.disabled = false;
            return;
          }

          sessionStorage.setItem("loggedIn", "true");
          sessionStorage.setItem("username", account.username);
          sessionStorage.setItem("name", account.name);
          sessionStorage.setItem("role", account.role);
          sessionStorage.setItem("sessionAuditLogged", "true");

          window.location.href = "dashboard.html";
        } else {
          showAlert("Invalid username or password. Please verify credentials.", "danger");
        }
      } finally {
        if (loginBtn) loginBtn.disabled = false;
      }
    });
  }
});

