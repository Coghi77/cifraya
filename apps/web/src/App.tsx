import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Clock3, Copy, LockKeyhole, Plus, ShieldCheck, Sparkles, Ticket, X } from 'lucide-react';

type Raffle = {
  id: string;
  slug: string;
  title: string;
  description: string;
  prize: string;
  imageUrl: string | null;
  priceCrc: number;
  numberCount: number;
  numberWidth: number;
  status: 'DRAFT' | 'LIVE';
  drawDate: string | null;
};
type EntryNumber = { value: number; status: 'AVAILABLE' | 'RESERVED' | 'SOLD' };
type Reservation = { token: string; expiresAt: string; values: number[]; totalCrc: number };
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
type View = 'home' | 'raffle' | 'admin';

const ADMIN_PATH = '/estudio-cifraya';
const money = (amount: number) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(amount);
const formatNumber = (value: number, width: number) => String(value).padStart(width, '0');

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
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

export default function App() {
  const [view, setView] = useState<View>(() => window.location.pathname === ADMIN_PATH ? 'admin' : window.location.pathname.startsWith('/rifa/') ? 'raffle' : 'home');
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [numbers, setNumbers] = useState<EntryNumber[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [buyer, setBuyer] = useState({ buyerName: '', buyerEmail: '', buyerPhone: '' });
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminRaffles, setAdminRaffles] = useState<Raffle[]>([]);
  const [adminReservations, setAdminReservations] = useState<AdminReservation[]>([]);
  const [draft, setDraft] = useState({ title: '', slug: '', prize: '', description: '', priceCrc: '', numberCount: '' });
  const countdown = useCountdown(reservation?.expiresAt);

  async function loadRaffles() {
    try { setRaffles(await api<Raffle[]>('/api/campaigns')); }
    catch { setError('No se pudo cargar la rifa. Intentá de nuevo en un minuto.'); }
  }

  async function openRaffle(slug: string, navigate = true) {
    setBusy(true); setError(''); setSelected([]); setReservation(null); setShowCheckout(false); setPage(1);
    try {
      const result = await api<Raffle>('/api/campaigns/' + encodeURIComponent(slug));
      const list = await api<{ numbers: EntryNumber[]; pageCount: number }>('/api/campaigns/' + encodeURIComponent(slug) + '/numbers?page=1');
      setRaffle(result); setNumbers(list.numbers); setPageCount(list.pageCount); setView('raffle');
      if (navigate) window.history.pushState({}, '', '/rifa/' + encodeURIComponent(slug));
      window.scrollTo(0, 0);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  function goHome() {
    window.history.pushState({}, '', '/');
    setView('home'); setError(''); setShowCheckout(false); setAdminToken(''); setAdminUnlocked(false);
    void loadRaffles(); window.scrollTo(0, 0);
  }

  useEffect(() => {
    void loadRaffles();
    const pathname = window.location.pathname;
    if (pathname.startsWith('/rifa/')) void openRaffle(decodeURIComponent(pathname.slice(6)), false);
    function onPopState() {
      const path = window.location.pathname;
      if (path === ADMIN_PATH) setView('admin');
      else if (path.startsWith('/rifa/')) void openRaffle(decodeURIComponent(path.slice(6)), false);
      else setView('home');
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

  async function loadAdmin() {
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
      setError((cause as Error).message);
    } finally { setBusy(false); }
  }

  async function createRaffle(event: FormEvent) {
    event.preventDefault();
    const priceCrc = Number(draft.priceCrc);
    const numberCount = Number(draft.numberCount);
    if (!Number.isInteger(priceCrc) || priceCrc < 1 || priceCrc > 2_147_483_647 ||
        !Number.isInteger(numberCount) || numberCount < 10 || numberCount > 100000) {
      setError('Ingresá un precio válido y una cantidad entre 10 y 100 000 boletos.');
      return;
    }
    setBusy(true); setError('');
    try {
      await api('/api/admin/campaigns', { method: 'POST', headers: { Authorization: 'Bearer ' + adminToken }, body: JSON.stringify({ ...draft, priceCrc, numberCount }) });
      setDraft({ title: '', slug: '', prize: '', description: '', priceCrc: '', numberCount: '' });
      await loadAdmin();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function publish(id: string) {
    setBusy(true); setError('');
    try {
      await api('/api/admin/campaigns/' + id + '/publish', { method: 'POST', headers: { Authorization: 'Bearer ' + adminToken } });
      await Promise.all([loadAdmin(), loadRaffles()]);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  const width = raffle?.numberWidth ?? 3;
  const activeHolds = adminReservations.filter(item => item.status === 'ACTIVE');
  const heldTickets = activeHolds.reduce((sum, item) => sum + item.ticketCount, 0);

  return <div className={'app-shell ' + (view === 'admin' ? 'admin-shell' : '')}>
    <header className="site-header">
      <button className="brand" onClick={goHome} aria-label="Ir al inicio"><span className="brand-mark"><Sparkles size={19} /></span><span>CIFRA<span className="brand-light">YA</span></span></button>
      <nav aria-label="Navegación principal">
        {view === 'admin' ? <button onClick={goHome}>Volver al sitio <ArrowRight size={15} /></button> : <button onClick={goHome}>Rifas <ArrowRight size={15} /></button>}
      </nav>
      <span className="local-pill"><span /> DEMO / SIN PAGOS</span>
    </header>

    {error && <div className="alert" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Cerrar aviso"><X size={17} /></button></div>}

    {view === 'home' && <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> UNA NUEVA FORMA DE ELEGIR</div>
          <h1>La suerte<br />tiene <em>tu número.</em></h1>
          <p>Entrá a la rifa, elegí los boletos que te gustan y mirá su disponibilidad al instante. Esta es una experiencia de prueba, sin pagos.</p>
          <a href="#rifas" className="button primary">Explorar rifas <ArrowRight size={18} /></a>
          <div className="hero-note"><ShieldCheck size={17} /> Apartado exclusivo por 30 minutos</div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-ring ring-one" /><div className="hero-ring ring-two" />
          <div className="hero-mini">NUEVA<br />ENERGÍA<br />PARA JUGAR</div>
          <div className="ticket-art">
            <span className="ticket-art-top">CIFRAYA <span>✳</span> EDICIÓN 001</span>
            <div className="ticket-art-center"><span>BOLETO</span><strong>08</strong><em>Tu momento empieza aquí.</em></div>
            <span className="ticket-art-bottom">ABRÍ · ELEGÍ · APARTÁ <ArrowRight size={24}/></span>
          </div>
        </div>
      </section>

      <section className="section raffles-section" id="rifas">
        <div className="section-heading"><div><div className="eyebrow">ELEGÍ TU PRÓXIMO MOMENTO</div><h2>Rifas abiertas<span className="heading-star">✳</span></h2></div><span className="count-pill">{raffles.length} {raffles.length === 1 ? 'rifa' : 'rifas'}</span></div>
        <div className="raffle-grid">{raffles.map((item, index) => <article className="raffle-card" key={item.id}>
          <div className="raffle-cover">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <div className="cover-placeholder"><span className="cover-index">0{index + 1}</span><Sparkles size={58} strokeWidth={1.2}/><span>ALGO BUENO VIENE</span></div>}<span className="cover-status">RIFA ABIERTA</span></div>
          <div className="raffle-body"><div className="raffle-overline">{item.numberCount.toLocaleString('es-CR')} BOLETOS EN ESTA RIFA</div><h3>{item.title}</h3><p>{item.description || 'Elegí tu boleto favorito y apartalo para esta rifa.'}</p><div className="raffle-facts"><div><small>PREMIO</small><strong>{item.prize}</strong></div><div><small>POR BOLETO</small><strong>{money(item.priceCrc)}</strong></div></div><button className="button dark full" onClick={() => void openRaffle(item.slug)}>Entrar a la rifa <ArrowRight size={17} /></button></div>
        </article>)}</div>
        {raffles.length === 0 && <div className="empty-state"><Sparkles size={26}/><h3>Pronto habrá algo por descubrir.</h3><p>Estamos preparando la primera rifa de prueba.</p></div>}
      </section>

      <section className="how-section"><div className="how-inner"><div className="eyebrow">ASÍ DE SIMPLE</div><h2>Un número.<br /><em>Una posibilidad.</em></h2><div className="how-grid"><div><span>01</span><h3>Entrá a una rifa</h3><p>Descubrí el premio y el valor de cada boleto.</p></div><div><span>02</span><h3>Elegí tus boletos</h3><p>Los disponibles se ven al instante. Podés seleccionar hasta 20.</p></div><div><span>03</span><h3>Revisá tu pase</h3><p>La reserva de prueba muestra tu nombre, tus números y su vencimiento.</p></div></div></div></section>
    </main>}

    {view === 'raffle' && raffle && <main className="section detail-page">
      <button className="text-button" onClick={goHome}><ChevronLeft size={17}/> Todas las rifas</button>
      <div className="detail-heading"><span className="eyebrow">RIFA ABIERTA / DEMO</span><h1>{raffle.title}</h1><p>Elegí tu boleto. El momento es tuyo.</p></div>
      <div className="detail-layout">
        <div><div className="detail-image">{raffle.imageUrl ? <img src={raffle.imageUrl} alt="" /> : <div className="cover-placeholder"><Sparkles size={84} strokeWidth={1}/><span>ALGO BUENO VIENE</span></div>}</div><div className="detail-description"><div className="eyebrow">EL PREMIO</div><h2>{raffle.prize}</h2><p>{raffle.description || 'Elegí tus boletos favoritos para esta rifa de prueba.'}</p><div className="info-strip"><ShieldCheck size={20}/><span>Cada número se aparta de forma exclusiva durante 30 minutos.</span></div></div></div>
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
          </div> : <div className="selection-footer"><div className="selection-summary"><span>{selected.length} {selected.length === 1 ? 'boleto elegido' : 'boletos elegidos'}</span><strong>{money(selected.length * raffle.priceCrc)}</strong></div><button className="button primary full" disabled={selected.length === 0 || busy} onClick={() => setShowCheckout(true)}>Continuar con {selected.length || 'tus'} {selected.length === 1 ? 'boleto' : 'boletos'} <ArrowRight size={17}/></button><p className="phase-note">Demostración sin pagos ni boletos confirmados.</p></div>}
        </div>
      </div>
    </main>}

    {view === 'admin' && <main className="admin-page">
      <div className="admin-top"><div><div className="eyebrow">CIFRAYA / ESTUDIO</div><h1>Centro de control<span>✳</span></h1><p>Tu espacio para crear rifas y revisar las reservas de prueba.</p></div><div className="admin-badge"><LockKeyhole size={16}/> Acceso con clave</div></div>
      {!adminUnlocked ? <section className="admin-login"><div className="admin-login-icon"><LockKeyhole size={26}/></div><h2>Entrá a tu estudio</h2><p>La dirección abre el panel; la clave protege los datos y las acciones.</p><form onSubmit={event => { event.preventDefault(); void loadAdmin(); }} className="form-grid"><label>Clave del panel<input type="password" required value={adminToken} onChange={event => setAdminToken(event.target.value)} autoComplete="off" placeholder="ADMIN_TOKEN de Render" /></label><button className="button primary full" disabled={busy}>{busy ? 'Verificando...' : 'Ingresar al panel'} <ArrowRight size={17}/></button></form></section> : <>
        <div className="admin-stats"><div><small>RIFAS</small><strong>{adminRaffles.length}</strong><span>Creadas en el sistema</span></div><div><small>RESERVAS ACTIVAS</small><strong>{activeHolds.length}</strong><span>De prueba, con vencimiento</span></div><div><small>BOLETOS APARTADOS</small><strong>{heldTickets}</strong><span>Ninguno es una compra</span></div></div>
        <div className="admin-layout"><section className="admin-card"><div className="card-title"><Plus size={20}/><h2>Nueva rifa</h2></div><p className="muted">Se crea como borrador. Publicala cuando esté lista.</p><form onSubmit={createRaffle} className="form-grid"><label>Nombre de la rifa<input required minLength={3} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="Ej. Rifa de octubre" /></label><label>Identificador URL<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={event => setDraft({ ...draft, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="rifa-octubre" /></label><label>Premio<input required value={draft.prize} onChange={event => setDraft({ ...draft, prize: event.target.value })} placeholder="Premio principal" /></label><label>Descripción<textarea value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} rows={3} placeholder="Contá de qué trata la rifa" /></label><div className="form-row"><label>Precio por boleto (₡)<input type="text" inputMode="numeric" pattern="[0-9]+" required maxLength={10} placeholder="Ej. 1000" value={draft.priceCrc} onChange={event => setDraft({ ...draft, priceCrc: event.target.value.replace(/\D/g, '') })} /></label><label>Cantidad de boletos<input type="text" inputMode="numeric" pattern="[0-9]+" required maxLength={6} placeholder="Ej. 100" value={draft.numberCount} onChange={event => setDraft({ ...draft, numberCount: event.target.value.replace(/\D/g, '') })} /></label></div><button className="button primary full" disabled={busy}>Crear borrador <ArrowRight size={17}/></button></form></section>
        <section className="admin-card"><div className="card-title"><Ticket size={20}/><h2>Tus rifas</h2></div><p className="muted">Revisá cuáles están visibles para el público.</p><div className="admin-list">{adminRaffles.map(item => <div className="admin-item" key={item.id}><div><strong>{item.title}</strong><span>{item.numberCount.toLocaleString('es-CR')} boletos · {money(item.priceCrc)} c/u</span></div><div><span className={'state ' + item.status.toLowerCase()}>{item.status === 'DRAFT' ? 'Borrador' : 'Abierta'}</span>{item.status === 'DRAFT' && <button className="mini-button" onClick={() => void publish(item.id)} disabled={busy}>Publicar</button>}</div></div>)}{adminRaffles.length === 0 && <div className="empty-state small">Todavía no hay rifas creadas.</div>}</div></section></div>
        <section className="admin-card reservations-card"><div className="card-title"><Ticket size={20}/><h2>Boletos y personas</h2><button className="refresh-button" onClick={() => void loadAdmin()} disabled={busy}>Actualizar</button></div><p className="muted">Reservas activas de prueba. Aún no existe un estado de compra confirmada.</p><div className="reservation-list">{adminReservations.map(item => <div className="reservation-row" key={item.id}><div className="reservation-avatar">{item.buyerName.trim().charAt(0).toUpperCase()}</div><div className="reservation-person"><strong>{item.buyerName}</strong><span>{item.campaign.title}</span></div><div className="reservation-amount"><strong>{item.ticketCount}</strong><span>{item.ticketCount === 1 ? 'boleto' : 'boletos'}</span></div><div className="reservation-chips">{item.values.slice(0, 6).map(value => <span key={value}>{formatNumber(value, item.campaign.numberWidth)}</span>)}{item.values.length > 6 && <span>+{item.values.length - 6}</span>}</div><span className="state active">Apartado</span></div>)}{adminReservations.length === 0 && <div className="empty-state small">Aún no hay reservas activas.</div>}</div></section>
      </>}
    </main>}

    {showCheckout && raffle && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowCheckout(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={() => setShowCheckout(false)} aria-label="Cerrar"><X size={20}/></button><div className="eyebrow">TU PASE / PASO FINAL</div><h2 id="modal-title">Dale nombre a tu boleto.</h2><p>Demostración: usá datos ficticios. La reserva dura 30 minutos y no implica un pago.</p><div className="modal-numbers">{selected.map(value => <span key={value}><Check size={14}/>{formatNumber(value, width)}</span>)}</div><form onSubmit={reserve} className="form-grid"><label>Nombre en el boleto<input required minLength={2} autoComplete="off" value={buyer.buyerName} onChange={event => setBuyer({ ...buyer, buyerName: event.target.value })} /></label><label>Correo de prueba<input required type="email" autoComplete="off" value={buyer.buyerEmail} onChange={event => setBuyer({ ...buyer, buyerEmail: event.target.value })} /></label><label>Teléfono de prueba<input required minLength={8} autoComplete="off" value={buyer.buyerPhone} onChange={event => setBuyer({ ...buyer, buyerPhone: event.target.value })} /></label><div className="modal-total"><span>Total de referencia</span><strong>{money(selected.length * raffle.priceCrc)}</strong></div><button className="button primary full" disabled={busy}>{busy ? 'Apartando...' : 'Crear reserva de prueba'} <ArrowRight size={17}/></button></form></div></div>}

    <footer className="site-footer"><span>CIFRAYA ✳</span><span>DEMO / SIN PAGOS HABILITADOS</span></footer>
  </div>;
}
