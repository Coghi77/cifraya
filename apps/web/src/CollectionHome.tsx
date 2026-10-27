import {useEffect,useState} from 'react';
import {ArrowDown, ArrowUpRight, BookOpen, Layers3, ScanLine, Pause, Play} from 'lucide-react';
import AnniversaryCarousel from './AnniversaryCarousel';
import FeaturedCards from './FeaturedCards';
import './collection.css';

export default function CollectionHome(){
 const [paused,setPaused]=useState(false);
 const [reduced,setReduced]=useState(true);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReduced(media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
 return <div className={'collection-home'+(paused||reduced?' motion-paused':'')}>
   <section className="collection-hero" aria-labelledby="collection-title">
     <div className="collection-hero-copy"><span className="collection-kicker">VNOVA / CULTURA TCG</span><h1 id="collection-title">Cada carta.<br/>Una <em>historia.</em></h1><p>Un espacio para explorar productos, entender tus cartas y disfrutar lo que coleccionás.</p><a className="collection-action" href="#coleccion">Explorar la colección <ArrowDown size={18}/></a><span className="collection-caption">DESCUBRÍ · APRENDÉ · COLECCIONÁ</span><button className="scene-motion" type="button" disabled={reduced} onClick={()=>setPaused(value=>!value)}>{paused||reduced?<Play size={14}/>:<Pause size={14}/>} {reduced?'Movimiento reducido':paused?'Activar animaciones':'Pausar animaciones'}</button></div>
     <div className="collection-art" aria-label="Carta destacada: Gengar VMAX de Fusion Strike"><div className="collection-orbit"/><div className="collection-art-card back"/><div className="collection-real-card"><img src="https://assets.pokemon.com/static-assets/content-assets/cms2/img/cards/web/SWSH8/SWSH8_EN_271.png" alt="Gengar VMAX, Fusion Strike, carta 271 de 264" referrerPolicy="no-referrer"/><span className="card-glint" aria-hidden="true"/></div><span className="collection-art-note">GENGAR VMAX · FUSION STRIKE<br/>Una mirada al arte de las cartas.</span></div>
   </section>
   <div className="collection-ribbon"><span><Layers3 size={18}/> Productos de cerca</span><span><ScanLine size={18}/> Detalles que importan</span><span><BookOpen size={18}/> Aprendé a tu ritmo</span></div>
   <AnniversaryCarousel/>
   <FeaturedCards/>
   <section className="collection-about"><img src="/vnova-transparent.png" alt="Vnova TCG" loading="lazy"/><div><span className="collection-kicker">SEGUÍ EXPLORANDO</span><h2>Tu próxima historia.</h2><p>El universo TCG tiene mucho más por descubrir.</p></div><a href="#coleccion">Explorar las cartas <ArrowUpRight size={18}/></a></section>
 </div>;
}
