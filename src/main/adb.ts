import { spawn } from 'node:child_process';
import path from 'node:path';
import { app } from 'electron';
import { AdbServerClient } from '@yume-chan/adb';
import { AdbServerNodeTcpConnector } from '@yume-chan/adb-server-node-tcp';

// Caminho do adb embarcado (Android Platform Tools, Apache-2.0). Em dev,
// espera-se `resources/platform-tools/adb.exe` neste repo (baixar à parte —
// não versionar o binário); em produção, `extraResources` do electron-builder
// coloca em `process.resourcesPath/platform-tools`.
function resolveAdbPath(): string {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'platform-tools')
    : path.join(__dirname, '../../resources/platform-tools');
  return path.join(base, process.platform === 'win32' ? 'adb.exe' : 'adb');
}

// Só usamos o binário adb.exe pra uma coisa: garantir que o ADB server (o
// daemon que fica ouvindo em 127.0.0.1:5037) está de pé. Tudo depois disso —
// listar dispositivo, abrir shell, empurrar o scrcpy-server — fala o
// protocolo ADB direto por TCP via @yume-chan/adb, sem depender de parsear
// stdout de comando nenhum.
export function ensureAdbServerStarted(): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(resolveAdbPath(), ['start-server']);
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`adb start-server saiu com código ${code}`));
        return;
      }
      resolve();
    });
  });
}

let client: AdbServerClient | undefined;

export function getServerClient(): AdbServerClient {
  client ??= new AdbServerClient(
    new AdbServerNodeTcpConnector({ host: '127.0.0.1', port: 5037 }),
  );
  return client;
}

export interface AdbDevice {
  serial: string;
  state: 'device' | 'unauthorized' | 'offline';
  model?: string;
}

// Equivalente a `adb devices -l`, mas via protocolo, sem spawn de processo.
// Um dispositivo recém-plugado aparece como "unauthorized" até o usuário
// confirmar o popup de "Permitir depuração USB?" na tela do próprio celular
// — isso não pode ser automatizado, é decisão do sistema Android, e é o
// principal ponto de fricção de onboarding (ver ESCOPO_ESPELHAMENTO.md §7 no
// repo zapscript).
export async function listDevices(): Promise<AdbDevice[]> {
  const devices = await getServerClient().getDevices();
  return devices.map((d) => ({
    serial: d.serial,
    state: d.state,
    model: d.model,
  }));
}

// Pareamento por Wi-Fi (conveniência, §3 do escopo original): o aparelho
// precisa estar antes autorizado por USB pelo menos uma vez.
export async function connectWifi(address: string): Promise<void> {
  await getServerClient().wireless.connect(address);
}

// Pega um handle de Adb (protocolo completo: shell, sync/push, sockets) pro
// dispositivo selecionado — é o que src/main/scrcpy.ts usa pra empurrar e
// iniciar o scrcpy-server.
export async function getAdb(serial: string) {
  return getServerClient().createAdb({ serial });
}
