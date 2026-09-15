import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
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
