# resources/scrcpy

Roda `npm run fetch-scrcpy-server` (no seu computador — baixa do GitHub, que
está bloqueado no sandbox onde este projeto foi desenvolvido) para colocar
`server.bin` aqui. A versão baixada é lida automaticamente da biblioteca
`@yume-chan/adb-scrcpy` instalada, então vai sempre bater com o protocolo que
`src/main/scrcpy.ts` espera — não escolha a versão à mão.

Não versionar o binário neste repo (`.gitignore` já cobre `*.bin` aqui); o
`electron-builder` empacota este diretório via `extraResources` em
`package.json`.
