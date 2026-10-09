const axios = require("axios");
const path = require("path");
const fs = require("fs");
const exec = require("child_process").exec;
const { app } = require("electron");

function getLocalVersion() {
  // Prefer a persisted local hot-update version, then package.json, then app version.
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
    const pkgJson = require(path.join(app.getAppPath(), "package.json"));
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

function check_if_new_version_available(){
const currentVersion = getLocalVersion();

  // Replace with your actual GitHub Username and Repository Name
  const GITHUB_USER = "punithashunmugam4";
  const GITHUB_REPO = "smart-market";
  const BRANCH = "main";

  // Base URL pointing to your update folder on GitHub
  const baseUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${BRANCH}`;

  try {
    // 1. Fetch the manifest file from GitHub
    const response = await axios.get(`${baseUrl}/manifest.json`);
    const manifest = response.data;
    console.log({
      "currentVersion":
      currentVersion,
      "manifestVersion":
      manifest?.version,
    }
    );

    if (!manifest?.version) {
      console.warn("Manifest version missing; skipping update check.");
      return(false);
    }
    else{
      return({
      "currentVersion":
      currentVersion,
      "manifestVersion":
      manifest?.version,
    });
    }
} catch (error) {
    console.log(error);
    if (error.response && error.response.status === 404) {
      console.log(
        "Update manifest or update file not found on GitHub; skipping update check.",
      );
      
    } else {
      console.error("GitHub update sync failed:", error);
    }
    return(false)
  }
}
async function checkForFileUpdates() {
let is_version_available=check_if_new_version_available();
  return is_version_available;
}

function downloadUpdate(){
  let is_version_available=check_if_new_version_available();
if (is_version_available.manifestVersion !== is_version_available.currentVersion) {
      // In a packaged app, app.getAppPath() points inside app.asar, which is not writable.
      // Use userData for downloaded update files instead.

      let targetDir = app.getAppPath();

      // 2. Loop through and download EVERY changed file listed in the manifest
      for (const filePath of manifest.changedFiles) {
        const fileUrl = `${baseUrl}/${filePath}`;
        const fileData = await axios.get(fileUrl, { responseType: "text" });

        let destPath = path.join(targetDir, filePath);
        console.log("Downloading files to", destPath);
        try {
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.writeFileSync(destPath, fileData.data);
        } catch (err) {
          console.error(`Failed to write updated file ${filePath}:`, err);
          targetDir = app.getPath("userData");
          destPath = path.join(targetDir, filePath);
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.writeFileSync(destPath, fileData.data);
        }
      }

      // Persist the updated version so the updated files are recognized after restart.
      fs.writeFileSync(
        path.join(targetDir, "version.json"),
        JSON.stringify({ version: manifest.version }),
      );

      // 3. Handle Node Modules if they exist in the manifest
      if (
        manifest.newDependencies &&
        Object.keys(manifest.newDependencies).length > 0
      ) {
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
          if (!err) restartApp();
        });
      } else {
        console.log("No new dependencies. Restarting app...");
        restartApp();
      }
    }
    else{
      return "Version up-to-date";
    }
}

function restartApp() {
  app.relaunch();
  app.exit(0);
}

module.exports = { checkForFileUpdates,downloadUpdate };
