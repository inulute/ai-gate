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

// Authentication-related domains to keep in the app
const AUTH_DOMAINS = [
  'accounts.google.com',
  'login.microsoftonline.com',
  'github.com/login',
  'api.twitter.com/oauth',
  'auth', // Generic auth paths
  'login',
  'signin',
  'sign_in',
  'oauth'
];

// Additional URL substrings that should always stay in-app (e.g., verification flows)
const KEEP_IN_APP_URL_PARTS = [
  'google.com/sorry'
];

// Helper function to check if a URL is authentication-related
function isAuthRelated(url: string): boolean {
  try {
    return AUTH_DOMAINS.some(domain => url.includes(domain));
  } catch (e) {
    return false;
  }
}

function isKeepInApp(url: string): boolean {
  try {
    if (KEEP_IN_APP_URL_PARTS.some(part => url.includes(part))) return true;
    const u = new URL(url);
    if (u.hostname.endsWith('google.com') && u.pathname.startsWith('/sorry')) return true;
    return isAuthRelated(url);
  } catch {
    return false;
  }
}

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

  // Handle external links - but keep auth/verification related ones in the app
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    // Keep selected URLs within the app
    if (isKeepInApp(url)) {
      return { action: 'allow' };
    }
    
    // Open external URLs in default browser
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    
    return { action: 'allow' };
  });

  // Configure session for webviews
  session.defaultSession.webRequest.onHeadersReceived((details: any, callback: any) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' *"
      }
    });
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
  const candidatePaths = [
    path.join(app.getAppPath(), 'icons/win/favicon.ico'),
    path.join(process.resourcesPath || '', 'icons/win/favicon.ico'),
    path.join(__dirname, '../icons/win/favicon.ico')
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
  
  // If no icon found, create a simple one
  if (!icon) {
    console.log('Creating fallback tray icon...');
    // Create a proper 16x16 icon for Windows system tray
    const iconBuffer = Buffer.from(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect width="16" height="16" fill="#3b82f6" rx="2"/>
        <text x="8" y="12" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="white" text-anchor="middle">AI</text>
      </svg>
    `);
    icon = nativeImage.createFromBuffer(iconBuffer);
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
    contents.setWindowOpenHandler(({ url }: { url: string }) => {
      // Keep selected URLs within the app
      if (isKeepInApp(url)) {
        return { action: 'allow' };
      }
      
      // Open non-auth external links in default browser
      if (url.startsWith('http:') || url.startsWith('https:')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
      return { action: 'allow' };
    });

    // Handle navigation events
    contents.on('will-navigate', (event: any, url: string) => {
      const isMainWindow = BrowserWindow.fromWebContents(contents) !== null;

      // Always allow in-app/verification/auth flows
      if (isKeepInApp(url)) {
        return;
      }

      // Only redirect to external browser for the main window's top-level navigations
      if (isMainWindow && (url.startsWith('http:') || url.startsWith('https:'))) {
        event.preventDefault();
        shell.openExternal(url);
      }
      // For webviews (not main window), allow navigation to proceed in place
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