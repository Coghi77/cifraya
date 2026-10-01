import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { issueAdminSession, verifyAdminSession } from './adminSession.js';
import { createReservationExpirer } from './reservationExpiry.js';
import { registerSecurityHeaders } from './security.js';

const db = new PrismaClient();
const app = Fastify({ logger: true });
registerSecurityHeaders(app, process.env.NODE_ENV === 'production');
const subscribers = new Set<(event: string) => void>();
function broadcast(event: string) { for (const subscriber of subscribers) subscriber(event); }
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
  prizeCount: z.number().int().min(1).max(3).default(1),
  secondPrize: z.string().min(3).max(200).optional(),
  thirdPrize: z.string().min(3).max(200).optional(),
  imageUrl: z.string().url().refine(value => new URL(value).protocol === 'https:', 'La imagen debe usar HTTPS.').optional(),
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

const proposalInput = z.object({ quantity: z.number().int().min(1).max(20) });
function sessionKey(cookie: string | undefined) {
  return cookie?.match(/(?:^|;\s*)cifraya_selection=([a-f0-9]{48})(?:;|$)/)?.[1];
}
function pickRandom(values: number[], count: number) {
  const pool = [...values];
  for (let index = 0; index < count; index++) {
    const chosen = randomInt(index, pool.length);
    [pool[index], pool[chosen]] = [pool[chosen], pool[index]];
  }
  return pool.slice(0, count);
}

const photoInput = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  base64: z.string().min(1).max(2_800_000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

const photoSelect = { select: { id: true }, orderBy: { sortOrder: 'asc' as const } };
const packageSelect = { select: { quantity: true, priceCrc: true }, orderBy: { quantity: 'asc' as const } };
function imageList(photos: { id: string }[]) {
  return photos.map(photo => ({ id: photo.id, url: `/api/campaign-photos/${photo.id}` }));
}
function validPhoto(data: Buffer, mimeType: string) {
  if (data.length === 0 || data.length > 2_000_000) return false;
  if (mimeType === 'image/jpeg') return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mimeType === 'image/png') return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP';
}

const failedLogins = new Map<string, { count: number; resetAt: number }>();

function adminAuthorized(header: string | undefined) {
  return Boolean(header?.startsWith('Bearer ') && verifyAdminSession(header.slice(7), process.env.ADMIN_TOKEN));
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
  if (!process.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN.length < 24) {
    return reply.code(503).send({ error: 'La configuración del panel está incompleta.' });
  }
  return { token: issueAdminSession(process.env.ADMIN_TOKEN, now) };
});

const expireReservations = createReservationExpirer(db, () => broadcast('reservations'));

app.get('/api/health', async () => ({ ok: true }));

app.get('/api/events', (_request, reply) => {
  if (subscribers.size >= 200) return reply.code(503).send({ error: 'Demasiadas conexiones activas. Intentá de nuevo.' });
  reply.hijack();
  reply.raw.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  reply.raw.write('retry: 3000\n\n');
  const send = (event: string) => { if (!reply.raw.destroyed) reply.raw.write(`event: update\ndata: ${event}\n\n`); };
  subscribers.add(send);
  const heartbeat = setInterval(() => { if (!reply.raw.destroyed) reply.raw.write(': heartbeat\n\n'); }, 25_000);
  reply.raw.on('close', () => { clearInterval(heartbeat); subscribers.delete(send); });
});

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

app.post<{ Params: { slug: string } }>('/api/campaigns/:slug/proposal', async (request, reply) => {
  await expireReservations();
  const parsed = proposalInput.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Seleccioná un paquete válido.' });
  const campaign = await db.campaign.findUnique({ where: { slug: request.params.slug }, select: { id: true, status: true, packages: { select: { quantity: true } } } });
  if (!campaign || campaign.status !== 'LIVE') return reply.code(404).send({ error: 'Rifa no disponible.' });
  const offeredQuantities = campaign.packages.length ? campaign.packages.map(item => item.quantity) : [1];
  if (!offeredQuantities.includes(parsed.data.quantity)) return reply.code(400).send({ error: 'Ese paquete no está disponible.' });
  let key = sessionKey(request.headers.cookie);
  if (!key) {
    key = randomBytes(24).toString('hex');
    reply.header('Set-Cookie', `cifraya_selection=${key}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  }
  try {
    const proposal = await db.$transaction(async tx => {
      const existing = await tx.numberProposal.findUnique({ where: { campaignId_sessionKey: { campaignId: campaign.id, sessionKey: key } } });
      const valid = existing && !existing.consumedAt && existing.expiresAt > new Date();
      const currentAvailable = valid ? await tx.entryNumber.count({ where: { campaignId: campaign.id, value: { in: existing.values }, status: 'AVAILABLE' } }) : 0;
      if (valid && existing.values.length === parsed.data.quantity && currentAvailable === existing.values.length) return existing;
      const available = await tx.entryNumber.findMany({ where: { campaignId: campaign.id, status: 'AVAILABLE' }, select: { value: true } });
      if (available.length < parsed.data.quantity) throw new Error('NOT_ENOUGH_NUMBERS');
      const values = pickRandom(available.map(item => item.value), parsed.data.quantity);
      return tx.numberProposal.upsert({
        where: { campaignId_sessionKey: { campaignId: campaign.id, sessionKey: key } },
        create: { campaignId: campaign.id, sessionKey: key, values, expiresAt: new Date(Date.now() + 15 * 60_000) },
        update: { values, changesUsed: valid && existing.values.length === parsed.data.quantity ? existing.changesUsed : 0, expiresAt: new Date(Date.now() + 15 * 60_000), consumedAt: null },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { values: proposal.values, changesRemaining: 5 - proposal.changesUsed };
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_CHANGES_LEFT') return reply.code(409).send({ error: 'Ya usaste los cinco cambios disponibles.' });
    if (error instanceof Error && error.message === 'NOT_ENOUGH_NUMBERS') return reply.code(409).send({ error: 'No quedan suficientes números disponibles.' });
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) return reply.code(409).send({ error: 'La selección cambió. Intentá de nuevo.' });
    throw error;
  }
});

app.post<{ Params: { slug: string } }>('/api/campaigns/:slug/proposal/change', async (request, reply) => {
  await expireReservations();
  const key = sessionKey(request.headers.cookie);
  if (!key) return reply.code(400).send({ error: 'Primero seleccioná un paquete.' });
  const campaign = await db.campaign.findUnique({ where: { slug: request.params.slug }, select: { id: true, status: true } });
  if (!campaign || campaign.status !== 'LIVE') return reply.code(404).send({ error: 'Rifa no disponible.' });
  try {
    const proposal = await db.$transaction(async tx => {
      const existing = await tx.numberProposal.findUnique({ where: { campaignId_sessionKey: { campaignId: campaign.id, sessionKey: key } } });
      if (!existing || existing.consumedAt || existing.expiresAt <= new Date()) throw new Error('PROPOSAL_EXPIRED');
      if (existing.changesUsed >= 5) throw new Error('NO_CHANGES_LEFT');
      const available = await tx.entryNumber.findMany({ where: { campaignId: campaign.id, status: 'AVAILABLE', value: { notIn: existing.values } }, select: { value: true } });
      if (available.length < existing.values.length) throw new Error('NOT_ENOUGH_NUMBERS');
      const values = pickRandom(available.map(item => item.value), existing.values.length);
      return tx.numberProposal.update({ where: { id: existing.id }, data: { values, changesUsed: { increment: 1 }, expiresAt: new Date(Date.now() + 15 * 60_000) } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { values: proposal.values, changesRemaining: 5 - proposal.changesUsed };
  } catch (error) {
    if (error instanceof Error && error.message === 'PROPOSAL_EXPIRED') return reply.code(409).send({ error: 'La selección venció. Generá otra.' });
    if (error instanceof Error && error.message === 'NO_CHANGES_LEFT') return reply.code(409).send({ error: 'Ya usaste los cinco cambios disponibles.' });
    if (error instanceof Error && error.message === 'NOT_ENOUGH_NUMBERS') return reply.code(409).send({ error: 'No quedan suficientes números diferentes disponibles.' });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return reply.code(409).send({ error: 'La selección cambió. Intentá de nuevo.' });
    throw error;
  }
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
  const selectedPackage = campaign.packages.length ? campaign.packages.find(item => item.quantity === uniqueValues.length) : uniqueValues.length === 1 ? { priceCrc: campaign.priceCrc } : undefined;
  if (!selectedPackage) return reply.code(400).send({ error: 'Seleccioná uno de los paquetes disponibles.' });

  try {
    const reservation = await db.$transaction(async tx => {
      const key = sessionKey(request.headers.cookie);
      if (!key) throw new Error('PROPOSAL_REQUIRED');
      const proposal = await tx.numberProposal.findUnique({ where: { campaignId_sessionKey: { campaignId: campaign.id, sessionKey: key } } });
      if (!proposal || proposal.consumedAt || proposal.expiresAt <= new Date() || proposal.values.length !== uniqueValues.length || proposal.values.some((value, index) => value !== uniqueValues[index])) throw new Error('PROPOSAL_REQUIRED');
      const consumed = await tx.numberProposal.updateMany({ where: { id: proposal.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
      if (consumed.count !== 1) throw new Error('PROPOSAL_REQUIRED');
      const created = await tx.reservation.create({
        data: {
          lookupToken: randomBytes(24).toString('hex'),
          campaignId: campaign.id,
          buyerName: input.buyerName,
          buyerEmail: input.buyerEmail,
          buyerPhone: input.buyerPhone,
          selectedValues: uniqueValues,
          totalCrc: selectedPackage.priceCrc,
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
    broadcast('reservations');
    return reply.code(201).send({
      token: reservation.lookupToken,
      expiresAt: reservation.expiresAt,
      values: uniqueValues,
      totalCrc: reservation.totalCrc,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'PROPOSAL_REQUIRED') return reply.code(409).send({ error: 'Generá tus números desde esta página antes de apartarlos.' });
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
    include: { campaign: { select: { title: true, numberWidth: true, priceCrc: true } }, numbers: { select: { value: true } }, _count: { select: { proofs: true } } },
  });
  if (!reservation) return reply.code(404).send({ error: 'Reserva no encontrada' });
  return {
    status: reservation.status,
    expiresAt: reservation.expiresAt,
    buyerName: reservation.buyerName,
    totalCrc: reservation.totalCrc,
    proofCount: reservation._count.proofs,
    proofSubmittedAt: reservation.proofSubmittedAt,
    reviewNote: reservation.reviewNote,
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
      proofSubmittedAt: true,
      reviewNote: true,
      _count: { select: { proofs: true } },
      numbers: { select: { value: true } },
      campaign: { select: { title: true, numberWidth: true, priceCrc: true } },
    },
  });
  if (!reservation) return reply.code(404).send({ error: 'No encontramos una reserva con ese código.' });
  return {
    buyerName: reservation.buyerName,
    status: reservation.status,
    totalCrc: reservation.totalCrc,
    proofCount: reservation._count.proofs,
    proofSubmittedAt: reservation.proofSubmittedAt,
    reviewNote: reservation.reviewNote,
    expiresAt: reservation.expiresAt,
    values: reservation.selectedValues.length ? reservation.selectedValues : reservation.numbers.map(number => number.value),
    campaign: reservation.campaign,
  };
});

app.post<{ Params: { token: string } }>('/api/reservations/:token/proofs', { bodyLimit: 3_000_000 }, async (request, reply) => {
  await expireReservations();
  if (!/^[a-f0-9]{48}$/i.test(request.params.token)) return reply.code(404).send({ error: 'Reserva no encontrada.' });
  const parsed = photoInput.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'El comprobante debe ser JPG, PNG o WebP y pesar menos de 2 MB.' });
  const bytes = Buffer.from(parsed.data.base64, 'base64');
  if (!validPhoto(bytes, parsed.data.mimeType)) return reply.code(400).send({ error: 'Archivo inválido o demasiado grande.' });
  try {
    const proof = await db.$transaction(async tx => {
      const reservation = await tx.reservation.findUnique({ where: { lookupToken: request.params.token }, select: { id: true, status: true, expiresAt: true, _count: { select: { proofs: true } } } });
      if (!reservation || !['ACTIVE', 'PENDING_REVIEW'].includes(reservation.status) || (reservation.status === 'ACTIVE' && reservation.expiresAt <= new Date())) throw new Error('RESERVATION_CLOSED');
      if (reservation._count.proofs >= 3) throw new Error('PROOF_LIMIT');
      const created = await tx.paymentProof.create({ data: { reservationId: reservation.id, mimeType: parsed.data.mimeType, data: bytes }, select: { id: true } });
      if (reservation.status === 'ACTIVE') {
        const updated = await tx.reservation.updateMany({ where: { id: reservation.id, status: 'ACTIVE', expiresAt: { gt: new Date() } }, data: { status: 'PENDING_REVIEW', proofSubmittedAt: new Date() } });
        if (updated.count !== 1) throw new Error('RESERVATION_CLOSED');
      }
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    broadcast('proofs');
    return reply.code(201).send({ id: proof.id, status: 'PENDING_REVIEW' });
  } catch (error) {
    if (error instanceof Error && error.message === 'RESERVATION_CLOSED') return reply.code(409).send({ error: 'La reserva ya venció o fue revisada.' });
    if (error instanceof Error && error.message === 'PROOF_LIMIT') return reply.code(409).send({ error: 'Podés adjuntar hasta tres comprobantes.' });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return reply.code(409).send({ error: 'La reserva cambió. Intentá de nuevo.' });
    throw error;
  }
});

app.get('/api/admin/campaigns', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  const campaigns = await db.campaign.findMany({ orderBy: { createdAt: 'desc' }, include: { photos: photoSelect, packages: packageSelect, winners: { select: { position: true, numberValue: true }, orderBy: { position: 'asc' } } } });
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
  try {
    const photo = await db.$transaction(async tx => {
      const campaign = await tx.campaign.findUnique({ where: { id: request.params.id }, select: { id: true, _count: { select: { photos: true } } } });
      if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
      if (campaign._count.photos >= 5) throw new Error('PHOTO_LIMIT');
      return tx.campaignPhoto.create({
        data: { campaignId: campaign.id, mimeType: parsed.data.mimeType, data: bytes, sortOrder: campaign._count.photos },
        select: { id: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    broadcast('campaigns');
    return reply.code(201).send({ id: photo.id, url: `/api/campaign-photos/${photo.id}` });
  } catch (error) {
    if (error instanceof Error && error.message === 'CAMPAIGN_NOT_FOUND') return reply.code(404).send({ error: 'Rifa no encontrada' });
    if (error instanceof Error && error.message === 'PHOTO_LIMIT') return reply.code(409).send({ error: 'Cada rifa admite hasta 5 fotos.' });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return reply.code(409).send({ error: 'Las fotos cambiaron. Intentá de nuevo.' });
    throw error;
  }
});

app.delete<{ Params: { id: string } }>('/api/admin/campaign-photos/:id', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  const deleted = await db.campaignPhoto.deleteMany({ where: { id: request.params.id } });
  if (!deleted.count) return reply.code(404).send({ error: 'Foto no encontrada' });
  broadcast('campaigns');
  return { ok: true };
});

app.get('/api/admin/reservations', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  await expireReservations();
  const reservations = await db.reservation.findMany({
    where: { status: { in: ['ACTIVE', 'PENDING_REVIEW'] } },
    orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      buyerName: true,
      status: true,
      createdAt: true,
      expiresAt: true,
      selectedValues: true,
      totalCrc: true,
      proofSubmittedAt: true,
      _count: { select: { proofs: true } },
      campaign: { select: { title: true, numberWidth: true } },
      numbers: { select: { value: true }, orderBy: { value: 'asc' } },
    },
  });
  return reservations.map(({ numbers, selectedValues, _count, ...reservation }) => ({
    ...reservation,
    proofCount: _count.proofs,
    ticketCount: selectedValues.length || numbers.length,
    values: selectedValues.length ? selectedValues : numbers.map(number => number.value),
  }));
});

app.get<{ Params: { id: string } }>('/api/admin/reservations/:id', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  await expireReservations();
  const reservation = await db.reservation.findUnique({ where: { id: request.params.id }, select: {
    id: true, buyerName: true, buyerEmail: true, buyerPhone: true, selectedValues: true, status: true, totalCrc: true,
    createdAt: true, expiresAt: true, proofSubmittedAt: true, confirmedAt: true, reviewNote: true,
    campaign: { select: { title: true, numberWidth: true } },
    proofs: { orderBy: { createdAt: 'asc' }, select: { id: true, createdAt: true } },
  } });
  if (!reservation) return reply.code(404).send({ error: 'Reserva no encontrada.' });
  return reservation;
});

app.get<{ Params: { id: string } }>('/api/admin/payment-proofs/:id', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  const proof = await db.paymentProof.findUnique({ where: { id: request.params.id }, select: { mimeType: true, data: true } });
  if (!proof) return reply.code(404).send({ error: 'Comprobante no encontrado.' });
  return reply.type(proof.mimeType).header('Cache-Control', 'private, no-store').send(Buffer.from(proof.data));
});

app.post('/api/admin/campaigns', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  const parsed = campaignInput.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Datos inválidos', details: parsed.error.flatten() });
  const input = parsed.data;
  if ((input.prizeCount >= 2 && !input.secondPrize) || (input.prizeCount === 3 && !input.thirdPrize)) return reply.code(400).send({ error: 'Indicá el premio de cada posición.' });
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
        prizeCount: input.prizeCount,
        secondPrize: input.prizeCount >= 2 ? input.secondPrize : null,
        thirdPrize: input.prizeCount === 3 ? input.thirdPrize : null,
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
  broadcast('campaigns');
  return reply.code(201).send(campaign);
});

app.patch<{ Params: { id: string } }>('/api/admin/campaigns/:id', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  const current = await db.campaign.findUnique({ where: { id: request.params.id }, select: { status: true } });
  if (!current) return reply.code(404).send({ error: 'Rifa no encontrada.' });
  const parsed = (current.status === 'DRAFT' ? campaignInput : campaignInput.pick({ title: true, description: true }).strict()).safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Revisá los datos de la rifa.' });
  try {
    const updated = await db.$transaction(async tx => {
      const campaign = await tx.campaign.findUnique({ where: { id: request.params.id }, select: { status: true, numberCount: true, _count: { select: { reservations: true, winners: true } } } });
      if (!campaign || campaign.status !== current.status) throw new Error('CAMPAIGN_CHANGED');
      if (campaign.status !== 'DRAFT') return tx.campaign.update({ where: { id: request.params.id }, data: { title: parsed.data.title, description: parsed.data.description } });
      const input = parsed.data as z.infer<typeof campaignInput>;
      if (campaign._count.reservations || campaign._count.winners) throw new Error('CAMPAIGN_CHANGED');
      if ((input.prizeCount >= 2 && !input.secondPrize) || (input.prizeCount === 3 && !input.thirdPrize)) throw new Error('INVALID_PRIZES');
      if (new Set(input.packages.map(item => item.quantity)).size !== input.packages.length || input.packages.some(item => item.priceCrc >= item.quantity * input.priceCrc)) throw new Error('INVALID_PACKAGES');
      if (input.numberCount !== campaign.numberCount) {
        await tx.entryNumber.deleteMany({ where: { campaignId: request.params.id } });
        for (let start = 0; start < input.numberCount; start += 1000) await tx.entryNumber.createMany({
          data: Array.from({ length: Math.min(1000, input.numberCount - start) }, (_, offset) => ({ campaignId: request.params.id, value: start + offset })),
        });
      }
      await tx.pricePackage.deleteMany({ where: { campaignId: request.params.id } });
      return tx.campaign.update({ where: { id: request.params.id }, data: {
        title: input.title, slug: input.slug, description: input.description, prize: input.prize,
        prizeCount: input.prizeCount, secondPrize: input.prizeCount >= 2 ? input.secondPrize : null,
        thirdPrize: input.prizeCount === 3 ? input.thirdPrize : null, priceCrc: input.priceCrc,
        numberCount: input.numberCount, numberWidth: String(input.numberCount - 1).length,
        packages: { create: input.packages },
      } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60_000 });
    broadcast('campaigns');
    return updated;
  } catch (error) {
    if (error instanceof Error && error.message === 'CAMPAIGN_CHANGED') return reply.code(409).send({ error: 'La rifa cambió. Actualizá el panel antes de editarla.' });
    if (error instanceof Error && error.message === 'INVALID_PRIZES') return reply.code(400).send({ error: 'Indicá el premio de cada posición.' });
    if (error instanceof Error && error.message === 'INVALID_PACKAGES') return reply.code(400).send({ error: 'Revisá cantidad y precio de los paquetes.' });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return reply.code(409).send({ error: 'Ese identificador URL ya existe.' });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return reply.code(409).send({ error: 'La rifa cambió. Intentá de nuevo.' });
    throw error;
  }
});

app.post<{ Params: { id: string } }>('/api/admin/campaigns/:id/publish', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  const campaign = await db.campaign.findUnique({ where: { id: request.params.id } });
  if (!campaign) return reply.code(404).send({ error: 'Rifa no encontrada' });
  if (campaign.status !== 'DRAFT') return reply.code(409).send({ error: 'Solo se publican rifas en borrador' });
  const published = await db.campaign.update({ where: { id: campaign.id }, data: { status: 'LIVE' } });
  broadcast('campaigns');
  return published;
});

app.get('/api/winners', async () => {
  const winners = await db.winner.findMany({
    orderBy: { publishedAt: 'desc' },
    select: { position: true, numberValue: true, publishedAt: true, campaign: { select: { id: true, title: true, prize: true, secondPrize: true, thirdPrize: true, prizeCount: true, numberWidth: true } }, reservation: { select: { buyerName: true } } },
  });
  return winners.map(({ reservation, ...winner }) => ({ ...winner, buyerName: reservation.buyerName }));
});

app.get<{ Params: { id: string }; Querystring: { page?: string; number?: string; status?: string } }>('/api/admin/campaigns/:id/overview', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  await expireReservations();
  const campaign = await db.campaign.findUnique({ where: { id: request.params.id }, select: { id: true, title: true, numberCount: true, numberWidth: true, prizeCount: true, prize: true, secondPrize: true, thirdPrize: true, winners: { select: { position: true, numberValue: true }, orderBy: { position: 'asc' } } } });
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
      select: { value: true, status: true, reservation: { select: { id: true, buyerName: true } } } }),
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
      select: { id: true, buyerName: true, selectedValues: true, status: true, createdAt: true, expiresAt: true, confirmedAt: true, totalCrc: true } }),
  ]);
  return { page, pageCount: Math.ceil(total / 30), reservations };
});

app.get<{ Params: { id: string }; Querystring: { page?: string } }>('/api/admin/participants/by-reservation/:id', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  await expireReservations();
  const source = await db.reservation.findUnique({ where: { id: request.params.id }, select: {
    id: true, campaignId: true, buyerName: true, buyerEmail: true, buyerPhone: true, selectedValues: true,
    status: true, createdAt: true, expiresAt: true, totalCrc: true,
    campaign: { select: { title: true, numberWidth: true } },
  } });
  if (!source) return reply.code(404).send({ error: 'Participante no encontrado.' });
  const page = Math.max(1, Math.min(1000, Number(request.query.page) || 1));
  const where = { buyerEmail: { equals: source.buyerEmail, mode: 'insensitive' as const } };
  const [total, reservations] = await Promise.all([
    db.reservation.count({ where }),
    db.reservation.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 30, take: 30,
      select: { id: true, buyerName: true, selectedValues: true, status: true, createdAt: true, totalCrc: true,
        campaign: { select: { title: true, numberWidth: true } } } }),
  ]);
  return { participant: { name: source.buyerName, email: source.buyerEmail, phone: source.buyerPhone }, source,
    page, pageCount: Math.ceil(total / 30), total, reservations };
});

app.post<{ Params: { id: string } }>('/api/admin/reservations/:id/confirm', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  await expireReservations();
  try {
    const confirmed = await db.$transaction(async tx => {
      const reservation = await tx.reservation.findUnique({ where: { id: request.params.id }, select: { selectedValues: true, _count: { select: { proofs: true } } } });
      if (!reservation || reservation._count.proofs === 0) throw new Error('RESERVATION_NOT_ACTIVE');
      const changed = await tx.reservation.updateMany({ where: { id: request.params.id, status: 'PENDING_REVIEW' }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });
      if (changed.count !== 1) throw new Error('RESERVATION_NOT_ACTIVE');
      const sold = await tx.entryNumber.updateMany({ where: { reservationId: request.params.id, status: 'RESERVED' }, data: { status: 'SOLD' } });
      if (sold.count !== reservation.selectedValues.length) throw new Error('RESERVATION_NOT_ACTIVE');
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    broadcast('reservations');
    return { confirmed };
  } catch (error) {
    if (error instanceof Error && error.message === 'RESERVATION_NOT_ACTIVE') return reply.code(409).send({ error: 'La reserva debe tener un comprobante pendiente de revisión.' });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return reply.code(409).send({ error: 'La reserva cambió mientras se confirmaba. Intentá de nuevo.' });
    throw error;
  }
});

app.post<{ Params: { id: string } }>('/api/admin/reservations/:id/reject', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  const parsed = z.object({ reason: z.string().trim().min(3).max(500) }).safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Indicá el motivo del rechazo.' });
  try {
    await db.$transaction(async tx => {
      const changed = await tx.reservation.updateMany({ where: { id: request.params.id, status: 'PENDING_REVIEW' }, data: { status: 'CANCELLED', reviewNote: parsed.data.reason } });
      if (changed.count !== 1) throw new Error('RESERVATION_NOT_PENDING');
      await tx.entryNumber.updateMany({ where: { reservationId: request.params.id, status: 'RESERVED' }, data: { status: 'AVAILABLE', reservationId: null } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    broadcast('reservations');
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === 'RESERVATION_NOT_PENDING') return reply.code(409).send({ error: 'Esta reserva ya fue revisada.' });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return reply.code(409).send({ error: 'La reserva cambió. Intentá de nuevo.' });
    throw error;
  }
});

app.post<{ Params: { id: string } }>('/api/admin/campaigns/:id/winner', async (request, reply) => {
  if (!adminAuthorized(request.headers.authorization)) return reply.code(401).send({ error: 'Acceso no autorizado' });
  const parsed = z.object({ numberValue: z.number().int().nonnegative(), position: z.number().int().min(1).max(3) }).safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Número inválido.' });
  try {
    const winner = await db.$transaction(async tx => {
      const campaign = await tx.campaign.findUnique({ where: { id: request.params.id }, select: { status: true, prizeCount: true, winners: { select: { position: true, numberValue: true } } } });
      if (!campaign || campaign.status !== 'LIVE' || parsed.data.position !== campaign.winners.length + 1 || parsed.data.position > campaign.prizeCount || campaign.winners.some(item => item.numberValue === parsed.data.numberValue)) throw new Error('WINNER_NOT_ALLOWED');
      const number = await tx.entryNumber.findUnique({ where: { campaignId_value: { campaignId: request.params.id, value: parsed.data.numberValue } }, select: { status: true, reservationId: true } });
      if (number?.status !== 'SOLD' || !number.reservationId) throw new Error('NUMBER_NOT_SOLD');
      const winner = await tx.winner.create({ data: { campaignId: request.params.id, reservationId: number.reservationId, numberValue: parsed.data.numberValue, position: parsed.data.position } });
      if (parsed.data.position === campaign.prizeCount) await tx.campaign.update({ where: { id: request.params.id }, data: { status: 'CLOSED' } });
      return winner;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    broadcast('winners');
    return reply.code(201).send(winner);
  } catch (error) {
    if (error instanceof Error && error.message === 'WINNER_NOT_ALLOWED') return reply.code(409).send({ error: 'La posición no está disponible o este número ya ganó.' });
    if (error instanceof Error && error.message === 'NUMBER_NOT_SOLD') return reply.code(409).send({ error: 'Solo puede ganar un boleto vendido y confirmado.' });
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) return reply.code(409).send({ error: 'El resultado cambió. Actualizá la rifa.' });
    throw error;
  }
});

const timer = setInterval(() => expireReservations().catch(error => app.log.error(error)), 60_000);
timer.unref();
const proposalCleanup = setInterval(() => {
  void db.numberProposal.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60_000) } } }).catch(error => app.log.error(error));
}, 60 * 60_000);
proposalCleanup.unref();
app.addHook('onClose', async () => { clearInterval(timer); clearInterval(proposalCleanup); await db.$disconnect(); });

const port = Number(process.env.PORT || 4100);
await app.listen({ host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1', port });
