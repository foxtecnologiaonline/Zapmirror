# ZapMirror

> Espelhamento e controle de celular Android no Windows (mouse e teclado),
> via ADB — o mesmo mecanismo do scrcpy.

Projeto único e independente: app desktop Electron, sem backend, sem conta,
sem WhatsApp/Evolution API. 100% local no PC do usuário depois de instalado.

Ver `ESCOPO_ZAPMIRROR.md` para a arquitetura completa e o que falta para o
MVP.

## Estrutura

```
zapmirror/
├── src/
│   ├── main/
│   │   ├── index.ts    → janela Electron, IPC
│   │   ├── adb.ts       → protocolo ADB real (lista dispositivos, Wi-Fi, abre Adb pro device)
│   │   └── scrcpy.ts     → sessão de espelhamento (push+start do scrcpy-server, vídeo, input)
│   ├── preload/          → bridge seguro main↔renderer
│   └── renderer/          → UI: lista de dispositivos + canvas de espelhamento
├── scripts/
│   ├── build.mjs                 → bundler (esbuild) — ver §"Build" abaixo
│   └── fetch-scrcpy-server.mjs   → baixa o binário do servidor (rodar localmente)
└── resources/
    ├── platform-tools/  → coloque o adb aqui (ver README ali)
    └── scrcpy/            → `npm run fetch-scrcpy-server` baixa o server.bin aqui
```

## Build

Os pacotes que falam o protocolo ADB/scrcpy (`@yume-chan/*`) são ESM-only.
`tsc` puro gera `require(...)` pra eles, o que quebra tanto no processo
principal (Node não carrega ESM síncrono assim) quanto no renderer (que nem
tem `require`, já que `nodeIntegration` está desligado). Por isso o build
real é `esbuild` (`scripts/build.mjs`), que bundla tudo certo pra cada
processo; `tsc --noEmit` continua rodando antes, só pra checagem de tipos.

## Setup local

```bash
npm install
npm run fetch-scrcpy-server   # baixa resources/scrcpy/server.bin (precisa de acesso ao GitHub)
npm run dev
```

Precisa do `adb` (Android Platform Tools) em `resources/platform-tools/`
antes de rodar — ver o README ali.

## Estado atual (honesto)

- **Validado de verdade:** `src/main/adb.ts` fala o protocolo ADB real por
  TCP (`@yume-chan/adb` + `@yume-chan/adb-server-node-tcp`) — testado neste
  sandbox com um `adb` real (instalado via apt) rodando o servidor: abriu a
  conexão, leu a versão do servidor e listou dispositivos (vazio, sem
  Android físico aqui, mas o protocolo completo funcionou). O app sobe sem
  crash num smoke test headless, com e sem o binário `adb` presente — sem
  ele, degrada graciosamente em vez de travar sem abrir janela (bug real que
  apareceu e foi corrigido durante essa validação).
- **Escrito, mas sem validação com hardware real:** `src/main/scrcpy.ts` (a
  sessão de espelhamento — push do servidor, vídeo, input) e o decoder no
  renderer (`@yume-chan/scrcpy-decoder-webcodecs`). O binário
  `resources/scrcpy/server.bin` nunca foi baixado neste sandbox (GitHub
  bloqueado na política de rede daqui) nem testado contra um Android físico
  — isso só dá pra validar no Windows do usuário, com `npm run
  fetch-scrcpy-server` rodado lá.
