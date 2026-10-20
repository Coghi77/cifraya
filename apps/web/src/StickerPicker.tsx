import { useState } from 'react';

export default function StickerPicker({ price, numbersPerSticker, disabled, onChoose }: {
  price: number; numbersPerSticker: number; disabled: boolean; onChoose: (numbers: number) => void;
}) {
  const [count, setCount] = useState('1');
  const maximum = Math.min(Math.floor(100 / numbersPerSticker), Math.floor(1_000_000_000 / price));
  const quantity = Number(count);
  const valid = Number.isInteger(quantity) && quantity >= 1 && quantity <= maximum;
  const money = (value: number) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(value);
  return <div className="sticker-picker">
    <p><strong>{money(price)} por sticker</strong><br/>Cada sticker incluye {numbersPerSticker} {numbersPerSticker === 1 ? 'número' : 'números'}.</p>
    <label>Cantidad de stickers<input type="number" min="1" max={maximum} step="1" value={count} disabled={disabled} onChange={event => setCount(event.target.value)}/></label>
    <p aria-live="polite">{valid ? `${quantity} ${quantity === 1 ? 'sticker' : 'stickers'} · ${quantity * numbersPerSticker} números · ${money(quantity * price)}` : `Elegí entre 1 y ${maximum} stickers por pedido.`}</p>
    <button type="button" className="button primary full" disabled={disabled || !valid} onClick={() => onChoose(quantity * numbersPerSticker)}>{disabled ? 'Preparando…' : 'Elegir mis stickers'}</button>
  </div>;
}
