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
  const approved = kind === 'CONFIRMED';
  const accent = approved ? '#395aff' : '#b52a28';
  const tickets = order.selectedValues.map(n => '<span style="display:inline-block;margin:4px;padding:12px 16px;border:1px dashed #b6b9c5;border-radius:8px;background:#ffffff;font-size:18px;font-weight:700;letter-spacing:2px;color:#191919">' + String(n).padStart(order.campaign.numberWidth, '0') + '</span>').join('');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f2f2f5;color:#191919;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeHtml(heading)}. Pedido ${escapeHtml(reference)}. Consultá los detalles de tu rifa.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f5"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e2e8;border-radius:16px;overflow:hidden">
<tr><td style="padding:24px 28px;background:#191919;border-top:6px solid #ff4200"><span style="font-size:26px;font-weight:800;letter-spacing:1px;color:#ffffff">VNOVA <span style="color:#ff7545">TCG</span></span><p style="margin:6px 0 0;color:#c5c5cf;font-size:12px;letter-spacing:2px">TUS NÚMEROS. TU OPORTUNIDAD.</p></td></tr>
<tr><td style="padding:28px">
${diagnostic ? '<p style="margin:0 0 22px;padding:12px;border:1px solid #dedee6;border-radius:8px;color:#626272;font-size:12px;line-height:1.6"><strong>CORREO DE PRUEBA</strong><br>Prueba técnica autorizada. No representa una compra ni un pago real.</p>' : ''}
<p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:2px;color:${accent}">${approved ? 'COMPRA CONFIRMADA' : 'REVISIÓN DEL PAGO'}</p>
<h1 style="margin:0 0 18px;font-size:30px;line-height:1.15;letter-spacing:-1px;color:#191919">${approved ? '¡Tus números ya son tuyos!' : 'Tu pago no fue aprobado'}</h1>
<p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#494954">Hola, ${escapeHtml(order.buyerName)}.</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#494954">${approved ? 'Verificamos tu pago. Tu participación está confirmada y estos boletos quedaron registrados a tu nombre.' : 'Revisamos tu comprobante y no pudimos confirmar el pago. Encontrá el motivo y los detalles a continuación.'}</p>
${!approved ? '<div style="padding:18px;background:#fff2f0;border-left:3px solid #b52a28;border-radius:4px;margin:0 0 24px"><p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#962220">MOTIVO DEL RECHAZO</p><p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;color:#191919">' + escapeHtml(order.reviewNote ?? '') + '</p></div>' : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e6e6ec;border-bottom:1px solid #e6e6ec">
<tr><td style="padding:16px 0 6px;font-size:12px;color:#686875">PEDIDO</td></tr><tr><td style="padding:0 0 18px;font-size:17px;font-weight:700;overflow-wrap:anywhere">${escapeHtml(reference)}</td></tr>
<tr><td style="padding:0 0 6px;font-size:12px;color:#686875">RIFA</td></tr><tr><td style="padding:0 0 18px;font-size:17px;font-weight:700;overflow-wrap:anywhere">${escapeHtml(order.campaign.title)}</td></tr>
<tr><td style="padding:0 0 6px;font-size:12px;color:#686875">${approved ? 'TOTAL CONFIRMADO' : 'TOTAL DEL PEDIDO'}</td></tr><tr><td style="padding:0 0 18px;font-size:26px;font-weight:700">₡${order.totalCrc.toLocaleString('es-CR')}</td></tr></table>
<p style="margin:24px 0 10px;font-size:12px;font-weight:700;letter-spacing:1px;color:#686875">${approved ? 'TUS BOLETOS' : 'NÚMEROS DEL PEDIDO · NO CONFIRMADOS'}</p>
<div style="margin:0 -4px 26px">${tickets}</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" bgcolor="#395aff" style="border-radius:8px"><a href="${escapeHtml(link)}" style="display:block;padding:17px 20px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border:1px solid #395aff;border-radius:8px">${diagnostic ? 'Visitar Vnova TCG' : 'Ver detalle de mi pedido'} &rarr;</a></td></tr></table>
<p style="margin:16px 0 0;text-align:center;font-size:12px;line-height:1.6;color:#686875">${diagnostic ? 'Vista de prueba del correo automático.' : 'Este enlace es privado. Guardalo y no lo compartás.'}</p>
</td></tr><tr><td style="padding:22px 28px;background:#f8f8fa;border-top:1px solid #e6e6ec;text-align:center"><p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#191919">Vnova TCG</p><p style="margin:0;font-size:12px;line-height:1.6;color:#686875">Notificación automática sobre tu pedido.</p></td></tr></table>
</td></tr></table></body></html>`;
  return { subject: `${diagnostic ? '[PRUEBA] ' : ''}${heading} · ${reference} · Vnova TCG`, text: (diagnostic ? ['Prueba técnica autorizada. No representa una compra ni un pago real.', ...lines] : lines).join('\n\n'), html };

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
