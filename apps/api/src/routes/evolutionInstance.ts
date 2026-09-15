import type { FastifyInstance } from 'fastify';
import { prisma } from '@zapmirror/database';
import {
  createEvolutionInstance,
  deleteEvolutionInstance,
  fetchQrCode,
  getConnectionState,
  instanceNameFor,
} from '../lib/evolutionClient';

// Provisiona/gerencia a instância WhatsApp própria do ZapMirror para o
// usuário logado, na Evolution API compartilhada do servidor Vultr do
// ZapScript. Isolada por nome (prefixo EVOLUTION_INSTANCE_PREFIX) — nunca
// toca em instâncias/contas do ZapScript.
export async function evolutionInstanceRoutes(app: FastifyInstance) {
  app.post(
    '/whatsapp/instance',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;

      const existing = await prisma.mirrorInstance.findFirst({ where: { userId } });
      if (existing) {
        return reply.send(existing);
      }

      const created = await createEvolutionInstance(userId);

      const instance = await prisma.mirrorInstance.create({
        data: {
          userId,
          instanceName: created.instanceName,
          evolutionApiKey: created.apiKey,
          qrCode: created.qrCode ?? null,
          status: 'pending',
        },
      });

      return reply.status(201).send(instance);
    },
  );

  app.get(
    '/whatsapp/instance/qrcode',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;
      const instance = await prisma.mirrorInstance.findFirst({ where: { userId } });
      if (!instance) {
        return reply.status(404).send({ error: 'instancia_nao_encontrada' });
      }

      const { base64 } = await fetchQrCode(instance.instanceName);
      if (base64) {
        await prisma.mirrorInstance.update({
          where: { id: instance.id },
          data: { qrCode: base64 },
        });
      }

      return reply.send({ qrCode: base64 ?? instance.qrCode });
    },
  );

  app.get(
    '/whatsapp/instance/status',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;
      const instance = await prisma.mirrorInstance.findFirst({ where: { userId } });
      if (!instance) {
        return reply.status(404).send({ error: 'instancia_nao_encontrada' });
      }

      const { instance: state } = await getConnectionState(instance.instanceName);

      if (state.state !== instance.status) {
        await prisma.mirrorInstance.update({
          where: { id: instance.id },
          data: {
            status: state.state,
            lastConnectedAt: state.state === 'open' ? new Date() : instance.lastConnectedAt,
          },
        });
      }

      return reply.send({ status: state.state });
    },
  );

  app.delete(
    '/whatsapp/instance',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const userId = request.user.sub;
      const instance = await prisma.mirrorInstance.findFirst({ where: { userId } });
      if (!instance) {
        return reply.status(404).send({ error: 'instancia_nao_encontrada' });
      }

      await deleteEvolutionInstance(instance.instanceName);
      await prisma.mirrorInstance.delete({ where: { id: instance.id } });

      return reply.status(204).send();
    },
  );

  // Sanidade: nome que este usuário teria na Evolution, sem criar nada.
  app.get(
    '/whatsapp/instance/preview-name',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      return reply.send({ instanceName: instanceNameFor(request.user.sub) });
    },
  );
}
