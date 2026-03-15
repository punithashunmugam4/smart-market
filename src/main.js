const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');

// ─── Logging Setup ───────────────────────────────────────────────────────────
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// ─── Dev Mode ────────────────────────────────────────────────────────────────
const isDev = process.argv.includes('--dev') || !app.isPackaged;

// ─── Auto-Updater Config ─────────────────────────────────────────────────────
autoUpdater.autoDownload = false;         // Ask user before downloading
autoUpdater.autoInstallOnAppQuit = true;  // Install on next quit

let mainWindow = null;
let tray = null;

// ─── Window Creation ─────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 600,
    minHeight: 400,
    title: 'My Electron App',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,   // Security: isolate renderer from Node
      nodeIntegration: false,   // Security: no direct Node in renderer
      sandbox: false
    },
    show: false,                // Wait until ready-to-show
    backgroundColor: '#1a1a2e',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Show window when fully loaded
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools();
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ─── App Menu ─────────────────────────────────────────────────────────────────
function createMenu() {
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates',
          click: () => checkForUpdates(true)
        },
        {
          label: `Version ${app.getVersion()}`,
          enabled: false
        },
        { type: 'separator' },
        {
          label: 'Open Log File',
          click: () => shell.openPath(log.transports.file.getFile().path)
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── Auto-Updater Logic ──────────────────────────────────────────────────────
function checkForUpdates(manual = false) {
  if (isDev) {
    if (manual) dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Dev Mode',
      message: 'Auto-update is disabled in development mode.'
    });
    return;
  }
  autoUpdater.checkForUpdates();
}

autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...');
  sendToRenderer('update-status', { status: 'checking' });
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info.version);
  sendToRenderer('update-status', {
    status: 'available',
    version: info.version,
    releaseNotes: info.releaseNotes
  });

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `Version ${info.version} is available!`,
    detail: 'Would you like to download it now? The app will restart to apply the update.',
    buttons: ['Download Now', 'Later'],
    defaultId: 0,
    cancelId: 1
  }).then(({ response }) => {
    if (response === 0) {
      autoUpdater.downloadUpdate();
    }
  });
});

autoUpdater.on('update-not-available', () => {
  log.info('No update available.');
  sendToRenderer('update-status', { status: 'up-to-date' });
});

autoUpdater.on('download-progress', (progressObj) => {
  log.info(`Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`);
  sendToRenderer('update-status', {
    status: 'downloading',
    percent: Math.round(progressObj.percent),
    transferred: progressObj.transferred,
    total: progressObj.total,
    bytesPerSecond: progressObj.bytesPerSecond
  });
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info.version);
  sendToRenderer('update-status', {
    status: 'downloaded',
    version: info.version
  });

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: `Version ${info.version} has been downloaded.`,
    detail: 'Restart the application to apply the update.',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
    cancelId: 1
  }).then(({ response }) => {
    if (response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });
});

autoUpdater.on('error', (err) => {
  log.error('Auto-updater error:', err);
  sendToRenderer('update-status', {
    status: 'error',
    message: err.message
  });
});

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('get-app-info', () => ({
  version: app.getVersion(),
  name: app.getName(),
  platform: process.platform,
  isDev
}));

ipcMain.handle('check-for-updates', () => {
  checkForUpdates(true);
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('open-log-file', () => {
  shell.openPath(log.transports.file.getFile().path);
});

// ─── Helper ──────────────────────────────────────────────────────────────────
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createMenu();

  // Check for updates 3 seconds after launch (not on first run in dev)
  if (!isDev) {
    setTimeout(() => checkForUpdates(), 3000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handle single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
