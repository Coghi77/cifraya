import {useEffect,useState} from 'react';
import {Clock3} from 'lucide-react';
export default function DrawCountdown({mode,date,sold,total}:{mode?:string;date:string|null;sold:number;total:number}) {
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{if(mode!=='DATE'||!date)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[mode,date]);
 if(mode!=='DATE'||!date)return <p className="draw-date-note"><Clock3 size={18}/>{mode==='SOLD_OUT' ? sold>=total ? 'Números agotados · sorteo por anunciar' : 'Sorteo al agotar los números' : 'Fecha del sorteo por anunciar'}</p>;
 const seconds=Math.max(0,Math.floor((new Date(date).getTime()-now)/1000));
 const parts=[Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60];
 return <section className="draw-countdown" aria-label="Fecha del sorteo"><div><Clock3 size={20}/><strong>{seconds ? 'Falta para el sorteo' : 'Fecha del sorteo alcanzada'}</strong></div><time dateTime={date}>{new Date(date).toLocaleString('es-CR',{timeZone:'America/Costa_Rica',dateStyle:'long',timeStyle:'short'})} · Costa Rica</time>{seconds>0 ? <div className="draw-countdown-units">{parts.map((value,index)=><div key={index}><b>{String(value).padStart(2,'0')}</b><span>{['Días','Horas','Min','Seg'][index]}</span></div>)}</div> : <p>Consultá los resultados cuando se publiquen.</p>}</section>;
}
