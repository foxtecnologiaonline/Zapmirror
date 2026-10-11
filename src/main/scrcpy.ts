import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import path from 'node:path';
import { app } from 'electron';
import type { Adb } from '@yume-chan/adb';
import { AdbScrcpyClient, AdbScrcpyOptionsLatest } from '@yume-chan/adb-scrcpy';
import {
  AndroidKeyCode,
  AndroidKeyEventAction,
  AndroidMotionEventAction,
  AndroidMotionEventButton,
  DefaultServerPath,
  type ScrcpyMediaStreamPacket,
} from '@yume-chan/scrcpy';
import { getAdb } from './adb';

// Camada que era o maior risco técnico do produto (ver
// ESCOPO_ESPELHAMENTO.md §6.1 e ESCOPO_ZAPMIRROR.md §4 no histórico deste
// repo): embarcar o scrcpy-server, empurrar pro aparelho, abrir os sockets
// de vídeo/controle, decodificar H.264. Em vez de reimplementar esse
// protocolo na mão (era o plano original e o maior risco de bug silencioso
// sem hardware pra testar), isto usa a biblioteca TypeScript do mesmo autor
// do scrcpy-server que o próprio Genymobile cita no README do scrcpy
// (github.com/yume-chan/ya-webadb, MIT) — ela já implementa o protocolo
// scrcpy inteiro (@yume-chan/scrcpy, @yume-chan/adb-scrcpy) e o decoder
// WebCodecs do lado do renderer (@yume-chan/scrcpy-decoder-webcodecs).
//
// O que AINDA não está validado: isto nunca rodou contra um scrcpy-server
// real nem um Android físico (sem hardware neste sandbox). O binário do
// servidor também não está no repo — rode `npm run fetch-scrcpy-server` (no
// SEU computador, não aqui: baixa do GitHub, bloqueado neste sandbox) antes
// de testar.

function resolveServerBinPath(): string {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'scrcpy')
    : path.join(__dirname, '../../resources/scrcpy');
  return path.join(base, 'server.bin');
}

export interface MirrorSession {
  serial: string;
  close(): Promise<void>;
  injectTouch(input: {
    action: 'down' | 'up' | 'move';
    x: number;
    y: number;
    videoWidth: number;
    videoHeight: number;
  }): Promise<void>;
  injectKey(input: { code: string; down: boolean }): Promise<void>;
}

type FrameListener = (packet: ScrcpyMediaStreamPacket) => void;
type SizeListener = (size: { width: number; height: number; codec: number }) => void;

export async function startMirrorSession(
  serial: string,
  onFrame: FrameListener,
  onSizeChanged: SizeListener,
): Promise<MirrorSession> {
  const adb: Adb = await getAdb(serial);

  // Cast necessário: o `ReadableStream` nativo do Node (o que `Readable.toWeb`
  // devolve) já suporta `for await`/`Symbol.asyncIterator` em runtime — é a
  // tipagem do @types/node que não declara isso. @yume-chan/stream-extra usa
  // o `ReadableStream` global do próprio ambiente (ver node_modules/
  // @yume-chan/stream-extra/esm/stream.js), então em runtime é a mesma classe.
  const serverStream = Readable.toWeb(createReadStream(resolveServerBinPath())) as unknown as Parameters<
    typeof AdbScrcpyClient.pushServer
  >[1];
  await AdbScrcpyClient.pushServer(adb, serverStream);

  const options = new AdbScrcpyOptionsLatest({
    video: true,
    audio: false,
    control: true,
  });

  const client = await AdbScrcpyClient.start(adb, DefaultServerPath, options);

  const videoStream = await client.videoStream;
  if (!videoStream) {
    throw new Error('Servidor scrcpy não abriu stream de vídeo (video:true foi ignorado?)');
  }

  const codec = videoStream.metadata.codec;
  videoStream.sizeChanged(({ width, height }) => onSizeChanged({ width, height, codec }));
  onSizeChanged({ width: videoStream.width, height: videoStream.height, codec });

  // Loop assíncrono: encaminha cada pacote H.264 (configuração ou dados) pro
  // chamador (que por sua vez manda pro renderer via IPC). Precisa rodar em
  // segundo plano sem bloquear — por isso não é `await`ado aqui.
  void (async () => {
    try {
      for await (const packet of videoStream.stream) {
        onFrame(packet);
      }
    } catch (err) {
      // Stream fechado ao desconectar é esperado; qualquer outro erro é real.
      console.error('[scrcpy] stream de vídeo terminou com erro', err);
    }
  })();

  const controller = client.controller;
  if (!controller) {
    throw new Error('Servidor scrcpy não abriu o canal de controle (control:true foi ignorado?)');
  }

  return {
    serial,
    async close() {
      await client.close();
    },
    async injectTouch({ action, x, y, videoWidth, videoHeight }) {
      const actionMap = {
        down: AndroidMotionEventAction.Down,
        up: AndroidMotionEventAction.Up,
        move: AndroidMotionEventAction.Move,
      } as const;

      await controller.injectTouch({
        action: actionMap[action],
        pointerId: 0n,
        pointerX: Math.round(x),
        pointerY: Math.round(y),
        videoWidth,
        videoHeight,
        pressure: action === 'up' ? 0 : 1,
        actionButton: AndroidMotionEventButton.Primary,
        buttons: action === 'up' ? 0 : AndroidMotionEventButton.Primary,
      });
    },
    async injectKey({ code, down }) {
      // `code` é o `KeyboardEvent.code` do browser (ex: "KeyA", "Digit5",
      // "Space", "Enter", "Backspace", "ArrowUp") — a biblioteca nomeia as
      // constantes de keycode do Android quase 1:1 com isso, então o lookup
      // direto cobre a maior parte do teclado sem tabela de tradução manual.
      // Teclas sem correspondência direta (ex: "ControlLeft") são ignoradas
      // por ora — ver AndroidKeyCode em node_modules/@yume-chan/scrcpy pra
      // completar depois.
      const keyCode = (AndroidKeyCode as Record<string, AndroidKeyCode | undefined>)[code];
      if (keyCode === undefined) return;

      await controller.injectKeyCode({
        action: down ? AndroidKeyEventAction.Down : AndroidKeyEventAction.Up,
        keyCode,
        repeat: 0,
        metaState: 0,
      });
    },
  };
}
