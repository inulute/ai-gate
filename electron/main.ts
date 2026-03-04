const { app, BrowserWindow, session, shell, Menu, globalShortcut, Tray, nativeImage, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const isDevelopment = !app.isPackaged;

// Hardware acceleration enabled for smoother UI performance

// Enforce single instance
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.setSkipTaskbar(false);
        mainWindow.show();
        mainWindow.focus();
      }
    } catch {}
  });
}

// Global variables for tray and window
let mainWindow: any = null;
let tray: any = null;

// Global flag to track if app is quitting
declare global {
  var isQuiting: boolean;
}

// Initialize the global flag
global.isQuiting = false;

// Parse CLI flags once
const launchArgs = process.argv.slice(1);
const launchedHidden = launchArgs.includes('--hidden');

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    show: false, // We'll decide to show based on flags later
    frame: true, // Keep frame but hide menu bar
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      // Re-enable security; we now rely on relative paths and loadFile
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: false,
      nativeWindowOpen: true,
      preload: path.join(__dirname, 'preload.js'),
      // backgroundThrottling: false
    }
  });

  // Remove the application menu entirely
  Menu.setApplicationMenu(null);

  // Load the app
  console.log('Environment:', process.env.NODE_ENV);
  console.log('isDevelopment:', isDevelopment);
  if (isDevelopment) {
    const devUrl = 'http://localhost:5173';
    console.log('Loading app from:', devUrl);
    mainWindow.loadURL(devUrl);
  } else {
    // In packaged builds, resolve from app.asar root
    // When packaged, app.getAppPath() resolves to resources/app.asar by default
    const appPath = app.getAppPath();
    const filePath = path.join(appPath, 'dist/index.html');
    console.log('Loading app from file:', filePath);
    try {
      const exists = fs.existsSync(filePath);
      console.log('dist/index.html exists:', exists);
      if (!exists) {
        console.error('dist/index.html not found at', filePath);
      }
    } catch (e) {
      console.error('Error checking dist path:', e);
    }
    mainWindow.loadFile(filePath);
  }

  // Determine startup behavior: only minimize when launched with --hidden
  const shouldStartMinimized = launchedHidden;

  // Open the DevTools only in development and not when starting minimized
  if (isDevelopment && !shouldStartMinimized) {
    mainWindow.webContents.openDevTools();
    try {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    } catch {}
  }

  // Extra diagnostics for blank windows
  mainWindow.webContents.on('did-fail-load', (_e: any, code: any, desc: any, url: string) => {
    console.error('did-fail-load', { code, desc, url });
  });
  mainWindow.webContents.on('render-process-gone', (_e: any, details: any) => {
    console.error('render-process-gone', details);
  });
  mainWindow.webContents.on('crashed', () => {
    console.error('webContents crashed');
  });

  // Handle external links - open all in external browser
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Configure session headers only for our app, do not override external sites (e.g., Google auth)
  session.defaultSession.webRequest.onHeadersReceived((details: any, callback: any) => {
    try {
      const url = details.url || '';
      const isAppUrl = url.startsWith('file://') || url.startsWith('http://localhost:5173');
      if (isAppUrl) {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' *"
          }
        });
        return;
      }
    } catch {}
    callback({ responseHeaders: details.responseHeaders });
  });
  
  // Create a persistent session for webviews to retain logins
  session.fromPartition('persist:webtool');

  // Handle window events
  mainWindow.on('close', (event: any) => {
    // Only prevent close if not explicitly quitting
    if (!global.isQuiting) {
      event.preventDefault();
      // Hide the window instead of closing it
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
      }
    }
  });

  // Show or keep hidden when it's ready, based on flag
  mainWindow.once('ready-to-show', () => {
    if (shouldStartMinimized) {
      mainWindow.setSkipTaskbar(true);
      return;
    }
    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
  });
}

function createTray() {
  // Resolve icon from packaged app resources
  // Try platform-specific icons first, then fall back to PNG (works everywhere)
  const appPath = app.getAppPath();
  const resourcesPath = process.resourcesPath || '';

  const candidatePaths = [
    // Windows .ico
    path.join(appPath, 'icons/win/favicon.ico'),
    path.join(resourcesPath, 'icons/win/favicon.ico'),
    path.join(__dirname, '../icons/win/favicon.ico'),
    // PNG (works on all platforms including Linux)
    path.join(appPath, 'icons/png/favicon.png'),
    path.join(resourcesPath, 'icons/png/favicon.png'),
    path.join(__dirname, '../icons/png/favicon.png'),
    // Common Linux system install paths
    '/usr/share/pixmaps/ai-gate.png',
    '/usr/share/icons/hicolor/256x256/apps/ai-gate.png',
  ];

  let icon = null;
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const test = nativeImage.createFromPath(p);
        if (!test.isEmpty()) {
          icon = test;
          console.log('Using tray icon from:', p);
          break;
        }
      }
    } catch {}
  }

  // If no icon found, create a minimal 16x16 PNG programmatically
  // (nativeImage.createFromBuffer does NOT support SVG — only PNG/JPEG/BMP)
  if (!icon) {
    console.log('Creating fallback tray icon...');
    // Minimal 16x16 blue square PNG (raw RGBA → nativeImage)
    const size = 16;
    const buffer = Buffer.alloc(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      buffer[i * 4 + 0] = 59;   // R (blue-500: #3b82f6)
      buffer[i * 4 + 1] = 130;  // G
      buffer[i * 4 + 2] = 246;  // B
      buffer[i * 4 + 3] = 255;  // A
    }
    icon = nativeImage.createFromBuffer(buffer, { width: size, height: size });
  }
  
  // Create the tray
  tray = new Tray(icon);
  
  // Force set the image again to ensure it's properly loaded
  tray.setImage(icon);
  
  // Add some debugging
  console.log('Tray created with icon size:', icon.getSize());
  console.log('Tray icon is empty:', icon.isEmpty());

  // Create context menu for the tray
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show AI Gate',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.setSkipTaskbar(false);
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        global.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('AI Gate');

  // Single-click to toggle show/hide for instant access
  tray.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
        mainWindow.setSkipTaskbar(true);
      } else {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.setSkipTaskbar(false);
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // Double-click to show window
  tray.on('double-click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.setSkipTaskbar(false);
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function getStoredSettings() {
  try {
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    
    if (fs.existsSync(settingsPath)) {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(settingsData);
    }
  } catch (error) {
    console.error('Error reading settings:', error);
  }
  
  // Defaults
  return { autostart: false, startMinimized: false };
}

function setStoredSettings(settings: any) {
  try {
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    
    // Ensure directory exists
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error writing settings:', error);
  }
}

// IPC handlers for settings
ipcMain.handle('get-settings', () => {
  return getStoredSettings();
});

ipcMain.handle('set-settings', (_event: any, settings: any) => {
  setStoredSettings(settings);
  return true;
});

ipcMain.handle('show-window', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
    mainWindow.focus();
  }
});

// Autostart functionality for Windows
function setAutoStart(enabled: boolean) {
  if (process.platform === 'win32') {
    const appPath = process.execPath;
    const appName = 'AI Gate';
    
    if (enabled) {
      // Add to startup with --hidden flag
      const command = `reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${appName}" /t REG_SZ /d "\"${appPath}\" --hidden" /f`;
      exec(command, (error: any) => {
        if (error) {
          console.error('Error setting autostart:', error);
        }
      });
    } else {
      // Remove from startup
      const command = `reg delete "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${appName}" /f`;
      exec(command, (error: any) => {
        if (error) {
          console.error('Error removing autostart:', error);
        }
      });
    }
  }
}

ipcMain.handle('set-autostart', (_event: any, enabled: boolean) => {
  setAutoStart(enabled);
  return true;
});

app.whenReady().then(() => {
  // Register global shortcuts to neutralize default close behavior
  try {
    globalShortcut.register('CommandOrControl+W', () => {});
    globalShortcut.register('CommandOrControl+Shift+W', () => {});
  } catch {}

  createWindow();
  createTray();
  
  // Add a global handler for all new windows/webviews
  app.on('web-contents-created', (_: any, contents: any) => {
    // Prevent default browser shortcuts (e.g., Ctrl+W closing window)
    contents.on('before-input-event', (event: any, input: any) => {
      const key = (input.key || '').toLowerCase();
      const isCtrlOnly = !!input.control && !input.shift && !input.alt && !input.meta;
      const isCtrlShift = !!input.control && !!input.shift && !input.alt && !input.meta;

      if (isCtrlOnly && key === 'w') {
        event.preventDefault();
      }
      if (isCtrlShift && key === 'w') {
        event.preventDefault();
      }
    });

    // For all web contents (including webviews)
    // Open all window.open() calls in external browser
    contents.setWindowOpenHandler(({ url }: { url: string }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  });
});

app.on('window-all-closed', () => {
  // Don't quit the app when all windows are closed - keep it running in the tray
  // Only quit on macOS when the user explicitly quits
  if (process.platform === 'darwin') {
    app.quit();
  }
  // On Windows and Linux, keep the app running in the system tray
});

// Prevent the app from quitting when all windows are closed
app.on('before-quit', (event: any) => {
  // Only allow quitting if explicitly requested from tray menu
  if (!global.isQuiting) {
    event.preventDefault();
    // Hide the window instead of quitting
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
    }
    return false;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  try {
    globalShortcut.unregister('CommandOrControl+W');
    globalShortcut.unregister('CommandOrControl+Shift+W');
    globalShortcut.unregisterAll();
  } catch {}
});

export {};