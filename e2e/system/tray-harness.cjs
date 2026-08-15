const { app, nativeImage } = require('electron');

const trayIconModulePath = process.argv[2];
const sourceIconPath = process.argv[3];

app.whenReady().then(() => {
  const { normalizeTrayIcon } = require(trayIconModulePath);
  const sourceIcon = nativeImage.createFromPath(sourceIconPath);
  const size = normalizeTrayIcon(sourceIcon, 'darwin').getSize();

  process.stdout.write(`TRAY_SIZE:${JSON.stringify(size)}\n`);
  app.quit();
});
