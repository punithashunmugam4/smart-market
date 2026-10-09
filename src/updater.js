import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import electron from "electron";
const { app } = electron;

function getLocalVersion() {
  const appPath = app.getAppPath();
  const persistedVersionFile = path.join(appPath, "version.json");

  if (fs.existsSync(persistedVersionFile)) {
    try {
      const payload = JSON.parse(fs.readFileSync(persistedVersionFile, "utf8"));
      if (payload && typeof payload.version === "string") {
        return payload.version;
      }
    } catch (err) {
      console.warn("Failed to read persisted version file:", err);
    }
  }

  try {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(app.getAppPath(), "package.json"), "utf8"),
    );
    if (pkgJson && typeof pkgJson.version === "string") {
      return pkgJson.version;
    }
  } catch (err) {
    console.warn("Failed to read package.json version:", err);
  }

  if (typeof app.getVersion === "function") {
    return app.getVersion();
  }

  return "0.0.0";
}


function restartApp() {
  app.relaunch();
  app.exit(0);
}


 async function check_if_new_version_available() {
  const currentVersion = getLocalVersion();
  const githubUser = "punithashunmugam4";
  const githubRepo = "smart-market";
  const branch = "main";
  const baseUrl = `https://raw.githubusercontent.com/${githubUser}/${githubRepo}/${branch}`;

  try {
    const response = await fetch(`${baseUrl}/src/manifest.json`);
    if (!response.ok) {
      console.warn(`Update manifest request failed with status ${response.status}`);
      return false;
    }

    const manifest = await response.json();
    console.log({ currentVersion, manifestVersion: manifest?.version });

    if (!manifest?.version) {
      console.warn("Manifest version missing; skipping update check.");
      return false;
    }

    return {
      currentVersion,
      manifestVersion: manifest.version,
      releaseNotes: manifest.releaseNotes || "",
      changedFiles: Array.isArray(manifest.changedFiles) ? manifest.changedFiles : [],
      newDependencies: manifest.newDependencies || {},
    };
  } catch (error) {
    console.log(error);
    console.error("GitHub update sync failed:", error);
    return false;
  }
}

export async function checkForFileUpdates() {
  return check_if_new_version_available();
}

export async function downloadUpdate() {
  const updateInfo = await check_if_new_version_available();
  if (!updateInfo || !updateInfo.manifestVersion || updateInfo.manifestVersion === updateInfo.currentVersion) {
    return "Version up-to-date";
  }

  const githubUser = "punithashunmugam4";
  const githubRepo = "smart-market";
  const branch = "main";
  const baseUrl = `https://raw.githubusercontent.com/${githubUser}/${githubRepo}/${branch}`;

  const manifestResponse = await fetch(`${baseUrl}/src/manifest.json`);
  if (!manifestResponse.ok) {
    throw new Error(`Unable to fetch manifest: ${manifestResponse.status}`);
  }

  const manifest = await manifestResponse.json();
  let targetDir = app.getAppPath();

  for (const filePath of manifest.changedFiles || []) {
    const fileUrl = `${baseUrl}/${filePath}`;
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Unable to fetch ${fileUrl}: ${fileResponse.status}`);
    }

    const fileData = await fileResponse.text();
    const destPath = path.join(targetDir, filePath);
    console.log("Downloading files to", destPath);

    try {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, fileData);
    } catch (err) {
      console.error(`Failed to write updated file ${filePath}:`, err);
      targetDir = app.getPath("userData");
      const fallbackPath = path.join(targetDir, filePath);
      fs.mkdirSync(path.dirname(fallbackPath), { recursive: true });
      fs.writeFileSync(fallbackPath, fileData);
    }
  }

  fs.writeFileSync(
    path.join(targetDir, "version.json"),
    JSON.stringify({ version: manifest.version }),
  );

  if (manifest.newDependencies && Object.keys(manifest.newDependencies).length > 0) {
    const localPkg = {
      dependencies: manifest.newDependencies,
      version: manifest.version,
    };

    fs.writeFileSync(
      path.join(targetDir, "package.json"),
      JSON.stringify(localPkg),
    );

    console.log("Running npm install for new dependencies...");
    exec("npm install --production", { cwd: targetDir }, (err) => {
      if (!err) {
        restartApp();
      }
    });
  } else {
    console.log("No new dependencies. Restarting app...");
    restartApp();
  }

  return "Update downloaded";
}

