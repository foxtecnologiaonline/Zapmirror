// Camada de maior risco técnico do produto (ver ESCOPO_ESPELHAMENTO.md §6.1
// no repo zapscript, item 3). Ainda NÃO implementada neste scaffold — só o
// contrato de funções que o resto do app (renderer, IPC) já assume, para não
// bloquear o desenvolvimento das outras camadas (ADB, licença, UI) enquanto
// isso é resolvido.
//
// O que falta de verdade aqui, em ordem:
//   1. Empacotar o `scrcpy-server.jar` (Apache-2.0, extraído de uma release do
//      github.com/Genymobile/scrcpy) em `resources/`.
//   2. `adb push` do jar + `adb shell app_process` pra rodar o servidor no
//      aparelho (ver `pushScrcpyServer` em adb.ts).
//   3. Abrir o socket local (`forwardScrcpyPort`) e ler os frames H.264 que
//      chegam nele.
//   4. Decodificar H.264 — candidatos: WebCodecs API (disponível no Chromium
//      embutido do Electron, decodificação no próprio renderer) ou um módulo
//      nativo (ex. binding sobre libavcodec/ffmpeg).
//   5. Desenhar os frames decodificados num <canvas> no renderer.
//
// Só depois disso faz sentido medir latência real e decidir se o produto é
// viável nesse eixo — é o "spike técnico isolado" recomendado no escopo.

export interface MirrorSession {
  deviceSerial: string;
  localPort: number;
}

export async function startMirrorSession(_deviceSerial: string): Promise<MirrorSession> {
  throw new Error(
    'startMirrorSession: pipeline de vídeo ainda não implementado — ver TODO em videoPipeline.ts',
  );
}

export async function stopMirrorSession(_session: MirrorSession): Promise<void> {
  throw new Error(
    'stopMirrorSession: pipeline de vídeo ainda não implementado — ver TODO em videoPipeline.ts',
  );
}
