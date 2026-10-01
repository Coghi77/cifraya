import { useCallback, useEffect, useRef, useState } from 'react';
import AdminParticipantDetail from './AdminParticipantDetail';

type NumberRow = {
  value: number;
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD';
  reservation: null | { id: string; buyerName: string };
};
type Overview = {
  campaign: { title: string; numberWidth: number; numberCount: number; prizeCount: number; prize: string; secondPrize: string | null; thirdPrize: string | null; winners: { position: number; numberValue: number }[] };
  counts: Record<string, number>;
  page: number;
  pageCount: number;
  numbers: NumberRow[];
};
type History = {
  page: number;
  pageCount: number;
  reservations: { id: string; buyerName: string; selectedValues: number[]; status: string; createdAt: string; expiresAt: string; confirmedAt: string | null; totalCrc: number }[];
};

async function adminRequest<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la acción.');
  return result as T;
}

const numberLabel = (value: number, width: number) => String(value).padStart(width, '0');
const currency = (value: number) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(value);
const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'AVAILABLE', label: 'Disponibles' },
  { value: 'RESERVED', label: 'Apartados' },
  { value: 'SOLD', label: 'Vendidos' },
];

export default function AdminRaffleDetail({ id, token, onBack, onChange, onReview }: { id: string; token: string; onBack: () => void; onChange: () => void; onReview: (id: string) => void }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [status, setStatus] = useState('');
  const [number, setNumber] = useState('');
  const [selectedWinner, setSelectedWinner] = useState<NumberRow | null>(null);
  const [winnerError, setWinnerError] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const winnerCancelRef = useRef<HTMLButtonElement>(null);
  const [selectedTicket, setSelectedTicket] = useState<NumberRow | null>(null);
  const [participantReservationId, setParticipantReservationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    const query = new URLSearchParams({ page: String(page) });
    if (status) query.set('status', status);
    if (number.trim()) query.set('number', number.trim());
    try {
      const [inventory, audit] = await Promise.all([
        adminRequest<Overview>(`/api/admin/campaigns/${id}/overview?${query}`, token),
        adminRequest<History>(`/api/admin/campaigns/${id}/history?page=${historyPage}`, token),
      ]);
      setOverview(inventory); setHistory(audit); setError('');
    } catch (cause) { setError((cause as Error).message); }
  }, [id, token, page, historyPage, status, number]);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void reload(); };
    const interval = window.setInterval(refresh, 20_000);
    window.addEventListener('cifraya:update', refresh);
    return () => { window.clearInterval(interval); window.removeEventListener('cifraya:update', refresh); };
  }, [reload]);
  useEffect(() => {
    if (!statusOpen) return;
    const closeOutside = (event: PointerEvent) => { if (!statusRef.current?.contains(event.target as Node)) setStatusOpen(false); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setStatusOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeEscape); };
  }, [statusOpen]);
  useEffect(() => {
    if (!selectedWinner) return;
    winnerCancelRef.current?.focus();
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) setSelectedWinner(null); };
    document.addEventListener('keydown', closeEscape);
    return () => document.removeEventListener('keydown', closeEscape);
  }, [selectedWinner, busy]);

  async function publishWinner() {
    if (!selectedWinner) return;
    setBusy(true);
    try {
      await adminRequest(`/api/admin/campaigns/${id}/winner`, token, { method: 'POST', body: JSON.stringify({ numberValue: selectedWinner.value, position: (overview?.campaign.winners.length || 0) + 1 }) });
      setSelectedWinner(null); await reload(); onChange();
    } catch (cause) { setWinnerError((cause as Error).message); }
    finally { setBusy(false); }
  }

  return <section className="admin-raffle-detail">
    <button className="admin-back" type="button" onClick={onBack}>← Todas las rifas</button>
    <div className="admin-detail-heading"><div><span className="eyebrow">INVENTARIO Y RESULTADO</span><h2>{overview?.campaign.title || 'Cargando rifa...'}</h2></div><button type="button" onClick={() => void reload()} disabled={busy}>Actualizar</button></div>
    {error && <p className="admin-detail-error" role="alert">{error}</p>}
    {overview && <>
      <div className="admin-detail-stats"><div><strong>{overview.counts.AVAILABLE || 0}</strong><span>Disponibles</span></div><div><strong>{overview.counts.RESERVED || 0}</strong><span>Apartados</span></div><div><strong>{overview.counts.SOLD || 0}</strong><span>Vendidos</span></div></div>
      <div className="admin-winner-banner">{Array.from({ length: overview.campaign.prizeCount }, (_, index) => { const winner = overview.campaign.winners.find(item => item.position === index + 1); const prize = [overview.campaign.prize, overview.campaign.secondPrize, overview.campaign.thirdPrize][index]; return <span key={index}><strong>{index + 1}.º premio · {prize}</strong><span>{winner ? `Ganador ${numberLabel(winner.numberValue, overview.campaign.numberWidth)}` : 'Pendiente'}</span></span>; })}</div>
      <div className="admin-detail-controls"><label>Buscar número<input inputMode="numeric" value={number} onChange={event => { setPage(1); setNumber(event.target.value.replace(/\D/g, '').slice(0, 5)); }} placeholder={'Ej. ' + '0'.repeat(overview.campaign.numberWidth - 1) + '1'} /></label><div className="admin-status-filter" ref={statusRef}><span>Estado</span><button type="button" className="admin-status-trigger" aria-label={`Estado: ${statusOptions.find(option => option.value === status)?.label}`} aria-expanded={statusOpen} aria-controls="ticket-status-options" onClick={() => setStatusOpen(open => !open)}>{statusOptions.find(option => option.value === status)?.label}<span aria-hidden="true">⌄</span></button>{statusOpen && <div id="ticket-status-options" className="admin-status-options" role="group" aria-label="Filtrar por estado">{statusOptions.map(option => <button key={option.value} type="button" aria-pressed={status === option.value} onClick={() => { setPage(1); setStatus(option.value); setStatusOpen(false); }}>{option.label}{status === option.value && <span aria-hidden="true">✓</span>}</button>)}</div>}</div></div>
      <p className="admin-detail-help">Abrí un boleto para ver sus números y el historial del participante.</p>
      <div className="admin-ticket-grid">{overview.numbers.map(item => <button className={'admin-ticket-card ' + item.status.toLowerCase()} type="button" key={item.value} onClick={() => { setSelectedTicket(item); if (item.reservation) setParticipantReservationId(item.reservation.id); }} aria-label={`Boleto ${numberLabel(item.value, overview.campaign.numberWidth)}, ${item.status === 'SOLD' ? 'vendido' : item.status === 'RESERVED' ? 'apartado' : 'disponible'}${item.reservation ? ', ' + item.reservation.buyerName : ''}`}><span className="admin-ticket-top"><span>CIFRAYA / BOLETO</span><span>{item.status === 'SOLD' ? 'VENDIDO' : item.status === 'RESERVED' ? 'APARTADO' : 'DISPONIBLE'}</span></span><strong className="admin-ticket-number">{numberLabel(item.value, overview.campaign.numberWidth)}</strong><span className="admin-ticket-divider"/><span className="admin-ticket-bottom"><span>{item.reservation?.buyerName || 'Sin asignar'}</span><span>VER →</span></span></button>)}{overview.numbers.length === 0 && <p>No hay números con este filtro.</p>}</div>
      {overview.pageCount > 1 && <div className="admin-detail-pages"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><span>{page} / {overview.pageCount}</span><button disabled={page >= overview.pageCount} onClick={() => setPage(page + 1)}>Siguiente</button></div>}
    </>}
    <div className="admin-history"><h3>Personas y participaciones</h3><p>Abrí una tarjeta para ver todas las rifas y números de esa persona.</p><div className="admin-history-grid">{history?.reservations.map(item => <article className="admin-history-card" key={item.id}><button type="button" onClick={() => setParticipantReservationId(item.id)}><span className="admin-history-card-top"><strong>{item.buyerName}</strong><span>{item.status === 'CONFIRMED' ? 'Vendido' : item.status === 'PENDING_REVIEW' ? 'En revisión' : item.status === 'ACTIVE' ? 'Apartado' : item.status === 'EXPIRED' ? 'Vencido' : 'Cancelado'}</span></span><span className="admin-history-card-count">{item.selectedValues.length} <small>{item.selectedValues.length === 1 ? 'boleto' : 'boletos'}</small></span><span className="admin-history-card-bottom"><span>{new Date(item.createdAt).toLocaleDateString('es-CR')} · {currency(item.totalCrc)}</span><span>ABRIR →</span></span></button>{['ACTIVE', 'PENDING_REVIEW'].includes(item.status) && <button className="admin-history-review" type="button" disabled={busy} onClick={() => onReview(item.id)}>Revisar pago</button>}</article>)}{history?.reservations.length === 0 && <p>No hay movimientos todavía.</p>}</div>{history && history.pageCount > 1 && <div className="admin-detail-pages"><button disabled={historyPage <= 1} onClick={() => setHistoryPage(historyPage - 1)}>Anterior</button><span>{historyPage} / {history.pageCount}</span><button disabled={historyPage >= history.pageCount} onClick={() => setHistoryPage(historyPage + 1)}>Siguiente</button></div>}</div>
    {selectedTicket && !participantReservationId && overview && <div className="participant-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedTicket(null); }}><section className="participant-panel participant-available" role="dialog" aria-modal="true" aria-label="Detalle del boleto"><button className="participant-close" type="button" onClick={() => setSelectedTicket(null)} aria-label="Cerrar">×</button><span className="eyebrow">CIFRAYA / BOLETO</span><strong>{numberLabel(selectedTicket.value, overview.campaign.numberWidth)}</strong><p>Este número está disponible. Aún no tiene una persona asignada.</p></section></div>}
    {participantReservationId && <AdminParticipantDetail reservationId={participantReservationId} token={token} onClose={() => { setParticipantReservationId(null); setSelectedTicket(null); }} onReview={reservationId => { setParticipantReservationId(null); setSelectedTicket(null); onReview(reservationId); }} onChooseWinner={selectedTicket?.status === 'SOLD' && overview && overview.campaign.winners.length < overview.campaign.prizeCount && !overview.campaign.winners.some(item => item.numberValue === selectedTicket.value) ? () => { setWinnerError(''); setSelectedWinner(selectedTicket); setParticipantReservationId(null); setSelectedTicket(null); } : undefined} />}
    {selectedWinner && overview && <div className="winner-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setSelectedWinner(null); }}><section className="winner-modal" role="dialog" aria-modal="true" aria-labelledby="winner-modal-title"><span className="eyebrow">PUBLICAR RESULTADO</span><h2 id="winner-modal-title">¿Publicar el {overview.campaign.winners.length + 1}.º premio?</h2><div className="winner-modal-ticket"><span>{[overview.campaign.prize, overview.campaign.secondPrize, overview.campaign.thirdPrize][overview.campaign.winners.length]}</span><strong>{numberLabel(selectedWinner.value, overview.campaign.numberWidth)}</strong><span>{selectedWinner.reservation?.buyerName}</span></div><p>El resultado aparecerá en el podio público.{overview.campaign.winners.length + 1 === overview.campaign.prizeCount ? ' Esta publicación cerrará la rifa.' : ' Podrás publicar el siguiente premio después.'}</p>{winnerError && <p className="admin-detail-error" role="alert">{winnerError}</p>}<div className="winner-modal-actions"><button ref={winnerCancelRef} type="button" disabled={busy} onClick={() => setSelectedWinner(null)}>Cancelar</button><button type="button" disabled={busy} onClick={() => void publishWinner()}>{busy ? 'Publicando...' : 'Publicar ganador'}</button></div></section></div>}
  </section>;
}
