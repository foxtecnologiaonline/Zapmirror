# ZapMirror — Escopo

- **Data:** 2026-09-15
- **Status:** scaffold inicial no ar (código real, não roda de ponta a ponta ainda — ver §5).
- **Origem:** produto derivado do escopo "Espelhamento de Celular no Windows"
  originalmente analisado dentro do repo `zapscript`
  (`ESCOPO_ESPELHAMENTO.md` lá — histórico da análise de mercado e da revisão
  técnica inicial vive nesse documento, vale ler antes deste).
- **Decisão que mudou desde aquela análise:** em vez de módulo dentro do
  ZapScript, o usuário decidiu que este é um **produto e repositório
  separados** — marca própria (ZapMirror), banco de dados próprio, billing
  próprio — reaproveitando **só** a Evolution API que já roda no servidor
  Vultr do ZapScript, como infraestrutura de terceiro.

---

## 1. O que é

Duas metades que se encontram só no usuário final:

1. **App desktop Windows** (`apps/desktop`, Electron) — espelha e controla um
   Android via ADB, o mesmo mecanismo do scrcpy. Roda 100% local no PC do
   usuário depois de instalado.
2. **Instância WhatsApp própria** (`apps/api` + Evolution API compartilhada)
   — cada usuário do ZapMirror ganha sua própria instância/sessão WhatsApp na
   Evolution API do servidor Vultr do ZapScript, isolada por nome
   (`zapmirror-<userId>`). É o que sustenta o diferencial identificado na
   análise original: abrir o WhatsApp do celular espelhado pra fazer o que o
   WhatsApp Web não permite, com o próprio ZapMirror também sabendo o estado
   da conexão (conectado/QR pendente) pela Evolution.

O `apps/api` deste repo **não é** o backend do ZapScript — é um backend novo,
pequeno, só com o necessário para: autenticar usuário do ZapMirror, checar
licença, e provisionar/gerenciar a instância Evolution de cada um.

---

## 2. Por que a Evolution é compartilhada, mas o resto não é

- **Evolution API** já roda no servidor Vultr, testada em produção,
  suporta múltiplas instâncias nomeadas — criar uma instância nova por
  usuário do ZapMirror ali é reaproveitamento de infraestrutura real, sem
  subir um segundo servidor Evolution do zero.
- **Banco de dados, auth, billing, usuários** são do ZapMirror, não do
  ZapScript — os dois produtos não compartilham conta de usuário nem
  cobrança. Um usuário pode ter ZapScript, ZapMirror, os dois, ou nenhum.
- **Isolamento:** toda instância criada pelo ZapMirror carrega o prefixo
  `zapmirror-` (ver `EVOLUTION_INSTANCE_PREFIX` em `apps/api/.env.example`) —
  nunca lê, escreve ou lista instâncias de usuários do ZapScript. Do ponto de
  vista da Evolution API, o ZapMirror é só mais um tenant entre vários.

---

## 3. Arquitetura implementada no scaffold

```
apps/desktop (Electron)                    apps/api (Fastify)
  ├─ main/adb.ts            ADB local        ├─ routes/auth.ts          cadastro/login
  ├─ main/videoPipeline.ts  [FALTA, ver §5]   ├─ routes/license.ts       status de licença
  ├─ main/license.ts    ───────────────────► ├─ routes/evolutionInstance.ts
  ├─ preload/index.ts       bridge IPC       │     └─ lib/evolutionClient.ts ──► Evolution API
  └─ renderer/               UI básica       │                                  (Vultr, compartilhada)
                                              └─ packages/database (Prisma, banco próprio)
```

Modelo de dados (`packages/database/prisma/schema.prisma`): `User`,
`License` (trial/active/expired/revoked — sem tiers ainda, ver §6),
`MirrorInstance` (1 por usuário, aponta pra Evolution) e `MirrorDevice` (1
por celular físico já pareado via ADB).

---

## 4. O que falta confirmar com quem administra o Vultr — bloqueante

O sandbox onde isto foi escrito **não tem acesso SSH ao servidor** (mesma
limitação de rede já registrada no `CLAUDE.md` do repo `zapscript`), então o
seguinte não pôde ser verificado e está assumido em `apps/api/.env.example`:

1. **A rota de gerência da Evolution (`POST /instance/create` etc.) está
   exposta publicamente** em `https://api.zapscript.me`, ou só na rede
   interna do Docker Compose do servidor? Se só interna, o `apps/api` do
   ZapMirror não pode rodar em outro host/servidor — precisa rodar no mesmo
   Vultr (novo container no mesmo `docker-compose.zapscript.yml`, ou um
   compose próprio na mesma máquina) ou atrás de um proxy dedicado que o
   administrador do servidor precisa criar.
2. **API key global da Evolution** com permissão de criar instância — precisa
   ser gerada/cedida por quem administra o servidor (vive no `.env` do
   servidor, conforme o `CLAUDE.md` do zapscript: `ENCRYPTION_KEY`,
   `JWT_SECRET` etc. também vivem lá, não em variável de CI).
3. **Limite de instâncias simultâneas** que o servidor Vultr aguenta — a
   Evolution do ZapScript já roda a carga de produção do ZapScript; cada
   usuário novo do ZapMirror é mais uma sessão WhatsApp (Baileys) competindo
   por CPU/RAM no mesmo container. Vale medir antes de abrir cadastro aberto.

Sem resposta a (1) e (2), `apps/api` não sobe de verdade contra a Evolution —
o código está escrito e é o próximo passo assim que esses dados chegarem.

---

## 5. Estado real do código (nada de fingir que está pronto)

**Atualizado em 2026-10-09** — primeira rodada de validação de verdade (não só
"compila"), feita neste sandbox contra Postgres local e um mock da Evolution
API (`scripts/mock-evolution.mjs`, não é a Evolution real do Vultr):

| Camada | Estado |
|---|---|
| `packages/database` — schema Prisma | **Migrado com sucesso contra Postgres real** (`prisma migrate dev`, migration `20261009013621_init` committada) |
| `apps/api` — auth, licença, rotas de instância | **Rodou de ponta a ponta** contra Postgres real + mock da Evolution: registro, login (certo e errado), token ausente, licença trial, criar instância, QR code, status, e-mail duplicado — todos com o status HTTP esperado. Dois bugs reais encontrados e corrigidos nessa rodada: faltava carregar `.env` (adicionado `dotenv`) e erro de validação (zod) sem handler devolvia 500 em vez de 400 (adicionado `setErrorHandler`). **Ainda não testado contra a Evolution de verdade** — isso continua bloqueado pelo §4 |
| `apps/desktop` — `tsc` (typecheck) | Compila limpo. Um bug real corrigido: `declare global` em `renderer/main.ts` não tinha efeito sem `export {}`, o que deixava `window.zapmirror` como `any` |
| `apps/desktop` — smoke test do processo Electron | Sobe sem crash em Xvfb headless (erros de dbus/GPU no log são ruído do container, não da app) — mas isso **não** valida UI, ADB real ou o fluxo completo, só que o processo principal não quebra ao iniciar |
| `apps/desktop` — `adb devices` | **Ainda não testado com hardware real.** O parsing do código bate com o formato conhecido de `adb devices -l`, mas nunca rodou contra um `adb.exe` de verdade nem um Android físico — só dá pra confirmar isso no Windows do usuário |
| `apps/desktop` — pipeline de vídeo/input (`videoPipeline.ts`) | **Não implementado.** Continua stub — é a camada de maior risco técnico (ver `ESCOPO_ESPELHAMENTO.md` §6.1 do repo zapscript) |
| Empacotamento/instalador Windows, code signing | Não iniciado |

Setup usado para essa validação (reproduzível, não fica no repo como
dependência — `.env` segue fora do git):

```bash
# Postgres local + usuário/banco "zapmirror"
pnpm install
cp apps/api/.env.example apps/api/.env   # ajustar DATABASE_URL pro Postgres local
                                          # e EVOLUTION_API_URL=http://localhost:3200
node scripts/mock-evolution.mjs &        # mock da Evolution, só pra dev/smoke test
pnpm --filter @zapmirror/database build
cd packages/database && npx prisma migrate dev && cd ../..
pnpm --filter @zapmirror/api build && node apps/api/dist/index.js
```

**Isto continua sendo um sandbox Linux sem tela, sem USB e sem Android
físico.** Dá pra escrever e revisar todo o TypeScript aqui, mas rodar
`pnpm dev` em `apps/desktop` de verdade — e principalmente validar o
pipeline de vídeo do item acima — só é possível no Windows do usuário com um
celular conectado.

---

## 6. Próximos passos, em ordem

1. **Resolver o §4** (acesso à Evolution) — sem isso, `apps/api` fica
   escrito mas mudo.
2. **Rodar `apps/desktop` localmente no Windows** com `adb.exe` baixado e um
   Android conectado — validar que `listDevices()` encontra o aparelho e que
   o fluxo de autorização de depuração USB aparece como esperado.
3. **Implementar `videoPipeline.ts`** — o spike técnico isolado já
   recomendado: embarcar `scrcpy-server`, decodificar H.264, medir latência.
   Só faz sentido continuar no restante do produto se este passo confirmar
   viabilidade.
4. Licenciamento real (tiers, pagamento) — hoje `License.status` só tem
   `trial`, suficiente pra dev, não pra cobrar de ninguém.
