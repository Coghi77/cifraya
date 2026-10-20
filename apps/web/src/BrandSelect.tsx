import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

type Option = { value: string; label: string };
export default function BrandSelect({ value, onChange, options, label, required = false }: { value: string; onChange: (value: string) => void; options: Option[]; label: string; required?: boolean }) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = options.findIndex(option => option.value === value);
  function show() { setActive(Math.max(0, selected)); setOpen(true); }
  function choose(index: number) { onChange(options[index].value); setOpen(false); trigger.current?.focus(); }
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  useEffect(() => { if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' }); }, [active, open, id]);
  return <div className="brand-select" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <select className="brand-select-validation" aria-hidden="true" tabIndex={-1} required={required} value={value} onChange={event => onChange(event.target.value)} onInvalid={event => { event.preventDefault(); show(); trigger.current?.focus(); }}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
    <button ref={trigger} type="button" className="brand-select-trigger" role="combobox" aria-label={label} aria-expanded={open} aria-controls={id} aria-haspopup="listbox" aria-required={required} aria-activedescendant={open ? `${id}-${active}` : undefined} onClick={() => open ? setOpen(false) : show()} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
      else if (event.key === 'Tab') setOpen(false);
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) show(); else setActive(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length); }
      else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); setOpen(true); setActive(event.key === 'Home' ? 0 : options.length - 1); }
      else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (open) choose(active); else show(); }
      else if (event.key.length === 1) { const index = options.findIndex(option => option.label.toLowerCase().startsWith(event.key.toLowerCase())); if (index >= 0) { setOpen(true); setActive(index); } }
    }}><span>{options[selected]?.label || 'Elegí una opción'}</span><ChevronDown size={17}/></button>
    {open && <div id={id} role="listbox" aria-label={label} className="brand-select-menu">{options.map((option,index) => <div key={option.value} id={`${id}-${index}`} role="option" aria-selected={value === option.value} className={index === active ? 'is-active' : ''} onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(index)}><span>{option.label}</span>{value === option.value && <Check size={16}/>}</div>)}</div>}
  </div>;
}

export const numberCountOptions = [
  { value: '100', label: '100 · del 00 al 99' },
  { value: '1000', label: '1 000 · del 000 al 999' },
  { value: '10000', label: '10 000 · del 0000 al 9999' },
];
