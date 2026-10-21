import DrawScheduleEditor, {toDrawDate,fromDrawDate} from './DrawScheduleEditor';
import StickerCardEditor, { cardPackages, type StickerCard } from './StickerCardEditor';
import BrandSelect, { numberCountOptions } from './BrandSelect';
import PrizeEditor from './PrizeEditor';
import { useEffect, useState, type FormEvent } from 'react';

export type EditableRaffle = {
  drawMode:string; drawDate:string|null; id: string; status: string; title: string; slug: string; description: string;
  prize: string; prizes: string[]; prizeSources: number[]; prizeCount: number; secondPrize: string | null; thirdPrize: string | null;
  numbersPerSticker: number | null; priceCrc: number; numberCount: number; invertedEnabled: boolean; invertedPrizeEnabled: boolean; packages: { quantity: number; priceCrc: number }[];
};

export default function EditRaffle({ raffle, token, onClose, onSaved, onUnauthorized }: {
  raffle: EditableRaffle; token: string; onClose: () => void; onSaved: () => void; onUnauthorized: () => void;
}) {
  const [form, setForm] = useState({
    drawMode:raffle.drawMode || 'ANNOUNCED', drawDate:fromDrawDate(raffle.drawDate), title: raffle.title, slug: raffle.slug, description: raffle.description, prize: raffle.prize,
    prizes: raffle.prizes, prizeSources: raffle.prizeSources,
    numbersPerSticker: String(raffle.numbersPerSticker || 2),
    priceCrc: String(raffle.priceCrc), numberCount: String(raffle.numberCount),
    invertedEnabled: raffle.invertedEnabled, invertedPrizeEnabled: raffle.invertedPrizeEnabled,
  });
  const [cards, setCards] = useState<StickerCard[]>(raffle.packages.map(card => ({count: String(card.quantity / (raffle.numbersPerSticker || 1)), price: String(card.priceCrc)})));
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
    if (isDraft && (form.prizes.length > Number(form.numberCount) || form.prizes.some(prize => prize.trim().length < 3))) { setError('Completá cada premio y verificá que no haya más premios que números.'); return; }
    const payload = isDraft ? {
      ...form, drawDate:form.drawMode==='DATE'?toDrawDate(form.drawDate):null, priceCrc: Number(form.priceCrc), numberCount: Number(form.numberCount),
      numbersPerSticker: Number(form.numbersPerSticker), packages: cardPackages(cards, Number(form.numbersPerSticker)),
    } : { title: form.title, description: form.description, ...(raffle.status === 'LIVE' ? {packages:cardPackages(cards,raffle.numbersPerSticker || 1), drawMode:form.drawMode, drawDate:form.drawMode==='DATE'?toDrawDate(form.drawDate):null} : {}) };
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
      {!isDraft && <p className="edit-raffle-note">Las tarjetas nuevas se aplican a futuras reservas. Los pedidos existentes conservan su precio y sus números. Los premios y la cantidad de números por boleto no cambian.</p>}
      <form className="form-grid" onSubmit={save}>
        <label>Nombre de la rifa<input required minLength={3} maxLength={120} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })}/></label>
        {isDraft && <label>Identificador URL<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} value={form.slug} onChange={event => setForm({ ...form, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}/></label>}
        <label>Descripción<textarea maxLength={3000} rows={4} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })}/></label>
        {raffle.status!=='CLOSED' && <DrawScheduleEditor mode={form.drawMode} date={form.drawDate} onChange={(drawMode,drawDate)=>setForm({...form,drawMode,drawDate})}/>}
        {isDraft && <>
          <PrizeEditor prizes={form.prizes} sources={form.prizeSources} onChange={(prizes, prizeSources) => setForm({ ...form, prizes, prizeSources })}/>
          <div className="form-row"><label>Precio por boleto (₡)<input required inputMode="numeric" pattern="[0-9]+" value={form.priceCrc} onChange={event => setForm({ ...form, priceCrc: event.target.value.replace(/\D/g, '') })}/></label><div className="select-field"><span>Cantidad de números</span><BrandSelect label="Cantidad de números" required value={form.numberCount} onChange={value => setForm({ ...form, numberCount: value })} options={numberCountOptions}/></div></div>
          <div className="inverted-settings"><label><input type="checkbox" checked={form.invertedEnabled} onChange={event => setForm({ ...form, invertedEnabled: event.target.checked, invertedPrizeEnabled: event.target.checked && form.invertedPrizeEnabled })}/> Ofrecer números invertidos adicionales por el doble del precio</label></div>
          <label>Números incluidos por boleto<input required type="number" min="1" max="20" step="1" value={form.numbersPerSticker} onChange={event => setForm({ ...form, numbersPerSticker: event.target.value })}/></label>
          <StickerCardEditor cards={cards} onChange={setCards} numbersPerSticker={Number(form.numbersPerSticker)}/>
        </>}
        {raffle.status === 'LIVE' && <StickerCardEditor cards={cards} onChange={setCards} numbersPerSticker={raffle.numbersPerSticker || 1}/>}
        {error && <p className="edit-raffle-error" role="alert">{error}</p>}
        <div className="edit-raffle-actions"><button type="button" onClick={onClose} disabled={busy}>Cancelar</button><button type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar cambios'}</button></div>
      </form>
    </section>
  </div>;
}
