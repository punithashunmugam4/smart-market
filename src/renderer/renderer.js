// ─── setting resused variables────────────────────────────────────────────────

const toast = window.electronAPI.toast;

// ─── App Info ────────────────────────────────────────────────────────────────
async function loadAppInfo() {
  const info = await window.electronAPI.getAppInfo();
  document.getElementById("app-version").textContent = `v${info.version}`;
}

// ─── User Info ───────────────────────────────────────────────────────────────
let user = null;
async function loadUserInfo(username) {
  user = await window.electronAPI.getUserInfo(username);
  console.log("Loaded user info:", user);
  // document.getElementById("user-name").textContent = user.name;
}

// ─── Navigation ─────────────────────────────────────────────────────────────
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    document
      .querySelectorAll(".nav-item")
      .forEach((n) => n.classList.remove("active"));
    document
      .querySelectorAll(".page")
      .forEach((p) => p.classList.remove("active"));
    item.classList.add("active");
    document
      .getElementById(`page-${item.dataset.page}`)
      .classList.add("active");
  });
});

document.addEventListener("DOMContentLoaded", async () => {
  await loadAppInfo();
  if (localStorage.getItem("username")) {
    await loadUserInfo(localStorage.getItem("username"));
  }
});

// ─── Login Handling ─────────────────────────────────────────────────────────────

document.getElementById("show-password").addEventListener("change", (e) => {
  const passwordInput = document.getElementById("login-password");
  passwordInput.type = e.target.checked ? "text" : "password";
});

document.getElementById("login-submit").addEventListener("click", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  console.log("Attempting login with:", { username, password });
  if (!username || !password) {
    toast("Please enter both username and password.");
    return;
  }

  try {
    const loginResult = await window.electronAPI.login({
      username: username,
      password: password,
    });
    if (loginResult.success) {
      user = loginResult.user;
      localStorage.setItem("username", username);
      sessionStorage.setItem("token", loginResult.token);
      const login_page = document.querySelector(".login-page");
      const main_page = document.querySelector(".main-page");
      login_page.classList.remove("active");
      login_page.classList.add("hide");
      main_page.classList.add("active");
      main_page.classList.remove("hide");
      document.getElementById("user-name").textContent = user.name;

      if (user.role === "Administrator") {
        document.querySelectorAll(".only-admin").forEach((item) => {
          item.classList.remove("hide");
        });
      }
    }
  } catch (err) {
    toast("Login failed: " + err.message);
  }
});

// ─── New User Handling ─────────────────────────────────────────────────────
document
  .getElementById("submit-new-employee")
  .addEventListener("click", async (e) => {
    e.preventDefault();
    const name = document.getElementById("new-employee-name").value.trim();
    const new_username = document
      .getElementById("new-employee-username")
      .value.trim();
    const password = document.getElementById("new-employee-password").value;
    const role = document.getElementById("new-employee-role").value;
    const contact = document
      .getElementById("new-employee-contact")
      .value.trim();
    const address = document
      .getElementById("new-employee-address")
      .value.trim();
    if (!name || !new_username || !password) {
      toast("Please fill in all fields.");
      return;
    }
    await window.electronAPI
      .addUser({
        username: localStorage.getItem("username"),
        name,
        new_username: new_username,
        password,
        role,
        contact,
        address,
      })
      .then((response) => {
        if (response.success) {
          toast("User added successfully!");
        } else {
          toast(`Failed to add user: ${response.error}`);
        }
      });

    // Clear form

    document.getElementById("new-employee-name").value = "";
    document.getElementById("new-employee-username").value = "";
    document.getElementById("new-employee-password").value = "";
    document.getElementById("new-employee-role").value = "Employee";
    document.getElementById("new-employee-contact").value = "";
    document.getElementById("new-employee-address").value = "";
  });

// ─── Update UI ───────────────────────────────────────────────────────────────
const statusMessages = {
  checking: {
    title: "Checking for updates…",
    detail: "Contacting GitHub Releases…",
    dot: "checking",
  },
  available: {
    title: "Update available!",
    detail: "A new version is ready to download.",
    dot: "available",
  },
  "up-to-date": {
    title: "You're up to date ✓",
    detail: "You have the latest version.",
    dot: "up-to-date",
  },
  downloading: {
    title: "Downloading update…",
    detail: "Please wait…",
    dot: "downloading",
  },
  downloaded: {
    title: "Update ready to install ✓",
    detail: "Restart to apply the update.",
    dot: "downloaded",
  },
  error: {
    title: "Update check failed",
    detail: "See log file for details.",
    dot: "error",
  },
};

function setUpdateStatus(status, extra = {}) {
  const cfg = statusMessages[status] ?? statusMessages.error;

  const dot = document.getElementById("status-dot");
  const title = document.getElementById("status-title");
  const detail = document.getElementById("status-detail");
  const installBtn = document.getElementById("btn-install");
  const progressWrap = document.getElementById("progress-wrap");

  dot.className = `status-dot ${cfg.dot}`;
  title.textContent = extra.version
    ? `${cfg.title} (v${extra.version})`
    : cfg.title;

  if (status === "error" && extra.message) {
    detail.textContent = extra.message;
  } else if (status === "downloading" && extra.percent !== undefined) {
    const speed = extra.bytesPerSecond
      ? ` · ${(extra.bytesPerSecond / 1024).toFixed(1)} KB/s`
      : "";
    detail.textContent = `${extra.percent}% downloaded${speed}`;
  } else {
    detail.textContent = cfg.detail;
  }

  // Progress bar
  if (status === "downloading") {
    progressWrap.classList.add("visible");
    document.getElementById("progress-fill").style.width =
      `${extra.percent ?? 0}%`;
    document.getElementById("progress-label").textContent =
      `${extra.percent ?? 0}%`;
  } else {
    progressWrap.classList.remove("visible");
  }

  // Install button
  installBtn.style.display = status === "downloaded" ? "inline-block" : "none";
}

// ─── Listen for Update Events from Main ──────────────────────────────────────
window.electronAPI.onUpdateStatus((data) => {
  setUpdateStatus(data.status, data);
});

// ─── Buttons ─────────────────────────────────────────────────────────────────
document.getElementById("btn-check").addEventListener("click", async () => {
  setUpdateStatus("checking");
  await window.electronAPI.checkForUpdates();
});

document.getElementById("btn-install").addEventListener("click", async () => {
  await window.electronAPI.installUpdate();
});

document.getElementById("btn-log").addEventListener("click", async () => {
  await window.electronAPI.openLogFile();
});

document
  .getElementById("submit-new-product")
  .addEventListener("click", async (e) => {
    e.preventDefault();
    const product_name = document.getElementById("product-name").value.trim();
    const price = parseFloat(document.getElementById("product-price").value);
    const stock_quantity = document.getElementById("product-stock").value;
    const stock_threshold = document.getElementById(
      "product-stock-threshold",
    ).value;
    const unit = document.getElementById("product-unit").value.trim();

    if (!name || isNaN(price) || price < 0) {
      alert("Please enter a valid product name and price.");
      return;
    }

    // Send new product data to main process
    await window.electronAPI
      .addProduct({
        user,
        product_name,
        price,
        stock_quantity,
        stock_threshold,
        unit,
      })
      .then((response) => {
        if (response.success) {
          toast("Product added successfully!");
        } else {
          toast(`Failed to add product: ${response.error}`);
        }
      });

    // Clear form
    document.getElementById("product-name").value = "";
    document.getElementById("product-price").value = "";
    document.getElementById("product-stock").value = "";
    document.getElementById("product-stock-threshold").value = "";
    document.getElementById("product-unit").value = "";
  });
