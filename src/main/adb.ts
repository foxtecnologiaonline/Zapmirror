import { spawn } from 'node:child_process';
import path from 'node:path';
import { app } from 'electron';

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

export interface AdbDevice {
  serial: string;
  state: 'device' | 'unauthorized' | 'offline';
  model?: string;
}

function runAdb(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(resolveAdbPath(), args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => (stdout += chunk.toString()));
    proc.stderr.on('data', (chunk) => (stderr += chunk.toString()));

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`adb ${args.join(' ')} saiu com código ${code}: ${stderr}`));
        return;
      }
      resolve(stdout);
    });
  });
}

// `adb devices -l` — lista dispositivos USB/Wi-Fi já pareados. Um dispositivo
// recém-plugado aparece como "unauthorized" até o usuário confirmar o popup
// de "Permitir depuração USB?" na tela do próprio celular — isso não pode ser
// automatizado, é decisão do sistema Android, e é o principal ponto de
// fricção de onboarding (ver ESCOPO_ESPELHAMENTO.md §7 no repo zapscript).
export async function listDevices(): Promise<AdbDevice[]> {
  const output = await runAdb(['devices', '-l']);

  return output
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state, ...rest] = line.split(/\s+/);
      const modelField = rest.find((field) => field.startsWith('model:'));
      return {
        serial,
        state: state as AdbDevice['state'],
        model: modelField?.split(':')[1],
      };
    });
}

// Pareamento por Wi-Fi (conveniência, §3 do escopo original): o aparelho
// precisa estar antes autorizado por USB pelo menos uma vez.
export async function connectWifi(hostPort: string): Promise<void> {
  await runAdb(['connect', hostPort]);
}

// Abre o túnel local que o scrcpy-server usa para falar com o host
// (vídeo + input no mesmo socket). O binário/jar do scrcpy-server em si
// ainda não está embarcado neste scaffold — ver TODO em video-pipeline.ts.
export async function forwardScrcpyPort(serial: string, localPort: number): Promise<void> {
  await runAdb(['-s', serial, 'forward', `tcp:${localPort}`, 'localabstract:scrcpy']);
}

export async function pushScrcpyServer(serial: string, jarPath: string): Promise<void> {
  await runAdb(['-s', serial, 'push', jarPath, '/data/local/tmp/scrcpy-server.jar']);
}
