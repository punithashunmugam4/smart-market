const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // ── App Info ────────────────────────────────────────────────────
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  openLogFile: () => ipcRenderer.invoke('open-log-file'),

  // ── Auto-Updater ─────────────────────────────────────────────────
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),

  // ── Update Events (renderer listens) ─────────────────────────────
  onUpdateStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-status', handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener('update-status', handler);
  }
});
