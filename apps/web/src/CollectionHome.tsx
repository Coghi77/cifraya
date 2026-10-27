import {useEffect,useState} from 'react';
import AnniversaryCarousel from './AnniversaryCarousel';
import FeaturedCards from './FeaturedCards';
import './collection.css';

export default function CollectionHome(){
 const [reduced,setReduced]=useState(true);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReduced(media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
 return <div className={'collection-home'+(reduced?' motion-paused':'')}>
   <AnniversaryCarousel/>
   <FeaturedCards/>
 </div>;
}
