import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { ZodError } from 'zod';
import { env } from './lib/env';
import { authRoutes } from './routes/auth';
import { licenseRoutes } from './routes/license';
import { evolutionInstanceRoutes } from './routes/evolutionInstance';

async function main() {
  const app = Fastify({ logger: true });

  await app.register(fastifyJwt, { secret: env.JWT_SECRET });

  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'nao_autenticado' });
    }
  });

  // Sem isto, qualquer corpo de request fora do schema (zod) ou erro não
  // tratado numa rota vira 500 com stack trace no corpo da resposta — foi
  // isso que o smoke test local pegou: senha curta demais no /auth/login
  // devolvia 500 em vez de 400. Rotas continuam podendo responder seus
  // próprios status de erro normalmente (ex.: 401 em credenciais_invalidas);
  // este handler só cobre o que escapa sem tratamento.
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'validacao_invalida',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    app.log.error(error);
    return reply.status(500).send({ error: 'erro_interno' });
  });

  app.get('/health', async () => ({ ok: true }));

  await app.register(authRoutes);
  await app.register(licenseRoutes);
  await app.register(evolutionInstanceRoutes);

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
