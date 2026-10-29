import type { Prisma, PrismaClient } from '@prisma/client';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function paymentEmail(order: { paymentMethod?:string; stickerCount?: number | null; numbersPerSticker?: number | null; orderNumber: number; buyerName: string; lookupToken: string; selectedValues: number[]; totalCrc: number; reviewNote: string | null; campaign: { title: string; numberWidth: number } }, kind: 'CONFIRMED' | 'REJECTED' | 'RESERVED' | 'PENDING_REVIEW' | 'CANCELLED', origin: string, diagnostic = false) {
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('INVALID_PUBLIC_APP_URL');
  const link = diagnostic ? url.origin : `${url.origin}/pedido#${encodeURIComponent(order.lookupToken)}`;
  const reference = diagnostic ? 'PRUEBA-SIN-COMPRA' : `CY-${String(order.orderNumber).padStart(6, '0')}`;
  const copy = {
    CANCELLED: { heading: 'Tu reserva fue cancelada', title: 'Reserva cancelada', label: 'RESERVA CANCELADA', description: 'Administración canceló tu reserva sin comprobante. Los números quedaron disponibles nuevamente. Podés consultar el motivo en este correo y en tu pedido.' },
    CONFIRMED: { heading: 'Tu pago fue aprobado', title: '¡Tus números ya son tuyos!', label: 'COMPRA CONFIRMADA', description: 'Verificamos tu pago. Tu participación está confirmada y estos boletos quedaron registrados a tu nombre.' },
    REJECTED: { heading: 'Tu pago fue rechazado', title: 'Tu pago no fue aprobado', label: 'REVISIÓN DEL PAGO', description: 'Revisamos tu comprobante y no pudimos confirmar el pago. Encontrá el motivo y los detalles a continuación.' },
    RESERVED: { heading: 'Tu reserva y el estado de tu pago', title: 'Recibimos tu pedido', label: 'BOLETOS APARTADOS · PAGO NO CONFIRMADO', description: 'Tus boletos están apartados. Si ya adjuntaste el comprobante, tu pago está pendiente de revisión. Si todavía no lo adjuntaste, ingresá al enlace de tu pedido y subilo antes de que venza la reserva de 30 minutos. Consultá allí el estado actualizado. Te avisaremos por correo cuando aprobemos o rechacemos el pago.' },
    PENDING_REVIEW: { heading: 'Tu pago está pendiente de revisión', title: 'Estamos revisando tu pago', label: 'COMPROBANTE RECIBIDO', description: 'Recibimos tu comprobante. Tus boletos están apartados y el pago está pendiente de revisión por administración. Te avisaremos por correo cuando lo aprobemos o rechacemos; todavía no es una compra confirmada.' },
  }[kind];
  const heading = copy.heading;
  const numbers = order.selectedValues.map(n => String(n).padStart(order.campaign.numberWidth, '0')).join(', ');
  const stickerDetail = order.stickerCount ? `${order.stickerCount} boletos · ${order.numbersPerSticker} números por boleto` : '';
  const lines = [...(order.paymentMethod==='CASH'?['Método de pago: efectivo recibido.']:[]),stickerDetail,heading, `Hola, ${order.buyerName}.`, `Pedido: ${reference}`, `Rifa: ${order.campaign.title}`, `Total: ₡${order.totalCrc.toLocaleString('es-CR')}`, `Números: ${numbers}`, (kind === 'REJECTED' || kind === 'CANCELLED') ? `Motivo: ${order.reviewNote ?? ''}` : copy.description, ...(diagnostic ? [] : [`Código de consulta: ${order.lookupToken}`, `Para buscar tus boletos, copiá este código completo en ${url.origin}/buscar-boletos. Guardalo: es privado.`]), `Consultá tu pedido: ${link}`, 'Este enlace es privado. No lo compartás.'];
  const approved = kind === 'CONFIRMED';
  const accent = (kind === 'REJECTED' || kind === 'CANCELLED') ? '#b32240' : '#4654dc';
  const tickets = order.selectedValues.map(n => '<span style="display:inline-block;margin:4px;padding:12px 16px;border:1px dashed #9e9eae;border-radius:5px;background:#ffffff;font-family:Courier New,monospace;font-size:18px;font-weight:700;letter-spacing:2px;color:#202020">' + String(n).padStart(order.campaign.numberWidth, '0') + '</span>').join('');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f3f3f7;color:#202020;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeHtml(heading)}. Pedido ${escapeHtml(reference)}. Consultá los detalles de tu rifa.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f7"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #dddde7;border-radius:16px;overflow:hidden">
<tr><td style="padding:24px 28px;background:#191919;border-top:6px solid #ff6200"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="80" valign="middle" style="width:80px"><img src="${escapeHtml(url.origin)}/vnova-email-logo.png" width="80" height="76" alt="Logo Vnova TCG" style="display:block;width:80px;height:76px;border:0;border-radius:8px"></td><td valign="middle" style="padding-left:18px">
<span style="font-size:24px;font-weight:800;letter-spacing:1px;color:#ffffff">VNOVA <span style="color:#ff6200">TCG</span></span><p style="margin:6px 0 0;color:#c8c8ce;font-size:12px;letter-spacing:2px">TUS NÚMEROS. TU OPORTUNIDAD.</p></td></tr></table></td></tr>
<tr><td style="padding:28px;background:#ffffff">
${diagnostic ? '<p style="margin:0 0 22px;padding:12px;border:1px solid #c8caff;border-radius:8px;color:#666674;font-size:12px;line-height:1.6"><strong>CORREO DE PRUEBA</strong><br>Prueba técnica autorizada. No representa una compra ni un pago real.</p>' : ''}
<p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:1px;color:${accent}">${copy.label}</p>
<h1 style="margin:0 0 18px;font-size:30px;line-height:1.15;letter-spacing:-1px;color:#202020">${copy.title}</h1>
<p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#50505c">Hola, ${escapeHtml(order.buyerName)}.</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#50505c">${copy.description}</p>
${order.paymentMethod==='CASH'?'<p style="color:#202020;font-size:15px"><strong>Método de pago:</strong> efectivo recibido.</p>':''}
${(kind === 'REJECTED' || kind === 'CANCELLED') ? '<div style="padding:18px;background:#fff2f2;border-left:3px solid #ff8fa9;border-radius:4px;margin:0 0 24px"><p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#a32240">MOTIVO</p><p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;color:#202020">' + escapeHtml(order.reviewNote ?? '') + '</p></div>' : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #dddde7;border-bottom:1px solid #dddde7">
<tr><td style="padding:16px 0 6px;font-size:12px;color:#666674">PEDIDO</td></tr><tr><td style="padding:0 0 18px;font-size:17px;font-weight:700;overflow-wrap:anywhere">${escapeHtml(reference)}</td></tr>
<tr><td style="padding:0 0 6px;font-size:12px;color:#666674">RIFA</td></tr><tr><td style="padding:0 0 18px;font-size:17px;font-weight:700;overflow-wrap:anywhere">${escapeHtml(order.campaign.title)}</td></tr>
${stickerDetail ? `<tr><td style="padding:0 0 18px;font-size:15px">${escapeHtml(stickerDetail)}</td></tr>` : ''}
<tr><td style="padding:0 0 6px;font-size:12px;color:#666674">${approved ? 'TOTAL CONFIRMADO' : 'TOTAL DEL PEDIDO'}</td></tr><tr><td style="padding:0 0 18px;font-size:26px;font-weight:700">₡${order.totalCrc.toLocaleString('es-CR')}</td></tr></table>
<p style="margin:24px 0 10px;font-size:12px;font-weight:700;letter-spacing:1px;color:#666674">${approved ? 'TUS BOLETOS' : 'NÚMEROS DEL PEDIDO · NO CONFIRMADOS'}</p>
<div style="margin:0 0 26px;padding:0">${tickets}</div>
${diagnostic ? '' : `<div style="margin:0 0 24px;padding:18px;border:1px solid #c8caff;border-radius:10px;background:#f1f2ff"><p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#202020">TU CÓDIGO DE CONSULTA</p><p style="margin:0 0 12px;font-family:monospace;font-size:16px;line-height:1.6;word-break:break-all;overflow-wrap:anywhere;color:#202020">${escapeHtml(order.lookupToken)}</p><p style="margin:0;font-size:13px;line-height:1.6;color:#50505c">Copiá el código completo y pegalo en <a href="${escapeHtml(url.origin)}/buscar-boletos" style="color:#4654dc">Buscar boletos</a>. Guardá este correo: el código es privado y permite consultar tu pedido.</p><p style="margin:16px 0 0"><a href="${escapeHtml(url.origin)}/pedido?copiar=1#${encodeURIComponent(order.lookupToken)}" style="display:inline-block;padding:12px 16px;background:#4654dc;color:#ffffff;font-family:Courier New,monospace;font-weight:bold;text-decoration:none;border-top:3px solid #939cff;border-left:3px solid #939cff;border-bottom:3px solid #263080;border-right:3px solid #263080">Copiar código de consulta &rarr;</a></p><p style="margin:10px 0 0;font-size:12px;color:#666674">Abre tu pedido para copiar el código con un toque.</p></div>`}
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" bgcolor="#4654dc" style="border-radius:0;border-top:4px solid #939cff;border-left:4px solid #939cff;border-right:4px solid #263080;border-bottom:4px solid #263080"><a href="${escapeHtml(link)}" style="display:block;padding:17px 20px;color:#ffffff;font-family:Courier New,monospace;font-size:15px;font-weight:700;text-decoration:none;border:0;border-radius:0">${diagnostic ? 'Visitar Vnova TCG' : 'Ver detalle de mi pedido'} &rarr;</a></td></tr></table>
<p style="margin:16px 0 0;text-align:center;font-size:12px;line-height:1.6;color:#666674">${diagnostic ? 'Vista de prueba del correo automático.' : 'Este enlace es privado. Guardalo y no lo compartás.'}</p>
</td></tr><tr><td style="padding:22px 28px;background:#f8f8fa;border-top:1px solid #dddde7;text-align:center"><p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#202020">Vnova TCG</p><p style="margin:0;font-size:12px;line-height:1.6;color:#666674">Notificación automática sobre tu pedido.</p></td></tr></table>
</td></tr></table></body></html>`;
  return { subject: `${diagnostic ? '[PRUEBA] ' : ''}${heading} · ${reference} · Vnova TCG`, text: (diagnostic ? ['Prueba técnica autorizada. No representa una compra ni un pago real.', ...lines] : lines).join('\n\n'), html };

}

export async function enqueuePaymentEmail(tx: Prisma.TransactionClient, reservationId: string, kind: 'CONFIRMED' | 'REJECTED' | 'RESERVED' | 'PENDING_REVIEW' | 'CANCELLED') {
  const order = await tx.reservation.findUniqueOrThrow({ where: { id: reservationId }, include: { campaign: { select: { title: true, numberWidth: true, isTest: true } } } });
  if (order.campaign.isTest) return;
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
