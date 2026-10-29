import Confirmation from './Confirmation';
import CollectionHome from './CollectionHome';
const CardCatalogAdmin = lazy(() => import('./CardCatalog').then(module => ({default:module.CardCatalogAdmin})));
import SinpePaymentInfo from './SinpePaymentInfo';
import preparePhoto from './preparePhoto';
import SiteHeader from './SiteHeader';
import DrawCountdown from './DrawCountdown';
import DrawScheduleEditor, {toDrawDate} from './DrawScheduleEditor';
import CheckoutDialog from './CheckoutDialog';
import PrizePhoto from './PrizePhoto';
import StickerCardEditor, { cardPackages, type StickerCard } from './StickerCardEditor';
import StickerPicker from './StickerPicker';
import BrandSelect, { numberCountOptions } from './BrandSelect';
import ManualNumbers from './ManualNumbers';
const OrderDetail = lazy(() => import('./OrderDetail'));
import { startRealtime } from './realtime';
import PrizeEditor from './PrizeEditor';
import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Check, ChevronLeft, Clock3, Copy, LockKeyhole, Plus, Search, ShieldCheck, Sparkles, Ticket, Trophy, X } from 'lucide-react';
const AdminRaffleDetail = lazy(() => import('./AdminRaffleDetail'));
const AdminReservationReview = lazy(() => import('./AdminReservationReview'));
const EditRaffle = lazy(() => import('./EditRaffle'));
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
  numbersPerSticker: number | null;
  packages: { quantity: number; priceCrc: number }[];
  status: 'DRAFT' | 'LIVE' | 'CLOSED';
  isTest?: boolean;
  winners?: { position: number; numberValue: number }[];
  drawDate: string | null;
  drawMode: string;
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
type NumberProposal = { expiresAt: string; values: number[]; changesRemaining: number; invertedValues: number[] | null };
type View = 'order' | 'home' | 'raffle' | 'lookup' | 'winners' | 'admin';

const ADMIN_PATH = '/estudio-vnova';
const LEGACY_ADMIN_PATH = '/estudio-cifraya';
if (window.location.pathname === LEGACY_ADMIN_PATH || window.location.pathname.startsWith(LEGACY_ADMIN_PATH + '/')) {
  window.history.replaceState(null, '', ADMIN_PATH + window.location.pathname.slice(LEGACY_ADMIN_PATH.length) + window.location.search + window.location.hash);
}
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
const selectedOffer = (raffle: Raffle, quantity: number) => raffle.packages.length ? raffle.packages.find(offer => offer.quantity === quantity) : raffle.numbersPerSticker ? (quantity > 0 && quantity % raffle.numbersPerSticker === 0 ? { quantity, priceCrc: quantity / raffle.numbersPerSticker * raffle.priceCrc } : undefined) : offersFor(raffle).find(offer => offer.quantity === quantity);
const progressOf = (raffle: Raffle) => Math.min(100, Math.floor(100 * (raffle.soldCount || 0) / raffle.numberCount));
function SelectionSpinner() { return <span className="selection-spinner" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <span key={index}/>)}</span>; }
function RaffleProgress({ raffle, compact = false }: { raffle: Raffle; compact?: boolean }) {
  const percent = progressOf(raffle);
  return <div className={compact ? 'raffle-progress compact' : 'raffle-progress'}><div><span>PROGRESO DE LA RIFA</span><strong>{percent}% vendido</strong></div><div className="raffle-progress-track" role="progressbar" aria-label="Porcentaje vendido" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }}/></div></div>;
}
function InvertedChoice({ raffle, values, inverted, selected, disabled, onToggle }: { raffle: Raffle; values: number[]; inverted: number[] | null; selected: boolean; disabled: boolean; onToggle: (value: boolean) => void }) {
  if (!raffle.invertedEnabled) return null;
  return <div className="inverted-choice"><div><strong>Sumá los invertidos</strong><span>{inverted ? `${values.length} números más por el mismo precio del paquete` : 'Los invertidos de esta selección no están todos disponibles.'}</span></div>{inverted && <><div className="random-values">{inverted.map(value => <span key={value}>{formatNumber(value, raffle.numberWidth)}</span>)}</div><button type="button" className="inverted-toggle" aria-pressed={selected} disabled={disabled} onClick={() => onToggle(!selected)}>{selected ? 'Quitar invertidos' : `Agregar invertidos · +${money(selectedOffer(raffle, values.length)?.priceCrc || 0)}`}</button><small>Cada número agregado es un boleto. Los premios para el inverso se indican en esta rifa.</small></>}</div>;
}


class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

let serverClock: { time: number; sampled: number } | undefined;
const currentServerTime = () => serverClock ? serverClock.time + performance.now() - serverClock.sampled : Date.now();
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, { ...options, headers });
  const serverDate = Date.parse(response.headers.get('Date') || '');
  if (Number.isFinite(serverDate)) serverClock = { time: serverDate, sampled: performance.now() };
  const payload = await response.json();
  if (!response.ok) throw new ApiError(payload.error || 'Ocurrió un error', response.status);
  return payload as T;
}

function useCountdown(expiresAt: string | undefined) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => setRemaining(Math.max(0, Math.ceil((new Date(expiresAt).getTime() - currentServerTime()) / 1000)));
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
      <div className="ticket-meta"><span>VNOVA TCG / BOLETO DIGITAL</span><span className="ticket-status">{status}</span></div>

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
  const [messageFailed, setMessageFailed] = useState(false);
  async function upload(files: File[]) {
    if (!files.length) return;
    if (proofCount + files.length > 3) { setMessageFailed(true); setMessage('Podés adjuntar hasta tres comprobantes.'); return; }
    setUploading(true); setMessage(''); setMessageFailed(false);
    try {
      for (const file of files) {
        const image = await preparePhoto(file);
        await api(`/api/reservations/${token}/proofs`, { method: 'POST', body: JSON.stringify(image) });
        await onUploaded();
      }
      setMessage('Comprobante recibido. Pago en revisión.');
    } catch (cause) { setMessageFailed(true); setMessage((cause as Error).message); }
    finally { setUploading(false); }
  }
  return <div className="proof-uploader"><SinpePaymentInfo/><strong>Adjuntá tu comprobante SINPE Móvil</strong><p>Podés seleccionar hasta tres fotos a la vez (JPG, PNG o WebP). El primer comprobante debe llegar antes de que venza la reserva.</p><label className="proof-upload-button">{uploading ? 'Subiendo...' : proofCount ? `Agregar otro comprobante (${proofCount}/3)` : 'Seleccionar comprobantes'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading || proofCount >= 3} onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void upload(files); }}/></label>{message && <Confirmation variant={messageFailed ? 'error' : 'success'} message={message} onClose={()=>setMessage('')}/>}</div>;
}

export default function App() {
  const [comingSoon, setComingSoon] = useState<boolean | null>(null);
  const [savingScreen, setSavingScreen] = useState(false);
  const [cardsOpened,setCardsOpened] = useState(false);
  useEffect(() => {
    let stopped = false;
    const refresh = () => { void api<{comingSoon:boolean}>('/api/site-settings').then(value => { if (!stopped) setComingSoon(value.comingSoon); }).catch(() => {}); };
    refresh();
    const interval = window.setInterval(refresh, 10000);
    return () => { stopped = true; window.clearInterval(interval); };
  }, []);
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [selectionMode, setSelectionMode] = useState<'random' | 'manual'>('random');
  const [selected, setSelected] = useState<number[]>([]);
  const [availableInverted, setAvailableInverted] = useState<number[] | null>(null);
  const [includeInverted, setIncludeInverted] = useState(false);
  const [randomQuantity, setRandomQuantity] = useState('');
  const [holdExpiresAt, setHoldExpiresAt] = useState<string>();
  const holdCountdown = useCountdown(holdExpiresAt);
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
  const [adminWorkspace, setAdminWorkspace] = useState<'raffles' | 'create' | 'payments' | 'cards'>('raffles');
  const [draftCards, setDraftCards] = useState<StickerCard[]>([]);
  const [draft, setDraft] = useState({ drawMode:'ANNOUNCED', drawDate:'', title: '', slug: '', prizes: [''], prizeSources: [0], description: '', priceCrc: '', numbersPerSticker: '2', numberCount: '', invertedEnabled: false, invertedPrizeEnabled: false });
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
    setSelectionMode('random'); setBusy(true); setError(''); setSelected([]); setAvailableInverted(null); setIncludeInverted(false); setRandomQuantity(''); setProposalReady(false); setChangesRemaining(5); setReservation(null); setCheckoutProofs([]); setCodeCopied(false); setShowCheckout(false); setActivePhotoId(null);
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
          setRaffle(current => current?.id === updated.id ? updated : current);
          if (JSON.stringify(updated.packages) !== JSON.stringify(raffle.packages) && !reservation) {
            setShowCheckout(false); setProposalReady(false); setSelected([]); setRandomQuantity(''); setIncludeInverted(false); setAvailableInverted(null);
            setError('Las tarjetas se actualizaron. Elegí una tarjeta para continuar con el precio vigente.');
          }
        } catch { /* Keep the last known count while offline. */ }
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
  }, [view, adminDetailId, adminUnlocked, adminToken, raffle?.slug, JSON.stringify(raffle?.packages), reservation?.token, lookupCode, lookupResult?.status, proposalReady, selectionLoading, randomQuantity, selected.length, showCheckout, selectionMode]);

  useEffect(() => {
    if (holdExpiresAt && holdCountdown === '00:00' && new Date(holdExpiresAt).getTime() <= currentServerTime() && !reservation) {
      setProposalReady(false); setSelected([]); setRandomQuantity(''); setAvailableInverted(null); setIncludeInverted(false); setShowCheckout(false); setHoldExpiresAt(undefined);
      setError('El apartado temporal venció. Volvé a elegir tus números disponibles.');
    }
  }, [holdCountdown, holdExpiresAt, reservation]);

  useEffect(() => {
    if (view !== 'raffle' || !window.matchMedia('(max-width: 800px)').matches) return;
    const target = reservation ? '.reservation-result' : proposalReady ? '.selection-result' : selectionMode === 'manual' && randomQuantity ? '.manual-numbers' : null;
    if (target) document.querySelector(target)?.scrollIntoView({block: 'start', behavior: 'instant'});
  }, [view, proposalReady, selectionMode, randomQuantity, reservation?.token]);

  async function generateNumbers(quantity: number, campaign = raffle) {
    if (!campaign) return;
    setBusy(true); setError(''); setSelectionLoading('generating'); setRandomQuantity(String(quantity)); setSelected([]); setAvailableInverted(null); setIncludeInverted(false); setProposalReady(false);
    try {
      const proposal = await api<NumberProposal>(`/api/campaigns/${encodeURIComponent(campaign.slug)}/proposal`, { method: 'POST', body: JSON.stringify({ quantity }) });
      setHoldExpiresAt(proposal.expiresAt); setSelected(proposal.values); setAvailableInverted(proposal.invertedValues); setChangesRemaining(proposal.changesRemaining); setProposalReady(true);
    } catch (cause) { setRandomQuantity(''); setError((cause as Error).message); }
    finally { setBusy(false); setSelectionLoading(null); }
  }

  async function chooseManually(values: number[], ready = true) {
    if (!raffle) return;
    setBusy(true); setError(''); setProposalReady(false);
    try {
      const proposal = await api<NumberProposal>(`/api/campaigns/${encodeURIComponent(raffle.slug)}/proposal`, { method: 'POST', body: JSON.stringify({ quantity: Number(randomQuantity), values }) });
      setHoldExpiresAt(proposal.expiresAt); setSelected(proposal.values); setAvailableInverted(proposal.invertedValues); setIncludeInverted(false); setProposalReady(ready);
    } catch (cause) { setError((cause as Error).message); throw cause; }
    finally { setBusy(false); }
  }

  async function toggleInverted(value: boolean) {
    if (!raffle) return;
    setBusy(true); setError('');
    try {
      const proposal = await api<NumberProposal>(`/api/campaigns/${encodeURIComponent(raffle.slug)}/proposal`, { method: 'POST', body: JSON.stringify({ quantity: selected.length, values: selected, includeInverted: value }) });
      setHoldExpiresAt(proposal.expiresAt); setAvailableInverted(proposal.invertedValues); setIncludeInverted(value);
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  }

  async function changeRandomNumbers() {
    if (!raffle) return;
    setBusy(true); setError(''); setSelectionLoading('changing');
    try {
      const proposal = await api<NumberProposal>(`/api/campaigns/${encodeURIComponent(raffle.slug)}/proposal/change`, { method: 'POST' });
      setHoldExpiresAt(proposal.expiresAt); setSelected(proposal.values); setAvailableInverted(proposal.invertedValues); setIncludeInverted(false); setChangesRemaining(proposal.changesRemaining);
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
        method: 'POST', body: JSON.stringify({ campaignId: raffle.id, values: selected, includeInverted, expectedTotalCrc: (selectedOffer(raffle, selected.length)?.priceCrc || 0) * (includeInverted ? 2 : 1), ...buyer }),
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
    setError('La sesión venció. Ingresá tu contraseña de nuevo; tu borrador sigue guardado en esta pestaña.');
  }

  async function unlockAdmin(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const session = await api<{ token: string }>('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: adminPin }) });
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
        ![100, 1000, 10000, 100000].includes(numberCount)) {
      setError('Ingresá un precio válido y elegí 100, 1 000, 10 000 o 100 000 números.');
      return;
    }
    if (draft.prizes.length > numberCount || draft.prizes.some(prize => prize.trim().length < 3)) { setError('Completá cada premio y verificá que no haya más premios que números.'); return; }
    const numbersPerSticker = Number(draft.numbersPerSticker);
    if (!Number.isInteger(numbersPerSticker) || numbersPerSticker < 1 || numbersPerSticker > 20) { setError('Cada boleto debe incluir entre 1 y 20 números.'); return; }
    setBusy(true); setError('');
    let created = false;
    try {
      const campaign = await api<{ id: string }>('/api/admin/campaigns', { method: 'POST', headers: { Authorization: 'Bearer ' + adminToken }, body: JSON.stringify({ ...draft, drawDate:draft.drawMode==='DATE'?toDrawDate(draft.drawDate):null, priceCrc, numberCount, numbersPerSticker, packages: cardPackages(draftCards, numbersPerSticker) }) });
      created = true;
      const files = [...draftPhotos];
      setAdminWorkspace('raffles');
      setDraftCards([]);
      setDraft({ drawMode:'ANNOUNCED', drawDate:'', title: '', slug: '', prizes: [''], prizeSources: [0], description: '', priceCrc: '', numbersPerSticker: '2', numberCount: '', invertedEnabled: false, invertedPrizeEnabled: false });
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
        if (created) setError('La rifa se creó, pero la sesión venció al cargar una foto. Ingresá tu contraseña de nuevo y agregala en Tus rifas.');
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

  if (view !== 'admin' && comingSoon !== false) return <main className="coming-soon-screen" aria-live="polite"><div className="coming-soon-glass"><h1>{comingSoon ? 'Próximamente' : 'Cargando…'}</h1>{comingSoon && <p>Está en camino…</p>}</div></main>;

  return <div className={'app-shell ' + (view === 'admin' ? 'admin-shell' : '')}>
    {view === 'admin' ? <header className="studio-header"><div><img src="/vnova-transparent.webp" alt="Vnova TCG"/><span>Administración<small>Rifas, ventas y pagos</small></span></div><div className="studio-header-actions"><button type="button" onClick={goHome}>Salir al sitio <ArrowRight size={16}/></button>{adminUnlocked && <button type="button" onClick={() => { setAdminToken(''); setAdminPin(''); setAdminUnlocked(false); window.location.replace(ADMIN_PATH); }}>Cerrar sesión <LockKeyhole size={16}/></button>}</div></header> : <SiteHeader onHome={goHome}>
        <>
          <button className={view === 'home' || view === 'raffle' ? 'nav-active' : ''} onClick={goHome}><span className="battle-nav-icon battle-ball" aria-hidden="true"/><span>Inicio</span></button>
          <button className={view === 'lookup' ? 'nav-active' : ''} onClick={() => goPublic('lookup')}><span className="battle-nav-icon" aria-hidden="true"><Ticket size={20}/></span><span>Buscar boletos</span></button>
          <button className={view === 'winners' ? 'nav-active' : ''} onClick={() => goPublic('winners')}><span className="battle-nav-icon" aria-hidden="true"><Trophy size={20}/></span><span>Ganadores</span></button>
        </>
    </SiteHeader>}

    {error && <div className="vn-global-notice"><Confirmation variant="error" message={error} onClose={() => setError('')}/></div>}

    {view === 'home' && <main className="home-page">
      {featured ? <section className="current-raffle" aria-label="Rifa actual">
        <div className="mobile-raffle-intro"><span>RIFA DE POKÉMON</span><h2>{featured.title}</h2><p>{featured.prize}</p><button type="button" onClick={() => document.getElementById("home-ticket-options")?.scrollIntoView({block:"start",behavior:"smooth"})}>Elegir mis boletos <ArrowRight size={16}/></button></div>
        <div className="current-raffle-image">{coverOf(featured) ? <PrizePhoto photos={featured.photos} src={coverOf(featured)!} title={featured.prize}/> : <img className="current-logo" src="/vnova-logo.svg" alt=""/>}</div>
        <div className="current-raffle-content" id="home-ticket-options"><h1>{featured.title}</h1><div className="current-prize">{featured.prize}</div><DrawCountdown mode={featured.drawMode} date={featured.drawDate} sold={featured.soldCount} total={featured.numberCount}/><RaffleProgress raffle={featured} compact/>{featured.numbersPerSticker ? <StickerPicker cards={featured.packages} price={featured.priceCrc} numbersPerSticker={featured.numbersPerSticker} disabled={busy} onChoose={quantity => void openRaffle(featured.slug, true, quantity)}/> : <div className="home-packages"><span>Elegí tu paquete</span><div>{offersFor(featured).map(offer => <button key={offer.quantity} type="button" disabled={busy} onClick={() => void openRaffle(featured.slug, true, offer.quantity)}><span>{offer.quantity} {offer.quantity === 1 ? 'número' : 'números'}</span><strong>{money(offer.priceCrc)}</strong>{homePackageLoading === offer.quantity ? <SelectionSpinner/> : <ArrowRight size={18} aria-hidden="true"/>}</button>)}</div></div>}<button className="home-details-link" type="button" disabled={busy} onClick={() => void openRaffle(featured.slug)}>Ver detalles de la rifa <ArrowRight size={16}/></button></div>
      </section> : null}

      {raffles.length > 1 && <section className="section raffles-section" id="rifas">
        <div className="section-heading"><div><h2>Más rifas</h2></div></div>
        <div className="raffle-grid">{raffles.slice(1).map((item, index) => <article className="raffle-card" key={item.id}>
          <div className="raffle-cover">{coverOf(item) ? <img src={coverOf(item)!} alt={item.prize} /> : <div className="cover-placeholder"><span className="cover-index">0{index + 1}</span><Sparkles size={58} strokeWidth={1.2}/><span>ALGO BUENO VIENE</span></div>}<span className="cover-status">RIFA ABIERTA</span></div>
          <div className="raffle-body"><div className="raffle-overline">{item.numberCount.toLocaleString('es-CR')} BOLETOS EN ESTA RIFA</div><h3>{item.title}</h3><p>{item.description || 'Apartá tus números para esta rifa.'}</p><div className="raffle-facts"><div><small>PREMIO</small><strong>{item.prize}</strong></div><div><small>PAQUETES DESDE</small><strong>{money(Math.min(...offersFor(item).map(offer => offer.priceCrc)))}</strong></div></div><button className="button dark full" onClick={() => void openRaffle(item.slug)}>Entrar a la rifa <ArrowRight size={17} /></button></div>
        </article>)}</div>
      </section>}

      <CollectionHome/>
    </main>}

    {view === 'order' && <OrderDetail renderProof={(token, count, refresh) => <ProofUploader token={token} proofCount={count} onUploaded={refresh}/>}/> }
    {view === 'lookup' && <main className="public-page lookup-page">
      <div className="public-intro"><div className="eyebrow">VNOVA TCG / TUS BOLETOS</div><h1>Encontrá tus <em>números.</em></h1><p>Ingresá el código que recibiste al apartar tus números para consultar tu pase y su estado.</p></div>
      <div className="lookup-layout"><section className="lookup-card"><div className="public-icon"><Search size={27}/></div><h2>Buscar boletos</h2><p>Encontrá tu código en el correo de reserva o confirmación, o copialo desde tu pase.</p><form onSubmit={event => void lookupTickets(event)} className="form-grid"><label>Código de consulta<input value={lookupCode} onChange={event => setLookupCode(event.target.value)} placeholder="Pegá aquí tu código" autoComplete="off" spellCheck={false} required maxLength={48}/></label><button className="button dark full" disabled={busy || lookupCode.trim().length !== 48}>Consultar mi pase <ArrowRight size={17}/></button></form><span className="lookup-help"><LockKeyhole size={15}/> Solo quien tenga el código puede ver este pase.</span></section>
      <section className="lookup-result">{lookupResult ? <>
        <a className="button dark" href={`/pedido#${lookupCode.trim()}`}>Ver detalle del pedido <ArrowRight size={16}/></a>
        <TicketPass name={lookupResult.buyerName} title={lookupResult.campaign.title} values={lookupResult.values} baseValues={lookupResult.baseValues} includesInverted={lookupResult.includesInverted} width={lookupResult.campaign.numberWidth} count={lookupResult.values.length} status={lookupResult.status === 'CONFIRMED' ? 'COMPRA CONFIRMADA' : lookupResult.status === 'PENDING_REVIEW' ? 'PAGO EN REVISIÓN' : lookupResult.status === 'ACTIVE' ? 'APARTADO' : lookupResult.status === 'EXPIRED' ? 'RESERVA VENCIDA' : 'RESERVA CANCELADA'} timer={lookupResult.status === 'ACTIVE' ? lookupCountdown : undefined}/>
        <p>{lookupResult.status === 'CONFIRMED' ? `Compra confirmada por ${money(lookupResult.totalCrc)}.` : lookupResult.status === 'PENDING_REVIEW' ? 'Recibimos el comprobante. Tus números siguen apartados mientras revisamos el pago.' : lookupResult.status === 'ACTIVE' ? 'Adjuntá tu comprobante antes de que venza la reserva.' : lookupResult.status === 'CANCELLED' ? `Reserva rechazada: ${lookupResult.reviewNote || 'consultá con administración.'}` : 'Esta reserva venció y sus números pueden volver a estar disponibles.'}</p>
        {(lookupResult.status === 'PENDING_REVIEW' || (lookupResult.status === 'ACTIVE' && lookupCountdown !== '00:00')) && <ProofUploader token={lookupCode.trim()} proofCount={lookupResult.proofCount || 0} onUploaded={() => refreshReservation(lookupCode.trim())}/>}
      </> : <div className="lookup-placeholder"><Ticket size={42} strokeWidth={1.3}/><span>EL PASE APARECERÁ AQUÍ</span><p>Nombre, cantidad de boletos, números y estado en un solo lugar.</p></div>}</section></div>
    </main>}

    {view === 'winners' && <main className="public-page winners-page"><div className="public-intro"><div className="eyebrow">VNOVA TCG / RESULTADOS</div><h1>Ganadores.</h1><p>Los premios publicados de cada rifa.</p></div>{winners.length ? <WinnersPodium winners={winners}/> : <section className="winners-empty"><div className="winner-symbol"><Trophy size={68} strokeWidth={1.2}/></div><div><h2>Aún no hay ganadores publicados.</h2><p>Cuando se anuncie un premio, aparecerá aquí.</p><button className="button dark" onClick={goHome}>Ver rifas <ArrowRight size={17}/></button></div></section>}</main>}

    {view === 'raffle' && raffle && <main className="section detail-page">
      <button className="text-button" onClick={goHome}><ChevronLeft size={17}/> Todas las rifas</button>
      <div className="detail-heading"><h1>{raffle.title}</h1><p>Elegí tus boletos, seleccioná los números y completá tus datos.</p><button type="button" className="mobile-buy-link button primary" onClick={() => document.getElementById("rifa-compra")?.scrollIntoView({block:"start",behavior:"instant"})}>Elegir mis boletos <ArrowRight size={17}/></button></div>
      <div className="detail-layout">
        <div><div className="detail-image">{activePhotoId || coverOf(raffle) ? <PrizePhoto photos={raffle.photos} src={raffle.photos.find(photo => photo.id === activePhotoId)?.url || coverOf(raffle)!} title={raffle.prize}/> : <div className="cover-placeholder"><Sparkles size={84} strokeWidth={1}/><span>ALGO BUENO VIENE</span></div>}</div><div className="detail-description"><div className="eyebrow">EL PREMIO</div><h2>{raffle.prize}</h2>{(raffle.prizeCount > 1 || raffle.prizeSources.some(source => source < 0)) && <div className="detail-prize-list">{raffle.prizes.map((prize, index) => <span key={index}>{index + 1}.º · {prize}{raffle.prizeSources[index] > 0 ? ` · Inverso del ${raffle.prizeSources[index]}.º premio` : raffle.prizeSources[index] < 0 ? ` · JPS desde ${-raffle.prizeSources[index]}.º premio` : ' · Directo'}</span>)}</div>}<p>{raffle.description || 'Elegí tus boletos para participar en esta rifa.'}</p><div className="info-strip"><ShieldCheck size={20}/><span>Al confirmar la reserva, tenés 30 minutos para adjuntar el comprobante.</span></div></div></div>
        <div className="detail-side" id="rifa-compra">
          <div className="detail-side-top"><span>{raffle.numbersPerSticker ? 'Compra de boletos' : 'Elegí un paquete'}</span></div><DrawCountdown mode={raffle.drawMode} date={raffle.drawDate} sold={raffle.soldCount} total={raffle.numberCount}/><RaffleProgress raffle={raffle}/>
          <div className="selection-head"><div><h2>{raffle.numbersPerSticker ? 'Elegí tus boletos' : 'Elegí tu paquete'}</h2><p>Elegí cuántos querés y decidí si preferís números al azar o seleccionarlos vos.</p></div></div>
          {!reservation && <div className="random-picker"><div className="package-offers">{holdExpiresAt && <p className="hold-countdown" role="status">Apartado temporal: <strong>{holdCountdown}</strong></p>}{raffle.numbersPerSticker ? <StickerPicker cards={raffle.packages} selectedNumbers={Number(randomQuantity)} price={raffle.priceCrc} numbersPerSticker={raffle.numbersPerSticker} disabled={busy} onChoose={quantity => { if (selectionMode === 'random') void generateNumbers(quantity); else { setRandomQuantity(String(quantity)); setSelected([]); setProposalReady(false); setAvailableInverted(null); setIncludeInverted(false); } }}/> : <><strong>Paquetes disponibles</strong><div>{offersFor(raffle).map(offer => <button key={offer.quantity} type="button" className="package-option" aria-pressed={randomQuantity === String(offer.quantity)} disabled={busy} onClick={() => { if (selectionMode === 'random') void generateNumbers(offer.quantity); else { setRandomQuantity(String(offer.quantity)); setSelected([]); setProposalReady(false); setAvailableInverted(null); setIncludeInverted(false); } }}><strong>{offer.quantity} {offer.quantity === 1 ? 'número' : 'números'}</strong><span>{money(offer.priceCrc)}</span></button>)}</div></>}</div><div className="selection-modes" role="group" aria-label="Forma de elegir números">{(['random', 'manual'] as const).map(mode => <button type="button" key={mode} disabled={busy} aria-pressed={selectionMode === mode} onClick={() => { if (mode === selectionMode) return; setSelectionMode(mode); setProposalReady(false); setSelected([]); setAvailableInverted(null); setIncludeInverted(false); if (randomQuantity) { if (mode === 'random') void generateNumbers(Number(randomQuantity)); else void chooseManually([], false).catch(() => {}); } }}>{mode === 'random' ? 'Al azar' : 'Elegir mis números'}</button>)}</div>{selectionMode === 'manual' && randomQuantity && !proposalReady && <ManualNumbers key={raffle.id + ':' + randomQuantity} slug={raffle.slug} quantity={Number(randomQuantity)} width={width} disabled={busy} onPick={values => chooseManually(values, false)} onConfirm={chooseManually}/ >}{(proposalReady || selectionLoading) && <div className="selection-result" aria-busy={Boolean(selectionLoading)}>{proposalReady && <><div className="random-selection-heading"><strong>Tus {selected.length} {selected.length === 1 ? 'número' : 'números'}</strong>{selectionMode === 'random' && <span>{changesRemaining} de 5 cambios disponibles</span>}</div><div className="random-values">{selected.map(value => <span key={value}>{formatNumber(value, width)}</span>)}</div><InvertedChoice raffle={raffle} values={selected} inverted={availableInverted} selected={includeInverted} disabled={busy || Boolean(selectionLoading)} onToggle={value => void toggleInverted(value)}/><button className="button dark full" type="button" disabled={busy || (selectionMode === 'random' && changesRemaining === 0)} onClick={() => { if (selectionMode === 'random') void changeRandomNumbers(); else { setProposalReady(false); setSelected([]); setIncludeInverted(false); } }}>{selectionMode === 'random' ? 'Cambiar todos los números' : 'Elegir otros números'}</button><div className="selection-time"><span>Tiempo para confirmar tus datos</span><strong role="timer" aria-label="Tiempo restante">{holdCountdown}</strong><p>Tus números están apartados exclusivamente para vos.</p></div></>}{selectionLoading && <div className="selection-loader" role="status" aria-live="polite"><SelectionSpinner/><span>{selectionLoading === 'changing' ? 'Buscando otros números disponibles…' : 'Generando tus números…'}</span></div>}</div>}</div>}
          {reservation ? <div className="reservation-result">
            <TicketPass name={buyer.buyerName} title={raffle.title} values={reservation.values} baseValues={reservation.baseValues} includesInverted={reservation.includesInverted} width={width} count={reservation.values.length} status={reservation.status === 'CONFIRMED' ? 'COMPRA CONFIRMADA' : reservation.status === 'PENDING_REVIEW' ? 'PAGO EN REVISIÓN' : reservation.status === 'EXPIRED' ? 'RESERVA VENCIDA' : reservation.status === 'CANCELLED' ? 'RESERVA RECHAZADA' : 'APARTADO'} timer={!reservation.status || reservation.status === 'ACTIVE' ? countdown : undefined} />
            <strong>Total de la reserva: {money(reservation.totalCrc)}</strong>
            <p>{reservation.status === 'CONFIRMED' ? 'Pago verificado. Tus boletos están confirmados.' : reservation.status === 'PENDING_REVIEW' ? 'Recibimos tu comprobante. Tus números quedan apartados mientras revisamos el pago.' : reservation.status === 'CANCELLED' ? `Comprobante rechazado: ${reservation.reviewNote || 'consultá con administración.'}` : reservation.status === 'EXPIRED' ? 'La reserva venció y los números se liberaron.' : 'Adjuntá el comprobante antes de que venza el plazo. Sin comprobante, los números se liberan.'}</p>
            {(reservation.status === 'PENDING_REVIEW' || ((!reservation.status || reservation.status === 'ACTIVE') && countdown !== '00:00')) && <ProofUploader token={reservation.token} proofCount={reservation.proofCount || 0} onUploaded={() => refreshReservation(reservation.token)} />}
            <div className="reservation-actions">
              <button className="reservation-action primary" onClick={async () => { try { await navigator.clipboard.writeText(reservation.token); setCodeCopied(true); } catch { setError('No se pudo copiar el código. Intentá de nuevo.'); } }}><Copy size={16}/>{codeCopied ? 'Código copiado' : 'Copiar código de consulta'}</button>
              <a className="reservation-action secondary" href={`/pedido#${reservation.token}`}>Ver mi pedido <ArrowRight size={16}/></a>
              <button className="reservation-action secondary" onClick={() => { setLookupCode(reservation.token); goPublic('lookup'); }}>Buscar mis boletos <ArrowRight size={16}/></button>
            </div>
          </div> : <div className="selection-footer"><div className="selection-summary"><span>{selected.length ? raffle.numbersPerSticker ? `${selected.length / raffle.numbersPerSticker} boletos · ${selected.length * (includeInverted ? 2 : 1)} números` : `${selected.length * (includeInverted ? 2 : 1)} números` : 'Elegí tu compra'}</span><strong>{selectedOffer(raffle, selected.length) && proposalReady ? money(selectedOffer(raffle, selected.length)!.priceCrc * (includeInverted ? 2 : 1)) : '—'}</strong></div><button className="button primary full" disabled={!proposalReady || busy || (includeInverted && !availableInverted)} onClick={() => setShowCheckout(true)}>Continuar con mi compra <ArrowRight size={17}/></button><p className="phase-note">El pago debe ser verificado por administración para confirmar tus boletos.</p></div>}
        </div>
      </div>
    </main>}

    {view === 'admin' && <main className={`admin-page${!adminUnlocked ? ' admin-entry' : ''}`}>
      <div className="admin-top"><div><div className="eyebrow">VNOVA TCG / STUDIO</div><h1>Tu panel de administración</h1><p>Elegí una sección para trabajar. Tus rifas y pagos, en un solo lugar.</p></div><div className="admin-badge"><LockKeyhole size={16}/> Acceso con clave</div></div>
      {!adminUnlocked ? <section className="admin-login"><div className="admin-login-icon"><LockKeyhole size={26}/></div><h2>Entrá a tu estudio</h2><form onSubmit={event => void unlockAdmin(event)} className="form-grid" autoComplete="on"><label>Usuario<input name="username" autoComplete="username" value="admin" readOnly /></label><label>Contraseña<input type="password" name="password" autoCapitalize="none" spellCheck={false} maxLength={128} required value={adminPin} onChange={event => setAdminPin(event.target.value)} autoComplete="current-password" placeholder="Contraseña" /></label><button className="button primary full" disabled={busy || !adminPin.length}>{busy ? 'Verificando...' : 'Ingresar al panel'} <ArrowRight size={17}/></button></form></section> : adminDetailId ? <AdminRaffleDetail id={adminDetailId} token={adminToken} onBack={closeAdminRaffle} onReview={setReviewReservationId} onChange={() => { void loadAdmin(); void loadRaffles(); void loadWinners(); }}/> : <>
        <section className="site-screen-control"><div><h2>Pantalla pública</h2><p>{comingSoon ? 'Solo se muestra Próximamente. Las compras están pausadas.' : 'El sitio está visible para los visitantes.'}</p><small>Al activarla se ocultan todas las páginas públicas. Las reservas existentes conservan su plazo.</small></div><button type="button" disabled={savingScreen || comingSoon === null} onClick={async () => {
          setSavingScreen(true);
          try {
            const result = await api<{comingSoon:boolean}>('/api/admin/site-settings', {method:'PUT',headers:{Authorization:'Bearer '+adminToken},body:JSON.stringify({comingSoon:!comingSoon})});
            setComingSoon(result.comingSoon);
          } catch (cause) { setError((cause as Error).message); }
          finally { setSavingScreen(false); }
        }}>{savingScreen ? 'Guardando…' : comingSoon ? 'Desactivar Próximamente' : 'Activar Próximamente'}</button></section>
        <div className="admin-stats"><div><small>RIFAS</small><strong>{adminRaffles.length}</strong><span>Creadas en el sistema</span></div><div><small>RESERVAS ACTIVAS</small><strong>{activeHolds.length}</strong><span>Con vencimiento</span></div><div><small>BOLETOS APARTADOS</small><strong>{heldTickets}</strong><span>Pendientes de confirmar</span></div></div>
        <div className="studio-navigation" role="group" aria-label="Secciones del estudio"><button type="button" aria-pressed={adminWorkspace === 'raffles'} onClick={() => setAdminWorkspace('raffles')}><Ticket size={20}/><span>Tus rifas<small>Gestioná premios, fotos y resultados</small></span><b>{adminRaffles.length}</b></button><button type="button" aria-pressed={adminWorkspace === 'create'} onClick={() => setAdminWorkspace('create')}><Plus size={20}/><span>Nueva rifa<small>Prepará y guardá tu próximo sorteo</small></span></button><button type="button" aria-pressed={adminWorkspace === 'payments'} onClick={() => setAdminWorkspace('payments')}><LockKeyhole size={20}/><span>Pagos y reservas<small>Revisá comprobantes pendientes</small></span><b>{adminReservations.length}</b></button><button type="button" aria-pressed={adminWorkspace === 'cards'} onClick={() => {setCardsOpened(true);setAdminWorkspace('cards');}}><Sparkles size={20}/><span>Cartas destacadas<small>Administrá las cartas de la portada</small></span></button></div>
        {cardsOpened && <div hidden={adminWorkspace !== 'cards'}><Suspense fallback={<p>Cargando cartas…</p>}><CardCatalogAdmin token={adminToken}/></Suspense></div>}
        <div className="admin-layout studio-workspace"><section className="admin-card studio-create" hidden={adminWorkspace !== 'create'} aria-label="Crear nueva rifa"><div className="card-title"><Plus size={20}/><h2>Nueva rifa</h2></div><p className="muted">Completá estos cinco apartados. Primero guardás un borrador; después lo revisás y lo publicás desde Tus rifas.</p><form onSubmit={createRaffle} className="form-grid studio-create-form"><nav className="create-section-nav" aria-label="Apartados de nueva rifa"><a href="#create-step-1">1 · Datos</a><a href="#create-step-2">2 · Premios</a><a href="#create-step-3">3 · Fotos</a><a href="#create-step-4">4 · Boletos</a><a href="#create-step-5">5 · Fecha y compra</a></nav><div className="studio-form-section" id="create-step-1"><h3>1. Nombre y enlace</h3><p>Definí cómo la van a reconocer tus compradores.</p><label>Nombre de la rifa<input required minLength={3} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="Ej. Rifa de octubre" /></label><label>Enlace de la rifa<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={event => setDraft({ ...draft, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="rifa-octubre" /><small>Solo letras minúsculas, números y guiones. Ejemplo: vnovatcg.com/rifa/rifa-octubre</small></label></div><div className="studio-form-section" id="create-step-2"><h3>2. Premios y descripción</h3><p>Indicá qué se gana y cómo se define cada premio.</p><PrizeEditor prizes={draft.prizes} sources={draft.prizeSources} onChange={(prizes, prizeSources) => setDraft({ ...draft, prizes, prizeSources })}/><label>Descripción<textarea value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} rows={3} placeholder="Contá de qué trata la rifa" /></label></div><div className="studio-form-section" id="create-step-3"><h3>3. Fotos del premio</h3><div className="photo-field"><span>Fotos del premio (hasta 3)</span><PhotoPicker title="Agregar fotos" hint={`${draftPhotos.length}/3 fotos · seleccioná varias a la vez (JPG, PNG o WebP)`} disabled={draftPhotos.length >= 3} onFiles={files => { const unique = files.filter(file => !draftPhotos.some(saved => saved.name === file.name && saved.size === file.size && saved.lastModified === file.lastModified)); if (draftPhotos.length + unique.length > 3) { setError('Podés agregar hasta 3 fotos por rifa.'); return; } setError(''); setDraftPhotos([...draftPhotos, ...unique]); }}/>{draftPhotos.length > 0 && <div className="pending-photos">{draftPhotos.map((file, index) => <PendingPhoto key={`${file.name}-${file.lastModified}-${index}`} file={file} onRemove={() => setDraftPhotos(current => current.filter((_, photoIndex) => photoIndex !== index))}/>)}</div>}</div></div><div className="studio-form-section" id="create-step-4"><h3>4. Boletos y precios</h3><p>Definí el total de números disponibles, cuántos incluye cada boleto y su precio.</p><div className="form-row"><label>Precio por boleto (₡)<input type="text" inputMode="numeric" pattern="[0-9]+" required maxLength={10} placeholder="Ej. 1000" value={draft.priceCrc} onChange={event => setDraft({ ...draft, priceCrc: event.target.value.replace(/\D/g, '') })} /></label><div className="select-field"><span>Cantidad de números</span><BrandSelect label="Cantidad de números" required value={draft.numberCount} onChange={value => setDraft({ ...draft, numberCount: value })} options={[{ value: '', label: 'Elegí una cantidad' }, ...numberCountOptions]}/></div></div><div className="inverted-settings"><label><input type="checkbox" checked={draft.invertedEnabled} onChange={event => setDraft({ ...draft, invertedEnabled: event.target.checked, invertedPrizeEnabled: event.target.checked && draft.invertedPrizeEnabled })}/> Ofrecer números invertidos adicionales por el doble del precio</label></div><label>Números incluidos por boleto<input type="number" min="1" max="20" step="1" required value={draft.numbersPerSticker} onChange={event => setDraft({ ...draft, numbersPerSticker: event.target.value })}/><small>Ejemplo: 1 boleto de ₡2.000 incluye 2 números; 15 boletos incluyen 30 números.</small></label></div><div className="studio-form-section" id="create-step-5"><h3>5. Fecha y tarjetas de compra</h3><DrawScheduleEditor mode={draft.drawMode} date={draft.drawDate} onChange={(drawMode,drawDate)=>setDraft({...draft,drawMode,drawDate})}/><StickerCardEditor cards={draftCards} onChange={setDraftCards} numbersPerSticker={Number(draft.numbersPerSticker)}/></div><div className="studio-save-note">El borrador no se muestra al público. Podés revisarlo antes de publicar.</div><button className="button primary full" disabled={busy}>Crear borrador <ArrowRight size={17}/></button></form></section>
        <section className="admin-card studio-raffles" hidden={adminWorkspace !== 'raffles'} aria-label="Administrar tus rifas"><div className="card-title"><Ticket size={20}/><h2>Tus rifas</h2></div><p className="muted">Editá los datos y precios, gestioná las ventas o prepará las fotos de cada rifa.</p><div className="admin-list">{adminRaffles.map(item => <article className="admin-raffle-card" key={item.id}><div className="admin-raffle-heading"><div className="admin-raffle-info"><strong>{item.title}</strong><span>{item.numberCount.toLocaleString('es-CR')} números · {money(item.priceCrc)} {item.numbersPerSticker ? `por boleto (${item.numbersPerSticker} números)` : 'c/u'}</span></div><div className="admin-raffle-actions"><span className={'state ' + item.status.toLowerCase()}>{item.isTest ? 'Prueba · oculta al público' : item.status === 'DRAFT' ? 'Borrador' : item.status === 'CLOSED' ? 'Finalizada' : 'Abierta · pública'}</span>{item.status === 'DRAFT' && <button type="button" className="admin-action-button" onClick={() => void publish(item.id)} disabled={busy || publishingId !== null}>{publishingId === item.id ? 'Publicando...' : 'Publicar rifa'}</button>}<button type="button" className="admin-action-button" onClick={() => setEditingRaffleId(item.id)}>Editar datos y precios</button><button type="button" className="admin-action-button" onClick={() => openAdminRaffle(item.id)}>Ventas y boletos</button></div></div>{publishFeedback?.id === item.id && <Confirmation variant={publishFeedback.error ? 'error' : 'success'} message={publishFeedback.text}/>}<div className="admin-photo-section"><div className="admin-photo-list">{item.photos.map(photo => <div className="admin-photo" key={photo.id}><AdminPhoto id={photo.id} token={adminToken}/><button type="button" onClick={() => void removePhoto(photo.id)} disabled={busy} aria-label="Eliminar foto"><X size={15}/></button></div>)}{item.photos.length === 0 && <span>Sin fotos todavía</span>}</div><PhotoPicker compact title={item.photos.length >= 3 ? 'Máximo de 3 fotos' : 'Agregar fotos'} disabled={busy || item.photos.length >= 3} onFiles={files => { if (files.length + item.photos.length > 3) { setError('Cada rifa admite hasta 3 fotos.'); return; } void addPhotos(item.id, files); }}/></div></article>)}{adminRaffles.length === 0 && <div className="empty-state small">Todavía no hay rifas creadas.</div>}</div></section></div>
        <section className="admin-card reservations-card" hidden={adminWorkspace !== 'payments'}><div className="card-title"><Ticket size={20}/><h2>Pagos y reservas</h2><button className="refresh-button" onClick={() => void loadAdmin()} disabled={busy}>Actualizar</button></div><p className="muted">Abrí cada reserva para ver el comprobante y verificar el pago. Esta lista se actualiza sola.</p><div className="reservation-list">{adminReservations.map(item => <div className="reservation-row" key={item.id}><div className="reservation-avatar">{item.buyerName.trim().charAt(0).toUpperCase()}</div><div className="reservation-person"><strong>{item.buyerName}</strong><span>{item.campaign.title}</span></div><div className="reservation-amount"><strong>{item.ticketCount}</strong><span>{item.ticketCount === 1 ? 'boleto' : 'boletos'}</span></div><div className="reservation-chips">{item.values.slice(0, 6).map(value => <span key={value}>{formatNumber(value, item.campaign.numberWidth)}</span>)}{item.values.length > 6 && <span>+{item.values.length - 6}</span>}</div><span className={'state ' + (item.status === 'PENDING_REVIEW' ? 'pending-review' : 'waiting-proof')}>{item.status === 'PENDING_REVIEW' ? 'En revisión' : 'Esperando comprobante'}</span><button className="admin-action-button" type="button" onClick={() => setReviewReservationId(item.id)}>Revisar</button></div>)}{adminReservations.length === 0 && <div className="empty-state small">Aún no hay reservas activas.</div>}</div></section>
      </>}
    </main>}

    {editingRaffleId && adminUnlocked && adminRaffles.find(item => item.id === editingRaffleId) && <EditRaffle key={editingRaffleId} raffle={adminRaffles.find(item => item.id === editingRaffleId)!} token={adminToken} onClose={() => setEditingRaffleId(null)} onUnauthorized={() => { setEditingRaffleId(null); expireAdminSession(); }} onSaved={() => { void loadAdmin(adminToken, true); void loadRaffles(); void loadWinners(); }} /> }
    {reviewReservationId && adminUnlocked && <AdminReservationReview id={reviewReservationId} token={adminToken} onClose={() => setReviewReservationId(null)} onReviewed={() => { void loadAdmin(adminToken, true); void loadRaffles(); }} />}

    {showCheckout && raffle && <CheckoutDialog onClose={() => setShowCheckout(false)}><div className="modal"><button className="modal-close" onClick={() => setShowCheckout(false)} aria-label="Cerrar"><X size={20}/></button><div className="eyebrow">TU PASE / PASO FINAL</div><h2 id="modal-title">Completá los datos de tu compra.</h2><p>Tu selección está protegida durante {holdCountdown}. Al confirmar, la reserva dura 30 minutos. Administración confirmará tus boletos cuando verifique el pago.</p><div className="modal-numbers">{[...selected, ...(includeInverted ? availableInverted || [] : [])].map(value => <span key={value}><Check size={14}/>{formatNumber(value, width)}</span>)}</div>{error && <Confirmation variant="error" message={error}/>}<form onSubmit={reserve} className="form-grid"><label>Nombre completo de la persona que realiza la compra<input required minLength={2} maxLength={120} autoComplete="name" value={buyer.buyerName} onChange={event => setBuyer({ ...buyer, buyerName: event.target.value })} /></label><label>Correo electrónico<input required type="email" maxLength={200} autoComplete="email" autoCapitalize="none" value={buyer.buyerEmail} onChange={event => setBuyer({ ...buyer, buyerEmail: event.target.value })} /></label><label>Teléfono<input required type="tel" inputMode="tel" minLength={8} maxLength={25} autoComplete="tel" value={buyer.buyerPhone} onChange={event => setBuyer({ ...buyer, buyerPhone: event.target.value })} /></label><SinpePaymentInfo/><label className="checkout-proof-field">Comprobante SINPE Móvil (podés adjuntarlo ahora o durante la reserva)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; const added = files.filter(file => !checkoutProofs.some(saved => saved.name === file.name && saved.size === file.size && saved.lastModified === file.lastModified)); if (checkoutProofs.length + added.length > 3) { setError('Máximo 3 fotos. Quitá una para agregar otra.'); return; } setError(''); setCheckoutProofs(current => [...current, ...added]); }} /><span>{checkoutProofs.length ? `${checkoutProofs.length} foto${checkoutProofs.length === 1 ? '' : 's'} lista${checkoutProofs.length === 1 ? '' : 's'}` : 'Seleccionar hasta 3 fotos'}</span></label><small>Podés elegir varias fotos a la vez o agregarlas en varias selecciones (máximo 3).</small>{checkoutProofs.length > 0 && <ul className="checkout-proof-list">{checkoutProofs.map((file, index) => <li key={file.name + ':' + file.lastModified}><span>{file.name}</span><button type="button" disabled={busy} onClick={() => setCheckoutProofs(current => current.filter((_, i) => i !== index))} aria-label={'Quitar ' + file.name}>Quitar</button></li>)}</ul>}<div className="modal-total"><span>{includeInverted ? 'Total con invertidos' : 'Total'}</span><strong>{money((selectedOffer(raffle, selected.length)?.priceCrc ?? 0) * (includeInverted ? 2 : 1))}</strong></div><button className="button primary full" disabled={busy}>{busy ? 'Apartando...' : 'Apartar números'} <ArrowRight size={17}/></button></form></div></CheckoutDialog>}

    {view !== 'admin' && <footer className="site-footer"><span className="footer-brand"><img src="/vnova-transparent.webp" alt="Logo de Vnova TCG"/></span><FooterSocials/></footer>}
  </div>;
}

