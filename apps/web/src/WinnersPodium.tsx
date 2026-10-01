import { useState } from 'react';

export type WinnerResult = {
  position: number;
  numberValue: number;
  publishedAt: string;
  buyerName: string;
  campaign: { id: string; title: string; prize: string; secondPrize: string | null; thirdPrize: string | null; prizeCount: number; numberWidth: number };
};

const positionName = ['Primer premio', 'Segundo premio', 'Tercer premio'];
const prizeFor = (item: WinnerResult, position: number) => [item.campaign.prize, item.campaign.secondPrize, item.campaign.thirdPrize][position - 1];

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
          <span className="podium-prize">{prize}</span>
          <span className="podium-number">{winner ? `N.º ${String(winner.numberValue).padStart(campaign.numberWidth, '0')}` : '—'}</span>
          <span className="podium-base">{position}</span>
        </button>;
      })}</div>
      {active && <div className="podium-detail" role="status"><span>{positionName[active.position]} · {prizeFor(active, active.position)}</span><strong>{active.buyerName}</strong><span>Número ganador {String(active.numberValue).padStart(campaign.numberWidth, '0')} · {new Date(active.publishedAt).toLocaleDateString('es-CR')}</span></div>}
    </section>;
  })}</div>;
}
