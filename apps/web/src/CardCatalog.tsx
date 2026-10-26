import {useEffect,useState,type FormEvent} from 'react';
import './cardCatalog.css';
import Confirmation from './Confirmation';

type Card={name:string;rarity:string;number:string;imageUrl:string};
type Collection={id:string;name:string;edition:string;sourceUrl:string;cards:Card[];published:boolean;version:number};
type Draft=Omit<Collection,'id'|'version'>;
const blankCard=():Card=>({name:'',rarity:'',number:'',imageUrl:''});
const blank=():Draft=>({name:'',edition:'',sourceUrl:'',cards:[blankCard()],published:false});

function CardImage({card}:{card:Card}){
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[card.imageUrl]);
 return failed || !card.imageUrl ? <div className="catalog-image-missing">Imagen no disponible</div> : <img src={card.imageUrl} alt={card.name} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>;
}

export default function CardCatalog(){
 const [items,setItems]=useState<Collection[]>([]);
 const [chosen,setChosen]=useState('');
 const [failed,setFailed]=useState(false);
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{const controller=new AbortController();setFailed(false);fetch('/api/card-collections',{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error();setItems(await response.json());}).catch(error=>{if(error.name!=='AbortError')setFailed(true);});return()=>controller.abort();},[attempt]);
 const collection=items.find(item=>item.id===chosen)||items[0];
 if(failed)return <section className="collection-section"><p role="status">No se pudo cargar el catálogo de cartas.</p><button type="button" onClick={()=>setAttempt(value=>value+1)}>Volver a intentar</button></section>;
 if(!collection)return null;
 return <section className="collection-section card-catalog" aria-labelledby="catalog-title">
  <span className="collection-kicker">EXPLORÁ LAS CARTAS</span><h2 id="catalog-title">Dentro de la colección.</h2>
  <p>Conocé algunas de las cartas que pueden aparecer en los sobres de cada edición. El contenido es aleatorio: estas cartas no están garantizadas en cada caja.</p>
  <div className="catalog-tabs" role="group" aria-label="Colecciones de cartas">{items.map(item=><button key={item.id} type="button" aria-pressed={item.id===collection.id} onClick={()=>setChosen(item.id)}>{item.name}</button>)}</div>
  <div className="catalog-edition"><h3>{collection.name}</h3><span>{collection.edition}</span><a href={collection.sourceUrl} target="_blank" rel="noreferrer">Consultar lista de referencia ↗</a></div>
  <div className="catalog-grid">{collection.cards.map((card,index)=><article key={collection.id+':'+index} className="catalog-card"><CardImage card={card}/><div><span className="catalog-rarity">{card.rarity}</span><h4>{card.name}</h4>{card.number&&<small>N.º {card.number}</small>}</div></article>)}</div>
 </section>;
}

export function CardCatalogAdmin({token}:{token:string}){
 const [items,setItems]=useState<Collection[]>([]);
 const [editing,setEditing]=useState<Collection|null>(null);
 const [draft,setDraft]=useState<Draft>(blank);
 const [formOpen,setFormOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
 async function load(){setLoading(true);try{const response=await fetch('/api/admin/card-collections',{headers});if(!response.ok)throw Error(response.status===401?'La sesión venció. Volvé a ingresar al panel.':'No se pudo cargar el catálogo.');setItems(await response.json());}catch(err){setError((err as Error).message);}finally{setLoading(false);}}
 useEffect(()=>{void load();},[token]);
 function edit(item:Collection|null){setEditing(item);setDraft(item?{name:item.name,edition:item.edition,sourceUrl:item.sourceUrl,published:item.published,cards:item.cards.map(card=>({...card}))}:blank());setFormOpen(true);setError('');setNotice('');}
 function updateCard(index:number,key:keyof Card,value:string){setDraft(current=>({...current,cards:current.cards.map((card,i)=>i===index?{...card,[key]:value}:card)}));}
 function move(index:number,step:number){setDraft(current=>{const cards=[...current.cards];[cards[index],cards[index+step]]=[cards[index+step],cards[index]];return {...current,cards};});}
 async function save(event:FormEvent){event.preventDefault();setBusy(true);setError('');setNotice('');try{
  const response=await fetch('/api/admin/card-collections'+(editing?'/'+editing.id:''),{method:editing?'PUT':'POST',headers,body:JSON.stringify({...draft,...(editing?{version:editing.version}:{})})});
  const data=await response.json();if(!response.ok)throw Error(response.status===401?'La sesión venció. Volvé a ingresar al panel.':data.error||'No se pudo guardar.');
  setFormOpen(false);setNotice(draft.published?'Colección publicada en la portada.':'Colección guardada como borrador; no aparece en la portada.');await load();
 }catch(err){setError((err as Error).message);}finally{setBusy(false);}}
 return <details className="admin-card catalog-admin"><summary>Catálogo de cartas · colecciones y rarezas</summary><p>Organizá las cartas por expansión y edición. Usá una lista de referencia para comprobar que pertenecen a los sobres de esa colección.</p>
  {error&&<p role="alert" className="catalog-error">{error}</p>}{notice&&<Confirmation message={notice} onClose={()=>setNotice('')}/>}
  {!formOpen&&<><div className="catalog-actions"><button type="button" disabled={loading} onClick={()=>edit(null)}>Nueva colección</button><button type="button" disabled={loading} onClick={()=>{setError('');void load();}}>Actualizar lista</button></div>{loading?<p>Cargando colecciones…</p>:items.length===0?<p>Todavía no hay colecciones configuradas.</p>:<div className="catalog-admin-list">{items.map(item=><div key={item.id}><span><strong>{item.name}</strong><small>{item.edition} · {item.cards.length} cartas · {item.published?'Publicada':'Borrador'}</small></span><button type="button" onClick={()=>edit(item)}>Editar</button></div>)}</div>}</>}
  {formOpen&&<form className="form-grid" onSubmit={save}><fieldset disabled={busy} className="catalog-fields"><legend>{editing?'Editar colección':'Nueva colección'}</legend>
   <label>Nombre de la colección<input required maxLength={120} minLength={2} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
   <label>Expansión, edición e idioma<input required maxLength={160} minLength={2} placeholder="Nombre exacto de expansión · inglés" value={draft.edition} onChange={e=>setDraft({...draft,edition:e.target.value})}/></label>
   <label>Enlace de la lista de referencia<input required type="url" pattern="https://.*" maxLength={2000} placeholder="https://…" value={draft.sourceUrl} onChange={e=>setDraft({...draft,sourceUrl:e.target.value})}/></label>
   <p>Agregá imágenes mediante un enlace HTTPS directo a la imagen. No incluyás cartas de otras expansiones ni promociones que no puedan salir en esos sobres.</p>
   {draft.cards.map((card,index)=><fieldset className="catalog-card-editor" key={index}><legend>Carta {index+1}</legend><label>Nombre<input required maxLength={120} value={card.name} onChange={e=>updateCard(index,'name',e.target.value)}/></label><label>Rareza<input required maxLength={80} placeholder="Ej. Illustration Rare" value={card.rarity} onChange={e=>updateCard(index,'rarity',e.target.value)}/></label><label>Número de colección (opcional)<input maxLength={40} placeholder="Ej. 123/165" value={card.number} onChange={e=>updateCard(index,'number',e.target.value)}/></label><label>URL de la imagen<input type="url" pattern="https://.*" required maxLength={2000} value={card.imageUrl} onChange={e=>updateCard(index,'imageUrl',e.target.value)}/></label>{card.imageUrl.startsWith('https://')&&<div className="catalog-preview"><CardImage card={card}/></div>}<div className="catalog-actions"><button type="button" disabled={index===0} onClick={()=>move(index,-1)}>Subir</button><button type="button" disabled={index===draft.cards.length-1} onClick={()=>move(index,1)}>Bajar</button><button type="button" disabled={draft.cards.length===1} onClick={()=>setDraft({...draft,cards:draft.cards.filter((_,i)=>i!==index)})}>Quitar carta</button></div></fieldset>)}
   <button type="button" disabled={draft.cards.length>=100} onClick={()=>setDraft({...draft,cards:[...draft.cards,blankCard()]})}>Agregar carta ({draft.cards.length}/100)</button>
   <label className="catalog-publish"><input type="checkbox" checked={draft.published} onChange={e=>setDraft({...draft,published:e.target.checked})}/> Mostrar esta colección en la portada</label>
   <div className="catalog-actions"><button type="submit">{busy?'Guardando…':'Guardar colección'}</button><button type="button" onClick={()=>setFormOpen(false)}>Cancelar</button></div>
  </fieldset></form>}
 </details>;
}
