/**
 * notarize.js - macOS Notarization Script
 * Called by electron-builder after signing (via afterSign hook in package.json)
 *
 * Required env vars for notarization:
 *   APPLE_ID           - your Apple ID email
 *   APPLE_APP_PASSWORD - app-specific password from appleid.apple.com
 *   APPLE_TEAM_ID      - your Apple Developer Team ID
 */

const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only notarize on macOS
  if (electronPlatformName !== 'darwin') return;

  // Skip if env vars not set (e.g. CI without Apple credentials)
  if (!process.env.APPLE_ID) {
    console.log('Skipping notarization: APPLE_ID not set');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`Notarizing ${appPath}…`);

  await notarize({
    tool: 'notarytool',
    appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID
  });

  console.log('Notarization complete!');
};
