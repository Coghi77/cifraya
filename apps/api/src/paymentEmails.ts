import type { Prisma, PrismaClient } from '@prisma/client';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function paymentEmail(order: { orderNumber: number; buyerName: string; lookupToken: string; selectedValues: number[]; totalCrc: number; reviewNote: string | null; campaign: { title: string; numberWidth: number } }, kind: 'CONFIRMED' | 'REJECTED', origin: string, diagnostic = false) {
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('INVALID_PUBLIC_APP_URL');
  const link = diagnostic ? url.origin : `${url.origin}/pedido#${encodeURIComponent(order.lookupToken)}`;
  const reference = diagnostic ? 'PRUEBA-SIN-COMPRA' : `CY-${String(order.orderNumber).padStart(6, '0')}`;
  const heading = kind === 'CONFIRMED' ? 'Tu pago fue aprobado' : 'Tu pago fue rechazado';
  const numbers = order.selectedValues.map(n => String(n).padStart(order.campaign.numberWidth, '0')).join(', ');
  const lines = [heading, `Hola, ${order.buyerName}.`, `Pedido: ${reference}`, `Rifa: ${order.campaign.title}`, `Total: ₡${order.totalCrc.toLocaleString('es-CR')}`, `Números: ${numbers}`, kind === 'CONFIRMED' ? 'Tu compra está confirmada y tus boletos están vendidos a tu nombre.' : `Motivo: ${order.reviewNote ?? ''}`, `Consultá tu pedido: ${link}`, 'Este enlace es privado. No lo compartás.'];
  return { subject: `${diagnostic ? '[PRUEBA] ' : ''}${heading} · ${reference} · Vnova TCG`, text: (diagnostic ? ['Prueba técnica autorizada. No representa una compra ni un pago real.', ...lines] : lines).join('\n\n'), html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#191919"><h2 style="background:#ff4200;color:white;padding:24px">Vnova TCG</h2>${diagnostic ? '<p><strong>Prueba técnica autorizada. No representa una compra ni un pago real.</strong></p>' : ''}${lines.slice(0, 7).map(line => `<p>${escapeHtml(line)}</p>`).join('')}<p><a style="background:#395aff;color:white;padding:12px 18px;display:inline-block" href="${escapeHtml(link)}">Ver mi pedido</a></p><p>Este enlace es privado. No lo compartás.</p></div>` };
}

export async function enqueuePaymentEmail(tx: Prisma.TransactionClient, reservationId: string, kind: 'CONFIRMED' | 'REJECTED') {
  const order = await tx.reservation.findUniqueOrThrow({ where: { id: reservationId }, include: { campaign: { select: { title: true, numberWidth: true } } } });
  await tx.emailNotification.create({ data: { reservationId, kind, recipient: order.buyerEmail, ...paymentEmail(order, kind, process.env.PUBLIC_APP_URL || 'https://vnovatcg.com') } });
}

export function retryableEmailStatus(status: number) { return status === 408 || status === 429 || status >= 500; }
export function emailConfigured() { return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM); }

// Persistent outbox: a two-minute lease survives restarts; identical payload/key on retries.
export function createEmailWorker(db: PrismaClient, changed: () => void, failed: () => void) {
  let running: Promise<void> | undefined;
  let stopped = false;
  async function drain() {
    for (let i = 0; i < 10 && !stopped; i++) {
      const now = new Date();
      const job = await db.emailNotification.findFirst({ where: { status: 'PENDING', availableAt: { lte: now } }, orderBy: { availableAt: 'asc' } });
      if (!job) return;
      const claim = await db.emailNotification.updateMany({ where: { id: job.id, status: 'PENDING', availableAt: job.availableAt, attempts: job.attempts }, data: { availableAt: new Date(Date.now() + 120_000), attempts: { increment: 1 }, firstAttemptAt: job.firstAttemptAt ?? now, sender: job.sender ?? process.env.EMAIL_FROM! } });
      if (!claim.count) continue;
      if (job.firstAttemptAt && Date.now() - job.firstAttemptAt.getTime() > 23 * 60 * 60_000) {
        await db.emailNotification.update({ where: { id: job.id }, data: { status: 'FAILED', lastError: 'RETRY_WINDOW_EXPIRED' } });
        changed(); continue;
      }
      let error = 'NETWORK_ERROR';
      let retry = true;
      let providerId: string | undefined;
      try {
        const response = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(10_000), headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `payment-${job.id}` }, body: JSON.stringify({ from: job.sender ?? process.env.EMAIL_FROM!, to: [job.recipient], subject: job.subject, html: job.html, text: job.text }) });
        error = `RESEND_HTTP_${response.status}`;
        retry = retryableEmailStatus(response.status);
        if (response.ok) {
          const data = await response.json() as { id?: string };
          if (typeof data.id === 'string') providerId = data.id;
          else { error = 'INVALID_PROVIDER_RESPONSE'; retry = true; }
        }
      } catch { retry = true; /* Never log recipient, body, private order link or credentials. */ }
      await db.emailNotification.update({ where: { id: job.id }, data: providerId ? { status: 'SENT', providerId, sentAt: new Date(), lastError: null } : { status: retry && job.attempts < 11 ? 'PENDING' : 'FAILED', lastError: error, availableAt: new Date(Date.now() + Math.min(60 * 60_000, 60_000 * 2 ** job.attempts)) } });
      changed();
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }
  function kick() {
    if (!stopped && emailConfigured() && !running) running = drain().catch(failed).finally(() => { running = undefined; });
  }
  const timer = setInterval(kick, 60_000); timer.unref();
  return { kick, async close() { stopped = true; clearInterval(timer); await running; } };
}
