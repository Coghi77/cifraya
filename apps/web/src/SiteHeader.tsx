import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Menu,X} from 'lucide-react';

export default function SiteHeader({children,onHome}:{children:ReactNode;onHome:()=>void}) {
 const [open,setOpen]=useState(false);
 const header=useRef<HTMLElement>(null);
 const toggle=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{if(!header.current?.contains(event.target as Node))setOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);toggle.current?.focus();}};
  document.addEventListener('pointerdown',outside);
  document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[open]);
 useEffect(()=>{
  const query=window.matchMedia('(max-width:800px)');
  const close=()=>setOpen(false);
  query.addEventListener('change',close);
  window.addEventListener('popstate',close);
  return()=>{query.removeEventListener('change',close);window.removeEventListener('popstate',close);};
 },[]);
 return <header ref={header} className="site-header" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setOpen(false);}}>
  <button className="brand" onClick={()=>{setOpen(false);onHome();}} aria-label="Vnova TCG, ir al inicio"><img src="/vnova-transparent.webp" alt="Logo de Vnova TCG" className="brand-logo"/></button>
  <button ref={toggle} type="button" className="mobile-menu-toggle" aria-expanded={open} aria-controls="site-navigation" aria-label={open?'Cerrar menú':'Abrir menú'} onClick={()=>setOpen(value=>!value)}>{open?<X size={26}/>:<Menu size={26}/>}</button>
  <nav id="site-navigation" className={open?'mobile-menu-open':''} aria-label="Navegación principal" onClick={event=>{if((event.target as Element).closest('button,a'))setOpen(false);}}>{children}</nav>
 </header>;
}
