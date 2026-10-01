import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Clock3, Copy, LockKeyhole, Plus, Search, ShieldCheck, Sparkles, Ticket, Trophy, X } from 'lucide-react';

type Raffle = {
  id: string;
  slug: string;
  title: string;
  description: string;
  prize: string;
  imageUrl: string | null;
  photos: { id: string; url: string }[];
  priceCrc: number;
  numberCount: number;
  numberWidth: number;
  status: 'DRAFT' | 'LIVE';
  drawDate: string | null;
};
type EntryNumber = { value: number; status: 'AVAILABLE' | 'RESERVED' | 'SOLD' };
type Reservation = { token: string; expiresAt: string; values: number[]; totalCrc: number };
type LookupResult = {
  buyerName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  values: number[];
  campaign: { title: string; numberWidth: number; priceCrc: number };
};
type AdminReservation = {
  id: string;
  buyerName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
  expiresAt: string;
  ticketCount: number;
  values: number[];
  campaign: { title: string; numberWidth: number };
};
type View = 'home' | 'raffle' | 'lookup' | 'winners' | 'admin';

const ADMIN_PATH = '/estudio-cifraya';
function viewFromPath(path: string): View {
  if (path === ADMIN_PATH) return 'admin';
  if (path === '/buscar-boletos') return 'lookup';
  if (path === '/ganadores') return 'winners';
  if (path.startsWith('/rifa/')) return 'raffle';
  return 'home';
}
const money = (amount: number) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(amount);
const formatNumber = (value: number, width: number) => String(value).padStart(width, '0');
const coverOf = (item: Raffle) => item.photos?.[0]?.url || item.imageUrl;

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

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (options?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, { ...options, headers });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Ocurrió un error');
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

function TicketPass({ name, title, values, width, count, status, timer }: {
  name: string; title: string; values: number[]; width: number; count: number; status: string; timer?: string;
}) {
  return <article className="ticket-pass" aria-label={'Boleto de ' + name}>
    <div className="ticket-main">
      <div className="ticket-meta"><span>CIFRAYA / BOLETO DIGITAL</span><span className="ticket-status">{status}</span></div>
      <div className="ticket-star"><Sparkles size={30} strokeWidth={1.5} /></div>
      <div className="ticket-person"><small>A NOMBRE DE</small><strong>{name}</strong></div>
      <div className="ticket-quantity"><span>{count}</span><div>BOLETO{count === 1 ? '' : 'S'}<small>{title}</small></div></div>
    </div>
    <div className="ticket-stub">
      <span>NÚMEROS</span>
      <div className="ticket-values">{values.map(value => <strong key={value}>{formatNumber(value, width)}</strong>)}</div>
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

export default function App() {
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [numbers, setNumbers] = useState<EntryNumber[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [buyer, setBuyer] = useState({ buyerName: '', buyerEmail: '', buyerPhone: '' });
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminRaffles, setAdminRaffles] = useState<Raffle[]>([]);
  const [adminReservations, setAdminReservations] = useState<AdminReservation[]>([]);
  const [draft, setDraft] = useState({ title: '', slug: '', prize: '', description: '', priceCrc: '', numberCount: '' });
  const [draftPhotos, setDraftPhotos] = useState<File[]>([]);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishFeedback, setPublishFeedback] = useState<{ id: string; text: string; error: boolean } | null>(null);
  const countdown = useCountdown(reservation?.expiresAt);
  const lookupCountdown = useCountdown(lookupResult?.status === 'ACTIVE' ? lookupResult.expiresAt : undefined);

  async function loadRaffles() {
    try { setRaffles(await api<Raffle[]>('/api/campaigns')); }
    catch { setError('No se pudo cargar la rifa. Intentá de nuevo en un minuto.'); }
  }

  async function openRaffle(slug: string, navigate = true) {
    setBusy(true); setError(''); setSelected([]); setReservation(null); setShowCheckout(false); setPage(1); setActivePhotoId(null);
    try {
      const result = await api<Raffle>('/api/campaigns/' + encodeURIComponent(slug));
      const list = await api<{ numbers: EntryNumber[]; pageCount: number }>('/api/campaigns/' + encodeURIComponent(slug) + '/numbers?page=1');
      setRaffle(result); setNumbers(list.numbers); setPageCount(list.pageCount); setView('raffle');
      if (navigate) window.history.pushState({}, '', '/rifa/' + encodeURIComponent(slug));
      window.scrollTo(0, 0);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  function goPublic(next: 'home' | 'lookup' | 'winners') {
    const path = next === 'home' ? '/' : next === 'lookup' ? '/buscar-boletos' : '/ganadores';
    window.history.pushState({}, '', path);
    setView(next); setError(''); setShowCheckout(false); setAdminToken(''); setAdminUnlocked(false);
    if (next === 'home') void loadRaffles();
    window.scrollTo(0, 0);
  }

  function goHome() { goPublic('home'); }

  useEffect(() => {
    void loadRaffles();
    const pathname = window.location.pathname;
    if (pathname.startsWith('/rifa/')) void openRaffle(decodeURIComponent(pathname.slice(6)), false);
    function onPopState() {
      const path = window.location.pathname;
      if (path.startsWith('/rifa/')) void openRaffle(decodeURIComponent(path.slice(6)), false);
      else setView(viewFromPath(path));
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  async function changePage(next: number) {
    if (!raffle || next < 1 || next > pageCount) return;
    setBusy(true); setError('');
    try {
      const list = await api<{ numbers: EntryNumber[]; pageCount: number }>('/api/campaigns/' + raffle.slug + '/numbers?page=' + next);
      setNumbers(list.numbers); setPage(next);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  function toggleNumber(value: number) {
    setSelected(current => current.includes(value) ? current.filter(item => item !== value) : current.length < 20 ? [...current, value] : current);
  }

  async function reserve(event: FormEvent) {
    event.preventDefault();
    if (!raffle || selected.length === 0) return;
    setBusy(true); setError('');
    try {
      const result = await api<Reservation>('/api/reservations', {
        method: 'POST', body: JSON.stringify({ campaignId: raffle.id, values: selected, ...buyer }),
      });
      setReservation(result); setShowCheckout(false);
      const list = await api<{ numbers: EntryNumber[]; pageCount: number }>('/api/campaigns/' + raffle.slug + '/numbers?page=' + page);
      setNumbers(list.numbers);
    } catch (cause) { setError((cause as Error).message); }
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

  async function loadAdmin() {
    if (adminToken.length < 24) {
      setError('La clave del panel debe tener al menos 24 caracteres. Revisá ADMIN_TOKEN en Render.');
      return;
    }
    setBusy(true); setError('');
    try {
      const headers = { Authorization: 'Bearer ' + adminToken };
      const [list, holds] = await Promise.all([
        api<Raffle[]>('/api/admin/campaigns', { headers }),
        api<AdminReservation[]>('/api/admin/reservations', { headers }),
      ]);
      setAdminRaffles(list); setAdminReservations(holds); setAdminUnlocked(true);
    } catch (cause) {
      setAdminUnlocked(false); setAdminRaffles([]); setAdminReservations([]);
      setError((cause as Error).message === 'Acceso no autorizado'
        ? 'La clave no coincide con ADMIN_TOKEN de Render. Copiá el valor exacto desde Environment.'
        : (cause as Error).message);
    } finally { setBusy(false); }
  }

  async function createRaffle(event: FormEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const priceCrc = Number(draft.priceCrc);
    const numberCount = Number(draft.numberCount);
    if (!Number.isInteger(priceCrc) || priceCrc < 1 || priceCrc > 2_147_483_647 ||
        !Number.isInteger(numberCount) || numberCount < 10 || numberCount > 100000) {
      setError('Ingresá un precio válido y una cantidad entre 10 y 100 000 boletos.');
      return;
    }
    setBusy(true); setError('');
    let created = false;
    try {
      const campaign = await api<{ id: string }>('/api/admin/campaigns', { method: 'POST', headers: { Authorization: 'Bearer ' + adminToken }, body: JSON.stringify({ ...draft, priceCrc, numberCount }) });
      created = true;
      const files = [...draftPhotos];
      setDraft({ title: '', slug: '', prize: '', description: '', priceCrc: '', numberCount: '' });
      setDraftPhotos([]);
      form.reset();
      for (const file of files) {
        const photo = await preparePhoto(file);
        await api(`/api/admin/campaigns/${campaign.id}/photos`, { method: 'POST', headers: { Authorization: 'Bearer ' + adminToken }, body: JSON.stringify(photo) });
      }
      await loadAdmin();
    } catch (cause) {
      if (created) await loadAdmin();
      setError((created ? 'La rifa se creó, pero faltó cargar alguna foto. Podés agregarla en Tus rifas. ' : '') + (cause as Error).message);
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
    } catch (cause) { await loadAdmin(); setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function removePhoto(id: string) {
    setBusy(true); setError('');
    try {
      await api(`/api/admin/campaign-photos/${id}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + adminToken } });
      await Promise.all([loadAdmin(), loadRaffles()]);
    } catch (cause) { setError((cause as Error).message); }
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
      setPublishFeedback({ id, text: (cause as Error).message || 'No se pudo publicar la rifa.', error: true });
    } finally { setPublishingId(null); }
  }

  const width = raffle?.numberWidth ?? 3;
  const activeHolds = adminReservations.filter(item => item.status === 'ACTIVE');
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
        <div className="current-raffle-content"><span className="current-label">RIFA ACTUAL</span><h1>{featured.title}</h1><div className="current-prize">{featured.prize}</div><div className="current-price">{money(featured.priceCrc)} <span>por número</span></div><button className="button primary" onClick={() => void openRaffle(featured.slug)}>Elegir números <ArrowRight size={18}/></button><p>Reserva de prueba · 30 minutos</p></div>
      </section> : <section className="current-raffle current-empty"><img src="/cifraya-logo.png" alt=""/><div><span className="current-label">CIFRAYA</span><h1>Próxima rifa</h1><p>Estamos preparando la siguiente rifa.</p></div></section>}

      {raffles.length > 1 && <section className="section raffles-section" id="rifas">
        <div className="section-heading"><div><h2>Más rifas</h2></div></div>
        <div className="raffle-grid">{raffles.slice(1).map((item, index) => <article className="raffle-card" key={item.id}>
          <div className="raffle-cover">{coverOf(item) ? <img src={coverOf(item)!} alt={item.prize} /> : <div className="cover-placeholder"><span className="cover-index">0{index + 1}</span><Sparkles size={58} strokeWidth={1.2}/><span>ALGO BUENO VIENE</span></div>}<span className="cover-status">RIFA ABIERTA</span></div>
          <div className="raffle-body"><div className="raffle-overline">{item.numberCount.toLocaleString('es-CR')} BOLETOS EN ESTA RIFA</div><h3>{item.title}</h3><p>{item.description || 'Elegí tu boleto favorito y apartalo para esta rifa.'}</p><div className="raffle-facts"><div><small>PREMIO</small><strong>{item.prize}</strong></div><div><small>POR BOLETO</small><strong>{money(item.priceCrc)}</strong></div></div><button className="button dark full" onClick={() => void openRaffle(item.slug)}>Entrar a la rifa <ArrowRight size={17} /></button></div>
        </article>)}</div>
      </section>}

      <section className="how-section"><div className="how-inner"><div className="eyebrow">ASÍ DE SIMPLE</div><h2>Un número.<br /><em>Una posibilidad.</em></h2><div className="how-grid"><div><span>01</span><h3>Entrá a una rifa</h3><p>Descubrí el premio y el valor de cada boleto.</p></div><div><span>02</span><h3>Elegí tus boletos</h3><p>Los disponibles se ven al instante. Podés seleccionar hasta 20.</p></div><div><span>03</span><h3>Revisá tu pase</h3><p>La reserva de prueba muestra tu nombre, tus números y su vencimiento.</p></div></div></div></section>
    </main>}

    {view === 'lookup' && <main className="public-page">
      <div className="public-intro"><div className="eyebrow">CIFRAYA / TUS BOLETOS</div><h1>Encontrá tus <em>números.</em></h1><p>Ingresá el código que recibiste al apartar tus números para consultar tu pase de prueba y su estado.</p></div>
      <div className="lookup-layout"><section className="lookup-card"><div className="public-icon"><Search size={27}/></div><h2>Buscar boletos</h2><p>El código es privado. Lo podés copiar desde el pase que aparece al hacer la reserva.</p><form onSubmit={event => void lookupTickets(event)} className="form-grid"><label>Código de consulta<input value={lookupCode} onChange={event => setLookupCode(event.target.value)} placeholder="Pegá aquí tu código" autoComplete="off" spellCheck={false} required maxLength={48}/></label><button className="button dark full" disabled={busy || lookupCode.trim().length !== 48}>Consultar mi pase <ArrowRight size={17}/></button></form><span className="lookup-help"><LockKeyhole size={15}/> Solo quien tenga el código puede ver este pase.</span></section>
      <section className="lookup-result">{lookupResult ? <><TicketPass name={lookupResult.buyerName} title={lookupResult.campaign.title} values={lookupResult.values} width={lookupResult.campaign.numberWidth} count={lookupResult.values.length} status={lookupResult.status === 'ACTIVE' ? 'APARTADO · DEMO' : lookupResult.status === 'EXPIRED' ? 'RESERVA VENCIDA' : 'RESERVA CANCELADA'} timer={lookupResult.status === 'ACTIVE' ? lookupCountdown : undefined}/><p>{lookupResult.status === 'ACTIVE' ? 'Este pase es una reserva de prueba; todavía no representa una compra confirmada.' : 'Esta reserva ya no está vigente. Sus números pueden volver a estar disponibles.'}</p></> : <div className="lookup-placeholder"><Ticket size={42} strokeWidth={1.3}/><span>EL PASE APARECERÁ AQUÍ</span><p>Nombre, cantidad de boletos, números y estado en un solo lugar.</p></div>}</section></div>
    </main>}

    {view === 'winners' && <main className="public-page winners-page"><div className="public-intro"><div className="eyebrow">CIFRAYA / RESULTADOS</div><h1>Historias que <em>ganan.</em></h1><p>Este espacio mostrará los resultados de las rifas una vez que se realicen los sorteos.</p></div><section className="winners-empty"><div className="winner-symbol"><Trophy size={68} strokeWidth={1.2}/></div><div><span className="eyebrow">PRÓXIMAMENTE</span><h2>Aún no hay ganadores publicados.</h2><p>Estamos en fase de prueba. Cuando haya un sorteo validado, su resultado aparecerá aquí con los datos necesarios para verificarlo.</p><button className="button dark" onClick={goHome}>Ver rifas <ArrowRight size={17}/></button></div></section></main>}

    {view === 'raffle' && raffle && <main className="section detail-page">
      <button className="text-button" onClick={goHome}><ChevronLeft size={17}/> Todas las rifas</button>
      <div className="detail-heading"><span className="eyebrow">RIFA ABIERTA / DEMO</span><h1>{raffle.title}</h1><p>Elegí tu boleto. El momento es tuyo.</p></div>
      <div className="detail-layout">
        <div><div className="detail-image">{activePhotoId || coverOf(raffle) ? <img src={raffle.photos.find(photo => photo.id === activePhotoId)?.url || coverOf(raffle)!} alt={raffle.prize} /> : <div className="cover-placeholder"><Sparkles size={84} strokeWidth={1}/><span>ALGO BUENO VIENE</span></div>}</div>{raffle.photos.length > 1 && <div className="photo-thumbnails" aria-label="Fotos del premio">{raffle.photos.map((photo, index) => <button key={photo.id} className={activePhotoId === photo.id || (!activePhotoId && index === 0) ? 'active' : ''} onClick={() => setActivePhotoId(photo.id)} aria-label={`Ver foto ${index + 1}`} aria-pressed={activePhotoId === photo.id || (!activePhotoId && index === 0)}><img src={photo.url} alt=""/></button>)}</div>}<div className="detail-description"><div className="eyebrow">EL PREMIO</div><h2>{raffle.prize}</h2><p>{raffle.description || 'Elegí tus boletos favoritos para esta rifa de prueba.'}</p><div className="info-strip"><ShieldCheck size={20}/><span>Cada número se aparta de forma exclusiva durante 30 minutos.</span></div></div></div>
        <div className="detail-side">
          <div className="detail-side-top"><span className="status-label">RIFA ABIERTA</span><span>{money(raffle.priceCrc)} / boleto</span></div>
          <div className="selection-head"><div><h2>Elegí tus números</h2><p>Tocá los disponibles para agregarlos a tu pase.</p></div><span className="small-count">{selected.length} / 20</span></div>
          <div className="number-legend"><span><i className="available"/> Disponible</span><span><i className="chosen"/> Elegido</span><span><i className="taken"/> Apartado</span></div>
          <div className="number-grid">{numbers.map(number => <button key={number.value} className={'number ' + (selected.includes(number.value) ? 'selected' : '')} disabled={number.status !== 'AVAILABLE' || Boolean(reservation)} onClick={() => toggleNumber(number.value)} aria-pressed={selected.includes(number.value)} aria-label={'Número ' + formatNumber(number.value, width) + ': ' + (number.status === 'AVAILABLE' ? 'disponible' : 'no disponible')}>{formatNumber(number.value, width)}</button>)}</div>
          <div className="pagination"><button disabled={page <= 1 || busy} onClick={() => void changePage(page - 1)} aria-label="Página anterior"><ChevronLeft size={17}/></button><span>{page} / {pageCount}</span><button disabled={page >= pageCount || busy} onClick={() => void changePage(page + 1)} aria-label="Página siguiente"><ChevronRight size={17}/></button></div>
          {reservation ? <div className="reservation-result">
            <TicketPass name={buyer.buyerName} title={raffle.title} values={reservation.values} width={width} count={reservation.values.length} status="APARTADO · DEMO" timer={countdown} />
            <p>Este pase muestra una <strong>reserva de prueba</strong>, no una compra. Los números se liberan al vencer el plazo.</p>
            <button className="copy-token" onClick={() => void navigator.clipboard.writeText(reservation.token)}><Copy size={15}/> Copiar código de consulta</button>
            <button className="copy-token" onClick={() => { setLookupCode(reservation.token); goPublic('lookup'); }}>Ver en Buscar boletos <ArrowRight size={15}/></button>
          </div> : <div className="selection-footer"><div className="selection-summary"><span>{selected.length} {selected.length === 1 ? 'boleto elegido' : 'boletos elegidos'}</span><strong>{money(selected.length * raffle.priceCrc)}</strong></div><button className="button primary full" disabled={selected.length === 0 || busy} onClick={() => setShowCheckout(true)}>Continuar con {selected.length || 'tus'} {selected.length === 1 ? 'boleto' : 'boletos'} <ArrowRight size={17}/></button><p className="phase-note">Demostración sin pagos ni boletos confirmados.</p></div>}
        </div>
      </div>
    </main>}

    {view === 'admin' && <main className="admin-page">
      <div className="admin-top"><div><div className="eyebrow">CIFRAYA / ESTUDIO</div><h1>Centro de control<span>✳</span></h1><p>Tu espacio para crear rifas y revisar las reservas de prueba.</p></div><div className="admin-badge"><LockKeyhole size={16}/> Acceso con clave</div></div>
      {!adminUnlocked ? <section className="admin-login"><div className="admin-login-icon"><LockKeyhole size={26}/></div><h2>Entrá a tu estudio</h2><p>La dirección abre el panel; la clave protege los datos y las acciones.</p><form onSubmit={event => { event.preventDefault(); void loadAdmin(); }} className="form-grid"><label>Clave del panel<input type="password" required value={adminToken} onChange={event => setAdminToken(event.target.value)} autoComplete="off" placeholder="ADMIN_TOKEN de Render" /></label><button className="button primary full" disabled={busy}>{busy ? 'Verificando...' : 'Ingresar al panel'} <ArrowRight size={17}/></button></form></section> : <>
        <div className="admin-stats"><div><small>RIFAS</small><strong>{adminRaffles.length}</strong><span>Creadas en el sistema</span></div><div><small>RESERVAS ACTIVAS</small><strong>{activeHolds.length}</strong><span>De prueba, con vencimiento</span></div><div><small>BOLETOS APARTADOS</small><strong>{heldTickets}</strong><span>Ninguno es una compra</span></div></div>
        <div className="admin-layout"><section className="admin-card"><div className="card-title"><Plus size={20}/><h2>Nueva rifa</h2></div><p className="muted">Se crea como borrador. Publicala cuando esté lista.</p><form onSubmit={createRaffle} className="form-grid"><label>Nombre de la rifa<input required minLength={3} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="Ej. Rifa de octubre" /></label><label>Identificador URL<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={event => setDraft({ ...draft, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="rifa-octubre" /></label><label>Premio<input required value={draft.prize} onChange={event => setDraft({ ...draft, prize: event.target.value })} placeholder="Premio principal" /></label><label>Descripción<textarea value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} rows={3} placeholder="Contá de qué trata la rifa" /></label><div className="form-row"><label>Precio por boleto (₡)<input type="text" inputMode="numeric" pattern="[0-9]+" required maxLength={10} placeholder="Ej. 1000" value={draft.priceCrc} onChange={event => setDraft({ ...draft, priceCrc: event.target.value.replace(/\D/g, '') })} /></label><label>Cantidad de boletos<input type="text" inputMode="numeric" pattern="[0-9]+" required maxLength={6} placeholder="Ej. 100" value={draft.numberCount} onChange={event => setDraft({ ...draft, numberCount: event.target.value.replace(/\D/g, '') })} /></label></div><label>Fotos del premio (hasta 5)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => { const files = Array.from(event.target.files || []); if (files.length > 5) { setError('Podés agregar hasta 5 fotos por rifa.'); event.target.value = ''; return; } setDraftPhotos(files); }} /><span className="photo-hint">{draftPhotos.length ? `${draftPhotos.length} foto${draftPhotos.length === 1 ? '' : 's'} seleccionada${draftPhotos.length === 1 ? '' : 's'}` : 'JPG, PNG o WebP. Las fotos se optimizan al cargar.'}</span></label><button className="button primary full" disabled={busy}>Crear borrador <ArrowRight size={17}/></button></form></section>
        <section className="admin-card"><div className="card-title"><Ticket size={20}/><h2>Tus rifas</h2></div><p className="muted">Administrá las fotos antes o después de publicar.</p><div className="admin-list">{adminRaffles.map(item => <div className="admin-item admin-raffle-item" key={item.id}><div className="admin-raffle-heading"><div><strong>{item.title}</strong><span>{item.numberCount.toLocaleString('es-CR')} boletos · {money(item.priceCrc)} c/u</span></div><div><span className={'state ' + item.status.toLowerCase()}>{item.status === 'DRAFT' ? 'Borrador' : 'Abierta'}</span>{item.status === 'DRAFT' ? <button type="button" className="mini-button" onClick={() => void publish(item.id)} disabled={busy || publishingId !== null}>{publishingId === item.id ? 'Publicando...' : 'Publicar'}</button> : <button type="button" className="mini-button" onClick={() => void openRaffle(item.slug)}>Ver rifa</button>}</div></div>{publishFeedback?.id === item.id && <p className={publishFeedback.error ? 'publish-feedback error' : 'publish-feedback'} role="status">{publishFeedback.text}</p>}<div className="admin-photo-list">{item.photos.map(photo => <div className="admin-photo" key={photo.id}><AdminPhoto id={photo.id} token={adminToken}/><button type="button" onClick={() => void removePhoto(photo.id)} disabled={busy} aria-label="Eliminar foto"><X size={15}/></button></div>)}{item.photos.length === 0 && <span>Sin fotos todavía</span>}</div><label className="admin-photo-upload">{item.photos.length >= 5 ? 'Máximo de 5 fotos' : 'Agregar fotos'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || item.photos.length >= 5} onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; if (files.length + item.photos.length > 5) { setError('Cada rifa admite hasta 5 fotos.'); return; } void addPhotos(item.id, files); }}/></label></div>)}{adminRaffles.length === 0 && <div className="empty-state small">Todavía no hay rifas creadas.</div>}</div></section></div>
        <section className="admin-card reservations-card"><div className="card-title"><Ticket size={20}/><h2>Boletos y personas</h2><button className="refresh-button" onClick={() => void loadAdmin()} disabled={busy}>Actualizar</button></div><p className="muted">Reservas activas de prueba. Aún no existe un estado de compra confirmada.</p><div className="reservation-list">{adminReservations.map(item => <div className="reservation-row" key={item.id}><div className="reservation-avatar">{item.buyerName.trim().charAt(0).toUpperCase()}</div><div className="reservation-person"><strong>{item.buyerName}</strong><span>{item.campaign.title}</span></div><div className="reservation-amount"><strong>{item.ticketCount}</strong><span>{item.ticketCount === 1 ? 'boleto' : 'boletos'}</span></div><div className="reservation-chips">{item.values.slice(0, 6).map(value => <span key={value}>{formatNumber(value, item.campaign.numberWidth)}</span>)}{item.values.length > 6 && <span>+{item.values.length - 6}</span>}</div><span className="state active">Apartado</span></div>)}{adminReservations.length === 0 && <div className="empty-state small">Aún no hay reservas activas.</div>}</div></section>
      </>}
    </main>}

    {showCheckout && raffle && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowCheckout(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={() => setShowCheckout(false)} aria-label="Cerrar"><X size={20}/></button><div className="eyebrow">TU PASE / PASO FINAL</div><h2 id="modal-title">Dale nombre a tu boleto.</h2><p>Demostración: usá datos ficticios. La reserva dura 30 minutos y no implica un pago.</p><div className="modal-numbers">{selected.map(value => <span key={value}><Check size={14}/>{formatNumber(value, width)}</span>)}</div><form onSubmit={reserve} className="form-grid"><label>Nombre en el boleto<input required minLength={2} autoComplete="off" value={buyer.buyerName} onChange={event => setBuyer({ ...buyer, buyerName: event.target.value })} /></label><label>Correo de prueba<input required type="email" autoComplete="off" value={buyer.buyerEmail} onChange={event => setBuyer({ ...buyer, buyerEmail: event.target.value })} /></label><label>Teléfono de prueba<input required minLength={8} autoComplete="off" value={buyer.buyerPhone} onChange={event => setBuyer({ ...buyer, buyerPhone: event.target.value })} /></label><div className="modal-total"><span>Total de referencia</span><strong>{money(selected.length * raffle.priceCrc)}</strong></div><button className="button primary full" disabled={busy}>{busy ? 'Apartando...' : 'Crear reserva de prueba'} <ArrowRight size={17}/></button></form></div></div>}

    <footer className="site-footer"><span className="footer-brand"><img src="/cifraya-logo.png" alt="Logo de Cifraya"/></span></footer>
  </div>;
}
