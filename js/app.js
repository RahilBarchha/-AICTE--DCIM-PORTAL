let currentSection = "home";

const APP_API_BASE = (window.location.origin.includes(':5000'))
  ? 'http://localhost:5000/api'
  : (window.location.protocol === 'file:' ? 'http://localhost:5000/api' : (window.location.origin + '/api'));

window.onload = async () => {
  if (!sessionStorage.getItem("loggedIn")) {
    window.location.href = "index.html";
    return;
  }

  const token = sessionStorage.getItem("token");

  // Validate session token with backend if online
  if (token) {
    try {
      const res = await fetch(`${APP_API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(2500)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          sessionStorage.setItem("username", data.user.username);
          sessionStorage.setItem("name", data.user.name);
          sessionStorage.setItem("role", data.user.role);
        }
      } else if (res.status === 401 || res.status === 403) {
        sessionStorage.clear();
        window.location.href = "index.html";
        return;
      }
    } catch (err) {
      // Backend temporarily offline, continue with session cached data
    }
  }

  const currentUsername = sessionStorage.getItem("username") || "user";
  const currentRole = sessionStorage.getItem("role") || "User";
  const currentName = sessionStorage.getItem("name") || currentUsername;

  const usernameLabel = document.getElementById("current-user");
  if (usernameLabel) usernameLabel.textContent = currentName;

  const roleLabel = document.getElementById("current-role");
  if (roleLabel) roleLabel.textContent = currentRole;

  // Record login in audit log
  if (!sessionStorage.getItem("sessionAuditLogged")) {
    if (typeof addLog === "function") {
      addLog({
        user: currentUsername,
        role: currentRole,
        action: "User Login",
        target: "Portal Auth / Ops Console",
        ip: "127.0.0.1",
        result: "Success",
        details: `Authorized login as ${currentRole} (${currentName})`
      });
      sessionStorage.setItem("sessionAuditLogged", "true");
    }
  }

  // Sidebar Controls
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const menuToggle = document.getElementById("menuToggle");

  const closeDrawer = () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("open");
  };

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      backdrop.classList.toggle("open");
    });
  }
  if (backdrop) backdrop.addEventListener("click", closeDrawer);

  const sidebarItems = document.querySelectorAll(".sidebar li[data-section]");
  sidebarItems.forEach(item => {
    item.addEventListener("click", () => {
      sidebarItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      loadSection(item.dataset.section);
      closeDrawer();
    });
  });

  // Logout Handler
  document.getElementById("logout").addEventListener("click", () => {
    const actor = sessionStorage.getItem("username") || "user";
    const actorRole = sessionStorage.getItem("role") || "";
    if (typeof addLog === "function") {
      addLog({
        user: actor,
        role: actorRole,
        action: "User Logout",
        target: "Portal Auth / Ops Console",
        ip: "127.0.0.1",
        result: "Success",
        details: `Clean sign-out for ${actor}`
      });
    }
    sessionStorage.clear();
    window.location.href = "index.html";
  });

  // React Bits Live Clock in Top Header
  const liveClockEl = document.getElementById("liveClock");
  if (liveClockEl) {
    const updateClock = () => {
      const now = new Date();
      liveClockEl.textContent = now.toLocaleTimeString("en-US", { hour12: false }) + " UTC/IST";
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  // Global Search Shortcut & Trigger (Ctrl + K or Click)
  const jumpToSearch = () => {
    const serversNav = document.querySelector('.sidebar li[data-section="servers"]');
    if (serversNav) {
      serversNav.click();
      setTimeout(() => {
        const searchBox = document.querySelector('.server-search-card input');
        if (searchBox) {
          searchBox.focus();
          searchBox.select();
        }
      }, 100);
    }
  };

  const globalSearchTrigger = document.getElementById("globalSearchTrigger");
  if (globalSearchTrigger) {
    globalSearchTrigger.addEventListener("click", jumpToSearch);
  }

  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      jumpToSearch();
    }
  });

  // Dynamic Mouse Spotlight Tracking for React Bits Aesthetic
  document.addEventListener("mousemove", (e) => {
    const cards = document.querySelectorAll(".spotlight-card, .stat-card");
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    });
  });

  loadSection("home"); // default
  startMonitoring(); // background metrics + auto-alerting begins immediately
};

function loadSection(section) {
  currentSection = section;
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = ""; // clear

  switch (section) {
    case "home":
      renderDashboard(app);
      break;
    case "servers":
      renderServers(app);
      break;
    case "loadbalancers":
    case "loadbalancer":
      renderLoadBalancers(app);
      break;
    case "network":
    case "networks":
      renderNetwork(app);
      break;
    case "hardware":
      renderHardware(app);
      break;
    case "licenses":
      renderLicenses(app);
      break;
    case "alerts":
      renderAlerts(app);
      break;
    case "users":
      renderUsers(app);
      break;
    case "reports":
      renderReports(app);
      break;
    case "audit":
      renderAudit(app);
      break;
    case "monitoring":
      renderMonitoring(app);
      break;
    case "ai-assistant":
      renderAiAssistant(app);
      break;
    default:
      app.innerHTML = `<h2>${section}</h2><p>Section under construction</p>`;
  }
}
