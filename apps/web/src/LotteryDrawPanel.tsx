import Confirmation from './Confirmation';
import { useState } from 'react';

export default function LotteryDrawPanel({ id, token, position, width, start, requiredCount, savedResults, savedReference, onSaved }: {
  id: string; token: string; position: number; width: number; start: number; requiredCount: number;
  savedResults: string[]; savedReference: string; onSaved: () => void;
}) {
  const [results, setResults] = useState(() => Array.from({length: requiredCount}, (_, i) => savedResults[i] || ''));
  const [reference, setReference] = useState(savedReference);
  const [preview, setPreview] = useState<{value: number; sold: boolean; buyerName: string | null} | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = savedResults.length > 0;
  async function submit(publish: boolean) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/campaigns/${id}/${publish ? 'winner' : 'draw-preview'}`, {
        method: 'POST', headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({position, drawResults: results, drawReference: reference, ...(publish && preview ? {numberValue: preview.value, expectedSold: preview.sold} : {})}),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'No se pudo calcular el resultado.');
      if (publish) onSaved(); else setPreview(data);
    } catch (cause) { setError((cause as Error).message); setPreview(null); }
    finally { setBusy(false); }
  }
  return <section className="lottery-panel">
    <h3>Resultado por Lotería Nacional · {position}.º premio</h3>
    <p>{width} dígitos: {width === 2 ? `número del ${start}.º premio` : width === 3 ? `${start}.º premio + último dígito del ${start + 1}.º` : width === 4 ? `${start}.º premio + ${start + 1}.º premio` : `${start}.º premio + ${start + 1}.º premio + último dígito del ${start + 2}.º`}.</p>
    <p>Ingresá los números de los premios oficiales, no la serie ni el orden de extracción. Verificá los resultados antes de publicarlos.</p>
    <label>Sorteo y fecha<input disabled={locked || busy} value={reference} maxLength={120} placeholder="Ej. Sorteo 0000 · 20/10/2026" onChange={event => { setReference(event.target.value); setPreview(null); }}/></label>
    <div className="lottery-inputs">{results.map((value, index) => <label key={index}>{index + 1}.º premio<input disabled={locked || busy} inputMode="numeric" maxLength={2} placeholder="00" value={value} onChange={event => { setResults(results.map((item, i) => i === index ? event.target.value.replace(/\D/g, '') : item)); setPreview(null); }}/></label>)}</div>
    <small>Completá los resultados que necesitan las reglas de esta rifa. Tras publicar el primer resultado, no se podrán cambiar.</small>
    {error && <Confirmation variant="error" message={error}/>}
    {preview ? <div className="lottery-preview"><strong>{String(preview.value).padStart(width, '0')}</strong><p>{preview.sold ? preview.buyerName : 'Sin compra confirmada: se publicará sin ganador.'}</p><button type="button" disabled={busy} onClick={() => void submit(true)}>Confirmar y publicar resultado</button><button type="button" disabled={busy} onClick={() => setPreview(null)}>Volver a revisar</button></div> : <button type="button" disabled={busy || reference.trim().length < 3 || results.some(value => !/^\d{2}$/.test(value))} onClick={() => void submit(false)}>{busy ? 'Calculando…' : 'Calcular y revisar resultado'}</button>}
  </section>;
}
