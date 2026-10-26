import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,Expand} from 'lucide-react';
import {PrizeGallery} from './PrizePhoto';
import type {Collection} from './CardCatalog';

export default function FeaturedCards(){
 const [collections,setCollections]=useState<Collection[]>([]);
 useEffect(()=>{const controller=new AbortController();fetch('/api/card-collections',{signal:controller.signal}).then(async response=>{if(response.ok)setCollections(await response.json());}).catch(()=>{});return()=>controller.abort();},[]);
 const picks=collections.flatMap(collection=>collection.cards.filter(card=>card.featured).map(card=>({...card,url:card.imageUrl,collection:collection.name,edition:collection.edition})));
 const [active,setActive]=useState(0);
 const [open,setOpen]=useState(false);
 const card=picks[active] || picks[0];
 if(!card)return null;
 const move=(step:number)=>setActive(current=>(current+step+picks.length)%picks.length);
 return <section className={`featured-cards tone-${['pink','violet','gold','blue'][active%4]}`} aria-labelledby="featured-cards-title">
   <div className="featured-copy"><span className="collection-kicker">CARTAS DESTACADAS</span><h2 id="featured-cards-title">Las mejores cartas<br/><em>de {card.collection}.</em></h2><p>Estas son algunas de las cartas que podrían salir en los sobres de esta colección. Su aparición no está garantizada.</p><div className="featured-details" aria-live="polite"><span>{card.rarity}</span><h3>{card.name}</h3><small>{card.number} · {card.edition}</small></div><div className="featured-controls"><button type="button" onClick={()=>move(-1)} aria-label="Carta destacada anterior"><ArrowLeft/></button><span>{String(active+1).padStart(2,'0')} / {String(picks.length).padStart(2,'0')}</span><button type="button" onClick={()=>move(1)} aria-label="Carta destacada siguiente"><ArrowRight/></button></div></div>
   <div className="featured-stage"><span className="featured-orbit" aria-hidden="true"/><button type="button" className="featured-art" onClick={()=>setOpen(true)} aria-label={`Ampliar ${card.name} ${card.number}`}><img key={card.url} src={card.url} alt={`${card.name}, ${card.rarity}, ${card.number}`} width="367" height="512" loading="lazy"/><span><Expand size={16}/> Ver detalles</span></button></div>
   <div className="featured-thumbnails" role="group" aria-label="Elegir carta destacada">{picks.map((item,index)=><button key={item.url+index} type="button" aria-pressed={index===active} aria-label={`${item.name} ${item.number}`} onClick={()=>setActive(index)}><img src={item.url} alt="" width="64" height="90" loading="lazy"/><span>{item.name}<small>{item.number}</small></span></button>)}</div>
   {open&&<PrizeGallery photos={picks} title="Cartas destacadas" initialIndex={active} onClose={()=>setOpen(false)}/>}
 </section>;
}
