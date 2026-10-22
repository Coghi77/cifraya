import { useState } from 'react';

export default function SinpePaymentInfo() {
  const [message, setMessage] = useState('');
  async function copy() {
    try { await navigator.clipboard.writeText('72833548'); setMessage('Número copiado'); }
    catch { setMessage('Copiá el número manualmente: 72833548'); }
  }
  return <section className="sinpe-payment-info" aria-label="Datos para pagar por SINPE Móvil">
    <span>Pagá por SINPE Móvil al</span>
    <strong>7283 3548</strong>
    <span>A nombre de <b>David Vilanova Campos</b></span>
    <button type="button" onClick={() => void copy()}>Copiar número</button>
    <small>Transferí el total de tu compra y adjuntá el comprobante. El pago queda sujeto a revisión.</small>
    {message && <span role="status">{message}</span>}
  </section>;
}
