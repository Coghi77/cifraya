import Confirmation from './Confirmation';
import {useEffect, useRef, useState} from 'react';
import {ChevronLeft, ChevronRight, X, Search} from 'lucide-react';

type Photo = {url:string};
const displayPhoto=(url:string,width=1200)=>url.startsWith('/api/campaign-photos/')?url+'?w='+width:url;
const photoSet=(url:string)=>url.startsWith('/api/campaign-photos/')?displayPhoto(url,640)+' 640w, '+displayPhoto(url,1200)+' 1200w':undefined;
// Frame the supplied portrait photo around the full ETB, without changing its pixels.
const productFrame=(url:string)=>url.endsWith('/cmvpqcpsf0001k43rifof0lfa')?'etb-product-frame':undefined;
export default function PrizePhoto({photos, src, title}: {photos:Photo[]; src:string; title:string}) {
  const [open,setOpen]=useState(false);
  const [chosen,setChosen]=useState(src);
  const [slide,setSlide]=useState<{from:string;direction:number}|null>(null);
  const sliding=useRef(false);
  const images=photos.length ? photos : [{url:src}];
  const selected=images.some(photo=>photo.url===chosen)?chosen:images[0].url;
  useEffect(()=>setChosen(src),[src]);
  const touch=useRef<{x:number;y:number}|null>(null);
  const swiped=useRef(false);
  const index=Math.max(0,images.findIndex(photo=>photo.url===selected));
  const choose=(url:string,direction:number)=>{
    if(url===selected||sliding.current)return;
    sliding.current=true;
    setSlide({from:selected,direction});
    setChosen(url);
  };
  const move=(direction:number)=>choose(images[(index+direction+images.length)%images.length].url,direction);
  const photoUrls=JSON.stringify(images.map(photo=>photo.url));
  useEffect(()=>{
    const timer=window.setTimeout(()=>(JSON.parse(photoUrls) as string[]).filter(url=>url!==src).forEach(url=>{const image=new Image();image.sizes='(max-width: 600px) 90vw, 600px';image.srcset=photoSet(url)||'';image.fetchPriority='low';image.src=displayPhoto(url);}),1200);
    return()=>window.clearTimeout(timer);
  },[photoUrls,src]);
  useEffect(()=>{
    if(!slide)return;
    const timer=window.setTimeout(()=>{setSlide(null);sliding.current=false;},550);
    return ()=>window.clearTimeout(timer);
  },[slide]);
  useEffect(()=>{
    const urls=JSON.parse(photoUrls) as string[];
    if(open||urls.length<2)return;
    const timer=window.setInterval(()=>{
      if(document.hidden||touch.current)return;
      choose(urls[(Math.max(0,urls.indexOf(selected))+1)%urls.length],1);
    },3500);
    return ()=>window.clearInterval(timer);
  },[photoUrls,open,chosen]);
  return <div className="prize-photo" role="region" aria-label={'Galería de '+title} aria-roledescription="carrusel" onKeyDown={event=>{if(event.key==='ArrowRight'){event.preventDefault();move(1);}if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}}}>
    <div className="prize-carousel-stage" onTouchStart={event=>{swiped.current=false;touch.current=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;}} onTouchCancel={()=>{touch.current=null;}} onTouchEnd={event=>{const origin=touch.current;touch.current=null;if(!origin||!event.changedTouches.length)return;const dx=event.changedTouches[0].clientX-origin.x,dy=event.changedTouches[0].clientY-origin.y;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)&&images.length>1){swiped.current=true;move(dx<0?1:-1);}}}>
      <button type="button" className={`prize-photo-open${slide?' prize-sliding '+(slide.direction>0?'slide-forward':'slide-backward'):''}`} aria-label={'Ampliar foto '+(index+1)+' de '+title} onClick={()=>{if(swiped.current){swiped.current=false;return;}setOpen(true);}}>
        {slide&&<img key={'out-'+slide.from} className={`prize-slide-out ${productFrame(slide.from)||''}`} src={displayPhoto(slide.from)} srcSet={photoSet(slide.from)} sizes="(max-width: 600px) 90vw, 600px" decoding="async" alt="" aria-hidden="true" draggable={false}/>}
        <img key={selected} className={`prize-slide-current ${productFrame(selected)||''}`} src={displayPhoto(selected)} srcSet={photoSet(selected)} sizes="(max-width: 600px) 90vw, 600px" decoding="async" fetchPriority="high" alt={title+', foto '+(index+1)} draggable={false}/><span className="prize-photo-hint" aria-hidden="true"><Search size={22}/></span></button>

    </div>
    {images.length>1 && <div className="prize-photo-thumbnails prize-photo-dots" aria-label="Fotos del premio">{images.map((photo,photoIndex)=><button key={photo.url} type="button" aria-label={`Ver foto ${photoIndex+1}`} aria-pressed={selected===photo.url} onClick={()=>choose(photo.url,photoIndex>index?1:-1)}><span aria-hidden="true"/></button>)}</div>}
    {open && <PrizeGallery photos={images} title={title} initialIndex={index} onClose={()=>setOpen(false)}/>}
  </div>;
}

export function PrizeGallery({photos,title,initialIndex,onClose}:{photos:Photo[];title:string;initialIndex:number;onClose:()=>void}) {
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
  return <dialog ref={dialog} className="prize-gallery" aria-label={'Fotos del premio: '+title} onClose={event=>{if(!event.currentTarget.open)onClose();}} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}} onKeyDown={event=>{if(event.key==='ArrowRight'){event.preventDefault();move(1);}if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}}}>
    <div className="prize-gallery-panel">
      <div className="prize-gallery-header"><span>{title}</span><button type="button" autoFocus aria-label="Cerrar fotos" onClick={()=>dialog.current?.close()}><X/></button></div>
      <div className="prize-gallery-stage" onTouchCancel={()=>{start.current=null;}} onTouchStart={event=>{start.current=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;}} onTouchEnd={event=>{const origin=start.current;start.current=null;if(!origin||!event.changedTouches.length)return;const dx=event.changedTouches[0].clientX-origin.x;const dy=event.changedTouches[0].clientY-origin.y;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))move(dx<0?1:-1);}}>
        {failed ? <Confirmation variant="error" message="La foto no cargó. Probá con otra."/> : <img className={productFrame(photos[index].url)} key={photos[index].url} src={displayPhoto(photos[index].url,1600)} decoding="async" alt={`${title}, foto ${index+1}`} draggable={false} onError={()=>setFailed(true)}/>}
      </div>
      <div className="prize-gallery-controls">{photos.length>1 && <button type="button" aria-label="Foto anterior" onClick={()=>move(-1)}><ChevronLeft/></button>}<span role="status" aria-live="polite">Foto {index+1} de {photos.length}</span>{photos.length>1 && <button type="button" aria-label="Foto siguiente" onClick={()=>move(1)}><ChevronRight/></button>}</div>
    </div>
  </dialog>;
}
