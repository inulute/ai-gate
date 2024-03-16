const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("path");

app.allowRendererProcessReuse = true;

let mainWindow;
let dialogWindow;
const windows = {}; 

app.on("ready", () => {
  const window = require("./src/window");
  mainWindow = window.createBrowserWindow(app);
  mainWindow.setMenu(null);
  mainWindow.setTitle("Ai Gate");
  mainWindow.show(false);

  mainWindow.webContents.on("page-title-updated", (event, title) => {
    event.preventDefault();
    mainWindow.setTitle("Ai Gate");
  });

  registerShortcuts(); 

  const createCustomDialog = () => {
    dialogWindow = new BrowserWindow({
      parent: mainWindow,
      modal: true,
      show: false,
      width: 400,
      height: 630,
      backgroundColor: "#272829",
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
      },
      frame: false,
      autoHideMenuBar: true,
    });

    dialogWindow.loadFile(path.join(__dirname, "select.html"));

    dialogWindow.once("ready-to-show", () => {
      dialogWindow.show();
    });

    ipcMain.on("dialog-response", (event, response) => {
      handleDialogResponse(response);
      dialogWindow.close();
    });

    dialogWindow.on("closed", () => {
      dialogWindow = null;
    });
  };

  const handleDialogResponse = (response) => {

    let selectedWindowName;
    let selectedURL;
    switch (response) {
      case 0:
        selectedWindowName = "ChatGPT";
        selectedURL = "https://chat.openai.com";
        break;
      case 1:
        selectedWindowName = "Gemini";
        selectedURL = "https://gemini.google.com/";
        break;
      case 2:
        selectedWindowName = "PerplexityAI";
        selectedURL = "https://perplexity.ai";
        break;
      case 3:
        selectedWindowName = "PerplexityChat";
        selectedURL = "https://labs.perplexity.ai";
        break;
      case 4:
        selectedWindowName = "Claude";
        selectedURL = "https://claude.ai";
        break;
      default:
        selectedWindowName = "SelectedURL";
        selectedURL = "https://aigate.inulute.com/";
    }


    if (windows[selectedWindowName]) {
      windows[selectedWindowName].focus();
    } else {

      createWindow(selectedWindowName, selectedURL);
    }


    mainWindow.loadURL("https://donate.inulute.com");
  };

  ipcMain.on("close-dialog", () => {
    if (dialogWindow) {
      mainWindow.loadURL("https://donate.inulute.com/");
      dialogWindow.close();
    }
  });


  createCustomDialog();
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("will-quit", () => {
  globalShortcut.unregister("CommandOrControl+1");
  globalShortcut.unregister("CommandOrControl+2");
  globalShortcut.unregister("CommandOrControl+3");
  globalShortcut.unregister("CommandOrControl+4");
  globalShortcut.unregister("CommandOrControl+5");
});

const registerShortcuts = () => {


  globalShortcut.register("CommandOrControl+1", () => {
    if (windows["ChatGPT"]) {
      windows["ChatGPT"].focus();
    } else {
      createWindow("ChatGPT", "https://chat.openai.com");
    }
  });


  globalShortcut.register("CommandOrControl+2", () => {
    if (windows["Gemini"]) {
      windows["Gemini"].focus();
    } else {
      createWindow("Gemini", "https://gemini.google.com/");
    }
  });

  globalShortcut.register("CommandOrControl+3", () => {
    if (windows["PerplexityAI"]) {
      windows["PerplexityAI"].focus();
    } else {
      createWindow("PerplexityAI", "https://perplexity.ai");
    }
  });

  globalShortcut.register("CommandOrControl+4", () => {
    if (windows["PerplexityChat"]) {
      windows["PerplexityChat"].focus();
    } else {
      createWindow("PerplexityChat", "https://labs.perplexity.ai");
    }
  });

  globalShortcut.register("CommandOrControl+5", () => {
    if (windows["Claude"]) {
      windows["Claude"].focus();
    } else {
      createWindow("Claude", "https://claude.ai");
    }
  });
};

const createWindow = (name, url) => {
  windows[name] = new BrowserWindow({
    parent: mainWindow,
    modal: false,
    show: false,
    width: 1010, 
    height: 700, 
    backgroundColor: "#272829", 
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    frame: false,
    autoHideMenuBar: true,
  });

  windows[name].loadURL(url);

  windows[name].once("ready-to-show", () => {
    windows[name].show();
  });

  windows[name].on("closed", () => {
    delete windows[name];
  });
};
