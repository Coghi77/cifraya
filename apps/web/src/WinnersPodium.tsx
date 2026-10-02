import { useState } from 'react';

export type WinnerResult = {
  position: number;
  numberValue: number;
  publishedAt: string;
  buyerName: string;
  prize: string;
  inverseOf: number;
  awarded: boolean;
  campaign: { id: string; title: string; prize: string; prizes: string[]; prizeSources: number[]; prizeCount: number; numberWidth: number };
};

const positionName = ['Primer premio', 'Segundo premio', 'Tercer premio'];
const prizeFor = (item: WinnerResult, position: number) => item.position === position ? item.prize : item.campaign.prizes[position - 1];

function MoreWinners({ results, onSelect }: { results: WinnerResult[]; onSelect: (key: string) => void }) {
  const [page, setPage] = useState(0);
  const additional = results.filter(item => item.position > 3).sort((a, b) => a.position - b.position);
  if (!additional.length) return null;
  return <div><h3>Más premios</h3><div className="additional-winners">{additional.slice(page * 12, page * 12 + 12).map(item => <button key={item.position} type="button" onClick={() => onSelect(`${item.campaign.id}:${item.position}`)}><strong>{item.position}.º premio</strong><span>{prizeFor(item, item.position)}{item.inverseOf > 0 ? ` · Inverso del ${item.inverseOf}.º premio` : ''}</span><strong>{item.buyerName}</strong><span>N.º {String(item.numberValue).padStart(item.campaign.numberWidth, '0')}</span></button>)}</div>{additional.length > 12 && <div className="prize-pages"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button><span>{page + 1} / {Math.ceil(additional.length / 12)}</span><button type="button" disabled={(page + 1) * 12 >= additional.length} onClick={() => setPage(page + 1)}>Siguiente</button></div>}</div>;
}

export default function WinnersPodium({ winners }: { winners: WinnerResult[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const groups = [...new Map(winners.map(item => [item.campaign.id, item.campaign])).values()].map(campaign => ({ campaign, winners: winners.filter(item => item.campaign.id === campaign.id) }));
  return <div className="podium-groups">{groups.map(({ campaign, winners: results }) => {
    const activePosition = Number(selected?.startsWith(campaign.id + ':') ? selected.split(':')[1] : 0);
    const active = results.find(item => item.position === activePosition);
    return <section className="podium-section" key={campaign.id} aria-label={`Resultados de ${campaign.title}`}>
      <div className="podium-heading"><span>RESULTADOS / CIFRAYA</span><h2>{campaign.title}</h2><p>{results.length} de {campaign.prizeCount} premios publicados</p></div>
      <div className="podium-stage">{[2, 1, 3].filter(position => position <= campaign.prizeCount).map(position => {
        const winner = results.find(item => item.position === position);
        const prize = prizeFor(results[0], position);
        return <button className={`podium-place place-${position}${winner ? ' revealed' : ''}${activePosition === position ? ' selected' : ''}`} key={position} type="button" disabled={!winner} aria-pressed={activePosition === position} onClick={() => setSelected(activePosition === position ? null : `${campaign.id}:${position}`)}>
          <span className="podium-place-top"><span>{positionName[position - 1]}</span><strong>{String(position).padStart(2, '0')}</strong></span>
          <span className="podium-person">{winner?.buyerName || 'Por anunciar'}</span>
          <span className="podium-prize">{prize}{campaign.prizeSources[position - 1] > 0 && <small> · Inverso del {campaign.prizeSources[position - 1]}.º premio</small>}</span>
          <span className="podium-number">{winner ? `N.º ${String(winner.numberValue).padStart(campaign.numberWidth, '0')}` : '—'}</span>
          <span className="podium-base">{position}</span>
        </button>;
      })}</div>
      <MoreWinners results={results} onSelect={setSelected}/>
      {active && <div className="podium-detail" role="status"><span>{active.position}.º premio · {prizeFor(active, active.position)}{active.inverseOf > 0 ? ` · Inverso del ${active.inverseOf}.º premio` : ''}</span><strong>{active.buyerName}</strong><span>{active.awarded ? 'Número ganador' : 'Resultado sin ganador'} {String(active.numberValue).padStart(campaign.numberWidth, '0')} · {new Date(active.publishedAt).toLocaleDateString('es-CR')}</span></div>}
    </section>;
  })}</div>;
}
