import {useEffect,useState} from 'react';
import {ArrowDown, ArrowUpRight, BookOpen, Layers3, ScanLine, ShieldCheck, Pause, Play, ChevronLeft, ChevronRight} from 'lucide-react';
import PrizePhoto from './PrizePhoto';
import CardCatalog from './CardCatalog';
import './collection.css';

const products = [
  {name:'Elite Trainer Box', short:'ETB', image:'/collection/etb.png', type:'PARA CONOCER EL PRODUCTO', text:'Una caja que reúne sobres y accesorios de juego. El contenido exacto depende de la edición: revisá siempre la lista del empaque.', detail:'Buscá el nombre de la expansión, el idioma y la lista de contenido. Una carta promocional incluida y una carta aleatoria de un sobre son cosas distintas.'},
  {name:'Binder Collection', short:'Binder', image:'/collection/binder.png', type:'PARA ORGANIZAR TU COLECCIÓN', text:'El binder permite guardar y recorrer tu colección. Antes de elegir uno, identificá su capacidad y el contenido indicado en la caja.', detail:'Revisá los bolsillos y las fundas compatibles. Guardá las cartas sin doblarlas y mantené el álbum en un lugar seco, lejos del sol directo.'},
];
const lessons = [
  {title:'ETB, sobres y colecciones', tag:'01 / PRODUCTOS', body:'Son formatos diferentes. Una ETB combina sobres y accesorios; otras colecciones pueden incluir productos o cartas promocionales específicos. Leé el contenido de cada edición, porque no todas las cajas traen lo mismo.'},
  {title:'Rareza no es lo mismo que valor', tag:'02 / RAREZAS', body:'La rareza clasifica una carta dentro de su expansión. Los símbolos y categorías cambian entre series e idiomas. Para identificarla, consultá la lista oficial de la expansión; el brillo por sí solo no determina su rareza ni su autenticidad.'},
  {title:'Aprendé a identificar una carta', tag:'03 / IDENTIFICACIÓN', body:'Buscá el nombre, número de colección, expansión e idioma. Después compará la variante y el acabado. Dos cartas con el mismo Pokémon pueden pertenecer a ediciones completamente diferentes.'},
  {title:'Cuidá lo que coleccionás', tag:'04 / CONSERVACIÓN', body:'Manipulá tus cartas con las manos limpias y secas. Usá fundas del tamaño adecuado, evitá presionar los bordes y guardalas lejos de humedad, calor y luz directa.'},
];
export default function CollectionHome(){
 const [selected,setSelected]=useState(0);
 const [topic,setTopic]=useState(0);
 const [paused,setPaused]=useState(false);
 const [interacting,setInteracting]=useState(false);
 const [reduced,setReduced]=useState(true);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReduced(media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
 useEffect(()=>{if(paused||interacting||reduced)return;const timer=window.setInterval(()=>{if(!document.hidden)setSelected(value=>(value+1)%products.length);},6500);return()=>window.clearInterval(timer);},[paused,interacting,reduced]);
 const choose=(index:number)=>{setSelected((index+products.length)%products.length);setPaused(true);};
 const product=products[selected];
 return <div className={'collection-home'+(paused||reduced?' motion-paused':'')}>
   <section className="collection-hero" aria-labelledby="collection-title">
     <div className="collection-hero-copy"><span className="collection-kicker">VNOVA / CULTURA TCG</span><h1 id="collection-title">Cada carta.<br/>Una <em>historia.</em></h1><p>Un espacio para explorar productos, entender tus cartas y disfrutar lo que coleccionás.</p><a className="collection-action" href="#coleccion">Explorar la colección <ArrowDown size={18}/></a><span className="collection-caption">DESCUBRÍ · APRENDÉ · COLECCIONÁ</span><button className="scene-motion" type="button" disabled={reduced} onClick={()=>setPaused(value=>!value)}>{paused||reduced?<Play size={14}/>:<Pause size={14}/>} {reduced?'Movimiento reducido':paused?'Activar animaciones':'Pausar animaciones'}</button></div>
     <div className="collection-art" aria-label="Carta destacada: Gengar ex de Temporal Forces"><div className="collection-orbit"/><div className="collection-art-card back"/><div className="collection-real-card"><img src="https://assets.pokemon.com/static-assets/content-assets/cms2/img/cards/web/SV05/SV05_EN_104.png" alt="Gengar ex, Temporal Forces, carta 104 de 162" referrerPolicy="no-referrer"/><span className="card-glint" aria-hidden="true"/></div><span className="collection-art-note">GENGAR ex · TEMPORAL FORCES<br/>Una mirada al arte de las cartas.</span></div>
   </section>
   <div className="collection-ribbon"><span><Layers3 size={18}/> Productos de cerca</span><span><ScanLine size={18}/> Detalles que importan</span><span><BookOpen size={18}/> Aprendé a tu ritmo</span></div>
   <section className="collection-section" id="coleccion" aria-labelledby="products-title">
     <div className="collection-section-heading"><div><span className="collection-kicker">OBJETOS DE COLECCIÓN / 01</span><h2 id="products-title">Una colección.<br/><em>Muchas historias.</em></h2></div><p>Explorá las fotografías y conocé las diferencias entre los formatos.</p></div>
     <div className={'collection-showcase floating-showcase'+(paused||reduced?' motion-paused':'')} role="region" aria-roledescription="carrusel" aria-label="Explorar productos" onMouseEnter={()=>setInteracting(true)} onMouseLeave={()=>setInteracting(false)} onFocusCapture={()=>setInteracting(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setInteracting(false);}}>
      <div className="floating-product" key={product.image}><div className="collection-photo"><PrizePhoto src={product.image} photos={[]} title={product.name}/></div><span className="floating-product-index">0{selected+1} / 0{products.length}</span></div>
      <div className="collection-product-copy"><span className="collection-kicker">{product.type}</span><h3>{product.name}</h3><p>{product.text}</p><div className="collection-product-note"><ShieldCheck size={22}/><p>{product.detail}</p></div>
       <div className="carousel-controls"><button type="button" aria-label="Producto anterior" onClick={()=>choose(selected-1)}><ChevronLeft/></button><button type="button" disabled={reduced} aria-label={paused?'Reanudar carrusel':'Pausar carrusel'} onClick={()=>setPaused(value=>!value)}>{paused||reduced?<Play size={18}/>:<Pause size={18}/>}<span>{reduced?'Sin movimiento':paused?'Reanudar':'Pausar'}</span></button><button type="button" aria-label="Producto siguiente" onClick={()=>choose(selected+1)}><ChevronRight/></button></div>
       <div className="collection-product-switch" role="group" aria-label="Elegir producto">{products.map((p,i)=><button key={p.short} type="button" aria-pressed={i===selected} onClick={()=>choose(i)}><img src={p.image} alt="" loading="lazy"/><span>{p.short}</span></button>)}</div>
       <a className="collection-source" href="#aprende">Conocé los formatos aquí <ArrowUpRight size={16}/></a>
      </div>
     </div>
   </section>
   <CardCatalog/>
   <section className="collection-learn" id="aprende" aria-labelledby="learn-title"><div className="collection-section"><div className="collection-section-heading"><div><span className="collection-kicker">LABORATORIO TCG / 02</span><h2 id="learn-title">Activá tu<br/><em>curiosidad.</em></h2></div><p>No necesitás saberlo todo. Empezá por un detalle.</p></div><div className="collection-lessons"><div className="collection-topic-list" role="group" aria-label="Temas de aprendizaje">{lessons.map((lesson,i)=><button key={lesson.tag} aria-pressed={topic===i} onClick={()=>setTopic(i)} type="button"><small>{lesson.tag}</small><span>{lesson.title}<ArrowUpRight size={18}/></span></button>)}</div><article className="collection-lesson" aria-live="polite"><div className="lesson-pokemon" aria-hidden="true"><img src={'https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/site_search/'+['025','094','150','025'][topic]+'.png'} alt="" loading="lazy" referrerPolicy="no-referrer"/></div><BookOpen size={36} strokeWidth={1.2}/><span className="collection-kicker">GUÍA DE COLECCIONISMO</span><h3>{lessons[topic].title}</h3><p>{lessons[topic].body}</p><span className="collection-lesson-foot">{String(topic+1).padStart(2,'0')} / 04 · VNOVA TCG</span></article></div></div></section>
   <section className="collection-about"><img src="/vnova-logo.svg" alt="Vnova TCG" loading="lazy"/><div><span className="collection-kicker">HECHO PARA PERSONAS CURIOSAS</span><h2>Tu espacio para el TCG.</h2><p>Productos, detalles y aprendizaje en un mismo lugar.</p></div><a href="#aprende">Volver a la guía <ArrowUpRight size={18}/></a></section>
 </div>;
}
