import { useEffect, useRef, useState } from 'react';
import { productHaptic, useProductReducedMotion } from './product-motion';
import { Pressable } from './ui-system';
import './pager-tombola.css';

export type PagerTombolaModel = {
  date: string;
  names: string[];
  labels: string[];
  periods: string[];
  saved: boolean;
  canDraw: boolean;
};

type DrawResult = { order: string[]; error?: never } | { order?: never; error: string };
type DrawPhase = 'ready' | 'shuffling' | 'revealing' | 'complete';

const wait = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));
const frequencies = [466.16, 587.33, 698.46];

function playChime(context: AudioContext | undefined, frequency: number) {
  if (context?.state !== 'running') return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  const time = context.currentTime;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(.085, time + .02);
  gain.gain.exponentialRampToValueAtTime(.001, time + .48);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(time);
  oscillator.stop(time + .5);
}

export function PagerTombola({ model }: { model: PagerTombolaModel }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const tokens = useRef(new Map<string, HTMLSpanElement>());
  const results = useRef<(HTMLElement | null)[]>([]);
  const effects = useRef<HTMLDivElement>(null);
  const audio = useRef<AudioContext | undefined>(undefined);
  const alive = useRef(true);
  const running = useRef(false);
  const reduced = useProductReducedMotion();
  const [pool, setPool] = useState({ names: model.names, labels: model.labels });
  const [phase, setPhase] = useState<DrawPhase>('ready');
  const [sound, setSound] = useState(true);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState<string[]>([]);
  const busy = phase === 'shuffling' || phase === 'revealing';
  const label = (name: string) => pool.labels[pool.names.indexOf(name)] || name;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      void audio.current?.close().catch(() => {});
    };
  }, []);

  function open() {
    setError('');
    setPool({ names: model.names, labels: model.labels });
    setRevealed(model.saved ? model.names : []);
    setPhase(model.saved ? 'complete' : 'ready');
    dialog.current?.showModal();
  }

  async function sendToken(name: string, slot: number) {
    const source = tokens.current.get(name);
    const target = results.current[slot];
    if (reduced || !source || !target || !effects.current) return;
    const origin = source.getBoundingClientRect();
    const destination = target.getBoundingClientRect();
    if (!origin.width || !destination.width) return;
    const copy = source.cloneNode(true) as HTMLSpanElement;
    copy.classList.add('pagerDrawFlyingToken', 'pagerDrawColour' + pool.names.indexOf(name));
    copy.style.left = origin.left + 'px';
    copy.style.top = origin.top + 'px';
    copy.style.width = origin.width + 'px';
    effects.current.append(copy);
    source.style.visibility = 'hidden';
    const dx = destination.left - origin.left;
    const dy = destination.top - origin.top + (destination.height - origin.height) / 2;
    const flight = copy.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * .65 + 30}px, ${dy * .35 - 42}px) scale(1.06)`, opacity: 1, offset: .46 },
      { transform: `translate(${dx}px, ${dy}px) scale(.86)`, opacity: 0 }
    ], { duration: 520, easing: 'cubic-bezier(.36,.02,.22,1)', fill: 'forwards' });
    await flight.finished.catch(() => {});
    copy.remove();
  }

  async function draw() {
    if (running.current || !model.canDraw) return;
    running.current = true;
    setError('');
    setPhase('shuffling');
    productHaptic();
    if (sound) {
      try {
        audio.current ??= new AudioContext();
        void audio.current.resume().catch(() => {});
      } catch {
        // Audio is optional on devices that block playback.
      }
    }
    try {
      const api = window as unknown as { drawPagerTurns(date: string): Promise<DrawResult> };
      const [result] = await Promise.all([api.drawPagerTurns(model.date), wait(reduced ? 0 : 1800)]);
      if (!alive.current) return;
      if (!result.order) {
        setError(result.error);
        setPhase('ready');
        return;
      }
      setPhase('revealing');
      for (const [index, name] of result.order.entries()) {
        await sendToken(name, index);
        if (!alive.current) return;
        setRevealed(result.order.slice(0, index + 1));
        if (sound) { try { playChime(audio.current, frequencies[index]); } catch { /* Optional audio. */ } }
        if (index < 2 && !reduced) await wait(390);
        if (!alive.current) return;
      }
      productHaptic('success');
      setPhase('complete');
    } catch {
      if (alive.current) {
        setError('Refresh the roster to check whether the draw was saved.');
        setPhase('ready');
      }
    } finally {
      running.current = false;
    }
  }

  return <>
    <Pressable ref={launcher} type="button" className="pagerDrawLauncher" data-pager-draw-date={model.date} onClick={open}>
      <span><strong>{model.saved ? 'View draw result' : 'Draw Pager times'}</strong><small>{model.saved ? 'Saved for this night' : 'Randomly assign the three nurses to their times'}</small></span>
      <span aria-hidden="true">›</span>
    </Pressable>
    <dialog
      className="pagerDrawSheet"
      ref={dialog}
      aria-labelledby="pagerDrawTitle"
      onCancel={event => { if (running.current) event.preventDefault(); }}
      onClose={() => launcher.current?.focus()}
    >
      <div className="pagerDrawHeader">
        <div><h2 id="pagerDrawTitle">Pager draw</h2><p>Three nurses, three turns</p></div>
        <Pressable type="button" className="pagerDrawClose" aria-label="Close Pager draw" disabled={busy} onClick={() => dialog.current?.close()}>×</Pressable>
      </div>
      <p className="pagerDrawExplanation">Theatre assignments stay unchanged. This draw gives the three Pager nurses one turn each, covering 23:30–07:00.</p>
      {!busy && phase === 'ready' && <Pressable type="button" className="quietAction wide" onClick={() => { dialog.current?.close(); window.dispatchEvent(new CustomEvent('roster:quick-action', { detail: { action: 'roles' } })); }}>Change theatre / Pager team</Pressable>}
      <div className={`pagerDrawArena ${busy ? 'isSpinning' : ''} ${reduced ? 'isReduced' : ''}`} aria-hidden="true">
        <div className="pagerDrawChamber">
          <div className="pagerDrawSweep" />
          <div className="pagerDrawOrbit">
            {pool.names.map((name, index) => <div className={`pagerDrawPosition pagerDrawColour${index}`} key={name}>
              {!revealed.includes(name) && <span className="pagerDrawToken" ref={node => { if (node) tokens.current.set(name, node); else tokens.current.delete(name); }}>
                <i>{label(name).trim()[0]}</i><span>{label(name)}</span>
              </span>}
            </div>)}
          </div>
          {phase === 'complete' && <span className="pagerDrawCheck">✓</span>}
        </div>
      </div>
      <p className="pagerDrawStatus" role="status">
        {error ? 'Draw not saved' : phase === 'complete' ? 'Saved' : phase === 'shuffling' ? 'Drawing and saving…' : phase === 'revealing' ? 'Drawing Pager turns' : 'Ready to draw'}
      </p>
      <ol className="pagerDrawTurns" aria-label="Pager turns">
        {model.periods.map((period, index) => {
          const name = revealed[index];
          const colour = name ? pool.names.indexOf(name) : index;
          return <li key={period} className={`pagerDrawTurn pagerDrawColour${colour} ${name ? 'isRevealed' : ''}`}>
            <span className="pagerDrawTurnNumber" aria-hidden="true">{index + 1}</span>
            <span className="pagerDrawTurnTime"><small>Pager turn {index + 1}</small><strong>{period}</strong></span>
            <span ref={node => { results.current[index] = node; }} className="pagerDrawTurnName" aria-live="polite">{name ? label(name) : 'Awaiting draw'}</span>
          </li>;
        })}
      </ol>
      <div ref={effects} className="pagerDrawEffects" aria-hidden="true" />
      {error && <p className="pagerDrawError" role="alert">{error}</p>}
      <div className="pagerDrawActions">
        {phase === 'complete'
          ? <Pressable type="button" className="primary wide" onClick={() => dialog.current?.close()}>Done</Pressable>
          : <Pressable type="button" className="primary wide" disabled={busy || !model.canDraw} onClick={() => void draw()}>
            {busy ? 'Drawing and saving…' : error ? 'Retry Pager draw' : 'Draw Pager times'}
          </Pressable>}
        {phase === 'ready' && !model.canDraw && <p>Connect to the shared roster to draw.</p>}
        <Pressable type="button" className="pagerDrawSound" aria-pressed={sound} disabled={busy} onClick={() => setSound(!sound)}>Sound {sound ? 'on' : 'off'}</Pressable>
      </div>
    </dialog>
  </>;
}
