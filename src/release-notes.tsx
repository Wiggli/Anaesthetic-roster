import { useProductReducedMotion } from './product-motion';
import { useEffect, useMemo, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { motion } from 'motion/react';

export type ReleaseEntry = { version: string; date: string; title: string; changes: string[]; policy?: 'quiet' | 'normal' | 'important' };
export type ReleaseAction = { label: string; action: string; value?: string };

declare global { interface Window { renderReactReleaseNotes?: (entries: ReleaseEntry[], showHistory: boolean, actions?: ReleaseAction[]) => void; } }
let root: Root | undefined;
const monthLabel = (date: string) => date.replace(/^\d+\s+/, '') || date;
const releaseAction = (item: ReleaseAction) => window.dispatchEvent(new CustomEvent('roster:release-action', { detail: item }));

function LatestRelease({ entry, actions }: { entry: ReleaseEntry; actions: ReleaseAction[] }) {
  const reduced = useProductReducedMotion();
  return <section className="releaseEntry latest releaseEditorial">
    <motion.div className="releaseHero" initial={reduced ? false : { opacity: .82, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .22 }}>
      <span className="releaseHeroMark" aria-hidden="true">✦</span><div><span className="releaseHeroEyebrow">Night Roster {entry.version}</span><h3>{entry.title}</h3><p>Here are the improvements worth knowing about.</p></div><time>{entry.date}</time>
    </motion.div>
    <div className="releaseHighlights">{entry.changes.map((change,index)=><motion.article className="releaseHighlight" key={change} initial={reduced?false:{opacity:0,y:5}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.2,delay:reduced?0:index*.035}}>
      <span className="releaseHighlightIndex" aria-hidden="true">{index+1}</span><p>{change}</p>{actions[index]&&<button type="button" onClick={()=>releaseAction(actions[index])}>{actions[index].label}<span aria-hidden="true">›</span></button>}
    </motion.article>)}</div>
    <button type="button" className="releaseHistoryLink" onClick={()=>releaseAction({action:'history',label:'Version history'})}>View complete version history <span aria-hidden="true">›</span></button>
  </section>;
}

function ReleaseHistory({ entries }: { entries: ReleaseEntry[] }) {
  const history=useRef<HTMLDivElement>(null), reduced=useProductReducedMotion();
  const groups=useMemo(()=>{const result:{month:string;entries:{entry:ReleaseEntry;index:number}[]}[]=[];entries.forEach((entry,index)=>{const month=monthLabel(entry.date);let group=result[result.length-1];if(!group||group.month!==month){group={month,entries:[]};result.push(group)}group.entries.push({entry,index})});return result},[entries]);
  useEffect(()=>{if(history.current)history.current.scrollTop=0},[entries]);
  const jumpTo=(previous:boolean)=>{const container=history.current,target=container?.querySelector<HTMLElement>(`.releaseHistoryItem[data-history-index="${previous?1:0}"]`);if(!container||!target)return;container.scrollTo({top:Math.max(0,target.offsetTop-8),behavior:reduced?'auto':'smooth'})};
  return <><div className="releaseNav" aria-label="Version history navigation"><button type="button" onClick={()=>jumpTo(false)}>Latest update</button><button type="button" onClick={()=>jumpTo(true)}>Earlier releases <span>{Math.max(0,entries.length-1)}</span></button></div>
    <div className="releaseHistory releaseHistoryCompact" tabIndex={0} ref={history} aria-label="Complete Night Roster version history">
      {groups.map(group=><section className="releaseMonthGroup" key={group.month}><div className="releaseMonthHeading">{group.month}</div>{group.entries.map(({entry,index})=><motion.details key={entry.version} className={'releaseEntry releaseHistoryItem '+(index===0?'latest':'')} data-history-index={index} open={index===0} initial={reduced?false:{opacity:.84,y:3}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.16,delay:reduced?0:Math.min(index,3)*.02}}>
        <summary><span className="releaseHistoryVersion">v{entry.version}</span><span className="releaseHistoryCopy"><b>{entry.title}</b><small>{entry.date}</small></span><span className="releaseHistoryChevron" aria-hidden="true">⌄</span></summary><ul>{entry.changes.map(change=><li key={change}>{change}</li>)}</ul>
      </motion.details>)}</section>)}
    </div></>;
}
function ReleaseNotes({entries,showHistory,actions}:{entries:ReleaseEntry[];showHistory:boolean;actions:ReleaseAction[]}){if(!entries.length)return null;return <div className="releaseExperience" data-react-release-notes="ready">{showHistory?<ReleaseHistory entries={entries}/>:<LatestRelease entry={entries[0]} actions={actions}/>}</div>}
export function renderReleaseNotes(entries:ReleaseEntry[],showHistory:boolean,actions:ReleaseAction[]=[]){const host=document.getElementById('releaseNotesContent');if(!host)return;if(!root)root=createRoot(host);window.renderReactReleaseNotes=renderReleaseNotes;root.render(<ReleaseNotes entries={entries} showHistory={showHistory} actions={actions}/>)}
