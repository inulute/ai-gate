const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  requestNewTab: (toolName) => ipcRenderer.send('open-new-tab', toolName),
  onCreateNewTab: (callback) => ipcRenderer.on('create-new-tab', (event, toolName) => callback(toolName)),
  changeLayout: (layout) => ipcRenderer.send('change-layout', layout),
  onUpdateLayout: (callback) => ipcRenderer.on('update-layout', (event, layout) => callback(layout)),
  selectTool: (toolName) => ipcRenderer.send('select-tool', toolName),
});
