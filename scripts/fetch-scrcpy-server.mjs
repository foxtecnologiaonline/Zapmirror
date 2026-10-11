#!/usr/bin/env node
// Baixa o binário scrcpy-server (Apache-2.0, github.com/Genymobile/scrcpy) na
// versão exata que a biblioteca @yume-chan/adb-scrcpy instalada espera, e
// coloca em resources/scrcpy/server.bin — onde src/main/scrcpy.ts e o
// electron-builder (extraResources) esperam encontrá-lo.
//
// Roda no SEU computador, não no sandbox onde este projeto foi escrito: o
// download é direto do GitHub, e o ambiente onde isto foi desenvolvido tem
// github.com bloqueado na política de rede (ver ESCOPO_ZAPMIRROR.md).
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { AdbScrcpyOptionsLatest } from '@yume-chan/adb-scrcpy';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const { version } = new AdbScrcpyOptionsLatest({ video: false, audio: false, control: false });

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
