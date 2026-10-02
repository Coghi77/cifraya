import { useEffect, useState, type FormEvent } from 'react';

export type EditableRaffle = {
  id: string; status: string; title: string; slug: string; description: string;
  prize: string; prizeCount: number; secondPrize: string | null; thirdPrize: string | null;
  priceCrc: number; numberCount: number; invertedEnabled: boolean; invertedPrizeEnabled: boolean; packages: { quantity: number; priceCrc: number }[];
};

export default function EditRaffle({ raffle, token, onClose, onSaved, onUnauthorized }: {
  raffle: EditableRaffle; token: string; onClose: () => void; onSaved: () => void; onUnauthorized: () => void;
}) {
  const [form, setForm] = useState({
    title: raffle.title, slug: raffle.slug, description: raffle.description, prize: raffle.prize,
    prizeCount: raffle.prizeCount, secondPrize: raffle.secondPrize || '', thirdPrize: raffle.thirdPrize || '',
    priceCrc: String(raffle.priceCrc), numberCount: String(raffle.numberCount),
    invertedEnabled: raffle.invertedEnabled, invertedPrizeEnabled: raffle.invertedPrizeEnabled,
  });
  const [packages, setPackages] = useState(raffle.packages.map(item => ({ quantity: String(item.quantity), priceCrc: String(item.priceCrc) })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isDraft = raffle.status === 'DRAFT';

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [busy, onClose]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const payload = isDraft ? {
      ...form, priceCrc: Number(form.priceCrc), numberCount: Number(form.numberCount),
      secondPrize: form.prizeCount >= 2 ? form.secondPrize.trim() : undefined,
      thirdPrize: form.prizeCount === 3 ? form.thirdPrize.trim() : undefined,
      packages: packages.map(item => ({ quantity: Number(item.quantity), priceCrc: Number(item.priceCrc) })),
    } : { title: form.title, description: form.description };
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/campaigns/${raffle.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) { onUnauthorized(); return; }
        throw new Error(result.error || 'No se pudo guardar la rifa.');
      }
      onSaved(); onClose();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="edit-raffle-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="edit-raffle-panel" role="dialog" aria-modal="true" aria-labelledby="edit-raffle-title">
      <div className="edit-raffle-heading"><div><span className="eyebrow">CENTRO DE CONTROL</span><h2 id="edit-raffle-title">Editar rifa</h2></div><button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar edición">×</button></div>
      {!isDraft && <p className="edit-raffle-note">La rifa ya se publicó. Podés corregir el nombre y la descripción; los premios, precios y números permanecen como se anunciaron.</p>}
      <form className="form-grid" onSubmit={save}>
        <label>Nombre de la rifa<input required minLength={3} maxLength={120} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })}/></label>
        {isDraft && <label>Identificador URL<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} value={form.slug} onChange={event => setForm({ ...form, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}/></label>}
        <label>Descripción<textarea maxLength={3000} rows={4} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })}/></label>
        {isDraft && <>
          <div className="prize-editor"><span>Cantidad de premios</span><div className="prize-count" role="group" aria-label="Cantidad de premios">{[1, 2, 3].map(count => <button key={count} type="button" aria-pressed={form.prizeCount === count} onClick={() => setForm({ ...form, prizeCount: count })}>{count} {count === 1 ? 'premio' : 'premios'}</button>)}</div>
            <label>Primer premio<input required minLength={3} maxLength={200} value={form.prize} onChange={event => setForm({ ...form, prize: event.target.value })}/></label>
            {form.prizeCount >= 2 && <label>Segundo premio<input required minLength={3} maxLength={200} value={form.secondPrize} onChange={event => setForm({ ...form, secondPrize: event.target.value })}/></label>}
            {form.prizeCount === 3 && <label>Tercer premio<input required minLength={3} maxLength={200} value={form.thirdPrize} onChange={event => setForm({ ...form, thirdPrize: event.target.value })}/></label>}
          </div>
          <div className="form-row"><label>Precio por boleto (₡)<input required inputMode="numeric" pattern="[0-9]+" value={form.priceCrc} onChange={event => setForm({ ...form, priceCrc: event.target.value.replace(/\D/g, '') })}/></label><label>Cantidad de números<select required value={form.numberCount} onChange={event => setForm({ ...form, numberCount: event.target.value })}><option value="100">100 · 00 al 99</option><option value="1000">1 000 · 000 al 999</option><option value="10000">10 000 · 0000 al 9999</option></select></label></div>
          <div className="inverted-settings"><label><input type="checkbox" checked={form.invertedEnabled} onChange={event => setForm({ ...form, invertedEnabled: event.target.checked, invertedPrizeEnabled: event.target.checked && form.invertedPrizeEnabled })}/> Ofrecer paquete con números invertidos por el doble del precio</label><label><input type="checkbox" checked={form.invertedPrizeEnabled} disabled={!form.invertedEnabled} onChange={event => setForm({ ...form, invertedPrizeEnabled: event.target.checked })}/> Los invertidos también pueden ganar premios</label></div>
          <div className="package-editor"><div className="package-heading"><strong>Paquetes de números</strong><button type="button" disabled={packages.length >= 10} onClick={() => setPackages(current => [...current, { quantity: '', priceCrc: '' }])}>+ Agregar paquete</button></div>{packages.map((item, index) => <div className="package-row" key={index}><label>Cantidad<input required inputMode="numeric" pattern="[0-9]+" value={item.quantity} onChange={event => setPackages(current => current.map((entry, position) => position === index ? { ...entry, quantity: event.target.value.replace(/\D/g, '') } : entry))}/></label><label>Precio del paquete (₡)<input required inputMode="numeric" pattern="[0-9]+" value={item.priceCrc} onChange={event => setPackages(current => current.map((entry, position) => position === index ? { ...entry, priceCrc: event.target.value.replace(/\D/g, '') } : entry))}/></label><button type="button" aria-label="Quitar paquete" onClick={() => setPackages(current => current.filter((_, position) => position !== index))}>×</button></div>)}</div>
        </>}
        {error && <p className="edit-raffle-error" role="alert">{error}</p>}
        <div className="edit-raffle-actions"><button type="button" onClick={onClose} disabled={busy}>Cancelar</button><button type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar cambios'}</button></div>
      </form>
    </section>
  </div>;
}
