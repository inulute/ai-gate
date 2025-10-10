// electron/preload.ts
const { shell, contextBridge, ipcRenderer } = require('electron');

// This script runs in the renderer process (your React app)
window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload script loaded, setting up external link handling');
  
  // Intercept all link clicks and open them in the default browser
  document.addEventListener('click', (event) => {
    let element = event.target as HTMLElement;
    
    // Walk up the DOM to find if the clicked element is a link or has a link parent
    while (element && element.tagName !== 'A') {
      element = element.parentElement as HTMLElement;
    }

    // If it's an external link, open in default browser
    if (element && element.tagName === 'A' && element.getAttribute('href')) {
      const href = element.getAttribute('href')!;
      if (href.startsWith('http:') || href.startsWith('https:') || href.startsWith('mailto:')) {
        event.preventDefault();
        console.log('Opening external link via global handler:', href);
        shell.openExternal(href);
      }
    }
  });

  // Add a helper function to open links from buttons that aren't actual anchor tags
  (window as any).openExternal = (url: string) => {
    if (typeof url === 'string' && (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:'))) {
      console.log('Opening external link via helper function:', url);
      shell.openExternal(url);
    }
  };
});

// Expose IPC functions to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings: any) => ipcRenderer.invoke('set-settings', settings),
  showWindow: () => ipcRenderer.invoke('show-window'),
  setAutostart: (enabled: boolean) => ipcRenderer.invoke('set-autostart', enabled),
  getAppVersion: () => process.env.npm_package_version || '4.0.2',
  openExternal: (url: string) => {
    console.log('electronAPI.openExternal called with:', url);
    try {
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided');
      }
      
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
        throw new Error('URL must start with http://, https://, or mailto:');
      }
      
      shell.openExternal(url);
      console.log('Successfully opened external URL:', url);
    } catch (error) {
      console.error('Error opening external URL:', error);
      throw error;
    }
  },
});

export {};