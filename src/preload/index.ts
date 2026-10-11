import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('zapmirror', {
  listDevices: () => ipcRenderer.invoke('devices:list'),
});
