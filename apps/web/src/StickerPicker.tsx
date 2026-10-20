import { useState } from 'react';

export default function StickerPicker({ price, cards = [], numbersPerSticker, disabled, selectedNumbers = 0, onChoose }: {
  cards?: {quantity: number; priceCrc: number}[]; price: number; numbersPerSticker: number; disabled: boolean; selectedNumbers?: number; onChoose: (numbers: number) => void;
}) {
  const [count, setCount] = useState('1');
  const maximum = Math.min(Math.floor(100 / numbersPerSticker), Math.floor(1_000_000_000 / price));
  const quantity = Number(count);
  const valid = Number.isInteger(quantity) && quantity >= 1 && quantity <= maximum;
  const money = (value: number) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(value);
  const choices = cards.length ? cards.map(card => ({count: card.quantity / numbersPerSticker, price: card.priceCrc})) : [1, 2, 3, 5, 10, 15].filter(value => value <= maximum).map(count => ({count, price: count * price}));
  return <div className="sticker-picker sticker-card-picker">
    <p>Cada sticker incluye {numbersPerSticker} {numbersPerSticker === 1 ? 'número' : 'números'}. Elegí tu cantidad.</p>
    <div className="sticker-cards" role="group" aria-label="Opciones de stickers">{choices.map(({count: value, price: cardPrice}) => <button type="button" className="sticker-card" key={value} aria-pressed={selectedNumbers === value * numbersPerSticker} disabled={disabled} onClick={() => onChoose(value * numbersPerSticker)}>
      <span className="sticker-card-heading"><span><i aria-hidden="true"/><strong>{value}</strong> {value === 1 ? 'sticker' : 'stickers'}</span><b>{money(cardPrice)}</b></span>
      <span className="sticker-card-includes"><small>TU COMPRA INCLUYE</small><strong>{value * numbersPerSticker} números</strong></span>
    </button>)}</div>
    {!cards.length && <details className="sticker-other"><summary>Otra cantidad</summary><label>Cantidad de stickers<input type="number" min="1" max={maximum} step="1" value={count} disabled={disabled} onChange={event => setCount(event.target.value)}/></label><p aria-live="polite">{valid ? quantity + ' stickers · ' + quantity * numbersPerSticker + ' números · ' + money(quantity * price) : 'Elegí entre 1 y ' + maximum + ' stickers.'}</p><button type="button" className="button primary full" disabled={disabled || !valid} onClick={() => onChoose(quantity * numbersPerSticker)}>Elegir esta cantidad</button></details>}
  </div>;
}
