import { useEffect, useState, type ReactNode } from 'react';

type Order = {
  orderNumber: number; buyerName: string; status: string; totalCrc: number;
  createdAt: string; confirmedAt: string | null; expiresAt: string; reviewNote: string | null;
  values: number[]; baseValues: number[]; includesInverted: boolean; proofCount: number;
  campaign: { title: string; numberWidth: number };
};
const labels: Record<string, string> = { ACTIVE: 'Pendiente de pago', PENDING_REVIEW: 'Pago en revisión', CONFIRMED: 'Compra confirmada', CANCELLED: 'Pago rechazado', EXPIRED: 'Pedido vencido' };
const date = (value: string) => new Date(value).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });
const money = (value: number) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(value);

export default function OrderDetail({ renderProof }: { renderProof: (token: string, count: number, refresh: () => Promise<void>) => ReactNode }) {
  // The secret stays in the fragment: it is never sent in the page URL or referrer.
  const [token] = useState(() => window.location.hash.slice(1));
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!/^[a-f0-9]{48}$/i.test(token)) { setError('El enlace del pedido no es válido. Usá tu código en Buscar boletos.'); return; }
    const controller = new AbortController();
    let loading = false;
    const refresh = async () => {
      if (loading || document.visibilityState === 'hidden') return;
      loading = true;
      try {
        const response = await fetch('/api/reservations/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo consultar el pedido.');
        if (!controller.signal.aborted) { setOrder(data); setError(''); }
      } catch (cause) { if (!controller.signal.aborted) setError((cause as Error).message); }
      finally { loading = false; }
    };
    void refresh();
    window.addEventListener('cifraya:update', refresh);
    return () => { controller.abort(); window.removeEventListener('cifraya:update', refresh); };
  }, [token, revision]);
  const refresh = async () => { setRevision(value => value + 1); };
  return <main className="public-page order-page"><header><span className="eyebrow">CIFRAYA / TU PEDIDO</span><h1>{order ? `CY-${String(order.orderNumber).padStart(6, '0')}` : 'Detalle del pedido'}</h1><p>Guardá este enlace privado para consultar tus boletos.</p></header>
    {error && <div role="alert"><p>{error}</p><button className="button dark" onClick={() => void refresh()}>Volver a consultar</button></div>}
    {!order && !error && <p role="status">Cargando pedido…</p>}
    {order && <section className="order-card" aria-label="Detalle del pedido"><div className="order-heading"><h2>{order.campaign.title}</h2><span role="status">{labels[order.status] || order.status}</span></div>
      <dl className="order-facts"><div><dt>A nombre de</dt><dd>{order.buyerName}</dd></div><div><dt>Total</dt><dd>{money(order.totalCrc)}</dd></div><div><dt>Fecha del pedido</dt><dd>{date(order.createdAt)}</dd></div><div><dt>Método de pago</dt><dd>SINPE Móvil</dd></div><div><dt>Paquete</dt><dd>{order.baseValues.length || order.values.length} números{order.includesInverted ? ' + invertidos' : ''}</dd></div><div><dt>Boletos del pedido</dt><dd>{order.values.length}</dd></div>{order.confirmedAt && <div><dt>Pago confirmado</dt><dd>{date(order.confirmedAt)}</dd></div>}</dl>
      <div className="order-tickets"><h3>Números de tu pedido</h3><div>{order.values.map(value => <span key={value}>{String(value).padStart(order.campaign.numberWidth, '0')}{order.includesInverted && !order.baseValues.includes(value) && <small>Inverso</small>}</span>)}</div></div>
      {order.status === 'ACTIVE' && <p>Adjuntá tu comprobante antes del {date(order.expiresAt)} para que revisemos el pago.</p>}
      {order.status === 'PENDING_REVIEW' && <p>Tu comprobante está en revisión. El estado se actualiza automáticamente al resolver el pago.</p>}
      {order.status === 'CANCELLED' && <div className="order-notice"><strong>Motivo del rechazo</strong><p>{order.reviewNote || 'Consultá con administración.'}</p></div>}
      {order.status === 'EXPIRED' && <p>El pedido venció. Estos números ya no están reservados a tu nombre.</p>}
      {['ACTIVE', 'PENDING_REVIEW'].includes(order.status) && renderProof(token, order.proofCount, refresh)}
      <button className="button dark" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/pedido#${token}`); setCopied(true); } catch { setError('No se pudo copiar. Podés guardar la dirección de esta página.'); } }}>{copied ? 'Enlace copiado' : 'Copiar enlace privado'}</button>
    </section>}
  </main>;
}
