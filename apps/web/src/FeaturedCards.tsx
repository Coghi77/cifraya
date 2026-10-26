import {useState} from 'react';
import {ArrowLeft,ArrowRight,Expand} from 'lucide-react';
import {PrizeGallery} from './PrizePhoto';
import catalog from './anniversaryCards.json';

const picks=[
 {number:158,name:'Mew ex',rarity:'Futuristic Rare',caption:'Una nueva mirada a un Pokémon mítico.',tone:'pink'},
 {number:157,name:'Mewtwo ex',rarity:'Futuristic Rare',caption:'Presencia, contraste y arte futurista.',tone:'violet'},
 {number:149,name:'Pikachu ex',rarity:'Special Illustration Rare',caption:'La celebración vista a plena luz.',tone:'gold'},
 {number:150,name:'Pikachu ex',rarity:'Special Illustration Rare',caption:'Otra escena. Otra forma de brillar.',tone:'blue'},
].map(card=>({...card,url:catalog.find(item=>item.id===`30c-${card.number}`)!.url}));

export default function FeaturedCards(){
 const [active,setActive]=useState(0);
 const [open,setOpen]=useState(false);
 const card=picks[active];
 const move=(step:number)=>setActive(current=>(current+step+picks.length)%picks.length);
 return <section className={`featured-cards tone-${card.tone}`} aria-labelledby="featured-cards-title">
   <div className="featured-copy"><span className="collection-kicker">30TH CELEBRATION / SELECCIÓN DESTACADA</span><h2 id="featured-cards-title">Arte que<br/><em>se roba la mirada.</em></h2><p>Cuatro cartas para mirar de cerca, elegidas por su ilustración y rareza.</p><div className="featured-details" aria-live="polite"><span>{card.rarity}</span><h3>{card.name}</h3><p>{card.caption}</p><small>{card.number}/128 · 30th Celebration</small></div><div className="featured-controls"><button type="button" onClick={()=>move(-1)} aria-label="Carta destacada anterior"><ArrowLeft/></button><span>{String(active+1).padStart(2,'0')} / 04</span><button type="button" onClick={()=>move(1)} aria-label="Carta destacada siguiente"><ArrowRight/></button></div></div>
   <div className="featured-stage"><span className="featured-orbit" aria-hidden="true"/><button type="button" className="featured-art" onClick={()=>setOpen(true)} aria-label={`Ampliar ${card.name} ${card.number}/128`}><img key={card.url} src={card.url} alt={`${card.name}, ${card.rarity}, ${card.number}/128`} width="367" height="512" loading="lazy"/><span><Expand size={16}/> Ver detalles</span></button></div>
   <div className="featured-thumbnails" role="group" aria-label="Elegir carta destacada">{picks.map((item,index)=><button key={item.number} type="button" aria-pressed={index===active} aria-label={`${item.name} ${item.number}/128`} onClick={()=>setActive(index)}><img src={item.url} alt="" width="64" height="90" loading="lazy"/><span>{item.name}<small>{item.number}/128</small></span></button>)}</div>
   {open&&<PrizeGallery photos={picks} title="Cartas destacadas · 30th Celebration" initialIndex={active} onClose={()=>setOpen(false)}/>}
 </section>;
}
