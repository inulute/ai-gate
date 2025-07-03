// main.js

const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true, // Hide the menu bar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webviewTag: true,
      sandbox: true,
      nativeWindowOpen: true,
    }
  });

  // Remove the default menu
  Menu.setApplicationMenu(null);

  mainWindow.loadFile('landing.html');
}

app.on('ready', createWindow);

ipcMain.on('select-tool', (event, toolName) => {
  mainWindow.loadFile('index.html');
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.send('create-new-tab', toolName);
  });
});

ipcMain.on('open-new-tab', (event, toolName) => {
  mainWindow.webContents.send('create-new-tab', toolName);
});

ipcMain.on('change-layout', (event, layout) => {
  mainWindow.webContents.send('update-layout', layout);
});
