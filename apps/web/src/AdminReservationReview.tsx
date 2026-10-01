import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type Detail = {
  id: string; buyerName: string; buyerEmail: string; buyerPhone: string; selectedValues: number[];
  status: 'ACTIVE' | 'PENDING_REVIEW' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED'; totalCrc: number;
  createdAt: string; expiresAt: string; proofSubmittedAt: string | null; confirmedAt: string | null; reviewNote: string | null;
  campaign: { title: string; numberWidth: number }; proofs: { id: string; createdAt: string }[];
};
const money = (amount: number) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(amount);

function ProofImage({ id, token }: { id: string; token: string }) {
  const [url, setUrl] = useState('');
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    void fetch(`/api/admin/payment-proofs/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => { if (!response.ok) throw new Error('No se pudo abrir el comprobante.'); return response.blob(); })
      .then(blob => { objectUrl = URL.createObjectURL(blob); if (active) setUrl(objectUrl); else URL.revokeObjectURL(objectUrl); })
      .catch(() => {});
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, token]);
  useEffect(() => {
    if (!expanded) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [expanded]);
  return url ? <>
    <button className="review-proof-thumb" type="button" onClick={() => setExpanded(true)} aria-label="Ampliar comprobante"><img src={url} alt="Comprobante SINPE Móvil" /></button>
    {expanded && createPortal(<div className="proof-lightbox" onMouseDown={event => { if (event.target === event.currentTarget) setExpanded(false); }}><div className="proof-lightbox-content" role="dialog" aria-modal="true" aria-label="Comprobante ampliado"><button className="proof-lightbox-close" type="button" autoFocus onClick={() => setExpanded(false)} aria-label="Cerrar comprobante"><X size={22}/></button><img src={url} alt="Comprobante SINPE Móvil ampliado" /></div></div>, document.body)}
  </> : <span>Cargando comprobante...</span>;
}

export default function AdminReservationReview({ id, token, onClose, onReviewed }: { id: string; token: string; onClose: () => void; onReviewed: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch(`/api/admin/reservations/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo abrir la reserva.'); return data as Detail; })
      .then(data => { if (active) setDetail(data); })
      .catch(cause => { if (active) setError((cause as Error).message); });
    return () => { active = false; };
  }, [id, token]);

  async function review(action: 'confirm' | 'reject') {
    if (!detail) return;
    if (action === 'reject' && reason.trim().length < 3) { setError('Escribí el motivo del rechazo.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/reservations/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: action === 'reject' ? JSON.stringify({ reason: reason.trim() }) : '{}' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo revisar el pago.');
      onReviewed(); onClose();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="review-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="review-panel" role="dialog" aria-modal="true" aria-label="Revisar reserva"><button className="review-close" onClick={onClose} aria-label="Cerrar"><X size={19}/></button><span className="eyebrow">BOLETOS Y PERSONAS</span><h2>Revisar pago</h2>{error && <p className="review-error" role="alert">{error}</p>}{detail ? <>
    <div className="review-person"><strong>{detail.buyerName}</strong><span>{detail.buyerEmail}</span><span>{detail.buyerPhone}</span><span>{detail.campaign.title}</span></div>
    <div className="review-summary"><div><small>ESTADO</small><strong>{detail.status === 'PENDING_REVIEW' ? 'Pago en revisión' : detail.status === 'ACTIVE' ? 'Esperando comprobante' : detail.status === 'CONFIRMED' ? 'Compra confirmada' : detail.status === 'EXPIRED' ? 'Vencida' : 'Rechazada'}</strong></div><div><small>IMPORTE</small><strong>{money(detail.totalCrc)}</strong></div><div><small>NÚMEROS</small><strong>{detail.selectedValues.length}</strong></div></div>
    <div className="review-numbers">{detail.selectedValues.map(value => <span key={value}>{String(value).padStart(detail.campaign.numberWidth, '0')}</span>)}</div>
    <p className="review-date">Reservado: {new Date(detail.createdAt).toLocaleString('es-CR')}{detail.proofSubmittedAt && ` · Comprobante: ${new Date(detail.proofSubmittedAt).toLocaleString('es-CR')} · Revisar antes: ${new Date(new Date(detail.proofSubmittedAt).getTime() + 48 * 60 * 60_000).toLocaleString('es-CR')}`}</p>
    <div className="review-proofs"><h3>Comprobantes SINPE Móvil</h3>{detail.proofs.length ? <div>{detail.proofs.map(proof => <ProofImage key={proof.id} id={proof.id} token={token}/>)}</div> : <p>Aún no se adjuntó un comprobante.</p>}</div>
    {detail.status === 'PENDING_REVIEW' && <div className="review-actions">{confirmingPayment ? <div className="review-confirmation" role="group" aria-label="Confirmar pago"><strong>¿Confirmás el pago de {money(detail.totalCrc)}?</strong><p>Comprobá primero que el dinero ingresó a tu cuenta. Al confirmar, estos {detail.selectedValues.length} boletos pasarán a vendidos.</p><div><button type="button" className="review-reject" disabled={busy} onClick={() => setConfirmingPayment(false)}>Cancelar</button><button type="button" className="review-approve" disabled={busy} onClick={() => void review('confirm')}>{busy ? 'Confirmando...' : 'Sí, verifiqué el pago'}</button></div></div> : <button type="button" className="review-approve" disabled={busy || detail.proofs.length === 0} onClick={() => setConfirmingPayment(true)}>Verifiqué el pago · confirmar boletos</button>}<label>Motivo si rechazás el pago<textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={500} placeholder="Ej. Comprobante no corresponde al monto recibido" /></label><button type="button" className="review-reject" disabled={busy || reason.trim().length < 3} onClick={() => void review('reject')}>Rechazar comprobante</button></div>}
  </> : !error && <p>Cargando reserva...</p>}</section></div>;
}
