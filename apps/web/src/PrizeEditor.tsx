import { useEffect, useId, useRef, useState } from 'react';

export default function PrizeEditor({ prizes, onChange }: { prizes: string[]; onChange: (prizes: string[]) => void }) {
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
      onChange(Array.from({ length: next }, (_, index) => prizes[index] ?? ''));
    }}>Aplicar</button></div>
    {error && <p role="alert">{error}</p>}
    <small>Un premio por posición. Indicá el nombre de cada uno.</small>
    {prizes.slice(page * 10, page * 10 + 10).map((prize, offset) => {
      const index = page * 10 + offset;
      return <label key={index}>{index + 1}.º premio<input required minLength={3} maxLength={200} value={prize} placeholder={index === 0 ? 'Premio principal' : `Premio de la posición ${index + 1}`} onChange={event => onChange(prizes.map((value, position) => position === index ? event.target.value : value))}/></label>;
    })}
    {prizes.length > 10 && <div className="prize-pages"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button><span>{page + 1} / {Math.ceil(prizes.length / 10)}</span><button type="button" disabled={(page + 1) * 10 >= prizes.length} onClick={() => setPage(page + 1)}>Siguiente</button></div>}
  </div>;
}
