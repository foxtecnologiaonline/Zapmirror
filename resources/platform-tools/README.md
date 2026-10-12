# platform-tools

`adb.exe` e as DLLs que ele precisa (`AdbWinApi.dll`, `AdbWinUsbApi.dll`,
`libusb-1.0.dll`, `libwinpthread-1.dll`) estão versionados neste diretório.

**Proveniência:** o site oficial do Google
(`dl.google.com/android/repository/platform-tools-latest-windows.zip`) está
bloqueado na política de rede do sandbox onde este projeto foi escrito, então
os binários vieram do pacote npm `android-tools-bin@2.0.1`
(`dist/win32/x86/`) — um repacote direto do ZIP oficial do Google, mesmo
conteúdo, mesma licença: **Apache-2.0** (ver `NOTICE-google-platform-tools.txt`
nesta pasta, copiado do próprio ZIP do Google). O pacote npm em si é
GPL-3.0 (código JS de wrapper, não usado aqui) — só os binários Apache-2.0
foram extraídos e commitados.

Se quiser os binários direto da fonte oficial (ex. versão mais nova),
baixe o ZIP do link acima e substitua os arquivos aqui — formato e nomes são
os mesmos.

Empacotado via `extraResources` em `package.json`.
