# ZapMirror — Escopo

- **Atualizado em:** 2026-10-11
- **Status:** scaffold Electron no ar, compila e sobe sem crash — o core
  (vídeo/input) ainda não está implementado.
- **Decisão de escopo (2026-10-11):** o projeto foi **reduzido a só isto**:
  espelhar e controlar um Android no Windows via ADB. Sem backend, sem conta
  de usuário, sem licenciamento, sem integração com WhatsApp/Evolution API.
  Essas camadas existiram numa versão anterior deste repo (auth, licença,
  instância própria na Evolution compartilhada do ZapScript) e foram
  removidas — ver `git log` antes deste commit se precisar recuperar algo.
- **Análise de mercado/viabilidade original:** vive no repo `zapscript`,
  `ESCOPO_ESPELHAMENTO.md` — concorrência (scrcpy, Vysor, ApowerMirror,
  AirDroid), por que só Android é viável, e por que o diferencial via
  WhatsApp foi deixado de lado por enquanto. Vale ler antes de reconsiderar
  adicionar de volta qualquer coisa que não seja ADB puro.

---

## 1. O que é

Um app desktop Windows (Electron) que espelha a tela de um Android e deixa
controlar com mouse e teclado, via ADB — o mesmo mecanismo do scrcpy. Roda
100% local, sem servidor, sem conta.

Sem diferencial de produto além de UX — isso é uma decisão consciente: a
prioridade agora é confirmar que o pipeline de vídeo/input funciona com
latência aceitável, antes de investir em qualquer coisa além disso (ver
`ESCOPO_ESPELHAMENTO.md` §0 do repo zapscript — é exatamente o "spike técnico
isolado" recomendado ali).

## 2. Estrutura

```
src/
├── main/
│   ├── index.ts         janela Electron, IPC
│   ├── adb.ts            wrapper real: listDevices, forward, push
│   └── videoPipeline.ts  FALTA — ver §4
├── preload/index.ts       bridge contextIsolation
└── renderer/              UI (hoje: só lista dispositivos)
```

## 3. Estado real do código

| Item | Estado |
|---|---|
| `tsc` (typecheck) | Compila limpo |
| Processo Electron | Sobe sem crash (smoke test headless, Xvfb) — não valida UI nem ADB real |
| `adb.ts` — `listDevices`, `connectWifi`, `forwardScrcpyPort`, `pushScrcpyServer` | Escrito, **nunca rodou contra hardware real** |
| `videoPipeline.ts` | **Não implementado** — é o core do produto, ver §4 |
| UI | Só lista dispositivos; falta a janela de espelhamento (vídeo + clique/tecla) e o print |
| Empacotamento Windows, code signing | Não iniciado |

## 4. O que falta para o MVP, em ordem de dependência

1. **`adb.exe`** (Android Platform Tools, Apache-2.0) em
   `resources/platform-tools/` — não versionado, baixar à parte.
2. **Validar `listDevices()` com hardware real** — só dá pra fazer no
   Windows do usuário com um Android conectado (autorizando "Depuração USB"
   no aparelho). Impossível neste sandbox (Linux, sem USB/tela).
3. **Pipeline de vídeo/input (`videoPipeline.ts`)** — o que falta de fato:
   - Embarcar `scrcpy-server.jar` (Apache-2.0, extraído de uma release do
     github.com/Genymobile/scrcpy).
   - `adb push` do jar + `adb shell app_process` pra rodar no aparelho.
   - Abrir o socket local (`forwardScrcpyPort`) e ler os frames H.264.
   - Decodificar H.264 no renderer (WebCodecs API do Chromium embutido, ou
     módulo nativo) e desenhar num `<canvas>`.
   - Traduzir clique/tecla do Electron pro protocolo de input do scrcpy, no
     mesmo socket.
4. **UI de espelhamento de verdade** — janela com o vídeo + captura de
   clique/tecla + botão de print.
5. **Empacotamento** — instalador Windows (`electron-builder`, já
   configurado em `package.json`, nunca rodado) + certificado de code
   signing.

Recorte de MVP (do `ESCOPO_ESPELHAMENTO.md` §2 original, ainda vale): **1
celular, 1 janela, USB, controle ativo, print.** Wi-Fi, múltiplos aparelhos e
gravação ficam para depois de confirmar que o pipeline de vídeo é viável.

O item 3 é o único que decide se o produto existe. Tudo antes dele (1, 2) é
só o que falta pra conseguir testar o item 3; tudo depois (4, 5) só importa
se o item 3 funcionar com latência aceitável.
