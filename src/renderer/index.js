// ─── setting resused variables────────────────────────────────────────────────

// const toast = window.electronAPI.toast;

const toast = {
  show: function (msg) {
    let toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = msg;
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.left = "10%";
    toast.style.transform = "translateX(-50%)";
    toast.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    toast.style.color = "#fff";
    toast.style.padding = "10px 20px";
    toast.style.borderRadius = "5px";
    toast.style.fontSize = "14px";
    toast.style.zIndex = "1000";

    document.body.appendChild(toast);
    setTimeout(function () {
      toast.classList.add("show");
    }, 100);
    setTimeout(
      function () {
        toast.classList.remove("show");
        setTimeout(function () {
          document.body.removeChild(toast);
        }, 300);
      },

      3000,
    );
  },
};

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
  if (user && user.name) {
    document.getElementById("user-name").textContent = user.name;
  }
}

function setIframeTheme(theme) {
  const iframe = document.getElementById("content_frame");
  if (!iframe || !iframe.contentDocument) return;
  try {
    iframe.contentDocument.body.classList.toggle(
      "light-theme",
      theme === "light",
    );
  } catch (ex) {
    // Cross-origin or access issue (shouldn't happen in local app) should not break selection.
    console.warn("Could not set iframe theme", ex);
  }
}

function applyTheme(theme, skipSave = false) {
  if (!theme) return;
  document.body.classList.toggle("light-theme", theme === "light");
  setIframeTheme(theme);
  if (!skipSave) {
    localStorage.setItem("theme", theme);
  }
  document.getElementById("knob").innerText = theme === "light" ? "🌞" : "🌙";
  // const items = document.querySelectorAll(
  //   ".profile-menu-item[data-action='set-theme']",
  // );
  // items.forEach((button) => {
  //   button.classList.toggle("active", button.dataset.theme === theme);
  // });
  toast.show(`Theme set to ${theme}.`);
}

function logout() {
  localStorage.removeItem("username");
  sessionStorage.removeItem("token");
  user = null;
  document.getElementById("user-name").textContent = "Guest";

  const loginPage = document.querySelector(".login-page");
  const mainPage = document.querySelector(".main-page");
  if (loginPage && mainPage) {
    loginPage.classList.remove("hide");
    loginPage.classList.add("active");
    mainPage.classList.remove("active");
    mainPage.classList.add("hide");
  }
  toast.show("Logged out successfully.");
}

function initProfileMenu() {
  const profileContainer = document.getElementById("profile-container");
  const logout_btn = document.getElementById("logout-btn");
  const profileMenu = document.getElementById("profile-menu");

  if (!profileContainer || !profileMenu) return;

  profileContainer.addEventListener("click", (event) => {
    event.stopPropagation();
    profileMenu.classList.toggle("hide");
  });
  logout_btn.addEventListener("click", (event) => {
    event.stopPropagation();
    logout();
  });
}

// toggle theme
const switch_ele = document.getElementById("myToggle");
const toggleInput = document.getElementById("toggleInput");

function toggleTheme(isChecked) {
  toggleInput.checked = !!isChecked;
  switch_ele.classList.toggle("on", isChecked);
  switch_ele.classList.toggle("aria-checked", isChecked ? "true" : "false");
  const theme = isChecked ? "light" : "dark";
  applyTheme(theme);
}
switch_ele.addEventListener("click", () => toggleTheme(!toggleInput.checked));
toggleInput.addEventListener("change", toggleTheme);

function initTheme() {
  const theme = localStorage.getItem("theme") || "dark";
  // applyTheme(theme, true);
  toggleTheme(theme === "light");
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadAppInfo();
  initTheme();
  initProfileMenu();

  const savedUsername = localStorage.getItem("username");
  if (savedUsername) {
    await loadUserInfo(savedUsername);
  }

  const contentFrame = document.getElementById("content_frame");
  if (contentFrame) {
    contentFrame.addEventListener("load", () => {
      const theme = localStorage.getItem("theme") || "dark";
      setIframeTheme(theme);
    });
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
    toast.show("Please enter both username and password.");
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

      if (user.role != "Administrator") {
        document.querySelectorAll(".only-admin").forEach((item) => {
          item.remove();
        });
      }
    }
  } catch (err) {
    toast.show("Login failed: " + err.message);
  }
});
