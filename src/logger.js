const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { app } = require("electron");
// Prefer the app installation directory, but fall back to userData or cwd if not writable
let targetDir = path.resolve(process.cwd());
try {
  if (app && typeof app.getAppPath === "function") {
    targetDir = app.getAppPath();
  }
} catch (err) {
  // ignore and keep cwd as fallback
}

// Ensure the logs directory is writable; if not, fall back to userData then cwd
let logsDir = path.join(targetDir, "logs");
try {
  fs.mkdirSync(logsDir, { recursive: true });
} catch (err) {
  try {
    if (app && typeof app.getPath === "function") {
      targetDir = app.getPath("userData");
      logsDir = path.join(targetDir, "logs");
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch (err2) {
    // final fallback to cwd
    targetDir = path.resolve(process.cwd());
    logsDir = path.join(targetDir, "logs");
    fs.mkdirSync(logsDir, { recursive: true });
  }
}
const dbPath = path.join(targetDir, "logs", "logger.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT,
    metadata TEXT
  )
`,
).run();

const insertLog = db.prepare(
  "INSERT INTO logs (timestamp, level, message, metadata) VALUES (?, ?, ?, ?)",
);

const deletelog = db.prepare(`
  DELETE FROM logs 
  WHERE timestamp < datetime('now', '-30 days')
`);
deletelog.run();
console.log("Deleted old log entries");
function serializeMetadata(metadata) {
  if (metadata === undefined || metadata === null) {
    return "";
  }
  if (typeof metadata === "string") {
    return metadata;
  }
  try {
    return JSON.stringify(metadata);
  } catch (err) {
    return String(metadata);
  }
}

function write(level, message, metadata = "") {
  insertLog.run(
    new Date().toISOString(),
    level,
    String(message),
    serializeMetadata(metadata),
  );
}

function info(message, metadata) {
  write("info", message, metadata);
}

function warn(message, metadata) {
  write("warn", message, metadata);
}

function error(message, metadata) {
  write("error", message, metadata);
}

function debug(message, metadata) {
  write("debug", message, metadata);
}

module.exports = {
  log: write,
  info,
  warn,
  error,
  debug,
  dbPath,
};
