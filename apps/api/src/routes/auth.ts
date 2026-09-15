import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@zapmirror/database';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    const { email, password } = credentialsSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'email_ja_cadastrado' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        licenses: { create: { status: 'trial' } },
      },
    });

    const token = app.jwt.sign({ sub: user.id });
    return reply.status(201).send({ token });
  });

  app.post('/auth/login', async (request, reply) => {
    const { email, password } = credentialsSchema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.status(401).send({ error: 'credenciais_invalidas' });
    }

    const token = app.jwt.sign({ sub: user.id });
    return reply.send({ token });
  });
}
