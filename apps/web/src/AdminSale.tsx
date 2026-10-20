import {useEffect,useRef,useState,type FormEvent} from 'react';
import ManualNumbers from './ManualNumbers';
import BrandSelect from './BrandSelect';
import preparePhoto from './preparePhoto';
export type SaleCampaign={id:string;slug:string;status:string;title:string;numberWidth:number;numbersPerSticker:number|null;priceCrc:number;packages:{quantity:number;priceCrc:number}[]};
type Order={reservationId:string;token:string;orderNumber:number;totalCrc:number};
const money=(n:number)=>new Intl.NumberFormat('es-CR',{style:'currency',currency:'CRC',maximumFractionDigits:0}).format(n);
export default function AdminSale({campaign,token,onClose,onReview}:{campaign:SaleCampaign;token:string;onClose:()=>void;onReview:(id:string)=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const offers=campaign.packages.length?campaign.packages:[{quantity:campaign.numbersPerSticker||1,priceCrc:campaign.priceCrc}];
 const [quantity,setQuantity]=useState(offers[0].quantity);
 const [manual,setManual]=useState(false);
 const [values,setValues]=useState<number[]>([]);
 const [expires,setExpires]=useState('');
 const [now,setNow]=useState(Date.now());
 const [buyer,setBuyer]=useState({buyerName:'',buyerEmail:'',buyerPhone:''});
 const [paymentMethod,setPaymentMethod]=useState('SINPE');
 const [cashReceived,setCashReceived]=useState(false);
 const [file,setFile]=useState<File|null>(null);
 const [order,setOrder]=useState<Order|null>(null);
 const [done,setDone]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const offer=offers.find(item=>item.quantity===quantity)!;
 const expired=Boolean(expires)&&new Date(expires).getTime()<=now;
 useEffect(()=>{const el=dialog.current!;const previous=document.body.style.overflow;document.body.style.overflow='hidden';el.showModal();const timer=setInterval(()=>setNow(Date.now()),1000);return()=>{clearInterval(timer);el.close();document.body.style.overflow=previous;};},[]);
 async function request<T>(url:string,body:unknown):Promise<T>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error||'No se pudo completar la acción.');return data;}
 async function select(picked?:number[]){const data=await request<{values:number[];expiresAt:string}>(`/api/campaigns/${encodeURIComponent(campaign.slug)}/proposal`,{quantity,...(picked?{values:picked}:{})});setValues(data.values);setExpires(data.expiresAt);setNow(Date.now());return data;}
 async function random(){setBusy(true);setError('');try{await select();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function reset(nextQuantity:number,nextManual:boolean){setBusy(true);setError('');try{if(values.length)await request(`/api/campaigns/${encodeURIComponent(campaign.slug)}/proposal`,{quantity,values:[]});setValues([]);setExpires('');setQuantity(nextQuantity);setManual(nextManual);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function submit(event:FormEvent){event.preventDefault();if(paymentMethod==='SINPE'&&!file)return;if(paymentMethod==='CASH'&&!cashReceived)return;setBusy(true);setError('');try{
  const proof=paymentMethod==='SINPE'?await preparePhoto(file!):null;
  let current=order;
  if(!current){current=await request<Order>('/api/admin/reservations',{campaignId:campaign.id,values,...buyer,paymentMethod,cashReceived,expectedTotalCrc:offer.priceCrc});setOrder(current);}
  if(proof)await request(`/api/reservations/${current.token}/proofs`,proof);
  setDone(true);
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <dialog ref={dialog} className="admin-sale-dialog" aria-labelledby="admin-sale-title" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
  <div className="admin-sale-heading"><div><span>VENTA PRESENCIAL</span><h2 id="admin-sale-title">Registrar venta</h2><p>{campaign.title}</p></div><button type="button" disabled={busy} onClick={onClose} aria-label="Cerrar venta manual">×</button></div>
  {done&&order?<div role="status"><h3>Pedido #{order.orderNumber} registrado</h3><p>{paymentMethod==='CASH'?'Pago en efectivo confirmado. Los números ya están vendidos.':'Comprobante adjunto. El pago está pendiente de revisión.'}</p><p>Total: {money(order.totalCrc)}. El comprador recibirá los correos con el detalle y su código de consulta.</p><button className="admin-sale-primary" onClick={()=>onReview(order.reservationId)}>{paymentMethod==='CASH'?'Ver venta registrada':'Revisar y aprobar el pago'}</button></div>:<form onSubmit={event=>void submit(event)}>
   <fieldset disabled={busy||Boolean(order)}><legend>Datos del comprador</legend><label>Nombre completo<input required minLength={3} maxLength={120} autoComplete="off" value={buyer.buyerName} onChange={e=>setBuyer({...buyer,buyerName:e.target.value})}/></label><label>Correo electrónico<input required type="email" maxLength={200} autoComplete="off" value={buyer.buyerEmail} onChange={e=>setBuyer({...buyer,buyerEmail:e.target.value})}/></label><label>Teléfono<input required type="tel" minLength={8} maxLength={25} autoComplete="off" value={buyer.buyerPhone} onChange={e=>setBuyer({...buyer,buyerPhone:e.target.value})}/></label>
   <BrandSelect label="Tarjeta de stickers" value={String(quantity)} onChange={value=>void reset(Number(value),manual)} options={offers.map(item=>({value:String(item.quantity),label:`${item.quantity/(campaign.numbersPerSticker||1)} ${campaign.numbersPerSticker?(item.quantity===campaign.numbersPerSticker?'sticker':'stickers'):(item.quantity===1?'boleto':'boletos')} · ${item.quantity} números · ${money(item.priceCrc)}`}))}/>
   <div className="selection-modes"><button type="button" aria-pressed={!manual} onClick={()=>void reset(quantity,false)}>Al azar</button><button type="button" aria-pressed={manual} onClick={()=>void reset(quantity,true)}>Elegir números</button></div>
   {manual?<ManualNumbers key={quantity} slug={campaign.slug} quantity={quantity} width={campaign.numberWidth} disabled={busy} onPick={async picked=>{await select(picked);}} onConfirm={async picked=>{await select(picked);}}/>:<button type="button" onClick={()=>void random()}>Generar números</button>}
   {values.length>0&&<><p>Números seleccionados ({values.length}/{quantity})</p><div className="admin-sale-numbers">{values.map(n=><span key={n}>{String(n).padStart(campaign.numberWidth,'0')}</span>)}</div><p role="status">{expired?'El apartado temporal venció. Volvé a seleccionar los números.':`Apartados temporalmente: ${Math.max(0,Math.ceil((new Date(expires).getTime()-now)/1000))} segundos.`}</p></>}
   </fieldset>
   {order&&<p role="status">El pedido #{order.orderNumber} ya está creado. Reintentá adjuntar el comprobante; no se creará otro pedido. También podés encontrarlo en Boletos y personas.</p>}
   <fieldset disabled={busy||Boolean(order)}><legend>Método de pago</legend><BrandSelect label="Método de pago" value={paymentMethod} onChange={value=>{setPaymentMethod(value);setCashReceived(false);}} options={[{value:'SINPE',label:'SINPE Móvil · con comprobante'},{value:'CASH',label:'Efectivo · sin comprobante'}]}/></fieldset>
   {paymentMethod==='CASH'?<label className="cash-received"><input type="checkbox" required checked={cashReceived} disabled={busy||Boolean(order)} onChange={event=>setCashReceived(event.target.checked)}/>Confirmo que recibí {money(offer.priceCrc)} en efectivo. Al guardar, los números quedarán vendidos.</label>:<><label>Comprobante del pago<input type="file" required disabled={busy} accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><small>JPG, PNG o WebP. Se guardará en revisión; adjuntar una imagen no confirma el pago.</small></>}
   {error&&<p role="alert" className="admin-detail-error">{error}</p>}
   <button className="admin-sale-primary" disabled={busy||(paymentMethod==='SINPE'?!file:!cashReceived)||(!order&&(values.length!==quantity||expired))}>{busy?'Guardando…':order?'Reintentar comprobante':`${paymentMethod==='CASH'?'Confirmar venta en efectivo':'Registrar pedido'} · ${money(offer.priceCrc)}`}</button>
  </form>}
 </dialog>;
}
