import {useState} from 'react';
import {ArrowDown, ArrowUpRight, BookOpen, Layers3, ScanLine, ShieldCheck} from 'lucide-react';
import PrizePhoto from './PrizePhoto';
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
 const product=products[selected];
 return <div className="collection-home">
   <section className="collection-hero" aria-labelledby="collection-title">
     <div className="collection-hero-copy"><span className="collection-kicker">VNOVA / CULTURA TCG</span><h1 id="collection-title">Cada carta.<br/>Una <em>historia.</em></h1><p>Un espacio para explorar productos, entender tus cartas y disfrutar lo que coleccionás.</p><a className="collection-action" href="#coleccion">Explorar la colección <ArrowDown size={18}/></a><span className="collection-caption">DESCUBRÍ · APRENDÉ · COLECCIONÁ</span></div>
     <div className="collection-art" aria-hidden="true"><div className="collection-orbit"/><div className="collection-art-card back"/><div className="collection-art-card front"><span>VNOVA TCG</span><img src="/vnova-logo.svg" alt=""/><span>EL ARTE DE COLECCIONAR <span>✦</span></span></div><span className="collection-art-note">Una colección empieza<br/>con curiosidad.</span></div>
   </section>
   <div className="collection-ribbon"><span><Layers3 size={18}/> Productos de cerca</span><span><ScanLine size={18}/> Detalles que importan</span><span><BookOpen size={18}/> Aprendé a tu ritmo</span></div>
   <section className="collection-section" id="coleccion" aria-labelledby="products-title">
     <div className="collection-section-heading"><div><span className="collection-kicker">LA VITRINA / 01</span><h2 id="products-title">De cerca se<br/><em>descubre más.</em></h2></div><p>Explorá las fotografías y conocé las diferencias entre los formatos.</p></div>
     <div className="collection-showcase"><div className="collection-photo"><PrizePhoto key={product.image} src={product.image} photos={[]} title={product.name}/></div><div className="collection-product-copy"><div className="collection-product-switch" role="group" aria-label="Elegir producto">{products.map((p,i)=><button key={p.short} type="button" aria-pressed={i===selected} onClick={()=>setSelected(i)}><img src={p.image} alt="" loading="lazy"/><span>{p.short}</span></button>)}</div><div aria-live="polite"><span className="collection-kicker">{product.type}</span><h3>{product.name}</h3><p>{product.text}</p><div className="collection-product-note"><ShieldCheck size={22}/><p>{product.detail}</p></div></div><a className="collection-source" href="https://support.pokemon.com/hc/en-us/articles/360001024394-What-types-of-Trading-Card-Game-products-are-available" target="_blank" rel="noreferrer">Guía oficial de tipos de productos <ArrowUpRight size={16}/></a></div></div>
   </section>
   <section className="collection-learn" id="aprende" aria-labelledby="learn-title"><div className="collection-section"><div className="collection-section-heading"><div><span className="collection-kicker">TU PRIMERA PÁGINA / 02</span><h2 id="learn-title">Coleccionar también<br/>es <em>aprender.</em></h2></div><p>No necesitás saberlo todo. Empezá por un detalle.</p></div><div className="collection-lessons"><div className="collection-topic-list" role="group" aria-label="Temas de aprendizaje">{lessons.map((lesson,i)=><button key={lesson.tag} aria-pressed={topic===i} onClick={()=>setTopic(i)} type="button"><small>{lesson.tag}</small><span>{lesson.title}<ArrowUpRight size={18}/></span></button>)}</div><article className="collection-lesson" aria-live="polite"><BookOpen size={36} strokeWidth={1.2}/><span className="collection-kicker">GUÍA DE COLECCIONISMO</span><h3>{lessons[topic].title}</h3><p>{lessons[topic].body}</p><span className="collection-lesson-foot">{String(topic+1).padStart(2,'0')} / 04 · VNOVA TCG</span></article></div></div></section>
   <section className="collection-about"><img src="/vnova-logo.svg" alt="Vnova TCG" loading="lazy"/><div><span className="collection-kicker">HECHO PARA PERSONAS CURIOSAS</span><h2>Tu espacio para el TCG.</h2><p>Productos, detalles y aprendizaje en un mismo lugar.</p></div><a href="#aprende">Volver a la guía <ArrowUpRight size={18}/></a></section>
 </div>;
}
