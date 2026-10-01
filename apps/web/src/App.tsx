import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Clock3, LockKeyhole, Plus, ShieldCheck, Sparkles, Ticket, X } from 'lucide-react';

type Campaign = {
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
  soldCount?: number;
};
type EntryNumber = { value: number; status: 'AVAILABLE' | 'RESERVED' | 'SOLD' };
type Reservation = { token: string; expiresAt: string; values: number[]; totalCrc: number };
type View = 'home' | 'campaign' | 'admin';

const money = (amount: number) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(amount);

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
  return `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
}

export default function App() {
  const [view, setView] = useState<View>('home');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
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
  const [adminCampaigns, setAdminCampaigns] = useState<Campaign[]>([]);
  const [draft, setDraft] = useState({ title: '', slug: '', prize: '', description: '', priceCrc: 1000, numberCount: 100 });
  const countdown = useCountdown(reservation?.expiresAt);

  async function loadCampaigns() {
    try { setCampaigns(await api<Campaign[]>('/api/campaigns')); }
    catch { setError('No se pudo conectar con la API de prueba. Intentá de nuevo en un minuto.'); }
  }
  useEffect(() => { void loadCampaigns(); }, []);

  async function openCampaign(slug: string) {
    setBusy(true); setError(''); setSelected([]); setReservation(null); setShowCheckout(false); setPage(1);
    try {
      const result = await api<Campaign>(`/api/campaigns/${slug}`);
      setCampaign(result); setView('campaign');
      const list = await api<{ numbers: EntryNumber[]; pageCount: number }>(`/api/campaigns/${slug}/numbers?page=1`);
      setNumbers(list.numbers); setPageCount(list.pageCount);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function changePage(next: number) {
    if (!campaign || next < 1 || next > pageCount) return;
    setBusy(true); setError('');
    try {
      const list = await api<{ numbers: EntryNumber[]; pageCount: number }>(`/api/campaigns/${campaign.slug}/numbers?page=${next}`);
      setNumbers(list.numbers); setPage(next);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  function toggleNumber(value: number) {
    setSelected(current => current.includes(value) ? current.filter(item => item !== value) : current.length < 20 ? [...current, value] : current);
  }

  async function reserve(event: React.FormEvent) {
    event.preventDefault();
    if (!campaign || selected.length === 0) return;
    setBusy(true); setError('');
    try {
      const result = await api<Reservation>('/api/reservations', {
        method: 'POST', body: JSON.stringify({ campaignId: campaign.id, values: selected, ...buyer }),
      });
      setReservation(result); setShowCheckout(false);
      const list = await api<{ numbers: EntryNumber[]; pageCount: number }>(`/api/campaigns/${campaign.slug}/numbers?page=${page}`);
      setNumbers(list.numbers);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function loadAdmin() {
    setBusy(true); setError('');
    try { setAdminCampaigns(await api<Campaign[]>('/api/admin/campaigns', { headers: { Authorization: `Bearer ${adminToken}` } })); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function createCampaign(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api('/api/admin/campaigns', { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` }, body: JSON.stringify(draft) });
      setDraft({ title: '', slug: '', prize: '', description: '', priceCrc: 1000, numberCount: 100 });
      await loadAdmin();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function publish(id: string) {
    setBusy(true); setError('');
    try {
      await api(`/api/admin/campaigns/${id}/publish`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } });
      await Promise.all([loadAdmin(), loadCampaigns()]);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  const formatted = (value: number) => String(value).padStart(campaign?.numberWidth ?? 3, '0');

  return <div className="app-shell">
    <header className="site-header glass">
      <button className="brand" onClick={() => { setView('home'); setError(''); }} aria-label="Ir al inicio"><span className="brand-mark"><Sparkles size={20} /></span><span>CIFRA<span className="brand-light">YA</span></span></button>
      <nav aria-label="Navegación principal"><button className={view === 'home' ? 'nav-active' : ''} onClick={() => setView('home')}>Campañas</button><button onClick={() => { setView('admin'); setError(''); }}>Panel de prueba</button></nav>
      <span className="local-pill"><span /> Vista de prueba</span>
    </header>

    {error && <div className="alert" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Cerrar aviso"><X size={17} /></button></div>}

    {view === 'home' && <main>
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> Plataforma de campañas</div><h1>Tu próxima<br /><em>gran oportunidad.</em></h1><p>Explorá las campañas disponibles, elegí tus números y seguí el estado de tu participación con claridad.</p><a href="#campanas" className="button primary">Ver campañas <ArrowRight size={17} /></a><div className="hero-note"><ShieldCheck size={17} /> Números reservados en tiempo real</div></div><div className="hero-art" aria-hidden="true"><div className="orb orb-one"/><div className="orb orb-two"/><div className="glass ticket-art"><div className="ticket-kicker">CAMPAÑA ACTIVA</div><Ticket size={45} strokeWidth={1.3}/><div className="ticket-number"># 0 8 2 4</div><div className="ticket-foot">Tu número. Tu momento.</div></div></div></section>
      <section className="section campaigns-section" id="campanas"><div className="section-heading"><div><div className="eyebrow">Explorar</div><h2>Campañas disponibles</h2></div><span className="count-pill">{campaigns.length} activas</span></div><div className="campaign-grid">{campaigns.map(item => <article className="campaign-card" key={item.id}><div className="campaign-cover">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <div className="cover-placeholder"><Sparkles size={54} /><span>UNA NUEVA OPORTUNIDAD</span></div>}<span className="cover-status">Activa</span></div><div className="campaign-body"><div className="campaign-overline">{item.numberCount.toLocaleString('es-CR')} números disponibles en total</div><h3>{item.title}</h3><p>{item.description}</p><div className="campaign-facts"><span>Premio <strong>{item.prize}</strong></span><span>Desde <strong>{money(item.priceCrc)}</strong></span></div><button className="button dark" onClick={() => void openCampaign(item.slug)}>Ver campaña <ArrowRight size={17} /></button></div></article>)}</div>{campaigns.length === 0 && <div className="empty-state">Todavía no hay campañas publicadas. El panel de prueba permite crear la primera.</div>}</section>
      <section className="how-section"><div className="section-heading"><div><div className="eyebrow">Simple y transparente</div><h2>¿Cómo funciona?</h2></div></div><div className="how-grid"><div><span>01</span><h3>Elegí tus números</h3><p>Seleccioná entre los que se encuentren disponibles en la campaña.</p></div><div><span>02</span><h3>Reservalos</h3><p>Quedan apartados durante 30 minutos mientras completás el proceso.</p></div><div><span>03</span><h3>Seguí tu estado</h3><p>Recibís un enlace privado para consultar la reserva y su vencimiento.</p></div></div></section>
    </main>}

    {view === 'campaign' && campaign && <main className="section detail-page"><button className="text-button" onClick={() => setView('home')}><ChevronLeft size={17}/> Todas las campañas</button><div className="detail-layout"><div><div className="detail-image">{campaign.imageUrl ? <img src={campaign.imageUrl} alt="" /> : <div className="cover-placeholder"><Sparkles size={72}/><span>UNA NUEVA OPORTUNIDAD</span></div>}</div><div className="detail-description"><div className="eyebrow">Sobre esta campaña</div><h2>Conocé el premio</h2><p>{campaign.description}</p><div className="info-strip"><ShieldCheck size={19}/><span>Las reservas se protegen en la base de datos para evitar números duplicados.</span></div></div></div><div className="detail-side"><span className="status-label">Campaña activa</span><h1>{campaign.title}</h1><p className="prize-label">Premio principal: <strong>{campaign.prize}</strong></p><div className="price-block"><span>Por número</span><strong>{money(campaign.priceCrc)}</strong></div><div className="selection-head"><div><h2>Elegí tus números</h2><p>Gris: apartado o vendido</p></div><span className="small-count">{selected.length}/20</span></div><div className="number-grid">{numbers.map(number => <button key={number.value} className={`number ${selected.includes(number.value) ? 'selected' : ''}`} disabled={number.status !== 'AVAILABLE' || Boolean(reservation)} onClick={() => toggleNumber(number.value)} aria-label={`Número ${formatted(number.value)}: ${number.status === 'AVAILABLE' ? 'disponible' : 'no disponible'}`}>{formatted(number.value)}</button>)}</div><div className="pagination"><button disabled={page <= 1 || busy} onClick={() => void changePage(page - 1)}><ChevronLeft size={16}/></button><span>Página {page} de {pageCount}</span><button disabled={page >= pageCount || busy} onClick={() => void changePage(page + 1)}><ChevronRight size={16}/></button></div>{reservation ? <div className="reserved-box"><div className="reserved-top"><Clock3 size={20}/><span>Reserva activa</span><strong>{countdown}</strong></div><p>Tus números están apartados hasta el vencimiento indicado.</p><div className="reserved-numbers">{reservation.values.map(value => <span key={value}>{formatted(value)}</span>)}</div><p className="phase-note">Esta primera fase es una demostración. Todavía no se reciben pagos ni comprobantes.</p><small>Guardá este código privado de consulta: <code>{reservation.token}</code></small></div> : <><div className="selection-summary"><span>{selected.length} {selected.length === 1 ? 'número seleccionado' : 'números seleccionados'}</span><strong>{money(selected.length * campaign.priceCrc)}</strong></div><button className="button primary full" disabled={selected.length === 0 || busy} onClick={() => setShowCheckout(true)}>Apartar números <ArrowRight size={17}/></button><p className="phase-note centered">Demo de prueba: sin cobros habilitados</p></>}</div></div></main>}

    {view === 'admin' && <main className="admin-page"><div className="admin-top"><div><div className="eyebrow">Operación de prueba</div><h1>Panel de campañas</h1><p>Creá campañas de prueba y publicalas en la vista de prueba.</p></div><div className="admin-badge"><LockKeyhole size={17}/> Acceso con clave de prueba</div></div><div className="admin-layout"><section className="admin-card"><div className="card-title"><Plus size={20}/><h2>Nueva campaña</h2></div><p className="muted">Se creará como borrador. Publicala cuando esté lista.</p><form onSubmit={createCampaign} className="form-grid"><label>Nombre de la campaña<input required minLength={3} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="Ej. Campaña de octubre" /></label><label>Identificador URL<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={event => setDraft({ ...draft, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="campana-octubre" /></label><label>Premio<input required value={draft.prize} onChange={event => setDraft({ ...draft, prize: event.target.value })} placeholder="Premio principal" /></label><label>Descripción<textarea value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} rows={3} placeholder="Contá de qué trata la campaña" /></label><div className="form-row"><label>Precio por número (₡)<input type="number" required min={1} value={draft.priceCrc} onChange={event => setDraft({ ...draft, priceCrc: Number(event.target.value) })} /></label><label>Cantidad de números<input type="number" required min={10} max={100000} value={draft.numberCount} onChange={event => setDraft({ ...draft, numberCount: Number(event.target.value) })} /></label></div><label>Clave del panel de prueba<input type="password" required value={adminToken} onChange={event => setAdminToken(event.target.value)} placeholder="ADMIN_TOKEN de la configuración" /></label><button className="button dark full" disabled={busy}>Crear borrador <ArrowRight size={17}/></button></form></section><section className="admin-card"><div className="card-title"><Ticket size={20}/><h2>Campañas creadas</h2></div><p className="muted">Ingresá la clave para consultar campañas y publicar borradores.</p><button className="button outline" onClick={() => void loadAdmin()} disabled={busy || !adminToken}>Cargar campañas</button><div className="admin-list">{adminCampaigns.map(item => <div className="admin-item" key={item.id}><div><strong>{item.title}</strong><span>{item.numberCount.toLocaleString('es-CR')} números · {money(item.priceCrc)} c/u</span></div><div><span className={`state ${item.status.toLowerCase()}`}>{item.status === 'DRAFT' ? 'Borrador' : 'Activa'}</span>{item.status === 'DRAFT' && <button className="mini-button" onClick={() => void publish(item.id)} disabled={busy}>Publicar</button>}</div></div>)}{adminCampaigns.length === 0 && <div className="empty-state small">Aún no hay campañas cargadas.</div>}</div></section></div></main>}

    {showCheckout && campaign && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowCheckout(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={() => setShowCheckout(false)} aria-label="Cerrar"><X size={20}/></button><div className="eyebrow">Paso 2 de 2</div><h2 id="modal-title">Apartá tus números</h2><p>Esta es una demostración. Usá datos ficticios: la reserva durará 30 minutos y no implica un pago.</p><div className="modal-numbers">{selected.map(value => <span key={value}><Check size={14}/>{formatted(value)}</span>)}</div><form onSubmit={reserve} className="form-grid"><label>Nombre completo<input required minLength={2} autoComplete="name" value={buyer.buyerName} onChange={event => setBuyer({ ...buyer, buyerName: event.target.value })} /></label><label>Correo electrónico<input required type="email" autoComplete="email" value={buyer.buyerEmail} onChange={event => setBuyer({ ...buyer, buyerEmail: event.target.value })} /></label><label>Teléfono<input required minLength={8} autoComplete="tel" value={buyer.buyerPhone} onChange={event => setBuyer({ ...buyer, buyerPhone: event.target.value })} /></label><div className="modal-total"><span>Total de referencia</span><strong>{money(selected.length * campaign.priceCrc)}</strong></div><button className="button primary full" disabled={busy}>{busy ? 'Apartando...' : 'Confirmar reserva de prueba'} <ArrowRight size={17}/></button></form></div></div>}

    <footer className="site-footer"><span>CIFRAYA</span><span>Prototipo de prueba · Fase 1 · Sin pagos habilitados</span></footer>
  </div>;
}
