import { motion, useReducedMotion } from 'motion/react';
import { createRoot, type Root } from 'react-dom/client';

type RosterDetail = { label: string; values: string[]; tone?: 'first' | 'second' | 'pager' | 'reliever' | 'warning' };
type RosterCard = { index: number; date: string; status: string; count: number; details: RosterDetail[] };

let root: Root | undefined;

function openNight(index: number) {
  window.dispatchEvent(new CustomEvent('roster:open-night', { detail: { index } }));
}

function DetailRow({ detail }: { detail: RosterDetail }) {
  return <div className={`rosterLedgerLine rosterLedgerLine-${detail.tone || 'neutral'}`}>
    <span>{detail.label}</span>
    <div>
      {detail.values.map((value, index) => <span key={`${value}-${index}`}>{value}</span>)}
    </div>
  </div>;
}

function Cards({ cards }: { cards: RosterCard[] }) {
  const reduced = useReducedMotion();
  if (!cards.length) return <div className="rosterLedgerEmpty" role="status"><strong>No matching nights</strong><span>Try another date or search term.</span></div>;
  return <div className="rosterLedger" aria-label={`${cards.length} roster nights`}>
    <p className="rosterLedgerCount" role="status">{cards.length} {cards.length === 1 ? 'night' : 'nights'} shown · Select a night to open its live plan</p>
    <div className="rosterLedgerList">
    {cards.map((card, index) => <motion.button
      type="button"
      key={`${card.date}-${card.index}`}
      initial={reduced ? false : { opacity: 0, y: 7 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.2, delay: reduced ? 0 : Math.min(index * 0.02, 0.12) }}
      whileTap={{ scale: reduced ? 1 : 0.99 }}
      onClick={() => openNight(card.index)}
      aria-label={`Open roster for ${card.date}`}
      className="rosterLedgerEntry"
    >
      <div className="rosterLedgerHeading">
        <div>
          <strong>{card.date}</strong>
          <span>{card.status}</span>
        </div>
        <span>{card.count} nurses <i aria-hidden="true">↗</i></span>
      </div>
      <div className="rosterLedgerDetails">{card.details.map((detail, row) => <DetailRow key={`${detail.label}-${row}`} detail={detail} />)}</div>
    </motion.button>)}
    </div>
  </div>;
}

export function renderRosterExperience(cards: RosterCard[]) {
  const host = document.getElementById('cards');
  if (!host) return;
  if (!root) root = createRoot(host);
  root.render(<Cards cards={cards} />);
}
