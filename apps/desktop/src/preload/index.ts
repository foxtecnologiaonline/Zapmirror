import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('zapmirror', {
  checkLicense: () => ipcRenderer.invoke('license:check'),
  listDevices: () => ipcRenderer.invoke('devices:list'),
});
