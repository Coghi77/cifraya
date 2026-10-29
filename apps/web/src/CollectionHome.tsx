import {lazy,Suspense,useRef,useEffect,useState} from 'react';
const AnniversaryCarousel=lazy(()=>import('./AnniversaryCarousel'));
const FeaturedCards=lazy(()=>import('./FeaturedCards'));
import './collection.css';

export default function CollectionHome(){
 const container=useRef<HTMLDivElement>(null);
 const [visible,setVisible]=useState(false);
 useEffect(()=>{const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:'300px'});if(container.current)observer.observe(container.current);return()=>observer.disconnect();},[]);
 const [reduced,setReduced]=useState(true);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReduced(media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
 return <div ref={container} style={{minHeight:200}} className={'collection-home'+(reduced?' motion-paused':'')}>
   {visible&&<Suspense fallback={<p>Cargando cartas…</p>}><AnniversaryCarousel/><FeaturedCards/></Suspense>}
 </div>;
}
