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
│   └── fetch-scrcpy-server.mjs   → baixa uma versão mais nova do servidor (opcional, ver nota de versão abaixo)
└── resources/
    ├── platform-tools/  → adb.exe + DLLs, já versionados (ver README ali)
    └── scrcpy/            → server.bin, já versionado (ver README ali)
```

**Os binários necessários já estão no repo** — `adb.exe` (+ DLLs) e
`server.bin` (scrcpy-server 2.5) vêm versionados em `resources/`. Não é
preciso baixar nada pra rodar `npm install && npm run dev` ou
`npm run build`. Ver os READMEs em cada pasta de `resources/` para a
proveniência exata e a licença de cada binário.

## Build

Os pacotes que falam o protocolo ADB/scrcpy (`@yume-chan/*`) são ESM-only.
`tsc` puro gera `require(...)` pra eles, o que quebra tanto no processo
principal (Node não carrega ESM síncrono assim) quanto no renderer (que nem
tem `require`, já que `nodeIntegration` está desligado). Por isso o build
real é `esbuild` (`scripts/build.mjs`), que bundla tudo certo pra cada
processo; `tsc --noEmit` continua rodando antes, só pra checagem de tipos.

## Setup local (dev)

```bash
npm install
npm run dev
```

## Gerar o build Windows

```bash
npm run build
```

Produz dois arquivos em `release/` (não `dist/` — esse é o bundle do
esbuild, build Windows fica separado pra não se misturar):

- `ZapMirror Setup <versão>.exe` — instalador NSIS tradicional (assistente,
  Menu Iniciar, desinstalador).
- `ZapMirror <versão>.exe` — **portable**: um único `.exe` que roda direto,
  sem assistente de instalação, sem admin, sem gravar nada permanente no
  sistema. Pra quem quer só rodar sem instalar.

Ambos (~73,6 MB cada) **já testados neste sandbox** (via `electron-builder` +
Wine, cross-compilando de Linux): geram com sucesso e os binários de
`resources/` ficam corretamente empacotados dentro. Não precisa de Windows
pra gerar — só pra rodar de verdade.

**Otimizações de tamanho aplicadas** (`compression: "maximum"` +
`electronLanguages: ["en-US"]` no `package.json`): cortam os ~50 idiomas do
Chromium que o app não usa (`locales/` caiu de 39 MB pra 460 KB) e usam
compressão LZMA máxima no instalador/portable. **O que eu deliberadamente
não toquei:** `d3dcompiler_47.dll`, `ffmpeg.dll`, `vk_swiftshader*` — são
parte da engine de renderização/decodificação de vídeo do Chromium
(WebGL + WebCodecs), exatamente o que este app usa pra decodificar e
desenhar o espelhamento. Cortar esses arquivos economizaria uns 10-15 MB a
mais, mas arriscaria quebrar a função principal do produto em máquinas sem
aceleração de GPU — não vale a troca.

## Estado atual (honesto)

- **Validado de verdade:** `src/main/adb.ts` fala o protocolo ADB real por
  TCP (`@yume-chan/adb` + `@yume-chan/adb-server-node-tcp`) — testado neste
  sandbox com um `adb` real (instalado via apt) rodando o servidor: abriu a
  conexão, leu a versão do servidor e listou dispositivos (vazio, sem
  Android físico aqui, mas o protocolo completo funcionou). O app sobe sem
  crash num smoke test headless, com e sem o binário `adb` presente — sem
  ele, degrada graciosamente em vez de travar sem abrir janela (bug real que
  apareceu e foi corrigido durante essa validação).
- **Empacotamento Windows validado estruturalmente:** `npm run build`
  (`electron-builder`, Wine) gera o instalador NSIS com sucesso, com
  `adb.exe`/`server.bin` corretamente dentro de `resources/` no pacote. O
  que isso **não** valida: se o instalador instala e roda certo num Windows
  de verdade, nem se o espelhamento funciona contra um Android físico.
- **Escrito, mas sem validação com hardware real:** `src/main/scrcpy.ts` (a
  sessão de espelhamento — push do servidor, vídeo, input) e o decoder no
  renderer (`@yume-chan/scrcpy-decoder-webcodecs`). O `server.bin` já está
  no repo (scrcpy-server 2.5, ver `resources/scrcpy/README.md`), mas nunca
  foi testado contra um Android físico — isso só dá pra validar no Windows
  do usuário, instalando o app e conectando um celular.
- **Revisão de código (sessão anterior):** confirmei com um teste isolado
  que `Uint8Array`/`bigint` sobrevivem ao IPC do Electron intactos (a
  premissa por trás do encaminhamento de frames main→renderer). Corrigidos
  2 bugs reais: `startMirrorSession` podia deixar o processo scrcpy-server
  "pendurado" no aparelho se `videoStream`/`controller` viessem vazios
  depois do `client.start()` ter sucesso; e um clique em "Espelhar" que
  falhasse ficava preso em "Conectando..." pra sempre, sem feedback.
