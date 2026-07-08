// Preload script for secure Electron context isolation
const { contextBridge, ipcRenderer } = require('electron');

// Expose only necessary IPC channels to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args)
});