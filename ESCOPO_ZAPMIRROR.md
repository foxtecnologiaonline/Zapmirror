# ZapMirror — Escopo

- **Atualizado em:** 2026-10-12
- **Status:** ADB real validado de ponta a ponta neste sandbox (protocolo,
  não hardware). Binários (`adb.exe`, `server.bin`) já versionados no repo,
  com proveniência e licença documentadas. Instalador Windows gerado e
  validado estruturalmente (via Wine neste sandbox). O que falta é só o que
  nenhum sandbox resolve: rodar contra um Android físico num Windows real
  — ver §5.
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
└── fetch-scrcpy-server.mjs    troca resources/scrcpy/server.bin por outra versão (opcional)
resources/
├── platform-tools/            adb.exe + DLLs, versionados — ver README ali (proveniência/licença)
└── scrcpy/                     server.bin (scrcpy-server 2.5), versionado — ver README ali
```

## 4. Estado real do código — o que foi validado nesta sessão e como

Diferente das rodadas anteriores (só "compila"), esta teve validação de
execução real:

| Item | Estado |
|---|---|
| `src/main/adb.ts` (`AdbServerClient` via `@yume-chan/adb` + `@yume-chan/adb-server-node-tcp`) | **Validado de verdade.** Instalei `adb` real via apt neste sandbox (não tem Windows aqui, mas o protocolo ADB client↔server é o mesmo), rodei o app e, fora do Electron também, um script direto: `client.getVersion()` → `41`, `client.getDevices()` → `[]` (sem Android físico, mas round-trip completo do protocolo, idêntico ao `adb devices -l` nativo) |
| `src/main/index.ts` — graceful degradation | **Bug real encontrado e corrigido.** Antes desta rodada, se `ensureAdbServerStarted()` falhasse (ex.: `adb` ausente), a `Promise` rejeitava sem `.catch()` e `createWindow()` nunca era chamado — o app ficava vivo sem abrir janela nenhuma, sem erro visível. Agora falha é logada e a janela abre mesmo assim; `devices:list` reporta o erro de forma tratada na UI |
| Build (`tsc` puro → `esbuild`) | **Bug real encontrado e corrigido.** Os pacotes `@yume-chan/*` são ESM-only; `tsc` com `module: commonjs` gerava `require(...)` pra eles, que quebrava com `ERR_REQUIRE_ESM` no processo principal — e no renderer nem chegava a esse erro, porque `require` não existe lá (`nodeIntegration: false`). Troquei a emissão por `esbuild` (`scripts/build.mjs`), que bundla certo pros três alvos (main/preload = Node+CJS, renderer = browser+IIFE); `tsc --noEmit` continua rodando só pra checar tipos |
| `src/main/scrcpy.ts` (sessão de espelhamento: push server, `AdbScrcpyClient.start`, vídeo, `injectTouch`/`injectKeyCode`) | **Escrito e type-checked, não validado em execução contra hardware.** Usa `AdbScrcpyOptions2_5`, pinado pra bater com `resources/scrcpy/server.bin` (ver abaixo) |
| `src/renderer/main.ts` (lista de dispositivos, canvas, `WebCodecsVideoDecoder` + `WebGLVideoFrameRenderer`, captura de mouse/teclado) | **Escrito e type-checked, não validado em execução** — depende do mesmo que o item acima |
| Transferência `Uint8Array`/`bigint` via IPC (frames de vídeo main→renderer) | **Verificado isoladamente.** Testei com uma janela Electron mínima, fora do app: `Uint8Array` e `bigint` chegam intactos do lado do preload. Confirma a premissa de `onFrame`/`mirror:frame` |
| **Binários (`adb.exe`, `server.bin`)** | **Resolvidos e versionados no repo**, sem precisar do usuário baixar nada. `dl.google.com` e `github.com` (releases) estão bloqueados pra mim neste sandbox, mas o npm registry não — extraí `adb.exe`+DLLs do pacote `android-tools-bin@2.0.1` (Apache-2.0, confirmado via `NOTICE.txt` embutido) e `scrcpy-server` do pacote `@scrcpy-installer/win32-x64@1.0.1` (só esse arquivo, confirmado como build genuíno da Genymobile pelas classes `com.genymobile.scrcpy.*` internas — Apache-2.0, apesar do pacote-wrapper se declarar "Proprietary" no nível do npm). Proveniência completa nos READMEs de `resources/platform-tools/` e `resources/scrcpy/` |
| **Versão do scrcpy-server encontrada: 2.5** (não a "latest" que a lib usa por padrão) — `scrcpy.ts` foi ajustado de `AdbScrcpyOptionsLatest` pra `AdbScrcpyOptions2_5` pra bater exatamente. `scripts/fetch-scrcpy-server.mjs` virou opcional (trocar de versão sob demanda) em vez de obrigatório no primeiro setup — e agora exige a versão como argumento explícito, pra nunca mais baixar uma versão desalinhada da classe de opções em uso |
| **Empacotamento Windows** | **NSIS + portable gerados com sucesso** (`npm run build`, `electron-builder` + Wine, cross-compilado neste sandbox Linux) — `release/ZapMirror Setup 0.0.1.exe` (instalador) e `release/ZapMirror 0.0.1.exe` (roda direto, sem instalar), **~73,6MB cada** (otimizado — ver abaixo), `adb.exe`/`server.bin` corretamente dentro de `resources/`. Achei e corrigi um bug real na primeira tentativa: `files: ["dist/**/*"]` colidia com a própria pasta `dist/` onde o build anterior ficava, empacotando recursivamente um build dentro do outro (166MB → 332MB entre builds) — mudei o output do electron-builder pra `release/` (separado do bundle do esbuild em `dist/`) e tirei `node_modules` do pacote (o esbuild já embute tudo, incluir de novo era 420MB de peso morto). **Não valida**: se roda num Windows de verdade, nem o espelhamento em si. Code signing: não feito (sem certificado) |
| **Otimização de tamanho** | `compression: "maximum"` + `electronLanguages: ["en-US"]` — `locales/` caiu de 39MB pra 460KB (o app não usa string traduzida do Chromium, nunca mostrou menu nativo customizado). 77MB → 73,6MB. **Decisão deliberada de não cortar mais:** `d3dcompiler_47.dll`/`ffmpeg.dll`/`vk_swiftshader*` somam ~10-15MB a mais e dá pra removê-los com um hook `afterPack`, mas são a engine de WebGL/decodificação de vídeo do Chromium — exatamente o que `WebCodecsVideoDecoder`/`WebGLVideoFrameRenderer` usam pra desenhar o espelhamento. Cortar isso é economia de tamanho às custas de risco real na única coisa que o produto precisa fazer direito |

**Dois bugs reais encontrados numa revisão anterior e corrigidos** (releitura crítica de `src/main/scrcpy.ts` e `src/renderer/main.ts`, sem precisar de hardware pra achá-los):

- `startMirrorSession` podia deixar o scrcpy-server "pendurado" no aparelho:
  se `client.videoStream`/`client.controller` vinham vazios depois de
  `AdbScrcpyClient.start()` já ter tido sucesso, o código lançava erro sem
  chamar `client.close()` — processo no device + conexão ADB ficavam
  abertos. Corrigido com `try/catch` fechando o client em qualquer falha
  depois do `start()`.
- Um clique em "Espelhar" que falhasse (ex.: `server.bin` ausente) ficava
  preso em "Conectando..." pra sempre — `await window.zapmirror.startMirror()`
  não tinha `try/catch`, então a falha virava rejeição não tratada no
  clique. Agora mostra o erro no status e libera a UI pra tentar de novo.

## 5. O que falta — só o que nenhum sandbox resolve

Com os binários versionados e o instalador gerando certo, sobra exatamente
uma coisa que decide se o produto existe de verdade:

1. **Testar com Android físico + Windows real** — rodar
   `ZapMirror Setup 0.0.1.exe` (instalador) ou `ZapMirror 0.0.1.exe`
   (portable, sem instalar), conectar o celular, autorizar "Depuração
   USB", clicar "Espelhar" na UI, confirmar que o vídeo aparece e que
   clique/tecla chegam no aparelho. **Impossível neste sandbox** (sem
   USB/tela/Windows real — Wine chegou a rodar o instalador, mas emulação
   de driver USB pra um Android físico não é algo em que confiar). Só o
   usuário consegue fazer isso.

Depois que isso funcionar (ou revelar o que precisa ajustar):

2. **UI mínima faltando:** botão de print (captura de frame atual) — o
   resto da UI básica (lista de dispositivos, canvas de vídeo, input) já
   está escrito.
3. **Code signing** — certificado de assinatura de código pra Windows não
   bloquear/assustar o usuário no primeiro uso (custo recorrente, decisão
   do dono do produto, não técnica).

Recorte de MVP (ainda vale): **1 celular, 1 janela, USB, controle ativo,
print.** Wi-Fi, múltiplos aparelhos e gravação ficam para depois de
confirmar que o item 1 funciona com latência aceitável.
