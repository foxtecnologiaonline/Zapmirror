import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('zapmirror', {
  listDevices: () => ipcRenderer.invoke('devices:list'),
  startMirror: (serial: string) => ipcRenderer.invoke('mirror:start', serial),
  stopMirror: () => ipcRenderer.invoke('mirror:stop'),
  sendTouch: (input: unknown) => ipcRenderer.invoke('mirror:touch', input),
  sendKey: (input: unknown) => ipcRenderer.invoke('mirror:key', input),
  onFrame: (callback: (packet: unknown) => void) => {
    const listener = (_event: unknown, packet: unknown) => callback(packet);
    ipcRenderer.on('mirror:frame', listener);
    return () => ipcRenderer.removeListener('mirror:frame', listener);
  },
  onSize: (callback: (size: { width: number; height: number; codec: number }) => void) => {
    const listener = (_event: unknown, size: { width: number; height: number; codec: number }) =>
      callback(size);
    ipcRenderer.on('mirror:size', listener);
    return () => ipcRenderer.removeListener('mirror:size', listener);
  },
});
