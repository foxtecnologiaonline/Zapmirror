# ZapMirror — Escopo

- **Atualizado em:** 2026-10-11
- **Status:** ADB real validado de ponta a ponta neste sandbox (protocolo,
  não hardware). Sessão de espelhamento (scrcpy) escrita, mas sem validar
  contra servidor/dispositivo reais — ver §3.
- **Decisão de escopo (2026-10-11):** o projeto é **só isto**: espelhar e
  controlar um Android no Windows via ADB. Sem backend, sem conta de
  usuário, sem licenciamento, sem integração com WhatsApp/Evolution API —
  isso existiu numa versão anterior deste repo e foi removido (ver `git log`
  se precisar recuperar algo).
- **Análise de mercado/viabilidade original:** vive no repo `zapscript`,
  `ESCOPO_ESPELHAMENTO.md` — concorrência (scrcpy, Vysor, ApowerMirror,
  AirDroid), por que só Android é viável. Vale ler antes de reconsiderar
  adicionar de volta qualquer coisa que não seja ADB puro.

---

## 1. O que é

Um app desktop Windows (Electron) que espelha a tela de um Android e deixa
controlar com mouse e teclado, via ADB. Roda 100% local, sem servidor, sem
conta.

## 2. Decisão de arquitetura: não reimplementar o protocolo scrcpy na mão

O plano original (ver `ESCOPO_ESPELHAMENTO.md` §6.1 do repo zapscript) era
embarcar o `scrcpy-server.jar` e escrever do zero o parsing do socket de
vídeo H.264 + protocolo de input — classificado ali como "a camada de maior
risco técnico", exatamente por não haver como validar sem hardware.

Em vez disso, este repo usa **Tango ADB** (`@yume-chan/adb`,
`@yume-chan/adb-scrcpy`, `@yume-chan/scrcpy`,
`@yume-chan/scrcpy-decoder-webcodecs` — MIT, github.com/yume-chan/ya-webadb),
uma implementação TypeScript madura e mantida do protocolo ADB **e** do
protocolo scrcpy, incluindo o decoder H.264 via WebCodecs. É o motor por
trás de clientes scrcpy web existentes. Isso substitui:

- parsing manual de `adb devices -l` → protocolo ADB real por TCP
  (`AdbServerClient`, fala direto com o `adb server` em `127.0.0.1:5037`);
- push/start manual do scrcpy-server → `AdbScrcpyClient.pushServer` +
  `AdbScrcpyClient.start`;
- parsing manual de H.264 → `@yume-chan/scrcpy-decoder-webcodecs` no
  renderer.

O ganho não é só menos código: é trocar "protocolo escrito às cegas, sem
como testar" por "biblioteca de terceiros já testada em produção por outro
projeto, só a integração é nossa". O risco que resta é só verificar se a
integração está certa — bem menor do que acertar o protocolo do zero.

## 3. Estrutura

```
src/
├── main/
│   ├── index.ts    janela Electron, IPC
│   ├── adb.ts       protocolo ADB real: listDevices, connectWifi, getAdb
│   └── scrcpy.ts     sessão de espelhamento: push+start do servidor, vídeo, input
├── preload/index.ts   bridge contextIsolation
└── renderer/           lista de dispositivos + canvas de espelhamento + input
scripts/
├── build.mjs                  bundler (esbuild) — ver §5
└── fetch-scrcpy-server.mjs    baixa resources/scrcpy/server.bin (rodar localmente)
```

## 4. Estado real do código — o que foi validado nesta sessão e como

Diferente das rodadas anteriores (só "compila"), esta teve validação de
execução real:

| Item | Estado |
|---|---|
| `src/main/adb.ts` (`AdbServerClient` via `@yume-chan/adb` + `@yume-chan/adb-server-node-tcp`) | **Validado de verdade.** Instalei `adb` real via apt neste sandbox (não tem Windows aqui, mas o protocolo ADB client↔server é o mesmo), rodei o app e, fora do Electron também, um script direto: `client.getVersion()` → `41`, `client.getDevices()` → `[]` (sem Android físico, mas round-trip completo do protocolo, idêntico ao `adb devices -l` nativo) |
| `src/main/index.ts` — graceful degradation | **Bug real encontrado e corrigido.** Antes desta rodada, se `ensureAdbServerStarted()` falhasse (ex.: `adb` ausente), a `Promise` rejeitava sem `.catch()` e `createWindow()` nunca era chamado — o app ficava vivo sem abrir janela nenhuma, sem erro visível. Agora falha é logada e a janela abre mesmo assim; `devices:list` reporta o erro de forma tratada na UI |
| Build (`tsc` puro → `esbuild`) | **Bug real encontrado e corrigido.** Os pacotes `@yume-chan/*` são ESM-only; `tsc` com `module: commonjs` gerava `require(...)` pra eles, que quebrava com `ERR_REQUIRE_ESM` no processo principal — e no renderer nem chegava a esse erro, porque `require` não existe lá (`nodeIntegration: false`). Troquei a emissão por `esbuild` (`scripts/build.mjs`), que bundla certo pros três alvos (main/preload = Node+CJS, renderer = browser+IIFE); `tsc --noEmit` continua rodando só pra checar tipos |
| `src/main/scrcpy.ts` (sessão de espelhamento: push server, `AdbScrcpyClient.start`, vídeo, `injectTouch`/`injectKeyCode`) | **Escrito e type-checked, não validado em execução.** Precisa de `resources/scrcpy/server.bin` (não baixado aqui — GitHub bloqueado na política de rede deste sandbox) e de um Android físico. É o próximo a testar |
| `src/renderer/main.ts` (lista de dispositivos, canvas, `WebCodecsVideoDecoder` + `WebGLVideoFrameRenderer`, captura de mouse/teclado) | **Escrito e type-checked, não validado em execução** — depende do mesmo que o item acima |
| Empacotamento Windows, code signing | Não iniciado |

## 5. O que falta para o MVP, em ordem de dependência

1. **`resources/scrcpy/server.bin`** — rodar `npm run fetch-scrcpy-server`
   **no computador do usuário** (baixa do GitHub). O script lê a versão
   exigida direto da biblioteca instalada, então não tem como baixar a
   versão errada.
2. **`adb` real em `resources/platform-tools/`** — no Windows, é o
   `adb.exe` do Android Platform Tools. Aqui no sandbox eu usei o pacote
   `android-tools-adb` do apt só pra validar o protocolo (§4) — isso não
   serve pra produção, é Linux, não Windows.
3. **Testar com Android físico + Windows** — conectar o celular, autorizar
   "Depuração USB", clicar "Espelhar" na UI, confirmar que o vídeo aparece e
   que clique/tecla chegam no aparelho. Impossível neste sandbox (sem
   USB/tela/Windows) — só o usuário consegue.
4. **UI mínima faltando:** botão de print (captura de frame atual) — o
   resto da UI básica (lista de dispositivos, canvas de vídeo, input) já
   está escrito.
5. **Empacotamento** — instalador Windows (`electron-builder`, já
   configurado em `package.json`, nunca rodado) + certificado de code
   signing.

Recorte de MVP (ainda vale): **1 celular, 1 janela, USB, controle ativo,
print.** Wi-Fi, múltiplos aparelhos e gravação ficam para depois de
confirmar que o item 3 funciona com latência aceitável.

O item 3 é o que decide se o produto existe de verdade — tudo antes dele (1,
2) só existe pra conseguir chegar lá; tudo depois (4, 5) só importa se ele
funcionar bem.
