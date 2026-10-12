#!/usr/bin/env node
// Baixa uma versão do binário scrcpy-server (Apache-2.0,
// github.com/Genymobile/scrcpy) e coloca em resources/scrcpy/server.bin.
//
// O repo já vem com um server.bin funcional (scrcpy-server 2.5, ver
// resources/scrcpy/README.md) — só rode isto se quiser trocar pra outra
// versão (ex. a mais recente do GitHub).
//
// IMPORTANTE: cliente e servidor do scrcpy precisam estar na MESMA versão.
// Depois de rodar isto, abra src/main/scrcpy.ts e troque `AdbScrcpyOptions2_5`
// pela classe correspondente à versão baixada em @yume-chan/adb-scrcpy (ex.
// `AdbScrcpyOptionsLatest` para a versão mais nova) — senão o app quebra
// com um binário de servidor que o cliente não sabe falar.
//
// Uso: npm run fetch-scrcpy-server -- 3.3.3
//
// Roda no SEU computador, não no sandbox onde este projeto foi escrito: o
// download é direto do GitHub, e o ambiente onde isto foi desenvolvido tem
// github.com bloqueado na política de rede (ver ESCOPO_ZAPMIRROR.md).
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const version = process.argv[2];
if (!version) {
  console.error(
    'Uso: npm run fetch-scrcpy-server -- <versão>  (ex: 3.3.3)\n' +
      'Depois, atualize a classe de opções em src/main/scrcpy.ts pra versão correspondente.',
  );
  process.exit(1);
}

console.log(`Baixando scrcpy-server v${version} do GitHub (Genymobile/scrcpy)...`);

const fetchServerBin = require.resolve('@yume-chan/fetch-scrcpy-server/bin/fetch-server.js');
execFileSync(process.execPath, [fetchServerBin, version], {
  stdio: 'inherit',
  cwd: dirname(fetchServerBin),
});

const downloadedBin = resolve(dirname(fetchServerBin), '..', 'server.bin');
if (!existsSync(downloadedBin)) {
  console.error(`Download terminou mas não achei ${downloadedBin} — a versão da lib pode ter mudado o layout.`);
  process.exit(1);
}

const destDir = resolve(repoRoot, 'resources/scrcpy');
mkdirSync(destDir, { recursive: true });
copyFileSync(downloadedBin, resolve(destDir, 'server.bin'));

console.log(`OK: resources/scrcpy/server.bin (scrcpy-server v${version})`);
console.log('Lembrete: atualize a classe de opções em src/main/scrcpy.ts pra essa versão.');
