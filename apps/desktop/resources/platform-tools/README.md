# platform-tools

Coloque aqui o `adb.exe` (Windows) baixado do pacote oficial **Android SDK
Platform Tools** (Apache-2.0):
https://developer.android.com/tools/releases/platform-tools

Não versionar os binários neste repo — baixar como parte do setup/CI e
extrair aqui antes de `pnpm build` (o `electron-builder` empacota este
diretório via `extraResources` em `apps/desktop/package.json`).
