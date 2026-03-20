const { contextBridge, ipcRenderer } = require("electron");

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

// Expose a safe API to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // ── App Info ────────────────────────────────────────────────────
  getAppInfo: () => ipcRenderer.invoke("get-app-info"),
  openLogFile: () => ipcRenderer.invoke("open-log-file"),

  // ── Auto-Updater ─────────────────────────────────────────────────
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  installUpdate: () => ipcRenderer.invoke("install-update"),

  // ── Update Events (renderer listens) ─────────────────────────────
  onUpdateStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("update-status", handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener("update-status", handler);
  },
  addProduct: (product) => ipcRenderer.invoke("add-product", product),
  toast: (msg) => toast.show(msg),
  login: (credentials) => ipcRenderer.invoke("login", credentials),
  addUser: (userInfo) => ipcRenderer.invoke("add-user", userInfo),
  getUserInfo: (username) => ipcRenderer.invoke("get-user-info", username),
});
