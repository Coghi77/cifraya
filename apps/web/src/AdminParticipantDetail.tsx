import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

type Reservation = {
  id: string; buyerName: string; selectedValues: number[]; status: string; createdAt: string; totalCrc: number;
  campaign: { title: string; numberWidth: number };
};
type ParticipantResponse = {
  participant: { name: string; email: string; phone: string };
  source: Reservation;
  page: number; pageCount: number; total: number; reservations: Reservation[];
};
const money = (amount: number) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(amount);
const numberLabel = (value: number, width: number) => String(value).padStart(width, '0');
const statusLabel = (status: string) => status === 'CONFIRMED' ? 'Vendido' : status === 'PENDING_REVIEW' ? 'En revisión' : status === 'ACTIVE' ? 'Apartado' : status === 'EXPIRED' ? 'Vencido' : 'Cancelado';

export default function AdminParticipantDetail({ reservationId, token, onClose, onReview, onChooseWinner }: { reservationId: string; token: string; onClose: () => void; onReview: (id: string) => void; onChooseWinner?: () => void }) {
  const [data, setData] = useState<ParticipantResponse | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      void fetch(`/api/admin/participants/by-reservation/${reservationId}?page=${page}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || 'No se pudo cargar el participante.'); return result as ParticipantResponse; })
        .then(result => { if (active) { setData(result); setError(''); } })
        .catch(cause => { if (active) setError((cause as Error).message); });
    };
    refresh();
    window.addEventListener('cifraya:update', refresh);
    return () => { active = false; window.removeEventListener('cifraya:update', refresh); };
  }, [reservationId, token, page]);

  return <div className="participant-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="participant-panel" role="dialog" aria-modal="true" aria-label="Ficha del participante"><button className="participant-close" type="button" onClick={onClose} aria-label="Cerrar"><X size={19}/></button><span className="eyebrow">FICHA DEL PARTICIPANTE</span>{error && <p className="admin-detail-error" role="alert">{error}</p>}{data ? <>
    <div className="participant-heading"><div className="participant-avatar">{data.participant.name.trim().charAt(0).toUpperCase()}</div><div><h2>{data.participant.name}</h2><span>{data.total} {data.total === 1 ? 'participación' : 'participaciones'} registradas</span></div></div>
    <div className="participant-contact"><div><small>CORREO</small><a href={`mailto:${data.participant.email}`}>{data.participant.email}</a></div><div><small>TELÉFONO</small><a href={`tel:${data.participant.phone}`}>{data.participant.phone}</a></div></div>
    <div className="participant-section"><div className="participant-section-heading"><h3>Esta reserva</h3><span>{statusLabel(data.source.status)}</span></div><p>{data.source.campaign.title} · {money(data.source.totalCrc)} · {new Date(data.source.createdAt).toLocaleString('es-CR')}</p><div className="participant-numbers">{data.source.selectedValues.map(value => <span key={value}>{numberLabel(value, data.source.campaign.numberWidth)}</span>)}</div>{['ACTIVE', 'PENDING_REVIEW'].includes(data.source.status) && <button className="participant-review" type="button" onClick={() => onReview(data.source.id)}>Revisar reserva y pago</button>}{onChooseWinner && <button className="participant-review" type="button" onClick={onChooseWinner}>Elegir este boleto como ganador</button>}</div>
    <div className="participant-section"><div className="participant-section-heading"><h3>Rifas en las que participó</h3></div><div className="participant-history">{data.reservations.map(reservation => <article key={reservation.id} className="participant-history-card"><div><strong>{reservation.campaign.title}</strong><span>{statusLabel(reservation.status)} · {new Date(reservation.createdAt).toLocaleDateString('es-CR')}</span></div><div className="participant-numbers">{reservation.selectedValues.map(value => <span key={value}>{numberLabel(value, reservation.campaign.numberWidth)}</span>)}</div><small>{money(reservation.totalCrc)}</small></article>)}</div>{data.pageCount > 1 && <div className="admin-detail-pages"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><span>{page} / {data.pageCount}</span><button type="button" disabled={page >= data.pageCount} onClick={() => setPage(page + 1)}>Siguiente</button></div>}</div>
  </> : !error && <p>Cargando ficha...</p>}</section></div>;
}
