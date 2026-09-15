import type { FastifyInstance } from 'fastify';
import { prisma } from '@zapmirror/database';

// O app desktop (Electron) chama isto no início de cada sessão e periodicamente
// durante o uso, para decidir se libera o espelhamento. Sem entitlement válido,
// o app deve recusar abrir uma sessão ADB nova (mas pode deixar o usuário
// terminar uma sessão já em andamento, se estiver no meio de um espelhamento).
export async function licenseRoutes(app: FastifyInstance) {
  app.get('/license/status', { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.sub;

    const license = await prisma.license.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!license) {
      return reply.send({ status: 'none', allowed: false });
    }

    const expired = license.expiresAt ? license.expiresAt < new Date() : false;
    const allowed = !expired && (license.status === 'trial' || license.status === 'active');

    return reply.send({
      status: expired ? 'expired' : license.status,
      expiresAt: license.expiresAt,
      allowed,
    });
  });
}
