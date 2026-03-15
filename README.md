# ⚡ My Electron App

A cross-platform Electron app with **GitHub Releases publishing** and **automatic updates** via `electron-updater`.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run in development
npm start

# 3. Build for your platform
npm run build
```

---

## 📁 Project Structure

```
my-electron-app/
├── src/
│   ├── main.js            ← Main process (Node.js, auto-updater)
│   ├── preload.js         ← Secure IPC bridge
│   └── renderer/
│       ├── index.html     ← App UI
│       └── renderer.js    ← UI logic
├── assets/
│   ├── icon.ico           ← Windows icon (256x256)
│   ├── icon.icns          ← macOS icon
│   ├── icon.png           ← Linux icon (512x512)
│   └── entitlements.mac.plist
├── scripts/
│   └── notarize.js        ← macOS notarization
├── .github/
│   └── workflows/
│       └── release.yml    ← CI/CD pipeline
└── package.json
```

---

## ⚙️ Configuration

### 1. Update `package.json`

Edit the `build.publish` section:

```json
"publish": {
  "provider": "github",
  "owner": "YOUR_GITHUB_USERNAME",   ← replace this
  "repo":  "YOUR_REPO_NAME"          ← replace this
}
```

Also update `author`, `appId`, `productName`.

### 2. Add GitHub Token Secret

In your GitHub repo → **Settings → Secrets → Actions**, add:

| Secret Name | Value |
|-------------|-------|
| `GH_TOKEN`  | A GitHub Personal Access Token with `repo` scope |

---

## 📦 Publishing a Release

### Via Git Tag (recommended)

```bash
# Bump version in package.json first, then:
git tag v1.1.0
git push origin v1.1.0
```

The GitHub Actions workflow triggers automatically, builds for all platforms, and publishes a GitHub Release with the installers attached.

### Manually

```bash
GH_TOKEN=your_token npm run publish
```

---

## 🔄 How Auto-Update Works

| Step | What happens |
|------|-------------|
| App starts | Checks GitHub Releases after 3 seconds |
| Update found | User is prompted to download |
| Downloading | Progress shown in Updates tab |
| Downloaded | User prompted to restart & install |
| On quit | Update installs automatically |

The update flow uses **`electron-updater`** which reads `latest.yml` / `latest-mac.yml` / `latest-linux.yml` files published alongside your release artifacts.

---

## 🏗️ Build Commands

| Command | Description |
|---------|-------------|
| `npm start` | Run in development |
| `npm run build` | Build for current platform |
| `npm run build:win` | Build Windows installer |
| `npm run build:mac` | Build macOS DMG |
| `npm run build:linux` | Build Linux AppImage/deb/rpm |
| `npm run publish` | Build + publish to GitHub |

---

## 🖼️ Icons

You need to provide app icons in `assets/`:

- **Windows**: `icon.ico` — 256×256 px
- **macOS**: `icon.icns` — multi-resolution
- **Linux**: `icon.png` — 512×512 px

Tools to generate: [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder) or [icotools](https://www.npmjs.com/package/icotools).

---

## 🔐 Code Signing (Optional)

### Windows
Set `CSC_LINK` (base64 `.pfx`) and `CSC_KEY_PASSWORD` as GitHub secrets.

### macOS
Set `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_PASSWORD`, `APPLE_TEAM_ID` as GitHub secrets, then uncomment the relevant lines in `release.yml`.

---

## 📄 Logs

Update logs are written to:
- **Windows**: `%APPDATA%\my-electron-app\logs\main.log`
- **macOS**: `~/Library/Logs/my-electron-app/main.log`
- **Linux**: `~/.config/my-electron-app/logs/main.log`
