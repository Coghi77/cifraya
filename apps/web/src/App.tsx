import OrderDetail from './OrderDetail';
import { startRealtime } from './realtime';
import PrizeEditor from './PrizeEditor';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Check, ChevronLeft, Clock3, Copy, LockKeyhole, Plus, Search, ShieldCheck, Sparkles, Ticket, Trophy, X } from 'lucide-react';
import AdminRaffleDetail from './AdminRaffleDetail';
import AdminReservationReview from './AdminReservationReview';
import EditRaffle from './EditRaffle';
import FooterSocials from './FooterSocials';
import WinnersPodium, { type WinnerResult } from './WinnersPodium';

type Raffle = {
  id: string;
  slug: string;
  title: string;
  description: string;
  prize: string;
  prizeCount: number;
  prizes: string[]; prizeSources: number[];
  secondPrize: string | null;
  thirdPrize: string | null;
  imageUrl: string | null;
  photos: { id: string; url: string }[];
  priceCrc: number;
  numberCount: number;
  numberWidth: number;
  invertedEnabled: boolean;
  invertedPrizeEnabled: boolean;
  soldCount: number;
  packages: { quantity: number; priceCrc: number }[];
  status: 'DRAFT' | 'LIVE' | 'CLOSED';
  winners?: { position: number; numberValue: number }[];
  drawDate: string | null;
};
type Reservation = { token: string; expiresAt: string; values: number[]; baseValues?: number[]; includesInverted?: boolean; totalCrc: number; status?: 'ACTIVE' | 'PENDING_REVIEW' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED'; proofCount?: number; reviewNote?: string | null };
type LookupResult = {
  buyerName: string;
  status: 'ACTIVE' | 'PENDING_REVIEW' | 'EXPIRED' | 'CANCELLED' | 'CONFIRMED';
  totalCrc: number;
  proofCount: number;
  reviewNote: string | null;
  expiresAt: string;
  values: number[];
  campaign: { title: string; numberWidth: number; priceCrc: number };
  baseValues: number[];
  includesInverted: boolean;
};
type AdminReservation = {
  id: string;
  buyerName: string;
  status: 'ACTIVE' | 'PENDING_REVIEW' | 'EXPIRED' | 'CANCELLED';
  proofCount: number;
  totalCrc: number;
  createdAt: string;
  expiresAt: string;
  ticketCount: number;
  values: number[];
  campaign: { title: string; numberWidth: number };
};
type NumberProposal = { values: number[]; changesRemaining: number; invertedValues: number[] | null };
type View = 'order' | 'home' | 'raffle' | 'lookup' | 'winners' | 'admin';

const ADMIN_PATH = '/estudio-cifraya';
function viewFromPath(path: string): View {
  if (path === ADMIN_PATH || path.startsWith(ADMIN_PATH + '/rifa/')) return 'admin';
  if (path === '/pedido') return 'order';
  if (path === '/buscar-boletos') return 'lookup';
  if (path === '/ganadores') return 'winners';
  if (path.startsWith('/rifa/')) return 'raffle';
  return 'home';
}
const money = (amount: number) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(amount);
const formatNumber = (value: number, width: number) => String(value).padStart(width, '0');
const coverOf = (item: Raffle) => item.photos?.[0]?.url || item.imageUrl;
const offersFor = (raffle: Raffle) => raffle.packages.length ? raffle.packages : [{ quantity: 1, priceCrc: raffle.priceCrc }];
const selectedOffer = (raffle: Raffle, quantity: number) => offersFor(raffle).find(offer => offer.quantity === quantity);
const progressOf = (raffle: Raffle) => Math.min(100, Math.floor(100 * (raffle.soldCount || 0) / raffle.numberCount));
function SelectionSpinner() { return <span className="selection-spinner" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <span key={index}/>)}</span>; }
function RaffleProgress({ raffle, compact = false }: { raffle: Raffle; compact?: boolean }) {
  const percent = progressOf(raffle);
  return <div className={compact ? 'raffle-progress compact' : 'raffle-progress'}><div><span>PROGRESO DE LA RIFA</span><strong>{percent}% vendido</strong></div><div className="raffle-progress-track" role="progressbar" aria-label="Números vendidos" aria-valuemin={0} aria-valuemax={raffle.numberCount} aria-valuenow={raffle.soldCount || 0}><span style={{ width: `${percent}%` }}/></div><small>{(raffle.soldCount || 0).toLocaleString('es-CR')} de {raffle.numberCount.toLocaleString('es-CR')} números confirmados</small></div>;
}
function InvertedChoice({ raffle, values, inverted, selected, disabled, onToggle }: { raffle: Raffle; values: number[]; inverted: number[] | null; selected: boolean; disabled: boolean; onToggle: (value: boolean) => void }) {
  if (!raffle.invertedEnabled) return null;
  return <div className="inverted-choice"><div><strong>Sumá los invertidos</strong><span>{inverted ? `${values.length} números más por el mismo precio del paquete` : 'Los invertidos de esta selección no están todos disponibles.'}</span></div>{inverted && <><div className="random-values">{inverted.map(value => <span key={value}>{formatNumber(value, raffle.numberWidth)}</span>)}</div><button type="button" className="inverted-toggle" aria-pressed={selected} disabled={disabled} onClick={() => onToggle(!selected)}>{selected ? 'Quitar invertidos' : `Agregar invertidos · +${money(selectedOffer(raffle, values.length)?.priceCrc || 0)}`}</button><small>Cada número agregado es un boleto. Los premios para el inverso se indican en esta rifa.</small></>}</div>;
}

async function preparePhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15_000_000) {
    throw new Error('Elegí fotos JPG, PNG o WebP de hasta 15 MB.');
  }
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar la foto.');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.82, 0.68, 0.5]) {
    const base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
    if (base64.length <= 2_666_668) return { mimeType: 'image/jpeg', base64 };
  }
  throw new Error('Esta foto es demasiado grande incluso después de comprimirla.');
}

class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, { ...options, headers });
  const payload = await response.json();
  if (!response.ok) throw new ApiError(payload.error || 'Ocurrió un error', response.status);
  return payload as T;
}

function useCountdown(expiresAt: string | undefined) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => setRemaining(Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt]);
  return String(Math.floor(remaining / 60)).padStart(2, '0') + ':' + String(remaining % 60).padStart(2, '0');
}

function TicketPass({ name, title, values, baseValues, includesInverted, width, count, status, timer }: {
  name: string; title: string; values: number[]; baseValues?: number[]; includesInverted?: boolean; width: number; count: number; status: string; timer?: string;
}) {
  return <article className="ticket-pass" aria-label={'Boleto de ' + name}>
    <div className="ticket-main">
      <div className="ticket-meta"><span>CIFRAYA / BOLETO DIGITAL</span><span className="ticket-status">{status}</span></div>
      <div className="ticket-star"><Sparkles size={30} strokeWidth={1.5} /></div>
      <div className="ticket-person"><small>A NOMBRE DE</small><strong>{name}</strong></div>
      <div className="ticket-quantity"><span>{count}</span><div>BOLETO{count === 1 ? '' : 'S'}<small>{title}</small></div></div>
    </div>
    <div className="ticket-stub">
      <span>{includesInverted ? 'NÚMEROS ORIGINALES' : 'NÚMEROS'}</span>
      <div className="ticket-values">{(includesInverted ? baseValues || [] : values).map(value => <strong key={value}>{formatNumber(value, width)}</strong>)}</div>
      {includesInverted && <><span>INVERTIDOS</span><div className="ticket-values">{values.filter(value => !(baseValues || []).includes(value)).map(value => <strong key={value}>{formatNumber(value, width)}</strong>)}</div></>}
      {timer && <div className="ticket-timer"><Clock3 size={16} /> Reserva: {timer}</div>}
    </div>
  </article>;
}

function AdminPhoto({ id, token }: { id: string; token: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    void fetch(`/api/admin/campaign-photos/${id}`, { headers: { Authorization: 'Bearer ' + token } })
      .then(response => { if (!response.ok) throw new Error('Foto no disponible'); return response.blob(); })
      .then(blob => { objectUrl = URL.createObjectURL(blob); if (active) setUrl(objectUrl); else URL.revokeObjectURL(objectUrl); })
      .catch(() => {});
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, token]);
  return url ? <img src={url} alt="Foto de la rifa"/> : <span className="admin-photo-loading">Foto</span>;
}

function PhotoPicker({ title, hint, onFiles, disabled = false, compact = false }: {
  title: string; hint?: string; onFiles: (files: File[]) => void; disabled?: boolean; compact?: boolean;
}) {
  return <label className={'photo-picker' + (compact ? ' compact' : '') + (disabled ? ' disabled' : '')}>
    <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled} onChange={event => {
      const files = Array.from(event.target.files || []);
      if (files.length) onFiles(files);
      event.target.value = '';
    }} />
    <span className="photo-picker-title"><Plus size={17}/>{title}</span>
    {hint && <span className="photo-picker-hint">{hint}</span>}
  </label>;
}

function PendingPhoto({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return <div className="pending-photo">
    {url && <img src={url} alt={file.name} />}
    <button type="button" onClick={onRemove} aria-label={`Quitar ${file.name}`}><X size={15}/></button>
  </div>;
}

function ProofUploader({ token, proofCount, onUploaded }: { token: string; proofCount: number; onUploaded: () => Promise<void> | void }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  async function upload(files: File[]) {
    if (!files.length) return;
    if (proofCount + files.length > 3) { setMessage('Podés adjuntar hasta tres comprobantes.'); return; }
    setUploading(true); setMessage('');
    try {
      for (const file of files) {
        const image = await preparePhoto(file);
        await api(`/api/reservations/${token}/proofs`, { method: 'POST', body: JSON.stringify(image) });
        await onUploaded();
      }
      setMessage('Comprobante recibido. Tu pago está pendiente de revisión.');
    } catch (cause) { setMessage((cause as Error).message); }
    finally { setUploading(false); }
  }
  return <div className="proof-uploader"><strong>Adjuntá tu comprobante SINPE Móvil</strong><p>Podés subir hasta tres fotos JPG, PNG o WebP. El primer comprobante debe llegar antes de que venza la reserva.</p><label className="proof-upload-button">{uploading ? 'Subiendo...' : proofCount ? `Agregar otro comprobante (${proofCount}/3)` : 'Seleccionar comprobante'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading || proofCount >= 3} onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void upload(files); }}/></label>{message && <span role="status">{message}</span>}</div>;
}

export default function App() {
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [availableInverted, setAvailableInverted] = useState<number[] | null>(null);
  const [includeInverted, setIncludeInverted] = useState(false);
  const [randomQuantity, setRandomQuantity] = useState('');
  const [proposalReady, setProposalReady] = useState(false);
  const [selectionLoading, setSelectionLoading] = useState<'generating' | 'changing' | null>(null);
  const [homePackageLoading, setHomePackageLoading] = useState<number | null>(null);
  const [changesRemaining, setChangesRemaining] = useState(5);
  const [buyer, setBuyer] = useState({ buyerName: '', buyerEmail: '', buyerPhone: '' });
  const [checkoutProofs, setCheckoutProofs] = useState<File[]>([]);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminRaffles, setAdminRaffles] = useState<Raffle[]>([]);
  const [editingRaffleId, setEditingRaffleId] = useState<string | null>(null);
  const [adminReservations, setAdminReservations] = useState<AdminReservation[]>([]);
  const [reviewReservationId, setReviewReservationId] = useState<string | null>(null);
  const [adminDetailId, setAdminDetailId] = useState<string | null>(() => window.location.pathname.startsWith(ADMIN_PATH + '/rifa/') ? window.location.pathname.slice((ADMIN_PATH + '/rifa/').length) : null);
  const [winners, setWinners] = useState<WinnerResult[]>([]);
  const [draft, setDraft] = useState({ title: '', slug: '', prizes: [''], prizeSources: [0], description: '', priceCrc: '', numberCount: '', invertedEnabled: false, invertedPrizeEnabled: false });
  const [draftPackages, setDraftPackages] = useState<{ quantity: string; priceCrc: string }[]>([]);
  const [draftPhotos, setDraftPhotos] = useState<File[]>([]);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishFeedback, setPublishFeedback] = useState<{ id: string; text: string; error: boolean } | null>(null);
  const countdown = useCountdown(!reservation?.status || reservation.status === 'ACTIVE' ? reservation?.expiresAt : undefined);
  const lookupCountdown = useCountdown(lookupResult?.status === 'ACTIVE' ? lookupResult.expiresAt : undefined);

  async function loadRaffles() {
    try { setRaffles(await api<Raffle[]>('/api/campaigns')); }
    catch { setError('No se pudo cargar la rifa. Intentá de nuevo en un minuto.'); }
  }

  async function loadWinners() {
    try { setWinners(await api<WinnerResult[]>('/api/winners')); }
    catch { setError('No se pudieron cargar los resultados.'); }
  }

  async function openRaffle(slug: string, navigate = true, packageQuantity?: number) {
    setBusy(true); setError(''); setSelected([]); setAvailableInverted(null); setIncludeInverted(false); setRandomQuantity(''); setProposalReady(false); setChangesRemaining(5); setReservation(null); setCheckoutProofs([]); setCodeCopied(false); setShowCheckout(false); setActivePhotoId(null);
    if (packageQuantity) setHomePackageLoading(packageQuantity);
    try {
      const result = await api<Raffle>('/api/campaigns/' + encodeURIComponent(slug));
      setRaffle(result); setView('raffle');
      if (navigate) window.history.pushState({}, '', '/rifa/' + encodeURIComponent(slug));
      window.scrollTo(0, 0);
      if (packageQuantity) await generateNumbers(packageQuantity, result);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); setHomePackageLoading(null); }
  }

  function goPublic(next: 'home' | 'lookup' | 'winners') {
    const path = next === 'home' ? '/' : next === 'lookup' ? '/buscar-boletos' : '/ganadores';
    window.history.pushState({}, '', path);
    setView(next); setError(''); setShowCheckout(false); setAdminToken(''); setAdminPin(''); setAdminUnlocked(false); setAdminDetailId(null);
    if (next === 'home') void loadRaffles();
    if (next === 'winners') void loadWinners();
    window.scrollTo(0, 0);
  }

  function goHome() { goPublic('home'); }

  useEffect(() => {
    void loadRaffles();
    const pathname = window.location.pathname;
    if (pathname === '/ganadores') void loadWinners();
    if (pathname.startsWith('/rifa/')) void openRaffle(decodeURIComponent(pathname.slice(6)), false);
    function onPopState() {
      const path = window.location.pathname;
      if (path.startsWith('/rifa/')) void openRaffle(decodeURIComponent(path.slice(6)), false);
      else { setView(viewFromPath(path)); setAdminDetailId(path.startsWith(ADMIN_PATH + '/rifa/') ? path.slice((ADMIN_PATH + '/rifa/').length) : null); if (path === '/ganadores') void loadWinners(); }
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(startRealtime, []);

  useEffect(() => {
    let refreshing = false;
    let queued = false;
    let stopped = false;
    async function refresh() {
      if (stopped) return;
      if (refreshing) { queued = true; return; }
      if (document.visibilityState !== 'visible') return;
      refreshing = true;
      try {
      if (view === 'home') await loadRaffles();
      if (view === 'winners') await loadWinners();
      if (view === 'admin' && !adminDetailId && adminUnlocked && adminToken) await loadAdmin(adminToken, true);
      if (view === 'raffle' && raffle) {
        try {
          const updated = await api<Raffle>(`/api/campaigns/${encodeURIComponent(raffle.slug)}`);
          setRaffle(current => current?.id === updated.id ? { ...current, soldCount: updated.soldCount } : current);
        } catch { /* Keep the last known count while offline. */ }
      }
      if (view === 'raffle' && raffle && proposalReady && !selectionLoading && !reservation && !showCheckout && Number(randomQuantity) === selected.length) {
        try {
          const proposal = await api<NumberProposal>(`/api/campaigns/${encodeURIComponent(raffle.slug)}/proposal`, { method: 'POST', body: JSON.stringify({ quantity: selected.length }) });
          setSelected(current => current.every((value, index) => value === proposal.values[index]) ? current : proposal.values);
          setAvailableInverted(proposal.invertedValues);
          if (!proposal.invertedValues) setIncludeInverted(false);
          setChangesRemaining(proposal.changesRemaining);
        } catch { /* A reservation attempt will report a stale proposal explicitly. */ }
      }
      if (view === 'lookup' && lookupResult && lookupCode.trim().length === 48) {
        try { await refreshReservation(lookupCode.trim()); } catch { /* Keep the last known result while offline. */ }
      }
      if (view === 'raffle' && reservation?.token) {
        try { await refreshReservation(reservation.token); } catch { /* Keep the last known pass while offline. */ }
      }
      } finally { refreshing = false; if (queued) { queued = false; void refresh(); } }
    }
    window.addEventListener('cifraya:update', refresh);
    return () => { stopped = true; window.removeEventListener('cifraya:update', refresh); };
  }, [view, adminDetailId, adminUnlocked, adminToken, raffle?.slug, reservation?.token, lookupCode, lookupResult?.status, proposalReady, selectionLoading, randomQuantity, selected.length, showCheckout]);

  async function generateNumbers(quantity: number, campaign = raffle) {
    if (!campaign) return;
    setBusy(true); setError(''); setSelectionLoading('generating'); setRandomQuantity(String(quantity)); setSelected([]); setAvailableInverted(null); setIncludeInverted(false); setProposalReady(false);
    try {
      const proposal = await api<NumberProposal>(`/api/campaigns/${encodeURIComponent(campaign.slug)}/proposal`, { method: 'POST', body: JSON.stringify({ quantity }) });
      setSelected(proposal.values); setAvailableInverted(proposal.invertedValues); setChangesRemaining(proposal.changesRemaining); setProposalReady(true);
    } catch (cause) { setRandomQuantity(''); setError((cause as Error).message); }
    finally { setBusy(false); setSelectionLoading(null); }
  }

  async function changeRandomNumbers() {
    if (!raffle) return;
    setBusy(true); setError(''); setSelectionLoading('changing');
    try {
      const proposal = await api<NumberProposal>(`/api/campaigns/${encodeURIComponent(raffle.slug)}/proposal/change`, { method: 'POST' });
      setSelected(proposal.values); setAvailableInverted(proposal.invertedValues); if (!proposal.invertedValues) setIncludeInverted(false); setChangesRemaining(proposal.changesRemaining);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); setSelectionLoading(null); }
  }

  async function refreshReservation(token: string) {
    const updated = await api<LookupResult>('/api/reservations/lookup', { method: 'POST', body: JSON.stringify({ token }) });
    setLookupResult(current => current && lookupCode.trim() === token ? updated : current);
    setReservation(current => current?.token === token ? { ...current, status: updated.status, proofCount: updated.proofCount, reviewNote: updated.reviewNote } : current);
  }

  async function reserve(event: FormEvent) {
    event.preventDefault();
    if (!raffle || selected.length === 0 || !proposalReady) return;
    setBusy(true); setError('');
    try {
      const result = await api<Reservation>('/api/reservations', {
        method: 'POST', body: JSON.stringify({ campaignId: raffle.id, values: selected, includeInverted, ...buyer }),
      });
      setReservation(result); setShowCheckout(false);
      setCodeCopied(false);
      const files = [...checkoutProofs];
      setCheckoutProofs([]);
      for (const file of files) {
        try {
          const image = await preparePhoto(file);
          await api(`/api/reservations/${result.token}/proofs`, { method: 'POST', body: JSON.stringify(image) });
          await refreshReservation(result.token);
        } catch (cause) { setError('Los números quedaron apartados, pero el comprobante no se cargó: ' + (cause as Error).message + ' Podés volver a adjuntarlo desde tu pase.'); break; }
      }
    } catch (cause) {
      const message = (cause as Error).message;
      if (/apartado|disponible|conflicto/i.test(message)) {
        setShowCheckout(false);
        setProposalReady(false);
        setError(message + ' Generá otra selección.');
      } else setError(message);
    }
    finally { setBusy(false); }
  }

  async function lookupTickets(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setLookupResult(null);
    try {
      const result = await api<LookupResult>('/api/reservations/lookup', {
        method: 'POST', body: JSON.stringify({ token: lookupCode.trim() }),
      });
      setLookupResult(result);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function loadAdmin(token = adminToken, silent = false) {
    if (!token) return;
    if (!silent) { setBusy(true); setError(''); }
    try {
      const headers = { Authorization: 'Bearer ' + token };
      const [list, holds] = await Promise.all([
        api<Raffle[]>('/api/admin/campaigns', { headers }),
        api<AdminReservation[]>('/api/admin/reservations', { headers }),
      ]);
      setAdminRaffles(list); setAdminReservations(holds); setAdminUnlocked(true);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) expireAdminSession();
      else if (!silent) setError((cause as Error).message);
    } finally { if (!silent) setBusy(false); }
  }

  function expireAdminSession() {
    setAdminUnlocked(false);
    setAdminRaffles([]);
    setAdminReservations([]);
    setAdminToken('');
    setReviewReservationId(null);
    setError('La sesión venció. Ingresá el PIN de nuevo; tu borrador sigue guardado en esta pestaña.');
  }

  async function unlockAdmin(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const session = await api<{ token: string }>('/api/admin/login', { method: 'POST', body: JSON.stringify({ pin: adminPin }) });
      setAdminToken(session.token);
      setAdminPin('');
      await loadAdmin(session.token);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function createRaffle(event: FormEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const priceCrc = Number(draft.priceCrc);
    const numberCount = Number(draft.numberCount);
    if (!Number.isInteger(priceCrc) || priceCrc < 1 || priceCrc > 100_000_000 ||
        ![100, 1000, 10000].includes(numberCount)) {
      setError('Ingresá un precio válido y elegí 100, 1 000 o 10 000 números.');
      return;
    }
    if (draft.prizes.length > numberCount || draft.prizes.some(prize => prize.trim().length < 3)) { setError('Completá cada premio y verificá que no haya más premios que números.'); return; }
    const packages = draftPackages.map(item => ({ quantity: Number(item.quantity), priceCrc: Number(item.priceCrc) }));
    if (packages.some(item => !Number.isInteger(item.quantity) || item.quantity < 2 || item.quantity > 20 || !Number.isInteger(item.priceCrc) || item.priceCrc < 1 || item.priceCrc > 100_000_000 || item.priceCrc >= item.quantity * priceCrc) || new Set(packages.map(item => item.quantity)).size !== packages.length) {
      setError('Revisá los paquetes: cada cantidad debe ser única, entre 2 y 20, y costar menos que comprar los números por separado.');
      return;
    }
    setBusy(true); setError('');
    let created = false;
    try {
      const campaign = await api<{ id: string }>('/api/admin/campaigns', { method: 'POST', headers: { Authorization: 'Bearer ' + adminToken }, body: JSON.stringify({ ...draft, priceCrc, numberCount, packages }) });
      created = true;
      const files = [...draftPhotos];
      setDraft({ title: '', slug: '', prizes: [''], prizeSources: [0], description: '', priceCrc: '', numberCount: '', invertedEnabled: false, invertedPrizeEnabled: false });
      setDraftPackages([]);
      setDraftPhotos([]);
      form.reset();
      for (const file of files) {
        const photo = await preparePhoto(file);
        await api(`/api/admin/campaigns/${campaign.id}/photos`, { method: 'POST', headers: { Authorization: 'Bearer ' + adminToken }, body: JSON.stringify(photo) });
      }
      await loadAdmin();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        expireAdminSession();
        if (created) setError('La rifa se creó, pero la sesión venció al cargar una foto. Ingresá el PIN de nuevo y agregala en Tus rifas.');
      } else {
        if (created) await loadAdmin();
        setError((created ? 'La rifa se creó, pero faltó cargar alguna foto. Podés agregarla en Tus rifas. ' : '') + (cause as Error).message);
      }
    }
    finally { setBusy(false); }
  }

  async function addPhotos(id: string, files: File[]) {
    if (!files.length) return;
    setBusy(true); setError('');
    try {
      for (const file of files) {
        const photo = await preparePhoto(file);
        await api(`/api/admin/campaigns/${id}/photos`, { method: 'POST', headers: { Authorization: 'Bearer ' + adminToken }, body: JSON.stringify(photo) });
      }
      await Promise.all([loadAdmin(), loadRaffles()]);
    } catch (cause) { if (cause instanceof ApiError && cause.status === 401) expireAdminSession(); else { await loadAdmin(); setError((cause as Error).message); } }
    finally { setBusy(false); }
  }

  async function removePhoto(id: string) {
    setBusy(true); setError('');
    try {
      await api(`/api/admin/campaign-photos/${id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + adminToken } });
      await Promise.all([loadAdmin(), loadRaffles()]);
    } catch (cause) { if (cause instanceof ApiError && cause.status === 401) expireAdminSession(); else setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function publish(id: string) {
    setPublishingId(id); setPublishFeedback(null); setError('');
    try {
      const updated = await api<Raffle>('/api/admin/campaigns/' + id + '/publish', { method: 'POST', headers: { Authorization: 'Bearer ' + adminToken } });
      setAdminRaffles(current => current.map(item => item.id === id ? { ...item, status: updated.status } : item));
      setPublishFeedback({ id, text: 'Rifa publicada. Ya está visible en Inicio.', error: false });
      void loadRaffles();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) expireAdminSession();
      else setPublishFeedback({ id, text: (cause as Error).message || 'No se pudo publicar la rifa.', error: true });
    } finally { setPublishingId(null); }
  }

  function openAdminRaffle(id: string) {
    setAdminDetailId(id);
    window.history.pushState({}, '', ADMIN_PATH + '/rifa/' + id);
    window.scrollTo(0, 0);
  }

  function closeAdminRaffle() {
    setAdminDetailId(null);
    window.history.pushState({}, '', ADMIN_PATH);
    window.scrollTo(0, 0);
  }

  const width = raffle?.numberWidth ?? 3;
  const activeHolds = adminReservations.filter(item => item.status === 'ACTIVE' || item.status === 'PENDING_REVIEW');
  const heldTickets = activeHolds.reduce((sum, item) => sum + item.ticketCount, 0);
  const featured = raffles[0];

  return <div className={'app-shell ' + (view === 'admin' ? 'admin-shell' : '')}>
    <header className="site-header">
      <button className="brand" onClick={goHome} aria-label="Cifraya, ir al inicio"><img src="/cifraya-logo.png" alt="Logo de Cifraya" className="brand-logo"/></button>
      <nav aria-label="Navegación principal">
        {view === 'admin' ? <button onClick={goHome}>Volver al sitio <ArrowRight size={15} /></button> : <>
          <button className={view === 'home' || view === 'raffle' ? 'nav-active' : ''} onClick={goHome}>Inicio</button>
          <button className={view === 'lookup' ? 'nav-active' : ''} onClick={() => goPublic('lookup')}>Buscar boletos</button>
          <button className={view === 'winners' ? 'nav-active' : ''} onClick={() => goPublic('winners')}>Ganadores</button>
        </>}
      </nav>
    </header>

    {error && <div className="alert" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Cerrar aviso"><X size={17} /></button></div>}

    {view === 'home' && <main>
      {featured ? <section className="current-raffle" aria-label="Rifa actual">
        <div className="current-raffle-image">{coverOf(featured) ? <img src={coverOf(featured)!} alt={featured.prize}/> : <img className="current-logo" src="/cifraya-logo.png" alt=""/>}</div>
        <div className="current-raffle-content"><span className="current-label">RIFA ACTUAL</span><h1>{featured.title}</h1><div className="current-prize">{featured.prize}</div><RaffleProgress raffle={featured} compact/><div className="home-packages"><span>Elegí tu paquete</span><div>{offersFor(featured).map(offer => <button key={offer.quantity} type="button" disabled={busy} onClick={() => void openRaffle(featured.slug, true, offer.quantity)}><span>{offer.quantity} {offer.quantity === 1 ? 'número' : 'números'}</span><strong>{money(offer.priceCrc)}</strong>{homePackageLoading === offer.quantity ? <SelectionSpinner/> : <ArrowRight size={18} aria-hidden="true"/>}</button>)}</div></div><button className="home-details-link" type="button" disabled={busy} onClick={() => void openRaffle(featured.slug)}>Ver detalles de la rifa <ArrowRight size={16}/></button></div>
      </section> : <section className="current-raffle current-empty"><img src="/cifraya-logo.png" alt=""/><div><span className="current-label">CIFRAYA</span><h1>Próxima rifa</h1><p>Estamos preparando la siguiente rifa.</p></div></section>}

      {raffles.length > 1 && <section className="section raffles-section" id="rifas">
        <div className="section-heading"><div><h2>Más rifas</h2></div></div>
        <div className="raffle-grid">{raffles.slice(1).map((item, index) => <article className="raffle-card" key={item.id}>
          <div className="raffle-cover">{coverOf(item) ? <img src={coverOf(item)!} alt={item.prize} /> : <div className="cover-placeholder"><span className="cover-index">0{index + 1}</span><Sparkles size={58} strokeWidth={1.2}/><span>ALGO BUENO VIENE</span></div>}<span className="cover-status">RIFA ABIERTA</span></div>
          <div className="raffle-body"><div className="raffle-overline">{item.numberCount.toLocaleString('es-CR')} BOLETOS EN ESTA RIFA</div><h3>{item.title}</h3><p>{item.description || 'Apartá tus números para esta rifa.'}</p><div className="raffle-facts"><div><small>PREMIO</small><strong>{item.prize}</strong></div><div><small>PAQUETES DESDE</small><strong>{money(Math.min(...offersFor(item).map(offer => offer.priceCrc)))}</strong></div></div><button className="button dark full" onClick={() => void openRaffle(item.slug)}>Entrar a la rifa <ArrowRight size={17} /></button></div>
        </article>)}</div>
      </section>}

      <section className="how-section"><div className="how-inner"><div className="eyebrow">ASÍ DE SIMPLE</div><h2>Un número.<br /><em>Una posibilidad.</em></h2><div className="how-grid"><div><span>01</span><h3>Entrá a una rifa</h3><p>Descubrí el premio y el valor de cada boleto.</p></div><div><span>02</span><h3>Elegí tus boletos</h3><p>Seleccioná un paquete y recibí sus números disponibles al azar.</p></div><div><span>03</span><h3>Revisá tu pase</h3><p>Tu pase muestra tu nombre, tus números y el estado de la reserva.</p></div></div></div></section>
    </main>}

    {view === 'order' && <OrderDetail renderProof={(token, count, refresh) => <ProofUploader token={token} proofCount={count} onUploaded={refresh}/>}/> }
    {view === 'lookup' && <main className="public-page">
      <div className="public-intro"><div className="eyebrow">CIFRAYA / TUS BOLETOS</div><h1>Encontrá tus <em>números.</em></h1><p>Ingresá el código que recibiste al apartar tus números para consultar tu pase y su estado.</p></div>
      <div className="lookup-layout"><section className="lookup-card"><div className="public-icon"><Search size={27}/></div><h2>Buscar boletos</h2><p>El código es privado. Lo podés copiar desde el pase que aparece al hacer la reserva.</p><form onSubmit={event => void lookupTickets(event)} className="form-grid"><label>Código de consulta<input value={lookupCode} onChange={event => setLookupCode(event.target.value)} placeholder="Pegá aquí tu código" autoComplete="off" spellCheck={false} required maxLength={48}/></label><button className="button dark full" disabled={busy || lookupCode.trim().length !== 48}>Consultar mi pase <ArrowRight size={17}/></button></form><span className="lookup-help"><LockKeyhole size={15}/> Solo quien tenga el código puede ver este pase.</span></section>
      <section className="lookup-result">{lookupResult ? <>
        <a className="button dark" href={`/pedido#${lookupCode.trim()}`}>Ver detalle del pedido <ArrowRight size={16}/></a>
        <TicketPass name={lookupResult.buyerName} title={lookupResult.campaign.title} values={lookupResult.values} baseValues={lookupResult.baseValues} includesInverted={lookupResult.includesInverted} width={lookupResult.campaign.numberWidth} count={lookupResult.values.length} status={lookupResult.status === 'CONFIRMED' ? 'COMPRA CONFIRMADA' : lookupResult.status === 'PENDING_REVIEW' ? 'PAGO EN REVISIÓN' : lookupResult.status === 'ACTIVE' ? 'APARTADO' : lookupResult.status === 'EXPIRED' ? 'RESERVA VENCIDA' : 'RESERVA CANCELADA'} timer={lookupResult.status === 'ACTIVE' ? lookupCountdown : undefined}/>
        <p>{lookupResult.status === 'CONFIRMED' ? `Compra confirmada por ${money(lookupResult.totalCrc)}.` : lookupResult.status === 'PENDING_REVIEW' ? 'Recibimos el comprobante. Tus números siguen apartados mientras revisamos el pago, hasta dos días.' : lookupResult.status === 'ACTIVE' ? 'Adjuntá tu comprobante antes de que venza la reserva.' : lookupResult.status === 'CANCELLED' ? `Reserva rechazada: ${lookupResult.reviewNote || 'consultá con administración.'}` : 'Esta reserva venció y sus números pueden volver a estar disponibles.'}</p>
        {['ACTIVE', 'PENDING_REVIEW'].includes(lookupResult.status) && <ProofUploader token={lookupCode.trim()} proofCount={lookupResult.proofCount || 0} onUploaded={() => refreshReservation(lookupCode.trim())}/>}
      </> : <div className="lookup-placeholder"><Ticket size={42} strokeWidth={1.3}/><span>EL PASE APARECERÁ AQUÍ</span><p>Nombre, cantidad de boletos, números y estado en un solo lugar.</p></div>}</section></div>
    </main>}

    {view === 'winners' && <main className="public-page winners-page"><div className="public-intro"><div className="eyebrow">CIFRAYA / RESULTADOS</div><h1>Ganadores.</h1><p>Los premios publicados de cada rifa.</p></div>{winners.length ? <WinnersPodium winners={winners}/> : <section className="winners-empty"><div className="winner-symbol"><Trophy size={68} strokeWidth={1.2}/></div><div><h2>Aún no hay ganadores publicados.</h2><p>Cuando se anuncie un premio, aparecerá aquí.</p><button className="button dark" onClick={goHome}>Ver rifas <ArrowRight size={17}/></button></div></section>}</main>}

    {view === 'raffle' && raffle && <main className="section detail-page">
      <button className="text-button" onClick={goHome}><ChevronLeft size={17}/> Todas las rifas</button>
      <div className="detail-heading"><span className="eyebrow">RIFA ABIERTA</span><h1>{raffle.title}</h1><p>Tus números, tu oportunidad.</p></div>
      <div className="detail-layout">
        <div><div className="detail-image">{activePhotoId || coverOf(raffle) ? <img src={raffle.photos.find(photo => photo.id === activePhotoId)?.url || coverOf(raffle)!} alt={raffle.prize} /> : <div className="cover-placeholder"><Sparkles size={84} strokeWidth={1}/><span>ALGO BUENO VIENE</span></div>}</div>{raffle.photos.length > 1 && <div className="photo-thumbnails" aria-label="Fotos del premio">{raffle.photos.map((photo, index) => <button key={photo.id} className={activePhotoId === photo.id || (!activePhotoId && index === 0) ? 'active' : ''} onClick={() => setActivePhotoId(photo.id)} aria-label={`Ver foto ${index + 1}`} aria-pressed={activePhotoId === photo.id || (!activePhotoId && index === 0)}><img src={photo.url} alt=""/></button>)}</div>}<div className="detail-description"><div className="eyebrow">EL PREMIO</div><h2>{raffle.prize}</h2>{raffle.prizeCount > 1 && <div className="detail-prize-list">{raffle.prizes.map((prize, index) => <span key={index}>{index + 1}.º · {prize}{raffle.prizeSources[index] > 0 ? ` · Inverso del ${raffle.prizeSources[index]}.º premio` : ' · Directo'}</span>)}</div>}<p>{raffle.description || 'Elegí tus boletos favoritos para esta rifa.'}</p><div className="info-strip"><ShieldCheck size={20}/><span>Cada número se aparta de forma exclusiva durante 30 minutos.</span></div></div></div>
        <div className="detail-side">
          <div className="detail-side-top"><span className="status-label">RIFA ABIERTA</span><span>Elegí un paquete</span></div><RaffleProgress raffle={raffle}/>
          <div className="selection-head"><div><h2>Elegí tu paquete</h2><p>Al seleccionarlo, te mostramos sus números disponibles al azar.</p></div></div>
          {!reservation && <div className="random-picker"><div className="package-offers"><strong>Paquetes disponibles</strong><div>{offersFor(raffle).map(offer => <button key={offer.quantity} type="button" className="package-option" aria-pressed={randomQuantity === String(offer.quantity)} disabled={busy} onClick={() => void generateNumbers(offer.quantity)}><strong>{offer.quantity} {offer.quantity === 1 ? 'número' : 'números'}</strong><span>{money(offer.priceCrc)}</span></button>)}</div></div>{(proposalReady || selectionLoading) && <div className="selection-result" aria-busy={Boolean(selectionLoading)}>{proposalReady && <><div className="random-selection-heading"><strong>Tus {selected.length} {selected.length === 1 ? 'número' : 'números'}</strong><span>{changesRemaining} de 5 cambios disponibles</span></div><div className="random-values">{selected.map(value => <span key={value}>{formatNumber(value, width)}</span>)}</div><InvertedChoice raffle={raffle} values={selected} inverted={availableInverted} selected={includeInverted} disabled={busy || Boolean(selectionLoading)} onToggle={setIncludeInverted}/><button className="button dark full" type="button" disabled={busy || changesRemaining === 0} onClick={() => void changeRandomNumbers()}>Cambiar todos los números</button><p>Cada cambio genera un conjunto nuevo, sin repetir los números que tenés ahora.</p></>}{selectionLoading && <div className="selection-loader" role="status" aria-live="polite"><SelectionSpinner/><span>{selectionLoading === 'changing' ? 'Buscando otros números disponibles…' : 'Generando tus números…'}</span></div>}</div>}</div>}
          {reservation ? <div className="reservation-result">
            <TicketPass name={buyer.buyerName} title={raffle.title} values={reservation.values} baseValues={reservation.baseValues} includesInverted={reservation.includesInverted} width={width} count={reservation.values.length} status={reservation.status === 'CONFIRMED' ? 'COMPRA CONFIRMADA' : reservation.status === 'PENDING_REVIEW' ? 'PAGO EN REVISIÓN' : reservation.status === 'EXPIRED' ? 'RESERVA VENCIDA' : reservation.status === 'CANCELLED' ? 'RESERVA RECHAZADA' : 'APARTADO'} timer={!reservation.status || reservation.status === 'ACTIVE' ? countdown : undefined} />
            <strong>Total de la reserva: {money(reservation.totalCrc)}</strong>
            <p>{reservation.status === 'CONFIRMED' ? 'Pago verificado. Tus boletos están confirmados.' : reservation.status === 'PENDING_REVIEW' ? 'Recibimos tu comprobante. Tus números quedan apartados mientras revisamos el pago, hasta dos días.' : reservation.status === 'CANCELLED' ? `Comprobante rechazado: ${reservation.reviewNote || 'consultá con administración.'}` : reservation.status === 'EXPIRED' ? 'La reserva venció y los números se liberaron.' : 'Adjuntá el comprobante antes de que venza el plazo. Sin comprobante, los números se liberan.'}</p>
            {(!reservation.status || ['ACTIVE', 'PENDING_REVIEW'].includes(reservation.status)) && <ProofUploader token={reservation.token} proofCount={reservation.proofCount || 0} onUploaded={() => refreshReservation(reservation.token)} />}
            <div className="reservation-actions">
              <button className="reservation-action primary" onClick={async () => { try { await navigator.clipboard.writeText(reservation.token); setCodeCopied(true); } catch { setError('No se pudo copiar el código. Intentá de nuevo.'); } }}><Copy size={16}/>{codeCopied ? 'Código copiado' : 'Copiar código de consulta'}</button>
              <a className="reservation-action secondary" href={`/pedido#${reservation.token}`}>Ver mi pedido <ArrowRight size={16}/></a>
              <button className="reservation-action secondary" onClick={() => { setLookupCode(reservation.token); goPublic('lookup'); }}>Buscar mis boletos <ArrowRight size={16}/></button>
            </div>
          </div> : <div className="selection-footer"><div className="selection-summary"><span>{selected.length ? `${selected.length * (includeInverted ? 2 : 1)} boletos en tu paquete` : 'Seleccioná un paquete'}</span><strong>{selectedOffer(raffle, selected.length) && proposalReady ? money(selectedOffer(raffle, selected.length)!.priceCrc * (includeInverted ? 2 : 1)) : '—'}</strong></div><button className="button primary full" disabled={!proposalReady || busy || (includeInverted && !availableInverted)} onClick={() => setShowCheckout(true)}>Continuar con mi paquete <ArrowRight size={17}/></button><p className="phase-note">El pago debe ser verificado por administración para confirmar tus boletos.</p></div>}
        </div>
      </div>
    </main>}

    {view === 'admin' && <main className="admin-page">
      <div className="admin-top"><div><div className="eyebrow">CIFRAYA / ESTUDIO</div><h1>Centro de control<span>✳</span></h1><p>Tu espacio para crear rifas y revisar boletos, pagos y resultados.</p></div><div className="admin-badge"><LockKeyhole size={16}/> Acceso con clave</div></div>
      {!adminUnlocked ? <section className="admin-login"><div className="admin-login-icon"><LockKeyhole size={26}/></div><h2>Entrá a tu estudio</h2><p>Ingresá tu PIN de seis dígitos.</p><form onSubmit={event => void unlockAdmin(event)} className="form-grid"><label>Ingresa el PIN<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={adminPin} onChange={event => setAdminPin(event.target.value.replace(/\D/g, ''))} autoComplete="off" placeholder="6 dígitos" /></label><button className="button primary full" disabled={busy || adminPin.length !== 6}>{busy ? 'Verificando...' : 'Ingresar al panel'} <ArrowRight size={17}/></button></form></section> : adminDetailId ? <AdminRaffleDetail id={adminDetailId} token={adminToken} onBack={closeAdminRaffle} onReview={setReviewReservationId} onChange={() => { void loadAdmin(); void loadRaffles(); void loadWinners(); }}/> : <>
        <div className="admin-stats"><div><small>RIFAS</small><strong>{adminRaffles.length}</strong><span>Creadas en el sistema</span></div><div><small>RESERVAS ACTIVAS</small><strong>{activeHolds.length}</strong><span>Con vencimiento</span></div><div><small>BOLETOS APARTADOS</small><strong>{heldTickets}</strong><span>Pendientes de confirmar</span></div></div>
        <div className="admin-layout"><section className="admin-card"><div className="card-title"><Plus size={20}/><h2>Nueva rifa</h2></div><p className="muted">Se crea como borrador. Publicala cuando esté lista.</p><form onSubmit={createRaffle} className="form-grid"><label>Nombre de la rifa<input required minLength={3} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="Ej. Rifa de octubre" /></label><label>Identificador URL<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={event => setDraft({ ...draft, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="rifa-octubre" /></label><PrizeEditor prizes={draft.prizes} sources={draft.prizeSources} onChange={(prizes, prizeSources) => setDraft({ ...draft, prizes, prizeSources })}/><label>Descripción<textarea value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} rows={3} placeholder="Contá de qué trata la rifa" /></label><div className="form-row"><label>Precio por boleto (₡)<input type="text" inputMode="numeric" pattern="[0-9]+" required maxLength={10} placeholder="Ej. 1000" value={draft.priceCrc} onChange={event => setDraft({ ...draft, priceCrc: event.target.value.replace(/\D/g, '') })} /></label><label>Cantidad de números<select required value={draft.numberCount} onChange={event => setDraft({ ...draft, numberCount: event.target.value })}><option value="">Elegí una cantidad</option><option value="100">100 · del 00 al 99</option><option value="1000">1 000 · del 000 al 999</option><option value="10000">10 000 · del 0000 al 9999</option></select></label></div><div className="inverted-settings"><label><input type="checkbox" checked={draft.invertedEnabled} onChange={event => setDraft({ ...draft, invertedEnabled: event.target.checked, invertedPrizeEnabled: event.target.checked && draft.invertedPrizeEnabled })}/> Ofrecer paquete con números invertidos por el doble del precio</label></div><div className="package-editor"><div className="package-heading"><strong>Paquetes de números</strong><button type="button" onClick={() => setDraftPackages(current => [...current, { quantity: '', priceCrc: '' }])} disabled={draftPackages.length >= 10}>+ Agregar paquete</button></div><p>Ejemplo: 3 números por ₡4.000. Cada comprador elige un paquete disponible.</p>{draftPackages.map((item, index) => <div className="package-row" key={index}><label>Cantidad<input type="text" inputMode="numeric" pattern="[0-9]+" required value={item.quantity} onChange={event => setDraftPackages(current => current.map((entry, position) => position === index ? { ...entry, quantity: event.target.value.replace(/\D/g, '') } : entry))} placeholder="3" /></label><label>Precio del paquete (₡)<input type="text" inputMode="numeric" pattern="[0-9]+" required value={item.priceCrc} onChange={event => setDraftPackages(current => current.map((entry, position) => position === index ? { ...entry, priceCrc: event.target.value.replace(/\D/g, '') } : entry))} placeholder="4000" /></label><button type="button" aria-label="Quitar paquete" onClick={() => setDraftPackages(current => current.filter((_, position) => position !== index))}>×</button></div>)}</div><div className="photo-field"><span>Fotos del premio (hasta 5)</span><PhotoPicker title="Agregar fotos" hint={`${draftPhotos.length}/5 fotos · seleccioná varias a la vez (JPG, PNG o WebP)`} disabled={draftPhotos.length >= 5} onFiles={files => { const unique = files.filter(file => !draftPhotos.some(saved => saved.name === file.name && saved.size === file.size && saved.lastModified === file.lastModified)); if (draftPhotos.length + unique.length > 5) { setError('Podés agregar hasta 5 fotos por rifa.'); return; } setError(''); setDraftPhotos([...draftPhotos, ...unique]); }}/>{draftPhotos.length > 0 && <div className="pending-photos">{draftPhotos.map((file, index) => <PendingPhoto key={`${file.name}-${file.lastModified}-${index}`} file={file} onRemove={() => setDraftPhotos(current => current.filter((_, photoIndex) => photoIndex !== index))}/>)}</div>}</div><button className="button primary full" disabled={busy}>Crear borrador <ArrowRight size={17}/></button></form></section>
        <section className="admin-card"><div className="card-title"><Ticket size={20}/><h2>Tus rifas</h2></div><p className="muted">Administrá las fotos antes o después de publicar.</p><div className="admin-list">{adminRaffles.map(item => <article className="admin-raffle-card" key={item.id}><div className="admin-raffle-heading"><div className="admin-raffle-info"><strong>{item.title}</strong><span>{item.numberCount.toLocaleString('es-CR')} boletos · {money(item.priceCrc)} c/u</span></div><div className="admin-raffle-actions"><span className={'state ' + item.status.toLowerCase()}>{item.status === 'DRAFT' ? 'Borrador' : item.status === 'CLOSED' ? 'Finalizada' : 'Abierta'}</span>{item.status === 'DRAFT' && <button type="button" className="admin-action-button" onClick={() => void publish(item.id)} disabled={busy || publishingId !== null}>{publishingId === item.id ? 'Publicando...' : 'Publicar rifa'}</button>}<button type="button" className="admin-action-button" onClick={() => setEditingRaffleId(item.id)}>Editar rifa</button><button type="button" className="admin-action-button" onClick={() => openAdminRaffle(item.id)}>Gestionar rifa</button></div></div>{publishFeedback?.id === item.id && <p className={publishFeedback.error ? 'publish-feedback error' : 'publish-feedback'} role="status">{publishFeedback.text}</p>}<div className="admin-photo-section"><div className="admin-photo-list">{item.photos.map(photo => <div className="admin-photo" key={photo.id}><AdminPhoto id={photo.id} token={adminToken}/><button type="button" onClick={() => void removePhoto(photo.id)} disabled={busy} aria-label="Eliminar foto"><X size={15}/></button></div>)}{item.photos.length === 0 && <span>Sin fotos todavía</span>}</div><PhotoPicker compact title={item.photos.length >= 5 ? 'Máximo de 5 fotos' : 'Agregar fotos'} disabled={busy || item.photos.length >= 5} onFiles={files => { if (files.length + item.photos.length > 5) { setError('Cada rifa admite hasta 5 fotos.'); return; } void addPhotos(item.id, files); }}/></div></article>)}{adminRaffles.length === 0 && <div className="empty-state small">Todavía no hay rifas creadas.</div>}</div></section></div>
        <section className="admin-card reservations-card"><div className="card-title"><Ticket size={20}/><h2>Boletos y personas</h2><button className="refresh-button" onClick={() => void loadAdmin()} disabled={busy}>Actualizar</button></div><p className="muted">Abrí cada reserva para ver el comprobante y verificar el pago. Esta lista se actualiza sola.</p><div className="reservation-list">{adminReservations.map(item => <div className="reservation-row" key={item.id}><div className="reservation-avatar">{item.buyerName.trim().charAt(0).toUpperCase()}</div><div className="reservation-person"><strong>{item.buyerName}</strong><span>{item.campaign.title}</span></div><div className="reservation-amount"><strong>{item.ticketCount}</strong><span>{item.ticketCount === 1 ? 'boleto' : 'boletos'}</span></div><div className="reservation-chips">{item.values.slice(0, 6).map(value => <span key={value}>{formatNumber(value, item.campaign.numberWidth)}</span>)}{item.values.length > 6 && <span>+{item.values.length - 6}</span>}</div><span className="state active">{item.status === 'PENDING_REVIEW' ? 'En revisión' : 'Esperando comprobante'}</span><button className="admin-action-button" type="button" onClick={() => setReviewReservationId(item.id)}>Revisar</button></div>)}{adminReservations.length === 0 && <div className="empty-state small">Aún no hay reservas activas.</div>}</div></section>
      </>}
    </main>}

    {editingRaffleId && adminUnlocked && adminRaffles.find(item => item.id === editingRaffleId) && <EditRaffle key={editingRaffleId} raffle={adminRaffles.find(item => item.id === editingRaffleId)!} token={adminToken} onClose={() => setEditingRaffleId(null)} onUnauthorized={() => { setEditingRaffleId(null); expireAdminSession(); }} onSaved={() => { void loadAdmin(adminToken, true); void loadRaffles(); void loadWinners(); }} /> }
    {reviewReservationId && adminUnlocked && <AdminReservationReview id={reviewReservationId} token={adminToken} onClose={() => setReviewReservationId(null)} onReviewed={() => { void loadAdmin(adminToken, true); void loadRaffles(); }} />}

    {showCheckout && raffle && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowCheckout(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={() => setShowCheckout(false)} aria-label="Cerrar"><X size={20}/></button><div className="eyebrow">TU PASE / PASO FINAL</div><h2 id="modal-title">Dale nombre a tu boleto.</h2><p>La reserva dura 30 minutos. Administración confirmará tus boletos cuando verifique el pago.</p><div className="modal-numbers">{[...selected, ...(includeInverted ? availableInverted || [] : [])].map(value => <span key={value}><Check size={14}/>{formatNumber(value, width)}</span>)}</div><form onSubmit={reserve} className="form-grid"><label>Nombre en el boleto<input required minLength={2} autoComplete="off" value={buyer.buyerName} onChange={event => setBuyer({ ...buyer, buyerName: event.target.value })} /></label><label>Correo electrónico<input required type="email" autoComplete="off" value={buyer.buyerEmail} onChange={event => setBuyer({ ...buyer, buyerEmail: event.target.value })} /></label><label>Teléfono<input required minLength={8} autoComplete="off" value={buyer.buyerPhone} onChange={event => setBuyer({ ...buyer, buyerPhone: event.target.value })} /></label><label className="checkout-proof-field">Comprobante SINPE Móvil (podés adjuntarlo ahora o durante la reserva)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => { const files = Array.from(event.target.files || []); if (files.length > 3) { setError('Podés adjuntar hasta tres comprobantes.'); event.target.value = ''; return; } setCheckoutProofs(files); }} /><span>{checkoutProofs.length ? `${checkoutProofs.length} foto${checkoutProofs.length === 1 ? '' : 's'} lista${checkoutProofs.length === 1 ? '' : 's'}` : 'Seleccionar hasta 3 fotos'}</span></label><div className="modal-total"><span>{includeInverted ? 'Total con invertidos' : 'Total'}</span><strong>{money((selectedOffer(raffle, selected.length)?.priceCrc ?? 0) * (includeInverted ? 2 : 1))}</strong></div><button className="button primary full" disabled={busy}>{busy ? 'Apartando...' : 'Apartar números'} <ArrowRight size={17}/></button></form></div></div>}

    <footer className="site-footer"><span className="footer-brand"><img src="/cifraya-logo.png" alt="Logo de Cifraya"/></span><FooterSocials/></footer>
  </div>;
}
