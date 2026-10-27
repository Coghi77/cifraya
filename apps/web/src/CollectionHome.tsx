import {useEffect,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import AnniversaryCarousel from './AnniversaryCarousel';
import FeaturedCards from './FeaturedCards';
import './collection.css';

export default function CollectionHome(){
 const [reduced,setReduced]=useState(true);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReduced(media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
 return <div className={'collection-home'+(reduced?' motion-paused':'')}>
   <AnniversaryCarousel/>
   <FeaturedCards/>
   <section className="collection-about"><img src="/vnova-transparent.png" alt="Vnova TCG" loading="lazy"/><div><span className="collection-kicker">SEGUÍ EXPLORANDO</span><h2>Tu próxima historia.</h2><p>El universo TCG tiene mucho más por descubrir.</p></div><a href="#coleccion">Explorar las cartas <ArrowUpRight size={18}/></a></section>
 </div>;
}
