import {useEffect, useRef, useState} from 'react';
import {ChevronLeft, ChevronRight, X, Expand} from 'lucide-react';

type Photo = {url:string};
export default function PrizePhoto({photos, src, title}: {photos:Photo[]; src:string; title:string}) {
  const [open,setOpen]=useState(false);
  const [chosen,setChosen]=useState(src);
  const images=photos.length ? photos : [{url:src}];
  const selected=images.some(photo=>photo.url===chosen)?chosen:images[0].url;
  useEffect(()=>setChosen(src),[src]);
  return <div className="prize-photo"><button type="button" className="prize-photo-open" aria-label={'Ampliar fotos de '+title} onClick={()=>setOpen(true)}><img src={selected} alt={title}/><span className="prize-photo-hint"><Expand size={16}/> Ampliar foto</span></button>{images.length>1 && <div className="prize-photo-thumbnails" aria-label="Fotos del premio">{images.map((photo,index)=><button key={photo.url} type="button" aria-label={`Ver foto ${index+1}`} aria-pressed={selected===photo.url} onClick={()=>setChosen(photo.url)}><img src={photo.url} alt="" loading="lazy"/></button>)}</div>}{open && <PrizeGallery photos={images} title={title} initialIndex={Math.max(0,images.findIndex(photo=>photo.url===selected))} onClose={()=>setOpen(false)}/>}</div>;
}

function PrizeGallery({photos,title,initialIndex,onClose}:{photos:Photo[];title:string;initialIndex:number;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const start=useRef<{x:number;y:number}|null>(null);
  const [index,setIndex]=useState(initialIndex);
  const [failed,setFailed]=useState(false);
  const move=(direction:number)=>{setFailed(false);setIndex(current=>(current+direction+photos.length)%photos.length);};
  useEffect(()=>{
    const element=dialog.current!;
    const overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';element.showModal();
    return ()=>{element.close();document.body.style.overflow=overflow;};
  },[]);
  return <dialog ref={dialog} className="prize-gallery" aria-label={'Fotos del premio: '+title} onClose={onClose} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}} onKeyDown={event=>{if(event.key==='ArrowRight'){event.preventDefault();move(1);}if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}}}>
    <div className="prize-gallery-panel">
      <div className="prize-gallery-header"><span>{title}</span><button type="button" autoFocus aria-label="Cerrar fotos" onClick={()=>dialog.current?.close()}><X/></button></div>
      <div className="prize-gallery-stage" onTouchCancel={()=>{start.current=null;}} onTouchStart={event=>{start.current=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;}} onTouchEnd={event=>{const origin=start.current;start.current=null;if(!origin||!event.changedTouches.length)return;const dx=event.changedTouches[0].clientX-origin.x;const dy=event.changedTouches[0].clientY-origin.y;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))move(dx<0?1:-1);}}>
        {failed ? <p role="status">No se pudo cargar esta foto. Podés pasar a otra imagen.</p> : <img key={photos[index].url} src={photos[index].url} alt={`${title}, foto ${index+1}`} draggable={false} onError={()=>setFailed(true)}/>}
      </div>
      <div className="prize-gallery-controls">{photos.length>1 && <button type="button" aria-label="Foto anterior" onClick={()=>move(-1)}><ChevronLeft/></button>}<span role="status" aria-live="polite">Foto {index+1} de {photos.length}</span>{photos.length>1 && <button type="button" aria-label="Foto siguiente" onClick={()=>move(1)}><ChevronRight/></button>}</div>
    </div>
  </dialog>;
}
