import Confirmation from './Confirmation';
import { useEffect, useState } from 'react';

type NumberRow = { value: number; status: string };
export default function ManualNumbers({ slug, quantity, width, disabled, onPick, onConfirm }: { slug: string; quantity: number; width: number; disabled: boolean; onPick: (values: number[]) => Promise<void>; onConfirm: (values: number[]) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  async function pick(values: number[]) {
    setSaving(true);
    try { await onPick(values); setPicked(values); setError(''); } catch (cause) { setError((cause as Error).message); setRevision(n => n + 1); } finally { setSaving(false); }
  }
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<NumberRow[]>([]);
  const [pages, setPages] = useState(1);
  const [picked, setPicked] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => { const refresh = () => setRevision(n => n + 1); window.addEventListener('cifraya:update', refresh); return () => window.removeEventListener('cifraya:update', refresh); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      void fetch(`/api/campaigns/${encodeURIComponent(slug)}/numbers?page=${page}&search=${search}`, { signal: controller.signal })
        .then(async r => { const data = await r.json(); if (!r.ok) throw Error(data.error); return data; })
        .then(data => { if (controller.signal.aborted) return; setRows(data.numbers); setPages(data.pageCount); setError(''); const unavailable = new Set<number>(data.numbers.filter((n: NumberRow) => n.status !== 'AVAILABLE').map((n: NumberRow) => n.value)); setPicked(current => current.filter(value => !unavailable.has(value))); })
        .catch(cause => { if (!controller.signal.aborted) setError(cause.message || 'No se pudieron cargar los números.'); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [slug, page, search, revision]);
  return <section className="manual-numbers" aria-label="Elegir números disponibles"><label>Buscar número<input inputMode="numeric" value={search} maxLength={width} placeholder={'Ej. ' + '0'.repeat(width)} onChange={e => { setSearch(e.target.value.replace(/\D/g, '')); setPage(1); }}/></label><div className="manual-selection-summary" role="status" aria-live="polite"><strong>Elegí {quantity} {quantity === 1 ? 'número' : 'números'}</strong><span>{picked.length} de {quantity} seleccionados</span><b>{picked.length === quantity ? 'Selección completa' : 'Te faltan ' + (quantity - picked.length) + ((quantity - picked.length) === 1 ? ' número' : ' números')}</b></div><p>Los apartados y vendidos están deshabilitados.</p>
    {error && <Confirmation variant="error" message={error}/>}<div className="manual-grid" aria-busy={loading}>{rows.map(n => <button type="button" key={n.value} aria-pressed={picked.includes(n.value)} aria-label={`${String(n.value).padStart(width, '0')}, ${n.status === 'AVAILABLE' ? 'disponible' : 'no disponible'}`} disabled={disabled || saving || loading || n.status !== 'AVAILABLE' || (!picked.includes(n.value) && picked.length >= quantity)} onClick={() => void pick(picked.includes(n.value) ? picked.filter(v => v !== n.value) : [...picked, n.value])}>{String(n.value).padStart(width, '0')}</button>)}</div>
    {loading && <p role="status">Cargando números…</p>}{!loading && !rows.length && <p>No hay coincidencias.</p>}
    <div className="manual-pagination"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>Anterior</button><span>{page} / {Math.max(1, pages)}</span><button type="button" disabled={page >= pages || loading} onClick={() => setPage(p => p + 1)}>Siguiente</button></div>
    <p aria-live="polite">{picked.length} de {quantity} seleccionados{picked.length ? ': ' + picked.map(n => String(n).padStart(width, '0')).join(', ') : ''}</p>
    <button type="button" className="button dark full" disabled={disabled || loading || picked.length !== quantity} onClick={() => { void onConfirm(picked).catch(cause => setError(cause.message)); }}>Usar estos números</button><p>Cada número que elegís queda bloqueado por cinco minutos desde tu primera selección. Si salís, se libera automáticamente al vencer.</p>
  </section>;
}
