const { app, BrowserWindow, session, shell, Menu, Tray, nativeImage, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const isDevelopment = !app.isPackaged;
const isE2E = process.env.AI_GATE_E2E === '1';

if (process.env.AI_GATE_E2E_USER_DATA_DIR) {
  app.setPath('userData', process.env.AI_GATE_E2E_USER_DATA_DIR);
}

// Hardware acceleration enabled for smoother UI performance

// Enforce single instance
const gotSingleInstanceLock = isE2E || app.requestSingleInstanceLock();
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

type ShortcutMode = 'standard' | 'prefix';
type KeyCombo = string[];

interface ShortcutIpcConfig {
  id: string;
  name: string;
  mode: ShortcutMode;
  keys: KeyCombo[];
}

interface ActiveShortcutPrefix {
  shortcuts: ShortcutIpcConfig[];
  nextStep: number;
}

// Global flag to track if app is quitting
declare global {
  var isQuiting: boolean;
  var shortcutConfig: ShortcutIpcConfig[];
  var shortcutRecordingActive: boolean;
  var activeShortcutPrefix: ActiveShortcutPrefix | null;
  var shortcutPrefixTimer: any;
}

// Initialize the global flag
global.isQuiting = false;
global.shortcutConfig = [];
global.shortcutRecordingActive = false;
global.activeShortcutPrefix = null;
global.shortcutPrefixTimer = null;

const codeKeyLabels = new Map([
  ['Backquote', '`'],
  ['Minus', '-'],
  ['Equal', '='],
  ['BracketLeft', '['],
  ['BracketRight', ']'],
  ['Backslash', '\\'],
  ['Semicolon', ';'],
  ['Quote', "'"],
  ['Comma', ','],
  ['Period', '.'],
  ['Slash', '/'],
  ['Space', 'Space'],
]);

/** Returns true when a provider webview should be allowed to open an in-app auth popup. */
const isProviderAuthPopupUrl = (url: string) => {
  return /^https:\/\/accounts\.google\.com\//i.test(url);
};

// Keep this local copy paired with src/lib/shortcutUtils.ts. The main process
// cannot rely on renderer shortcut handling because webviews consume keys first.

/** Normalizes Electron input key names to shortcut setting labels. */
const normalizeShortcutKey = (key: string) => {
  const lowerKey = key.toLowerCase();
  if (lowerKey === 'control' || lowerKey === 'ctrl') return 'Ctrl';
  if (lowerKey === 'command' || lowerKey === 'cmd' || lowerKey === 'meta') return 'Meta';
  if (lowerKey === 'option' || lowerKey === 'alt') return 'Alt';
  if (lowerKey === 'shift') return 'Shift';
  if (lowerKey === 'mod') return 'Mod';
  if (key === ' ') return 'Space';
  return key.length === 1 ? lowerKey : key;
};

/** Returns the unshifted physical key label for printable Electron input. */
const shortcutKeyFromInput = (input: any) => {
  const code = input.code || '';
  if (/^Digit[0-9]$/.test(code)) return code.replace('Digit', '');
  if (/^Numpad[0-9]$/.test(code)) return code.replace('Numpad', '');
  if (/^Key[A-Z]$/.test(code)) return code.replace('Key', '').toLowerCase();

  return normalizeShortcutKey(codeKeyLabels.get(code) || input.key || '');
};

/** Returns true when a key label is a shortcut modifier. */
const isShortcutModifier = (key: string) => {
  return ['Mod', 'Ctrl', 'Meta', 'Alt', 'Shift'].includes(normalizeShortcutKey(key));
};

/** Checks whether Electron input matches a stored shortcut combo. */
const shortcutComboMatchesInput = (combo: KeyCombo, input: any, allowExtraMod = false) => {
  const normalizedCombo = combo.map(normalizeShortcutKey);
  const wantsMod = normalizedCombo.includes('Mod');
  const wantsCtrl = normalizedCombo.includes('Ctrl');
  const wantsMeta = normalizedCombo.includes('Meta');
  const wantsAlt = normalizedCombo.includes('Alt');
  const wantsShift = normalizedCombo.includes('Shift');
  const expectedKey = normalizedCombo.find(key => !isShortcutModifier(key));
  const inputKey = shortcutKeyFromInput(input);

  if (wantsMod) {
    if (!input.control && !input.meta) return false;
  } else if (!allowExtraMod) {
    if (!!input.control !== wantsCtrl) return false;
    if (!!input.meta !== wantsMeta) return false;
  } else if (wantsCtrl || wantsMeta) {
    if (!!input.control !== wantsCtrl) return false;
    if (!!input.meta !== wantsMeta) return false;
  }

  if (!!input.alt !== wantsAlt) return false;
  if (!!input.shift !== wantsShift) return false;
  return !!expectedKey && expectedKey.toLowerCase() === inputKey.toLowerCase();
};

/** Sends a shortcut payload to the renderer process. */
const sendShortcutPayload = (payload: any) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('shortcut', payload);
  }
};

/** Clears any pending prefix shortcut sequence. */
const clearShortcutPrefix = () => {
  global.activeShortcutPrefix = null;
  if (global.shortcutPrefixTimer) {
    clearTimeout(global.shortcutPrefixTimer);
    global.shortcutPrefixTimer = null;
  }
};

/** Starts waiting for the next key in a prefix shortcut sequence. */
const activateShortcutPrefix = (shortcuts: ShortcutIpcConfig[]) => {
  global.activeShortcutPrefix = { shortcuts, nextStep: 1 };
  if (global.shortcutPrefixTimer) clearTimeout(global.shortcutPrefixTimer);
  global.shortcutPrefixTimer = setTimeout(() => {
    clearShortcutPrefix();
    sendShortcutPayload({ type: 'prefix-cancel' });
  }, 2000);
  sendShortcutPayload({ type: 'prefix-active', shortcutId: shortcuts[0]?.id });
};

/** Handles configurable shortcuts before Electron webviews consume them. */
const handleShortcutInput = (event: any, input: any) => {
  if (input.type !== 'keyDown') return;
  if (global.shortcutRecordingActive) return;

  const key = normalizeShortcutKey(input.key || '');
  const isPrimaryOnly = (!!input.control || !!input.meta) && !input.shift && !input.alt;
  const isPrimaryShift = (!!input.control || !!input.meta) && !!input.shift && !input.alt;
  const shouldNeutralizeNativeClose = key === 'w' && (isPrimaryOnly || isPrimaryShift);

  const activePrefix = global.activeShortcutPrefix;
  if (activePrefix) {
    if (key === 'Escape') {
      event.preventDefault();
      clearShortcutPrefix();
      sendShortcutPayload({ type: 'prefix-cancel' });
      return;
    }

    const matchingShortcuts = activePrefix.shortcuts.filter(shortcut => {
      const expectedCombo = shortcut.keys[activePrefix.nextStep];
      return expectedCombo && shortcutComboMatchesInput(expectedCombo, input, true);
    });

    if (matchingShortcuts.length > 0) {
      event.preventDefault();
      const nextStep = activePrefix.nextStep + 1;
      const completedShortcut = matchingShortcuts.find(shortcut => nextStep >= shortcut.keys.length);
      if (completedShortcut) {
        clearShortcutPrefix();
        sendShortcutPayload({ type: 'action', shortcutId: completedShortcut.id });
      } else {
        global.activeShortcutPrefix = { shortcuts: matchingShortcuts, nextStep };
      }
      return;
    }

    clearShortcutPrefix();
    sendShortcutPayload({ type: 'prefix-cancel' });
  }

  const prefixShortcuts = global.shortcutConfig.filter(shortcut =>
    shortcut.mode === 'prefix' &&
    shortcut.keys.length > 0 &&
    shortcutComboMatchesInput(shortcut.keys[0], input)
  );

  if (prefixShortcuts.length > 0) {
    event.preventDefault();
    const completedShortcut = prefixShortcuts.find(shortcut => shortcut.keys.length === 1);
    if (completedShortcut) {
      sendShortcutPayload({ type: 'action', shortcutId: completedShortcut.id });
    } else {
      activateShortcutPrefix(prefixShortcuts.filter(shortcut => shortcut.keys.length > 1));
    }
    return;
  }

  const standardShortcut = global.shortcutConfig.find(shortcut =>
    shortcut.mode === 'standard' &&
    shortcut.keys.length === 1 &&
    shortcutComboMatchesInput(shortcut.keys[0], input)
  );

  if (standardShortcut) {
    event.preventDefault();
    sendShortcutPayload({ type: 'action', shortcutId: standardShortcut.id });
    return;
  }

  if (shouldNeutralizeNativeClose) {
    event.preventDefault();
  }
};

// Parse CLI flags once
const launchArgs = process.argv.slice(1);
const launchedHidden = launchArgs.includes('--hidden');

// Wayland support detection and configuration
const detectAndEnableWayland = () => {
  const isWaylandSession = process.env.WAYLAND_DISPLAY ||
                          process.env.XDG_SESSION_TYPE === 'wayland' ||
                          process.env.NIXOS_OZONE_WL === '1';

  if (isWaylandSession) {
    console.log('🖥️  Detected Wayland session - Enabling native Wayland support...');

    // Enable Ozone/Wayland support before app is ready
    app.commandLine.appendSwitch('enable-features', [
      'WaylandWindowDecorations',
      'VaapiIgnoreDriverChecks',
      'VaapiVideoDecoder',
      'VaapiVideoEncoder',
      'AcceleratedVideoDecoder',
      'AcceleratedVideoEncoder',
      'UseMultiPlaneFormatForHardwareVideo',
      'Ozone',
    ].join(','));

    // Use Ozone/Wayland instead of X11
    app.commandLine.appendSwitch('ozone-platform', 'wayland');

    console.log('✅ Wayland flags enabled');
  } else {
    const displayServer = process.env.DISPLAY ? 'X11/Xwayland' : 'Unknown';
    console.log(`🖥️  Display server: ${displayServer}`);
  }
};

// Parse additional Electron arguments from environment (for NixOS and advanced users)
const parseElectronArgs = () => {
  const electronArgs = process.env.ELECTRON_ARGS;
  if (electronArgs) {
    console.log('📋 Applying custom ELECTRON_ARGS from environment...');
    // Parse comma-separated or space-separated feature flags
    const features = electronArgs
      .split(/[,\s]+/)
      .filter((flag: string) => flag && flag.startsWith('--enable-features='))
      .map((flag: string) => flag.replace('--enable-features=', ''));

    if (features.length > 0) {
      const allFeatures = features.join(',');
      console.log(`   Features: ${allFeatures}`);
      // Append additional features to existing ones
      app.commandLine.appendSwitch('enable-features', allFeatures);
    }
  }
};

// Call before app is ready
detectAndEnableWayland();
parseElectronArgs();

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
    const devUrl = process.env.AI_GATE_E2E_DEV_SERVER_URL || 'http://localhost:5173';
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
  if (isDevelopment && !shouldStartMinimized && !isE2E) {
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
    if (!isE2E && !global.isQuiting) {
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

ipcMain.handle('is-window-visible', () => {
  return !!mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible();
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

// Synchronous IPC for app version — called from preload before the renderer is ready
ipcMain.on('get-app-version', (event: any) => {
  event.returnValue = app.getVersion();
});

ipcMain.on('set-shortcut-config', (_event: any, shortcuts: ShortcutIpcConfig[]) => {
  global.shortcutConfig = Array.isArray(shortcuts) ? shortcuts : [];
  clearShortcutPrefix();
});

ipcMain.on('set-shortcut-recording-active', (_event: any, isActive: boolean) => {
  global.shortcutRecordingActive = isActive;
  if (isActive) clearShortcutPrefix();
});

app.whenReady().then(() => {
  // Register the web-contents listener BEFORE createWindow so it catches the
  // main BrowserWindow's webContents (created synchronously inside createWindow).
  app.on('web-contents-created', (_: any, contents: any) => {
    contents.on('before-input-event', (event: any, input: any) => {
      handleShortcutInput(event, input);
    });

    // For all web contents (including webviews)
    // Open all window.open() calls in external browser
    contents.setWindowOpenHandler((details: any) => {
      const { url } = details;
      if (contents.getType?.() === 'webview' && isProviderAuthPopupUrl(url)) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            width: 520,
            height: 720,
            title: 'Sign in',
            autoHideMenuBar: true,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              nativeWindowOpen: true,
              partition: 'persist:webtool',
            },
          },
        };
      }

      shell.openExternal(url);
      return { action: 'deny' };
    });
  });

  createWindow();
  if (!isE2E) createTray();
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
  if (!isE2E && !global.isQuiting) {
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


export {};
