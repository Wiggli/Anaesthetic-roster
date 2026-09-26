import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { motion, useReducedMotion } from 'motion/react';

export type ReleaseEntry = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

declare global {
  interface Window {
    renderReactReleaseNotes?: (entries: ReleaseEntry[], showHistory: boolean) => void;
  }
}

let root: Root | undefined;

function ReleaseNotes({ entries, showHistory }: { entries: ReleaseEntry[]; showHistory: boolean }) {
  const history = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (history.current) history.current.scrollTop = 0;
  }, [entries, showHistory]);

  const jumpTo = (previous: boolean) => {
    const container = history.current;
    const target = container?.querySelector<HTMLElement>(previous ? '.releaseArchiveHeading' : '.releaseEntry.latest');
    if (!container || !target) return;
    container.scrollTo({
      top: Math.max(0, target.offsetTop - (previous ? 0 : 8)),
      behavior: reducedMotion ? 'auto' : 'smooth'
    });
  };

  return <div className="tw:contents" data-react-release-notes="ready">
    <div className={'releaseNav' + (showHistory ? '' : ' hidden')} aria-label="Version history navigation">
      <button type="button" onClick={() => jumpTo(false)}>Latest</button>
      <button type="button" onClick={() => jumpTo(true)}>
        Previous updates <span>{Math.max(0, entries.length - 1)}</span>
      </button>
    </div>
    <div className="releaseHistory tw:min-w-0" tabIndex={0} ref={history}
      aria-label={showHistory ? 'Complete Night Roster version history' : `Changes in version ${entries[0]?.version || ''}`}>
      {entries.map((entry, index) => <div key={entry.version} className="tw:contents">
        {index === 1 && <div className="releaseArchiveHeading">
          <span>Previous updates</span><small>The work that shaped Night Roster</small>
        </div>}
        <motion.section className={'releaseEntry ' + (index === 0 ? 'latest' : '')}
          initial={reducedMotion ? false : { opacity: 0.82, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.18, delay: reducedMotion ? 0 : Math.min(index, 3) * 0.025 }}>
          <div className="releaseVersion">
            <div>
              <span>{index === 0 ? 'Current update · ' : ''}Version {entry.version}</span>
              <h3>{entry.title}</h3>
            </div>
            <time>{entry.date}</time>
          </div>
          <ul>{entry.changes.map(change => <li key={change}>{change}</li>)}</ul>
        </motion.section>
      </div>)}
    </div>
  </div>;
}

export function renderReleaseNotes(entries: ReleaseEntry[], showHistory: boolean) {
  const host = document.getElementById('releaseNotesContent');
  if (!host) return;
  if (!root) root = createRoot(host);
  window.renderReactReleaseNotes = renderReleaseNotes;
  root.render(<ReleaseNotes entries={entries} showHistory={showHistory} />);
}
