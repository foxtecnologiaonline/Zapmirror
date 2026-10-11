// `export {}` força o TS a tratar este arquivo como módulo — sem isso,
// `declare global` não tem efeito e `window.zapmirror` fica implicitamente
// `any` (TS2669).
export {};

import {
  WebCodecsVideoDecoder,
  WebGLVideoFrameRenderer,
} from '@yume-chan/scrcpy-decoder-webcodecs';
import type { ScrcpyMediaStreamPacket, ScrcpyVideoCodecId } from '@yume-chan/scrcpy';

declare global {
  interface Window {
    zapmirror: {
      listDevices: () => Promise<{ serial: string; state: string; model?: string }[]>;
      startMirror: (serial: string) => Promise<void>;
      stopMirror: () => Promise<void>;
      sendTouch: (input: {
        action: 'down' | 'up' | 'move';
        x: number;
        y: number;
        videoWidth: number;
        videoHeight: number;
      }) => Promise<void>;
      sendKey: (input: { code: string; down: boolean }) => Promise<void>;
      onFrame: (callback: (packet: ScrcpyMediaStreamPacket) => void) => () => void;
      onSize: (callback: (size: { width: number; height: number; codec: number }) => void) => () => void;
    };
  }
}

const devicesEl = document.getElementById('devices')!;
const mirrorEl = document.getElementById('mirror')!;
const statusEl = document.getElementById('status')!;
const canvas = document.getElementById('screen') as HTMLCanvasElement;

let decoder: WebCodecsVideoDecoder | undefined;
let writer: WritableStreamDefaultWriter<ScrcpyMediaStreamPacket> | undefined;
let currentSize = { width: 0, height: 0 };
let stopFrameListener: (() => void) | undefined;
let stopSizeListener: (() => void) | undefined;

async function renderDevices() {
  let devices: { serial: string; state: string; model?: string }[];
  try {
    devices = await window.zapmirror.listDevices();
  } catch (err) {
    devicesEl.textContent =
      'Não consegui falar com o adb server. Verifique se o adb.exe está em resources/platform-tools/ (ver README) e tente de novo.';
    console.error('[devices] listDevices falhou:', err);
    return;
  }

  if (devices.length === 0) {
    devicesEl.textContent =
      'Nenhum dispositivo detectado ainda. Conecte um Android por USB e autorize a depuração no aparelho.';
    return;
  }

  devicesEl.innerHTML = '';
  for (const d of devices) {
    const row = document.createElement('div');
    row.className = 'device';

    const label = document.createElement('span');
    label.textContent = `${d.model ?? d.serial} — ${d.state}`;
    row.appendChild(label);

    const button = document.createElement('button');
    button.textContent = 'Espelhar';
    button.disabled = d.state !== 'device';
    button.onclick = () => startMirroring(d.serial);
    row.appendChild(button);

    devicesEl.appendChild(row);
  }
}

async function startMirroring(serial: string) {
  statusEl.textContent = `Conectando em ${serial}...`;

  stopFrameListener?.();
  stopSizeListener?.();
  decoder?.dispose();

  stopSizeListener = window.zapmirror.onSize(({ width, height, codec }) => {
    currentSize = { width, height };
    canvas.width = width;
    canvas.height = height;

    decoder?.dispose();
    decoder = new WebCodecsVideoDecoder({
      // `codec` chega do processo principal como número puro via IPC; o
      // valor em si sempre vem de `videoStream.metadata.codec` (já um
      // `ScrcpyVideoCodecId` de verdade), então o cast é seguro.
      codec: codec as ScrcpyVideoCodecId,
      renderer: new WebGLVideoFrameRenderer(canvas),
    });
    writer = decoder.writable.getWriter();
    statusEl.textContent = `Espelhando ${serial} — ${width}x${height}`;
  });

  stopFrameListener = window.zapmirror.onFrame((packet) => {
    void writer?.write(packet);
  });

  mirrorEl.classList.add('active');
  await window.zapmirror.startMirror(serial);
  canvas.focus();
}

function videoCoordsFromEvent(event: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = currentSize.width / rect.width;
  const scaleY = currentSize.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

canvas.addEventListener('mousedown', (event) => {
  const { x, y } = videoCoordsFromEvent(event);
  void window.zapmirror.sendTouch({ action: 'down', x, y, videoWidth: currentSize.width, videoHeight: currentSize.height });
});

canvas.addEventListener('mousemove', (event) => {
  if (event.buttons === 0) return;
  const { x, y } = videoCoordsFromEvent(event);
  void window.zapmirror.sendTouch({ action: 'move', x, y, videoWidth: currentSize.width, videoHeight: currentSize.height });
});

canvas.addEventListener('mouseup', (event) => {
  const { x, y } = videoCoordsFromEvent(event);
  void window.zapmirror.sendTouch({ action: 'up', x, y, videoWidth: currentSize.width, videoHeight: currentSize.height });
});

canvas.addEventListener('keydown', (event) => {
  event.preventDefault();
  void window.zapmirror.sendKey({ code: event.code, down: true });
});

canvas.addEventListener('keyup', (event) => {
  event.preventDefault();
  void window.zapmirror.sendKey({ code: event.code, down: false });
});

renderDevices();
