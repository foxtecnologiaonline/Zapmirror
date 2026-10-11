# ZapMirror

> Espelhamento e controle de celular Android no Windows (mouse e teclado),
> via ADB — o mesmo mecanismo do scrcpy.

Projeto único e independente: app desktop Electron, sem backend, sem conta,
sem WhatsApp/Evolution API. 100% local no PC do usuário depois de instalado.

Ver `ESCOPO_ZAPMIRROR.md` para a análise de mercado, a arquitetura e o que
falta para o MVP.

## Estrutura

```
zapmirror/
├── src/
│   ├── main/        → processo principal Electron (janela, IPC, wrapper ADB)
│   ├── preload/      → bridge seguro main↔renderer
│   └── renderer/     → UI
└── resources/
    └── platform-tools/  → coloque o adb.exe aqui (ver README ali)
```

## Setup local

```bash
npm install
npm run dev
```

Precisa do `adb.exe` em `resources/platform-tools/` antes de rodar — ver o
README ali.

## Estado atual (honesto)

- Compila limpo (`tsc`) e o processo Electron sobe sem crash (smoke test
  headless). **Isso não valida UI, ADB real ou o fluxo completo.**
- `adb devices` (`src/main/adb.ts`) nunca rodou contra hardware real.
- **O pipeline de vídeo/input — a parte que de fato espelha a tela — ainda
  não está implementado**, ver `src/main/videoPipeline.ts`. Só dá para
  validar isso rodando no Windows com um Android físico conectado.
