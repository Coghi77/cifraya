import { randomBytes, timingSafeEqual } from 'node:crypto';
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
  app.setNotFoundHandler((request, reply) => {
    if ((request.method === 'GET' || request.method === 'HEAD') && !request.url.startsWith('/api/')) {
      return reply.sendFile('index.html');
    }
    return reply.code(404).send({ error: 'No encontrado' });
  });
}

const campaignInput = z.object({
  title: z.string().min(3).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  description: z.string().max(3000).default(''),
  prize: z.string().min(3).max(200),
  imageUrl: z.string().url().optional(),
  priceCrc: z.number().int().positive().max(100_000_000),
  numberCount: z.union([z.literal(100), z.literal(1000), z.literal(10000)]),
  packages: z.array(z.object({ quantity: z.number().int().min(2).max(20), priceCrc: z.number().int().positive().max(100_000_000) })).max(10).default([]),
  drawDate: z.string().datetime().optional(),
});

const reservationInput = z.object({
  campaignId: z.string(),
  values: z.array(z.number().int().nonnegative()).min(1).max(20),
  buyerName: z.string().min(2).max(120),
  buyerEmail: z.string().email().max(200),
  buyerPhone: z.string().min(8).max(25),
});

const photoInput = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  base64: z.string().min(1).max(2_800_000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

const photoSelect = { select: { id: true }, orderBy: { sortOrder: 'asc' as const } };
const packageSelect = { select: { quantity: true, priceCrc: true }, orderBy: { quantity: 'asc' as const } };
function priceFor(quantity: number, unitPrice: number, packages: { quantity: number; priceCrc: number }[]) {
  const totals = Array<number>(quantity + 1).fill(0);
  for (let count = 1; count <= quantity; count++) {
    totals[count] = totals[count - 1] + unitPrice;
    for (const offer of packages) if (offer.quantity <= count) {
      totals[count] = Math.min(totals[count], totals[count - offer.quantity] + offer.priceCrc);
    }
  }
  return totals[quantity];
}
function imageList(photos: { id: string }[]) {
  return photos.map(photo => ({ id: photo.id, url: `/api/campaign-photos/${photo.id}` }));
}
function validPhoto(data: Buffer, mimeType: string) {
  if (data.length === 0 || data.length > 2_000_000) return false;
  if (mimeType === 'image/jpeg') return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mimeType === 'image/png') return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP';
}

const adminSessions = new Map<string, number>();
const failedLogins = new Map<string, { count: number; resetAt: number }>();

function adminAuthorized(header: string | undefined) {
  if (!header?.startsWith('Bearer ')) return false;
  const token = header.slice(7);
  const expiresAt = adminSessions.get(token);
  if (expiresAt) {
    if (expiresAt > Date.now()) return true;
    adminSessions.delete(token);
  }
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(expected && expected.length >= 24 && token === expected);
}

app.post('/api/admin/login', async (request, reply) => {
  const key = request.ip;
  const now = Date.now();
  const attempts = failedLogins.get(key);
  if (attempts && attempts.resetAt > now && attempts.count >= 5) {
    return reply.code(429).send({ error: 'Demasiados intentos. Volvé a intentar en 15 minutos.' });
  }
  const parsed = z.object({ pin: z.string().regex(/^\d{6}$/) }).safeParse(request.body);
  const expected = process.env.ADMIN_PIN;
  const valid = Boolean(parsed.success && expected && /^\d{6}$/.test(expected) &&
    timingSafeEqual(Buffer.from(parsed.data.pin), Buffer.from(expected)));
  if (!valid) {
    const current = attempts?.resetAt && attempts.resetAt > now ? attempts : { count: 0, resetAt: now + 15 * 60_000 };
    failedLogins.set(key, { count: current.count + 1, resetAt: current.resetAt });
    return reply.code(401).send({ error: 'PIN incorrecto o no configurado.' });
  }
  failedLogins.delete(key);
  const token = randomBytes(32).toString('hex');
  adminSessions.set(token, now + 8 * 60 * 60_000);
  return { token };
});

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
    include: { photos: photoSelect, packages: packageSelect, _count: { select: { numbers: { where: { status: 'SOLD' } } } } },
  });
  return campaigns.map(({ _count, photos, ...campaign }) => ({ ...campaign, photos: imageList(photos), soldCount: _count.numbers }));
});

app.get<{ Params: { slug: string } }>('/api/campaigns/:slug', async (request, reply) => {
  const campaign = await db.campaign.findUnique({ where: { slug: request.params.slug }, include: { photos: photoSelect, packages: packageSelect } });
  if (!campaign || campaign.status !== 'LIVE') return reply.code(404).send({ error: 'Rifa no disponible' });
  const { photos, ...data } = campaign;
  return { ...data, photos: imageList(photos) };
});

app.get<{ Params: { id: string } }>('/api/campaign-photos/:id', async (request, reply) => {
  const photo = await db.campaignPhoto.findUnique({
    where: { id: request.params.id },
    select: { mimeType: true, data: true, campaign: { select: { status: true } } },
  });
  if (!photo || photo.campaign.status !== 'LIVE') return reply.code(404).send({ error: 'Foto no disponible' });
  return reply.type(photo.mimeType).header('Cache-Control', 'public, max-age=3600').send(Buffer.from(photo.data));
});

app.get<{ Params: { slug: string }; Querystring: { page?: string } }>('/api/campaigns/:slug/numbers', async (request, reply) => {
  await expireReservations();
  const campaign = await db.campaign.findUnique({ where: { slug: request.params.slug } });
  if (!campaign || campaign.status !== 'LIVE') return reply.code(404).send({ error: 'Rifa no disponible' });
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
  const campaign = await db.campaign.findUnique({ where: { id: input.campaignId }, include: { packages: packageSelect } });
  if (!campaign || campaign.status !== 'LIVE') return reply.code(404).send({ error: 'Rifa no disponible' });
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
          selectedValues: uniqueValues,
          totalCrc: priceFor(uniqueValues.length, campaign.priceCrc, campaign.packages),
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
      totalCrc: reservation.totalCrc,
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
    buyerName: reservation.buyerName,
    totalCrc: reservation.totalCrc,
    values: reservation.selectedValues.length ? reservation.selectedValues : reservation.numbers.map(number => number.value),
    campaign: reservation.campaign,
  };
});

app.post('/api/reservations/lookup', async (request, reply) => {
  const parsed = z.object({ token: z.string().regex(/^[a-f0-9]{48}$/i) }).safeParse(request.body);
  if (!parsed.success) return reply.code(404).send({ error: 'No encontramos una reserva con ese código.' });
  await expireReservations();
  const reservation = await db.reservation.findUnique({
    where: { lookupToken: parsed.data.token },
    select: {
      buyerName: true,
      status: true,
      expiresAt: true,
      selectedValues: true,
      totalCrc: true,
      numbers: { select: { value: true } },
      campaign: { select: { title: true, numberWidth: true, priceCrc: true } },
    },
  });
  if (!reservation) return reply.code(404).send({ error: 'No encontramos una reserva con ese código.' });
  return {
    buyerName: reservation.buyerName,
    status: reservation.status,
    totalCrc: reservation.totalCrc,
    expiresAt: reservation.expiresAt,
    values: reservation.selectedValues.length ? reservation.selectedValues : reservation.numbers.map(number => number.value),
    campaign: reservation.campaign,
  };
});

app.get('/api/admin/campaigns', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  const campaigns = await db.campaign.findMany({ orderBy: { createdAt: 'desc' }, include: { photos: photoSelect, packages: packageSelect, winner: { select: { numberValue: true } } } });
  return campaigns.map(({ photos, ...campaign }) => ({ ...campaign, photos: imageList(photos) }));
});

app.get<{ Params: { id: string } }>('/api/admin/campaign-photos/:id', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  const photo = await db.campaignPhoto.findUnique({ where: { id: request.params.id }, select: { mimeType: true, data: true } });
  if (!photo) return reply.code(404).send({ error: 'Foto no encontrada' });
  return reply.type(photo.mimeType).header('Cache-Control', 'private, no-store').send(Buffer.from(photo.data));
});

app.post<{ Params: { id: string } }>('/api/admin/campaigns/:id/photos', { bodyLimit: 3_000_000 }, async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  const parsed = photoInput.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'La foto debe ser JPG, PNG o WebP y pesar menos de 2 MB.' });
  const bytes = Buffer.from(parsed.data.base64, 'base64');
  if (!validPhoto(bytes, parsed.data.mimeType)) return reply.code(400).send({ error: 'Archivo de imagen inválido o demasiado grande.' });
  const campaign = await db.campaign.findUnique({ where: { id: request.params.id }, select: { id: true, _count: { select: { photos: true } } } });
  if (!campaign) return reply.code(404).send({ error: 'Rifa no encontrada' });
  if (campaign._count.photos >= 5) return reply.code(409).send({ error: 'Cada rifa admite hasta 5 fotos.' });
  const photo = await db.campaignPhoto.create({
    data: { campaignId: campaign.id, mimeType: parsed.data.mimeType, data: bytes, sortOrder: campaign._count.photos },
    select: { id: true },
  });
  return reply.code(201).send({ id: photo.id, url: `/api/campaign-photos/${photo.id}` });
});

app.delete<{ Params: { id: string } }>('/api/admin/campaign-photos/:id', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  const deleted = await db.campaignPhoto.deleteMany({ where: { id: request.params.id } });
  if (!deleted.count) return reply.code(404).send({ error: 'Foto no encontrada' });
  return { ok: true };
});

app.get('/api/admin/reservations', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  await expireReservations();
  const reservations = await db.reservation.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      buyerName: true,
      status: true,
      createdAt: true,
      expiresAt: true,
      selectedValues: true,
      campaign: { select: { title: true, numberWidth: true } },
      numbers: { select: { value: true }, orderBy: { value: 'asc' } },
    },
  });
  return reservations.map(({ numbers, selectedValues, ...reservation }) => ({
    ...reservation,
    ticketCount: selectedValues.length || numbers.length,
    values: selectedValues.length ? selectedValues : numbers.map(number => number.value),
  }));
});

app.post('/api/admin/campaigns', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  const parsed = campaignInput.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Datos inválidos', details: parsed.error.flatten() });
  const input = parsed.data;
  if (new Set(input.packages.map(item => item.quantity)).size !== input.packages.length || input.packages.some(item => item.priceCrc >= item.quantity * input.priceCrc)) {
    return reply.code(400).send({ error: 'Cada paquete debe tener una cantidad distinta y un precio menor al total individual.' });
  }
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
        packages: { create: input.packages },
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
  if (!campaign) return reply.code(404).send({ error: 'Rifa no encontrada' });
  if (campaign.status !== 'DRAFT') return reply.code(409).send({ error: 'Solo se publican rifas en borrador' });
  return db.campaign.update({ where: { id: campaign.id }, data: { status: 'LIVE' } });
});

app.get('/api/winners', async () => {
  const winners = await db.winner.findMany({
    orderBy: { publishedAt: 'desc' },
    select: { numberValue: true, publishedAt: true, campaign: { select: { title: true, prize: true, numberWidth: true } }, reservation: { select: { buyerName: true } } },
  });
  return winners.map(({ reservation, ...winner }) => ({ ...winner, buyerName: reservation.buyerName }));
});

app.get<{ Params: { id: string }; Querystring: { page?: string; number?: string; status?: string } }>('/api/admin/campaigns/:id/overview', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  await expireReservations();
  const campaign = await db.campaign.findUnique({ where: { id: request.params.id }, select: { id: true, title: true, numberCount: true, numberWidth: true, winner: { select: { numberValue: true } } } });
  if (!campaign) return reply.code(404).send({ error: 'Rifa no encontrada' });
  const page = Math.max(1, Math.min(1000, Number(request.query.page) || 1));
  const search = request.query.number?.trim();
  const number = search && /^\d{1,5}$/.test(search) ? Number(search) : undefined;
  if (search && (number === undefined || number >= campaign.numberCount)) return reply.code(400).send({ error: 'Número fuera del rango.' });
  const status = ['AVAILABLE', 'RESERVED', 'SOLD'].includes(request.query.status || '') ? request.query.status as 'AVAILABLE' | 'RESERVED' | 'SOLD' : undefined;
  const where = { campaignId: campaign.id, ...(number !== undefined ? { value: number } : {}), ...(status ? { status } : {}) };
  const [counts, total, numbers] = await Promise.all([
    db.entryNumber.groupBy({ by: ['status'], where: { campaignId: campaign.id }, _count: { _all: true } }),
    db.entryNumber.count({ where }),
    db.entryNumber.findMany({ where, orderBy: { value: 'asc' }, skip: (page - 1) * 100, take: 100,
      select: { value: true, status: true, reservation: { select: { id: true, buyerName: true, buyerEmail: true, buyerPhone: true, createdAt: true, expiresAt: true, confirmedAt: true, totalCrc: true, status: true } } } }),
  ]);
  return { campaign, counts: Object.fromEntries(counts.map(item => [item.status, item._count._all])), page, pageCount: Math.ceil(total / 100), numbers };
});

app.get<{ Params: { id: string }; Querystring: { page?: string } }>('/api/admin/campaigns/:id/history', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  await expireReservations();
  const page = Math.max(1, Math.min(1000, Number(request.query.page) || 1));
  const campaign = await db.campaign.findUnique({ where: { id: request.params.id }, select: { id: true, numberWidth: true } });
  if (!campaign) return reply.code(404).send({ error: 'Rifa no encontrada' });
  const [total, reservations] = await Promise.all([
    db.reservation.count({ where: { campaignId: campaign.id } }),
    db.reservation.findMany({ where: { campaignId: campaign.id }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 30, take: 30,
      select: { id: true, buyerName: true, buyerEmail: true, buyerPhone: true, selectedValues: true, status: true, createdAt: true, expiresAt: true, confirmedAt: true, totalCrc: true } }),
  ]);
  return { page, pageCount: Math.ceil(total / 30), reservations };
});

app.post<{ Params: { id: string } }>('/api/admin/reservations/:id/confirm', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  await expireReservations();
  try {
    const confirmed = await db.$transaction(async tx => {
      const reservation = await tx.reservation.findUnique({ where: { id: request.params.id }, select: { selectedValues: true } });
      if (!reservation) throw new Error('RESERVATION_NOT_ACTIVE');
      const changed = await tx.reservation.updateMany({ where: { id: request.params.id, status: 'ACTIVE', expiresAt: { gt: new Date() } }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });
      if (changed.count !== 1) throw new Error('RESERVATION_NOT_ACTIVE');
      const sold = await tx.entryNumber.updateMany({ where: { reservationId: request.params.id, status: 'RESERVED' }, data: { status: 'SOLD' } });
      if (sold.count !== reservation.selectedValues.length) throw new Error('RESERVATION_NOT_ACTIVE');
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { confirmed };
  } catch (error) {
    if (error instanceof Error && error.message === 'RESERVATION_NOT_ACTIVE') return reply.code(409).send({ error: 'La reserva venció o ya fue confirmada. Actualizá la rifa.' });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return reply.code(409).send({ error: 'La reserva cambió mientras se confirmaba. Intentá de nuevo.' });
    throw error;
  }
});

app.post<{ Params: { id: string } }>('/api/admin/campaigns/:id/winner', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  const parsed = z.object({ numberValue: z.number().int().nonnegative() }).safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Número inválido.' });
  try {
    const winner = await db.$transaction(async tx => {
      const campaign = await tx.campaign.findUnique({ where: { id: request.params.id }, select: { status: true, winner: { select: { id: true } } } });
      if (!campaign || campaign.status !== 'LIVE' || campaign.winner) throw new Error('WINNER_NOT_ALLOWED');
      const number = await tx.entryNumber.findUnique({ where: { campaignId_value: { campaignId: request.params.id, value: parsed.data.numberValue } }, select: { status: true, reservationId: true } });
      if (number?.status !== 'SOLD' || !number.reservationId) throw new Error('NUMBER_NOT_SOLD');
      const winner = await tx.winner.create({ data: { campaignId: request.params.id, reservationId: number.reservationId, numberValue: parsed.data.numberValue } });
      await tx.campaign.update({ where: { id: request.params.id }, data: { status: 'CLOSED' } });
      return winner;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return reply.code(201).send(winner);
  } catch (error) {
    if (error instanceof Error && error.message === 'WINNER_NOT_ALLOWED') return reply.code(409).send({ error: 'La rifa no está abierta o ya tiene ganador.' });
    if (error instanceof Error && error.message === 'NUMBER_NOT_SOLD') return reply.code(409).send({ error: 'Solo puede ganar un boleto vendido y confirmado.' });
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) return reply.code(409).send({ error: 'El resultado cambió. Actualizá la rifa.' });
    throw error;
  }
});

const timer = setInterval(() => expireReservations().catch(error => app.log.error(error)), 60_000);
timer.unref();
app.addHook('onClose', async () => { clearInterval(timer); await db.$disconnect(); });

const port = Number(process.env.PORT || 4100);
await app.listen({ host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1', port });
