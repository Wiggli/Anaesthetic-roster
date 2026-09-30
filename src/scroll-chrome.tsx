import { motion, useReducedMotion } from 'motion/react';
import { createRoot } from 'react-dom/client';
import { useEffect, useMemo, useRef, useState } from 'react';

type ChromeModel = {
  view: string;
  title: string;
  context: string;
  status?: string;
  closeAdmin?: boolean;
};

const supportedViews = new Set(['today', 'changes', 'breaks', 'chat', 'admin', 'roster']);

function clean(value?: string | null) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function readModel(): ChromeModel {
  const view = document.body.getAttribute('data-view') || 'today';
  if (view === 'today') {
    const assignment = clean(document.querySelector('#personalNightCard .personalRoleCopy b')?.textContent);
    const period = clean(document.querySelector('#personalNightCard .personalFacts div:nth-child(2) dd')?.textContent);
    return { view, title: 'Night', context: assignment || 'Your selected roster night', status: period || undefined };
  }
  if (view === 'changes') {
    const count = clean(document.querySelector('#changes .staffingCount strong')?.textContent);
    const live = clean(document.querySelector('#changes .liveStatus')?.textContent);
    return { view, title: 'Changes', context: count ? `${count} on the selected night` : 'Staffing and allocation', status: live || undefined };
  }
  if (view === 'breaks') {
    const ownBreak = clean(document.querySelector('#breakPersonalSummary .personalBreakMain h2')?.textContent);
    const date = clean(document.querySelector('#breakPersonalSummary .personalBreakEyebrow')?.textContent).replace(/^Your break\s*[·•]\s*/i, '');
    return { view, title: 'Breaks', context: ownBreak || "Tonight's rest plan", status: date || undefined };
  }
  if (view === 'chat') {
    const status = clean(document.getElementById('chatLiveStatus')?.textContent);
    return { view, title: 'Anaesthetic Team', context: 'Team chat', status: status || 'Live' };
  }
  if (view === 'admin') {
    const tab = clean(document.querySelector('#admin .adminTabs button.active')?.textContent) || 'Overview';
    return { view, title: 'Roster management', context: tab, closeAdmin: true };
  }
  if (view === 'roster') {
    const date = clean(document.querySelector('#roster .rosterContext')?.textContent || document.querySelector('#roster h2')?.textContent);
    return { view, title: 'Full roster', context: date || 'Published roster' };
  }
  return { view, title: 'Night Roster', context: '' };
}

function Icon({ view }: { view: string }) {
  if (view === 'changes') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h11" /><path d="m13 4 3 3-3 3" /><path d="M19 17H8" /><path d="m11 14-3 3 3 3" /></svg>;
  if (view === 'breaks') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5Z" /><path d="M17 11h2a2 2 0 0 1 0 4h-2" /><path d="M8 6c0-1 1-1 1-2M12 6c0-1 1-1 1-2" /></svg>;
  if (view === 'chat') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v11H9l-5 3v-14Z" /><path d="M8 10h8M8 13h5" /></svg>;
  if (view === 'admin') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z" /></svg>;
  if (view === 'roster') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" /><path d="M15.5 7.5h5M18 5v5" /></svg>;
}

function ScrollGlassChrome() {
  const reducedMotion = useReducedMotion();
  const barRef = useRef<HTMLElement>(null);
  const frame = useRef<number | null>(null);
  const [model, setModel] = useState<ChromeModel>(() => readModel());
  const modelKey = useMemo(() => `${model.view}:${model.title}:${model.context}:${model.status || ''}`, [model]);

  useEffect(() => {
    const updateModel = () => setModel(readModel());
    const updateScroll = () => {
      frame.current = null;
      const root = barRef.current;
      if (!root) return;
      const view = document.body.getAttribute('data-view') || 'today';
      const supported = supportedViews.has(view);
      const y = Math.max(0, Number(window.scrollY || 0));
      const raw = Math.max(0, Math.min(1, (y - 24) / 72));
      const progress = supported ? (reducedMotion ? (y >= 58 ? 1 : 0) : raw) : 0;
      document.documentElement.style.setProperty('--scroll-glass-progress', String(progress));
      document.documentElement.style.setProperty('--scroll-glass-offset', `${Math.round(progress * 54)}px`);
      root.style.setProperty('--scroll-glass-progress', String(progress));
      root.style.opacity = String(progress);
      root.style.transform = `translate3d(0,${Math.round((1 - progress) * -11)}px,0)`;
      root.toggleAttribute('data-visible', progress > 0.03);
      const interactive = view === 'admin' && progress > 0.72;
      root.style.pointerEvents = interactive ? 'auto' : 'none';
      root.setAttribute('aria-hidden', interactive ? 'false' : 'true');
    };
    const scheduleScroll = () => {
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(updateScroll);
    };
    const refresh = () => {
      updateModel();
      scheduleScroll();
    };
    const events = ['roster:viewchange', 'roster:personal-night', 'roster:changes', 'roster:breaks', 'roster:chat-status', 'roster:admin-account-action'];
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[data-admin-tab]')) window.setTimeout(updateModel, 0);
    };
    events.forEach(name => window.addEventListener(name, refresh));
    document.addEventListener('click', onDocumentClick);
    window.addEventListener('scroll', scheduleScroll, { passive: true });
    window.addEventListener('resize', scheduleScroll, { passive: true });
    const observer = new MutationObserver(() => {
      if (document.body.getAttribute('data-view') !== model.view) refresh();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-view'] });
    updateModel();
    updateScroll();
    return () => {
      events.forEach(name => window.removeEventListener(name, refresh));
      document.removeEventListener('click', onDocumentClick);
      window.removeEventListener('scroll', scheduleScroll);
      window.removeEventListener('resize', scheduleScroll);
      observer.disconnect();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      document.documentElement.style.removeProperty('--scroll-glass-progress');
      document.documentElement.style.removeProperty('--scroll-glass-offset');
    };
  }, [reducedMotion, model.view]);

  const closeAdmin = () => document.getElementById('closeAdminBtn')?.click();

  return <header ref={barRef} className={`scrollGlassHeader scrollGlass-${model.view}`} aria-hidden="true">
    <div className="scrollGlassMaterial" aria-hidden="true" />
    <div className="scrollGlassContent">
      <span className="scrollGlassIcon"><Icon view={model.view} /></span>
      <motion.span
        key={modelKey}
        className="scrollGlassCopy"
        initial={reducedMotion ? false : { opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.16 }}
      >
        <b>{model.title}</b>
        <small>{model.context}</small>
      </motion.span>
      {model.status && <span className="scrollGlassStatus"><i aria-hidden="true" />{model.status}</span>}
      {model.closeAdmin && <button type="button" className="scrollGlassClose" onClick={closeAdmin}>Close</button>}
    </div>
  </header>;
}

export function mountScrollChrome(host: HTMLElement) {
  createRoot(host).render(<ScrollGlassChrome />);
}
