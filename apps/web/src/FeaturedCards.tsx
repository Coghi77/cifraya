import {useEffect,useRef,useState} from 'react';
import {Expand} from 'lucide-react';
import {PrizeGallery} from './PrizePhoto';
import type {Collection} from './CardCatalog';

export default function FeaturedCards(){
 const [collections,setCollections]=useState<Collection[]>([]);
 useEffect(()=>{const controller=new AbortController();fetch('/api/card-collections',{signal:controller.signal}).then(async response=>{if(response.ok)setCollections(await response.json());}).catch(()=>{});return()=>controller.abort();},[]);
 const picks=collections.flatMap(collection=>collection.cards.filter(card=>card.featured).map(card=>({...card,url:card.imageUrl,collection:collection.name,edition:collection.edition})));
 const [active,setActive]=useState(0);
 const [open,setOpen]=useState(false);
 const gesture=useRef<{x:number;y:number}|null>(null);
 const dragged=useRef(false);
 const [touching,setTouching]=useState(false);
 const section=useRef<HTMLElement>(null);
 const [reduced,setReduced]=useState(false);
 const [visible,setVisible]=useState(false);
 const [pageVisible,setPageVisible]=useState(!document.hidden);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(media.matches);update();media.addEventListener('change',update);const visibility=()=>setPageVisible(!document.hidden);document.addEventListener('visibilitychange',visibility);return()=>{media.removeEventListener('change',update);document.removeEventListener('visibilitychange',visibility);};},[]);
 useEffect(()=>{if(!section.current)return;const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:.15});observer.observe(section.current);return()=>observer.disconnect();},[picks.length]);
 const running=!touching&&!reduced&&!open&&visible&&pageVisible&&picks.length>1;
 useEffect(()=>{if(!running)return;const timer=window.setTimeout(()=>setActive(current=>(current+1)%picks.length),3000);return()=>clearTimeout(timer);},[running,active,picks.length]);
 const card=picks[active] || picks[0];
 if(!card)return null;
 const move=(step:number)=>setActive(current=>(current+step+picks.length)%picks.length);
 return <section ref={section} className={`featured-cards featured-auto ${running?'is-running':''} tone-${['pink','violet','gold','blue'][active%4]}`} aria-labelledby="featured-cards-title">
   <div className="featured-copy"><span className="collection-kicker">CARTAS DESTACADAS</span><h2 id="featured-cards-title">HITS del<br/><em>{card.collection}</em></h2><p>Estas son algunas de las cartas que podrían salir en los sobres de esta colección. Su aparición no está garantizada.</p><div className="featured-details"><span>{card.rarity}</span><h3>{card.name}</h3><small>{card.number} · {card.edition}</small></div></div>
   <div className="featured-stage"><span className="featured-orbit" aria-hidden="true"/>
    <div className="featured-deck" onPointerDown={event=>{if(!event.isPrimary||event.button!==0)return;gesture.current={x:event.clientX,y:event.clientY};dragged.current=false;setTouching(true);}} onPointerUp={event=>{const start=gesture.current;gesture.current=null;setTouching(false);if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3){dragged.current=true;move(dx<0?1:-1);}}} onPointerLeave={event=>{if(event.pointerType==='mouse'){gesture.current=null;setTouching(false);}}} onPointerCancel={()=>{gesture.current=null;setTouching(false);}} onClickCapture={event=>{if(dragged.current){event.preventDefault();event.stopPropagation();dragged.current=false;}}}>{picks.map((item,index)=>{const offset=(index-active+picks.length)%picks.length;const position=offset===0?'current':offset===1?'next':offset===picks.length-1?'previous':'away';return <button key={item.url+index} type="button" className={`featured-slide slide-${position}`} tabIndex={position==='current'?0:-1} aria-hidden={position!=='current'} onClick={()=>position==='current'?setOpen(true):setActive(index)} aria-label={`Ampliar ${item.name} ${item.number}`}><img draggable={false} src={item.url} alt={`${item.name}, ${item.rarity}, ${item.number}`} width="367" height="512" loading="lazy"/>{position==='current'&&<span><Expand size={16}/> Ampliar carta</span>}</button>;})}</div>
   </div>
   <div className="featured-pagination" role="group" aria-label="Elegir carta destacada">{picks.map((item,index)=><button key={item.url+index} type="button" aria-pressed={index===active} aria-label={`${item.name} ${item.number}`} onClick={()=>setActive(index)}><span className="featured-progress" key={String(active)+String(running)} style={{animationPlayState:running?'running':'paused'}}/><span className="featured-page-name">{item.name}</span></button>)}</div>
   {open&&<PrizeGallery photos={picks} title="Cartas destacadas" initialIndex={active} onClose={()=>setOpen(false)}/>}
 </section>;
}
