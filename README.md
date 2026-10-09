# ZapMirror

> Espelhamento e controle de celular Android no Windows (mouse e teclado),
> com uma instância WhatsApp própria na Evolution API compartilhada do
> servidor Vultr do ZapScript.

Produto e repositório **separados** do ZapScript — marca, banco de dados,
billing e usuários próprios. A única infraestrutura compartilhada é a
Evolution API que já roda no servidor Vultr do ZapScript
(`216.238.120.65` / `api.zapscript.me`): o ZapMirror cria e gerencia **suas
próprias instâncias** ali (prefixo `zapmirror-`), isoladas das contas e dos
usuários do ZapScript.

Ver `ESCOPO_ZAPMIRROR.md` para a análise de viabilidade, arquitetura e
decisões já tomadas — inclui o que ainda **falta confirmar** antes de operar
de verdade (acesso à API de gerência da Evolution, ver seção 4 de lá).

## Estrutura

```
zapmirror/
├── apps/
│   ├── desktop/   → App Windows (Electron) — mirror ADB + UI
│   └── api/       → Backend (Fastify) — auth, licença, provisionamento Evolution
└── packages/
    └── database/  → Schema Prisma (banco próprio, não é o Supabase do ZapScript)
```

## Setup local

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # preencher DATABASE_URL e EVOLUTION_*
pnpm db:generate
pnpm db:migrate
pnpm dev
```

`apps/desktop` precisa do `adb.exe` em
`apps/desktop/resources/platform-tools/` antes de rodar — ver o README ali.

## Estado atual (honesto)

- `apps/api`: auth, licença e provisionamento de instância **validados de
  ponta a ponta** contra Postgres real e um mock da Evolution API
  (`scripts/mock-evolution.mjs`) — ver `ESCOPO_ZAPMIRROR.md` §5 para o que foi
  testado e os bugs já corrigidos. **Ainda não testado contra a Evolution de
  verdade do Vultr** (bloqueado por `ESCOPO_ZAPMIRROR.md` §4).
- `apps/desktop`: compila limpo e sobe sem crash (smoke test headless) —
  **o pipeline de vídeo/input (a parte que realmente espelha a tela) ainda
  não está implementado**, ver `apps/desktop/src/main/videoPipeline.ts`, e
  a detecção de dispositivo via `adb devices` nunca rodou contra hardware
  real. Só dá para validar isso no Windows com um Android físico conectado.
