import { motion, useReducedMotion } from 'motion/react';
import { createRoot, type Root } from 'react-dom/client';

type RosterDetail = { label: string; values: string[]; tone?: 'first' | 'second' | 'pager' | 'reliever' | 'warning' };
type RosterCard = { index: number; date: string; status: string; count: number; details: RosterDetail[] };

let root: Root | undefined;

function openNight(index: number) {
  window.dispatchEvent(new CustomEvent('roster:open-night', { detail: { index } }));
}

function DetailRow({ detail }: { detail: RosterDetail }) {
  const tone = detail.tone === 'first' ? 'tw:bg-teal-400/12 tw:text-teal-800 dark:tw:text-teal-200'
    : detail.tone === 'second' ? 'tw:bg-sky-400/12 tw:text-sky-800 dark:tw:text-sky-200'
      : detail.tone === 'warning' ? 'tw:bg-amber-400/14 tw:text-amber-800 dark:tw:text-amber-200'
        : 'tw:bg-[var(--surface)] tw:text-[var(--accent-strong)]';
  return <div className="tw:grid tw:grid-cols-[6.5rem_1fr] tw:gap-3 tw:border-t tw:border-black/6 tw:py-3 first:tw:border-t-0 dark:tw:border-white/8">
    <span className="tw:text-xs tw:font-bold tw:text-[var(--muted)]">{detail.label}</span>
    <div className="tw:flex tw:flex-wrap tw:justify-end tw:gap-1.5">
      {detail.values.map((value, index) => <span key={`${value}-${index}`} className={`tw:rounded-full tw:px-2.5 tw:py-1 tw:text-xs tw:font-bold ${tone}`}>{value}</span>)}
    </div>
  </div>;
}

function Cards({ cards }: { cards: RosterCard[] }) {
  const reduced = useReducedMotion();
  if (!cards.length) return <div className="tw:rounded-2xl tw:border tw:border-dashed tw:border-black/12 tw:bg-[var(--surface)] tw:p-6 tw:text-center tw:text-sm tw:text-[var(--muted)] dark:tw:border-white/14">No roster nights match this search.</div>;
  return <div className="tw:grid tw:gap-3 lg:tw:grid-cols-2">
    {cards.map((card, index) => <motion.button
      type="button"
      key={`${card.date}-${card.index}`}
      initial={reduced ? false : { opacity: 0, y: 7 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.2, delay: reduced ? 0 : Math.min(index * 0.02, 0.12) }}
      whileTap={{ scale: reduced ? 1 : 0.99 }}
      onClick={() => openNight(card.index)}
      aria-label={`Open roster for ${card.date}`}
      className="tw:w-full tw:rounded-[22px] tw:border tw:border-black/8 tw:bg-[var(--card)] tw:p-4 tw:text-left tw:shadow-sm dark:tw:border-white/10"
    >
      <div className="tw:flex tw:items-start tw:justify-between tw:gap-3">
        <div className="tw:min-w-0">
          <strong className="tw:block tw:text-[1.05rem]">{card.date}</strong>
          <span className="tw:mt-1 tw:block tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">{card.status}</span>
        </div>
        <span className="tw:shrink-0 tw:rounded-full tw:bg-teal-400/12 tw:px-2.5 tw:py-1 tw:text-xs tw:font-bold tw:text-teal-800 dark:tw:text-teal-200">{card.count} nurses</span>
      </div>
      <div className="tw:mt-3">{card.details.map((detail, row) => <DetailRow key={`${detail.label}-${row}`} detail={detail} />)}</div>
    </motion.button>)}
  </div>;
}

export function renderRosterExperience(cards: RosterCard[]) {
  const host = document.getElementById('cards');
  if (!host) return;
  if (!root) root = createRoot(host);
  root.render(<Cards cards={cards} />);
}
