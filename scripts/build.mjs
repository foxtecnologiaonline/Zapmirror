#!/usr/bin/env node
// Bundler real (esbuild) — necessário porque os pacotes @yume-chan/* usados
// em src/main e src/renderer são ESM-only (sem build CommonJS). `tsc` puro
// emite `require(...)` pra eles, que quebra tanto no processo principal
// (Node não deixa `require` carregar ESM síncrono) quanto no renderer (que
// nem tem `require`, já que nodeIntegration está desligado). esbuild resolve
// os dois problemas de uma vez: bundla tudo (inclusive deps ESM) no formato
// certo pra cada alvo.
import { build } from 'esbuild';
import { mkdirSync, copyFileSync } from 'node:fs';

const common = {
  bundle: true,
  sourcemap: true,
  logLevel: 'info',
};

async function run() {
  await build({
    ...common,
    entryPoints: ['src/main/index.ts'],
    outfile: 'dist/main/index.js',
    platform: 'node',
    format: 'cjs',
    external: ['electron'],
  });

  await build({
    ...common,
    entryPoints: ['src/preload/index.ts'],
    outfile: 'dist/preload/index.js',
    platform: 'node',
    format: 'cjs',
    external: ['electron'],
  });

  await build({
    ...common,
    entryPoints: ['src/renderer/main.ts'],
    outfile: 'dist/renderer/main.js',
    platform: 'browser',
    format: 'iife',
  });

  mkdirSync('dist/renderer', { recursive: true });
  copyFileSync('src/renderer/index.html', 'dist/renderer/index.html');
}

await run();
