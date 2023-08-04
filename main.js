const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

app.allowRendererProcessReuse = true;

let mainWindow;
let dialogWindow; // Declare the dialogWindow variable here

app.on("ready", () => {
  const window = require("./src/window");
  mainWindow = window.createBrowserWindow(app);
  mainWindow.setMenu(null);

  const createCustomDialog = () => {
    dialogWindow = new BrowserWindow({ // Assign the dialogWindow variable here
      parent: mainWindow,
      modal: true,
      show: false,
      width: 400,
      height: 570,
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
  };

  const handleDialogResponse = (response) => {
    // Handle the user's choice here
    if (response === 0) {
      mainWindow.loadURL("https://chat.openai.com");
    } else if (response === 1) {
      mainWindow.loadURL("https://bard.google.com/");
    } else if (response === 2) {
      mainWindow.loadURL("https://perplexity.ai");
    } else if (response === 3) {
      mainWindow.loadURL("https://labs.perplexity.ai");
    } else if (response === 4) {
      mainWindow.loadURL("https://claude.ai");
    }
  };

  ipcMain.on("close-dialog", () => {
    if (dialogWindow) {
      // Load the desired URL in the main window when the cross button is clicked
      mainWindow.loadURL("https://aigate.vercel.app/");
      dialogWindow.close();
    }
  });

  // Show the custom dialog when app is ready
  createCustomDialog();

  const print = require("./src/print");
});

app.on("window-all-closed", () => {
  app.quit();
});
