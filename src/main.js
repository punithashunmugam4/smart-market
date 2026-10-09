// const {
//   app,
//   BrowserWindow,
//   ipcMain,
//   dialog,
//   shell,
//   Menu,
//   Tray,
//   globalShortcut,
// } = require("electron");
// // const contextMenu = require("electron-context-menu");
// const log = require("electron-log");
// const path = require("path");
// const Database = require("better-sqlite3");
// const fs = require("fs");

import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Menu,
  Tray,
  globalShortcut,
} from "electron";
// const contextMenu = require("electron-context-menu");
import log from "electron-log";
import path from "path";
import Database from "better-sqlite3";
import fs from "fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log("Current directory:", __dirname);

// ─── Database handling in db file───────────────────────────────────────────────
let dbDir, db;
if (app.isPackaged) {
  // prefer resources/db created via extraResources in the build config:
  dbDir = path.join(process.resourcesPath, "electron_db");
  // alternative: if you used asarUnpack, use:
  // dbDir = path.join(process.resourcesPath, "app.asar.unpacked", "db");
} else {
  // development: keep DB in project folder (next to app files)
  dbDir = path.join(app.getAppPath(), "electron_db");
}

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, "dbstore.db");
try {
  db = new Database(dbPath);
} catch (err) {
  console.error("Failed to open DB at", dbPath, err);
  const fallback = path.join(app.getPath("temp"), "dbstore-fallback.db");
  console.warn("Using fallback DB at", fallback);
  db = new Database(fallback);
}
db.pragma("journal_mode = WAL");
db.pragma("cache_size = 32000");
console.log(db.pragma("cache_size", { simple: true }));

db.exec(`
  CREATE TABLE IF NOT EXISTS "Users" (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    contact TEXT,
    address TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
//testing
db.prepare(
  `INSERT INTO "Users" (name, username, password, role) VALUES (?, ?, ?, ?)`,
).run("Sumathi", "sumathi", "12345", "employee");
db.prepare(
  `INSERT INTO "Users" (name, username, password, role) VALUES (?, ?, ?, ?)`,
).run("Punitha Shunmugam", "punitha", "12345", "Administrator");
//testing code ends here

db.exec(`
  CREATE TABLE IF NOT EXISTS "Stock" (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    price REAL  NOT NULL,
    stock_quantity INTEGER NOT NULL,
    stock_threshold INTEGER NOT NULL,
    unit TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    history JSON
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS "Bills" (
    sales_id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller TEXT NOT NULL,
    buyer TEXT NOT NULL,
    total_amount REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    bill_details JSON
  );
`);


// ─── Dev Mode ────────────────────────────────────────────────────────────────
const isDev = process.argv.includes("--dev") || !app.isPackaged;


let mainWindow = null;
let tray = null;

// ─── Window Creation ─────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 600,
    minHeight: 400,
    title: "My Electron App",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "../assets/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      enableRemoteModule: false,
      webviewTag: true,
      nodeIntegration: true,
      backgroundThrottling: false,
      nativeWindowOpen: true,
      contextIsolation: true,
      // sandbox: false,
      webSecurity: false,
    },
    show: false, // Wait until ready-to-show
    backgroundColor: "#1a1a2e",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
  });
  // contextMenu({
  //   window: mainWindow,
  //   showInspectElement: true,
  // });
  // mainWindow.webContents.session.registerPreloadScript(path.join(__dirname, "preload.js"))  ;
  mainWindow.loadFile(path.join(__dirname, "renderer/index.html"));

  // Show window when fully loaded
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.maximize();
    if (isDev) mainWindow.webContents.openDevTools();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// ─── App Menu ─────────────────────────────────────────────────────────────────
function createMenu() {
  const template = [
    ...(process.platform === "darwin"
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        process.platform === "darwin" ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        ...(isDev ? [{ role: "toggleDevTools" }] : []),
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Check for Updates",
          click: () => checkForUpdates(true),
        },
        {
          label: `Version ${app.getVersion()}`,
          enabled: false,
        },
        { type: "separator" },
        {
          label: "Open Log File",
          click: () => shell.openPath(log.transports.file.getFile().path),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── Auto-Updater Logic ──────────────────────────────────────────────────────
function checkForUpdates(manual = false) {
   if (app.isPackaged) {
    try {
      const updaterPath = path.join(app.getAppPath(), "updater.js");
      if (fs.existsSync(updaterPath)) {
        const updater = requireC(updaterPath);
        if (updater && typeof updater.checkForFileUpdates === "function") {
          updater
            .checkForFileUpdates().then((data)=>{
              if(!data){
              log.info("No update available.");
              sendToRenderer("update-status", { status: "up-to-date" });
              }
              else{
                 log.info("Update available:", data.version);
                sendToRenderer("update-status", {
                status: "available",
                version: data.manifestVersion,
                releaseNotes: data.releaseNotes,
                })
             
              dialog
              .showMessageBox(mainWindow, {
                type: "info",
                title: "Update Available",
                message: `Version ${data.manifestVersion} is available!`,
                detail:
                  "Would you like to download it now? The app will restart to apply the update.",
                buttons: ["Update now", "Later"],
                defaultId: 0,
                cancelId: 1,
              })
              .then(({ response }) => {
                if (response === 0) {
                  updater.downloadUpdate();
                }
              });
            }
            })
            .catch((err) => log.error("Updater error:", err));
        } else {
          console.log("No checkForFileUpdates export; skipping updater");
          log.info("No checkForFileUpdates export; skipping updater");
        }
      } else {
        console.log("No updater.js found; skipping updates");
        log.info("No updater.js found; skipping updates");
      }
    } catch (err) {
      console.error("Failed to run updater:", err);
      log.error("Failed to run updater:", err);
    }
  } else {
    console.log("Development mode detected; skipping update check.");
    log.info("Development mode detected; skipping update check.");
  }
}

const update_download_progress= (progressObj) => {
  log.info(
    `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`,
  );
  sendToRenderer("update-status", {
    status: "downloading",
    percent: Math.round(progressObj.percent),
    transferred: progressObj.transferred,
    total: progressObj.total,
    bytesPerSecond: progressObj.bytesPerSecond,
  });
};



// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle("get-app-info", () => ({
  version: app.getVersion(),
  name: app.getName(),
  platform: process.platform,
  isDev,
}));

ipcMain.handle("check-for-updates", () => {
  checkForUpdates(true);
});

ipcMain.handle("install-update", () => {
  quitAndInstall(false, true);
});

ipcMain.handle("open-log-file", () => {
  shell.openPath(log.transports.file.getFile().path);
});

const getUserInfo = async (username) => {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(`SELECT * FROM "Users" WHERE username = ?`);
      const user = stmt.get(username);
      if (user) {
        resolve(user);
      } else {
        reject(new Error("User not found"));
      }
    } catch (err) {
      reject(err);
    }
  });
};

const getEmployees = () => {
  const rows = db.prepare(`SELECT * FROM "Users" ORDER BY rowid ASC`).all();

  return rows.map((row) => ({
    id: row.user_id ?? row.id ?? row.rowid,
    name: row.name,
    username: row.username,
    role: row.role,
    contact: row.contact,
    address: row.address,
    timestamp: row.timestamp,
  }));
};

const handleAddUser = async (event, obj) => {
  if (!obj || !obj.name || !obj.new_username || !obj.password) {
    return { success: false, error: "Please fill in all required fields." };
  }

  try {
    const existingUser = db
      .prepare(`SELECT * FROM "Users" WHERE username = ?`)
      .get(obj.new_username);

    if (existingUser) {
      return { success: false, error: "Username already exists." };
    }

    const result = db.prepare(
      `INSERT INTO "Users" (name, username, password, role, contact, address) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      obj.name,
      obj.new_username,
      obj.password,
      obj.role || "Employee",
      obj.contact || "",
      obj.address || "",
    );

    return {
      success: true,
      user: {
        id: result.lastInsertRowid,
        name: obj.name,
        username: obj.new_username,
        role: obj.role || "Employee",
        contact: obj.contact || "",
        address: obj.address || "",
      },
    };
  } catch (err) {
    log.error("Failed to add user:", err);
    return { success: false, error: err.message || "Unable to add user." };
  }
};

ipcMain.handle("login", async (event, credentials) => {
  log.info(
    "Login attempt for user:",
    credentials.username,
    credentials.password,
  );
  try {
    let user = await getUserInfo(credentials.username);
    if (!user) {
      log.warn("Login failed - user not found:", credentials.username);
      return { success: false, message: "Invalid username or password." };
    }
    if (user.password === credentials.password) {
      log.info("Login successful for user:", credentials.username);
      let token = `token-${Date.now()}-${Math.random().toString(36)}`;
      return { success: true, user, token, message: "Login successful!" };
    } else {
      log.warn(
        "Login failed - incorrect password for user:",
        credentials.username,
      );
      return { success: false, message: "Invalid username or password." };
    }
  } catch (err) {
    log.error("Login error for user:", credentials.username, err);
    return { success: false, message: "An error occurred during login." };
  }
});

ipcMain.handle("get-user-info", async (event, username) => {
  try {
    const user = await getUserInfo(username);
    console.log("User info retrieved:", user);
    return user;
  } catch (err) {
    console.error("Failed to get user info:", err);
    return null;
  }
});

ipcMain.handle("get-employees", async () => {
  try {
    return getEmployees();
  } catch (err) {
    console.error("Failed to get employees:", err);
    return [];
  }
});

ipcMain.handle("add-user", async (event, obj) => {
  return handleAddUser(event, obj);
});

ipcMain.handle("add-user-info", async (event, obj) => {
  return handleAddUser(event, obj);
});

ipcMain.handle("add-product", async (event, product) => {
  log.info("Adding product:", product);
  try {
    let historyEntry = {
      [new Date().toISOString()]: {
        user: product.user,
        price: product.price,
        stock_quantity: product.stock_quantity,
      },
    };

    //check if already exists
    const existing = db
      .prepare(`SELECT * FROM "Stock" WHERE product_name = ?`)
      .get(product.product_name);
    if (existing) {
      return { success: false, error: "KEY_EXISTS" };
    }
    const add_new = db.prepare(
      `INSERT INTO "Stock" (product_name, price, stock_quantity,stock_threshold, unit, history) VALUES (?, ?, ?, ?, ?,?)`,
    );
    const info = add_new.run(
      product.product_name,
      product.price,
      product.stock_quantity,
      product.stock_threshold,
      product.unit,
      JSON.stringify([historyEntry]),
    );
    console.log("info changes: ", info.changes);
    return {
      success: true,
      data: info,
      message: "Product added successfully!",
    };
  } catch (err) {
    // unique constraint -> key already exists
    if (
      err &&
      (err.code === "SQLITE_CONSTRAINT" ||
        /UNIQUE|CONSTRAINT/i.test(err.message))
    ) {
      return { success: false, error: "KEY_EXISTS" };
    }
    return { success: false, error: String(err) };
  }
});

ipcMain.handle("get-stock-items", async () => {
  try {
    const stmt = db.prepare(`SELECT * FROM "Stock"`);
    const items = stmt.all();
    console.log("Stock items retrieved:", items);
    return { success: true, data: items };
  } catch (err) {
    return { success: false, error: String(err) };
  }
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
  globalShortcut.register("CommandOrControl+I", () => {
    mainWindow.openDevTools();
  });
  // Check for updates 3 seconds after launch (not on first run in dev)
  if (!isDev) {
    setTimeout(() => checkForUpdates(), 3000);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Handle single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
