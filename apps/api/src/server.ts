import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';

const db = new PrismaClient();
const app = Fastify({ logger: true });
await app.register(cors, { origin: ['http://127.0.0.1:4173', 'http://localhost:4173'] });

if (process.env.NODE_ENV === 'production') {
  const apiDirectory = dirname(fileURLToPath(import.meta.url));
  await app.register(fastifyStatic, { root: resolve(apiDirectory, '../../web/dist') });
}

const campaignInput = z.object({
  title: z.string().min(3).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  description: z.string().max(3000).default(''),
  prize: z.string().min(3).max(200),
  imageUrl: z.string().url().optional(),
  priceCrc: z.number().int().positive(),
  numberCount: z.number().int().min(10).max(100000),
  drawDate: z.string().datetime().optional(),
});

const reservationInput = z.object({
  campaignId: z.string(),
  values: z.array(z.number().int().nonnegative()).min(1).max(20),
  buyerName: z.string().min(2).max(120),
  buyerEmail: z.string().email().max(200),
  buyerPhone: z.string().min(8).max(25),
});

function adminAuthorized(header: string | undefined) {
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(expected && expected.length >= 24 && header === `Bearer ${expected}`);
}

async function expireReservations() {
  const overdue = await db.reservation.findMany({
    where: { status: 'ACTIVE', expiresAt: { lte: new Date() } },
    select: { id: true },
    take: 100,
  });
  for (const { id } of overdue) {
    await db.$transaction(async tx => {
      const changed = await tx.reservation.updateMany({
        where: { id, status: 'ACTIVE', expiresAt: { lte: new Date() } },
        data: { status: 'EXPIRED' },
      });
      if (changed.count) {
        await tx.entryNumber.updateMany({
          where: { reservationId: id, status: 'RESERVED' },
          data: { status: 'AVAILABLE', reservationId: null },
        });
      }
    });
  }
}

app.get('/api/health', async () => ({ ok: true }));

app.get('/api/campaigns', async () => {
  await expireReservations();
  const campaigns = await db.campaign.findMany({
    where: { status: 'LIVE' },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { numbers: { where: { status: 'SOLD' } } } } },
  });
  return campaigns.map(({ _count, ...campaign }) => ({ ...campaign, soldCount: _count.numbers }));
});

app.get<{ Params: { slug: string } }>('/api/campaigns/:slug', async (request, reply) => {
  const campaign = await db.campaign.findUnique({ where: { slug: request.params.slug } });
  if (!campaign || campaign.status !== 'LIVE') return reply.code(404).send({ error: 'Campaña no disponible' });
  return campaign;
});

app.get<{ Params: { slug: string }; Querystring: { page?: string } }>('/api/campaigns/:slug/numbers', async (request, reply) => {
  await expireReservations();
  const campaign = await db.campaign.findUnique({ where: { slug: request.params.slug } });
  if (!campaign || campaign.status !== 'LIVE') return reply.code(404).send({ error: 'Campaña no disponible' });
  const page = Math.max(1, Math.min(1000, Number(request.query.page) || 1));
  const numbers = await db.entryNumber.findMany({
    where: { campaignId: campaign.id },
    orderBy: { value: 'asc' },
    skip: (page - 1) * 100,
    take: 100,
    select: { value: true, status: true },
  });
  return { page, pageCount: Math.ceil(campaign.numberCount / 100), numbers };
});

app.post('/api/reservations', async (request, reply) => {
  await expireReservations();
  const parsed = reservationInput.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Datos inválidos', details: parsed.error.flatten() });
  const input = parsed.data;
  const uniqueValues = [...new Set(input.values)];
  if (uniqueValues.length !== input.values.length) return reply.code(400).send({ error: 'Hay números repetidos en la selección' });
  const campaign = await db.campaign.findUnique({ where: { id: input.campaignId } });
  if (!campaign || campaign.status !== 'LIVE') return reply.code(404).send({ error: 'Campaña no disponible' });
  if (uniqueValues.some(value => value >= campaign.numberCount)) return reply.code(400).send({ error: 'Número fuera del rango' });

  try {
    const reservation = await db.$transaction(async tx => {
      const created = await tx.reservation.create({
        data: {
          lookupToken: randomBytes(24).toString('hex'),
          campaignId: campaign.id,
          buyerName: input.buyerName,
          buyerEmail: input.buyerEmail,
          buyerPhone: input.buyerPhone,
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
      });
      const claimed = await tx.entryNumber.updateMany({
        where: { campaignId: campaign.id, value: { in: uniqueValues }, status: 'AVAILABLE' },
        data: { status: 'RESERVED', reservationId: created.id },
      });
      if (claimed.count !== uniqueValues.length) throw new Error('NUMBER_UNAVAILABLE');
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return reply.code(201).send({
      token: reservation.lookupToken,
      expiresAt: reservation.expiresAt,
      values: uniqueValues,
      totalCrc: uniqueValues.length * campaign.priceCrc,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NUMBER_UNAVAILABLE') {
      return reply.code(409).send({ error: 'Uno de los números acaba de ser apartado. Actualizá la selección.' });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return reply.code(409).send({ error: 'Hubo otra selección al mismo tiempo. Intentá de nuevo.' });
    }
    throw error;
  }
});

app.get<{ Params: { token: string } }>('/api/reservations/:token', async (request, reply) => {
  await expireReservations();
  const reservation = await db.reservation.findUnique({
    where: { lookupToken: request.params.token },
    include: { campaign: { select: { title: true, numberWidth: true, priceCrc: true } }, numbers: { select: { value: true } } },
  });
  if (!reservation) return reply.code(404).send({ error: 'Reserva no encontrada' });
  return {
    status: reservation.status,
    expiresAt: reservation.expiresAt,
    values: reservation.numbers.map(number => number.value),
    campaign: reservation.campaign,
  };
});

app.get('/api/admin/campaigns', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  return db.campaign.findMany({ orderBy: { createdAt: 'desc' } });
});

app.post('/api/admin/campaigns', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  const parsed = campaignInput.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Datos inválidos', details: parsed.error.flatten() });
  const input = parsed.data;
  const campaign = await db.$transaction(async tx => {
    const created = await tx.campaign.create({
      data: {
        title: input.title,
        slug: input.slug,
        description: input.description,
        prize: input.prize,
        imageUrl: input.imageUrl,
        priceCrc: input.priceCrc,
        numberCount: input.numberCount,
        numberWidth: String(input.numberCount - 1).length,
        drawDate: input.drawDate ? new Date(input.drawDate) : undefined,
      },
    });
    for (let start = 0; start < input.numberCount; start += 1000) {
      await tx.entryNumber.createMany({
        data: Array.from({ length: Math.min(1000, input.numberCount - start) }, (_, offset) => ({
          campaignId: created.id,
          value: start + offset,
        })),
      });
    }
    return created;
  }, { timeout: 60_000 });
  return reply.code(201).send(campaign);
});

app.post<{ Params: { id: string } }>('/api/admin/campaigns/:id/publish', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  const campaign = await db.campaign.findUnique({ where: { id: request.params.id } });
  if (!campaign) return reply.code(404).send({ error: 'Campaña no encontrada' });
  if (campaign.status !== 'DRAFT') return reply.code(409).send({ error: 'Solo se publican campañas en borrador' });
  return db.campaign.update({ where: { id: campaign.id }, data: { status: 'LIVE' } });
});

const timer = setInterval(() => expireReservations().catch(error => app.log.error(error)), 60_000);
timer.unref();
app.addHook('onClose', async () => { clearInterval(timer); await db.$disconnect(); });

const port = Number(process.env.PORT || 4100);
await app.listen({ host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1', port });
