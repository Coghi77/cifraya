import BrandSelect from './BrandSelect';
import { useEffect, useId, useRef, useState } from 'react';

export default function PrizeEditor({ prizes, sources, onChange }: { prizes: string[]; sources: number[]; onChange: (prizes: string[], sources: number[]) => void }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [count, setCount] = useState(String(prizes.length));
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => { setCount(String(prizes.length)); setPage(current => Math.min(current, Math.floor((prizes.length - 1) / 10))); }, [prizes.length]);
  return <div className="prize-editor">
    <label htmlFor={id}>Cantidad de premios</label>
    <div className="prize-quantity"><input ref={input} id={id} required inputMode="numeric" pattern="[0-9]+" value={count} onInvalid={event => { event.preventDefault(); setError(event.currentTarget.validationMessage); }} onChange={event => {
      const text = event.target.value.replace(/\D/g, '');
      setCount(text);
      setError('');
      event.target.setCustomValidity(Number(text) === prizes.length ? '' : 'Aplicá la cantidad antes de guardar.');
    }}/><button type="button" onClick={() => {
      const next = Number(count);
      if (!Number.isInteger(next) || next < 1 || next > 10_000) { input.current?.setCustomValidity('Ingresá una cantidad entre 1 y 10 000.'); input.current?.reportValidity(); return; }
      input.current?.setCustomValidity('');
      setError('');
      onChange(Array.from({ length: next }, (_, index) => prizes[index] ?? ''), Array.from({ length: next }, (_, index) => sources[index] || 0));
    }}>Aplicar</button></div>
    {error && <p role="alert">{error}</p>}
    <small>Un premio por posición. Indicá el nombre de cada uno.</small>
    {prizes.slice(page * 10, page * 10 + 10).map((prize, offset) => {
      const index = page * 10 + offset;
      const directPositions = sources.slice(0, index).flatMap((source, position) => source <= 0 ? [position + 1] : []);
      return <div className="prize-rule" key={index}><label>{index + 1}.º premio<input required minLength={3} maxLength={200} value={prize} placeholder={index === 0 ? 'Premio principal' : `Premio de la posición ${index + 1}`} onChange={event => onChange(prizes.map((value, position) => position === index ? event.target.value : value), sources)}/></label><div className="prize-rule-options" role="group" aria-label={`Tipo del premio ${index + 1}`}><button type="button" aria-pressed={sources[index] === 0} onClick={() => onChange(prizes, sources.map((source, position) => position === index ? 0 : source))}>Directo</button><button type="button" disabled={!directPositions.length || sources.includes(index + 1)} aria-pressed={sources[index] > 0} onClick={() => onChange(prizes, sources.map((source, position) => position === index ? directPositions[directPositions.length - 1] : source === index + 1 ? 0 : source))}>Para el inverso</button><button type="button" aria-pressed={sources[index] === -1} onClick={() => onChange(prizes, sources.map((source, position) => position === index ? -1 : source))}>JPS desde 1.º</button><button type="button" aria-pressed={sources[index] === -2} onClick={() => onChange(prizes, sources.map((source, position) => position === index ? -2 : source))}>JPS desde 2.º</button></div>{sources[index] < 0 && <small>Compone el número según los dígitos de la rifa: 3 = completo + último dígito; 4 = dos completos; 5 = dos completos + último dígito del siguiente premio.</small>}{sources[index] > 0 && <div className="select-field"><span>Inverso del resultado</span><BrandSelect label="Inverso del resultado" value={String(sources[index])} onChange={value => onChange(prizes, sources.map((source, position) => position === index ? Number(value) : source))} options={directPositions.map(position => ({ value: String(position), label: position + '.º premio · ' + (prizes[position - 1] || 'Sin nombre') }))}/></div>}</div>;
    })}
    {prizes.length > 10 && <div className="prize-pages"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button><span>{page + 1} / {Math.ceil(prizes.length / 10)}</span><button type="button" disabled={(page + 1) * 10 >= prizes.length} onClick={() => setPage(page + 1)}>Siguiente</button></div>}
  </div>;
}
