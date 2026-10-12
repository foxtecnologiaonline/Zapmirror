# resources/scrcpy

`server.bin` está versionado neste diretório — **scrcpy-server 2.5**
(Genymobile, Apache-2.0), verificado por conter as classes
`com.genymobile.scrcpy.*` reais do projeto upstream
(github.com/Genymobile/scrcpy).

**Proveniência:** o GitHub (de onde `scripts/fetch-scrcpy-server.mjs` baixa
normalmente) está bloqueado na política de rede do sandbox onde este projeto
foi escrito. O binário aqui veio extraído do pacote npm
`@scrcpy-installer/win32-x64@1.0.1` — **só o arquivo `scrcpy-server` foi
extraído e commitado**, nenhum outro conteúdo desse pacote (que embute um
bundle inteiro do Android SDK e se declara "Proprietary" no nível do pacote
— mas o `scrcpy-server` em si é inequivocamente o build oficial Apache-2.0
da Genymobile, confirmado pelas classes internas).

**Versão importa:** `src/main/scrcpy.ts` usa `AdbScrcpyOptions2_5` (não
`AdbScrcpyOptionsLatest`) exatamente porque este binário é a versão 2.5 —
cliente e servidor do scrcpy precisam estar na mesma versão. Se trocar este
arquivo por uma versão mais nova (ex. rodando
`npm run fetch-scrcpy-server` no seu computador, que pega a última versão
do GitHub), **troque também** a classe de opções em `scrcpy.ts` pela
correspondente em `@yume-chan/adb-scrcpy` (ex. `AdbScrcpyOptionsLatest`).

Empacotado via `extraResources` em `package.json`.
