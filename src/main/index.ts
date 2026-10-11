import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { ensureAdbServerStarted, listDevices } from './adb';
import { startMirrorSession, type MirrorSession } from './scrcpy';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

// Uma sessão por vez neste primeiro corte (ver recorte de MVP em
// ESCOPO_ZAPMIRROR.md §4: 1 celular, 1 janela). Múltiplos dispositivos
// simultâneos é explicitamente fase 2.
let activeSession: MirrorSession | null = null;

ipcMain.handle('devices:list', () => listDevices());

ipcMain.handle('mirror:start', async (_event, serial: string) => {
  if (activeSession) {
    await activeSession.close();
    activeSession = null;
  }

  activeSession = await startMirrorSession(
    serial,
    (packet) => {
      mainWindow?.webContents.send('mirror:frame', packet);
    },
    (size) => {
      mainWindow?.webContents.send('mirror:size', size);
    },
  );
});

ipcMain.handle('mirror:stop', async () => {
  if (activeSession) {
    await activeSession.close();
    activeSession = null;
  }
});

ipcMain.handle(
  'mirror:touch',
  (
    _event,
    input: { action: 'down' | 'up' | 'move'; x: number; y: number; videoWidth: number; videoHeight: number },
  ) => activeSession?.injectTouch(input),
);

ipcMain.handle('mirror:key', (_event, input: { code: string; down: boolean }) =>
  activeSession?.injectKey(input),
);

app.whenReady().then(async () => {
  // Nunca deixar a janela de abrir por causa disso: sem o binário do adb
  // (ex.: usuário ainda não baixou o platform-tools em
  // resources/platform-tools/), o app deve subir mesmo assim e mostrar o
  // problema na UI quando `devices:list` for chamado — travar aqui sem
  // janela nenhuma era um bug real, pego no smoke test headless.
  try {
    await ensureAdbServerStarted();
  } catch (err) {
    console.error('[adb] não foi possível iniciar o adb server:', err);
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
