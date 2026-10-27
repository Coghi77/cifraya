import {useState, type CSSProperties} from 'react';
import {PrizeGallery} from './PrizePhoto';
import gallery from './anniversaryCards.json';

// Curated full-art selection, deliberately interleaved rather than in set order.
// Source: https://tcg.pokemon.com/en-us/galleries/30th-celebration/
const showcaseOrder = [149, 157, 153, 150, 158, 151, 156, 148, 154, 147, 155, 152];
const cards = showcaseOrder.flatMap(number => gallery.filter(card => card.id === `30c-${number}`));

export default function AnniversaryCarousel(){
  const [selected,setSelected]=useState<number|null>(null);
  return <section className="image-parade anniversary-parade" id="coleccion" aria-label="Cartas de Pokémon TCG: 30th Celebration">
    <div className="parade-window"><div className="parade-track" style={{'--parade-duration':`${cards.length*2.5}s`} as CSSProperties}>
      {[0,1].map(group=><div className="parade-group" key={group} aria-hidden={group===1?true:undefined}>
        {cards.map((card,index)=><button type="button" className="parade-card" key={card.id} tabIndex={group===1?-1:0} aria-label={`Ampliar ${card.title}`} onClick={()=>setSelected(index)}>
          <img src={card.url} alt={card.title} width="245" height="342" loading="lazy" decoding="async"/>
        </button>)}
      </div>)}
    </div></div>
    {selected!==null&&<PrizeGallery photos={cards} title="Pokémon TCG · 30th Celebration" initialIndex={selected} onClose={()=>setSelected(null)}/>}
  </section>;
}
