import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { createRoot } from 'react-dom/client';
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

type ChromeRailItem = {
  key: string;
  label: string;
  active: boolean;
};

type ChromeRail = {
  ariaLabel: string;
  items: ChromeRailItem[];
};

type ChromeMode = 'off' | 'compact' | 'rail';

type ChromeModel = {
  view: string;
  title: string;
  subtitle?: string;
  mode: ChromeMode;
  rail?: ChromeRail;
};

function clean(value?: string | null) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function readAdminRail(): ChromeRail | undefined {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('#admin .adminTabs [data-admin-tab]'));
  if (!buttons.length) return undefined;
  const items = buttons.map(button => ({
    key: button.getAttribute('data-admin-tab') || '',
    label: clean(button.textContent),
    active: button.classList.contains('active') || button.getAttribute('aria-selected') === 'true'
  })).filter(item => item.key && item.label);
  if (!items.length) return undefined;
  return { ariaLabel: 'Roster management sections', items };
}

function readModel(): ChromeModel {
  const view = document.body.getAttribute('data-view') || 'today';
  const count = (id: string) => {
    const element = document.getElementById(id);
    if (!element || element.classList.contains('hidden')) return 0;
    const value = Number(clean(element.textContent));
    return Number.isFinite(value) ? value : 0;
  };
  if (view === 'today') return { view, title: 'Night', mode: 'compact' };
  if (view === 'changes') {
    const tasks = count('changesTaskBadge');
    return { view, title: 'Changes', subtitle: tasks ? `${tasks} ${tasks === 1 ? 'item' : 'items'} need attention` : 'Staffing and allocation', mode: 'compact' };
  }
  if (view === 'breaks') return { view, title: 'Breaks', subtitle: 'Your break and the team plan', mode: 'compact' };
  if (view === 'chat') {
    const unread = count('chatUnreadBadge');
    return { view, title: 'Chat', subtitle: unread ? `${unread} unread` : 'Team and private messages', mode: 'compact' };
  }
  if (view === 'admin') return { view, title: 'Roster management', mode: 'compact' };
  if (view === 'roster') return { view, title: 'Full roster', subtitle: 'Published roster nights', mode: 'compact' };
  return { view, title: 'Night Roster', mode: 'off' };
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(value: number) {
  const x = clamp(value);
  return x * x * (3 - 2 * x);
}

function sourceElement(view: string) {
  if (view === 'today') return document.querySelector<HTMLElement>('#today > #appHeader, #today .nightSectionIdentity');
  if (view === 'admin') return document.querySelector<HTMLElement>('#admin .adminHeader');
  if (view === 'changes') return document.querySelector<HTMLElement>('#changes .changesScreenHeader, #changes .primaryScreenHeader');
  if (view === 'breaks') return document.querySelector<HTMLElement>('#breaks .breaksScreenHeader, #breaks .primaryScreenHeader');
  if (view === 'chat') return document.querySelector<HTMLElement>('#chat .chatScreenHeader, #chat .primaryScreenHeader');
  if (view === 'roster') return document.querySelector<HTMLElement>('#roster .rosterHeader, #roster > .panel');
  return null;
}

function rawScrollProgress(model: ChromeModel) {
  if (model.mode === 'off') return 0;
  const source = sourceElement(model.view);
  if (!source) return clamp((Math.max(0, window.scrollY) - 52) / 56);
  const rect = source.getBoundingClientRect();
  if (model.mode === 'rail') {
    // The replacement rail starts forming only as the original rail reaches the top edge.
    return clamp((64 - rect.top) / 48);
  }
  // Compact navigation forms continuously as the large page heading leaves the viewport.
  return clamp((72 - rect.bottom) / 48);
}

function activateAdminRailItem(key: string) {
  const target = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-admin-tab]'))
    .find(button => button.getAttribute('data-admin-tab') === key);
  target?.click();
}

function ScrollGlassChrome() {
  const reducedMotion = useReducedMotion();
  const barRef = useRef<HTMLElement>(null);
  const frame = useRef<number | null>(null);
  const [model, setModel] = useState<ChromeModel>(() => readModel());
  const modelKey = useMemo(
    () => model.view + ':' + model.mode + ':' + model.title + ':' + (model.subtitle || '') + ':' +
      (model.rail?.items.map(item => item.key + (item.active ? '*' : '')).join(',') || ''),
    [model]
  );

  useEffect(() => {
    const updateModel = () => setModel(readModel());
    const updateScroll = () => {
      frame.current = null;
      const root = barRef.current;
      if (!root) return;
      const raw = rawScrollProgress(model);
      const progress = model.mode === 'off'
        ? 0
        : (reducedMotion ? (raw >= 0.66 ? 1 : 0) : smoothstep(raw));
      const materialOpacity = clamp(progress * 0.98);
      const foreground = clamp((progress - 0.08) / 0.72);
      const edgeOpacity = clamp((progress - 0.24) / 0.76);

      document.documentElement.style.setProperty('--scroll-glass-progress', String(progress));
      document.documentElement.style.setProperty('--scroll-glass-offset', Math.round(progress * 48) + 'px');
      root.style.setProperty('--scroll-glass-progress', String(progress));
      root.style.setProperty('--scroll-glass-material-opacity', String(materialOpacity));
      root.style.setProperty('--scroll-glass-copy-opacity', String(foreground));
      root.style.setProperty('--scroll-glass-edge-opacity', String(edgeOpacity));
      root.style.setProperty('--chrome-glass-blur', Math.round(18 + progress * 12) + 'px');
      root.style.setProperty('--chrome-glass-saturate', Math.round(150 + progress * 30) + '%');
      root.style.setProperty('--chrome-glass-contrast', (1.005 + progress * 0.015).toFixed(3));
      root.style.opacity = String(progress);
      root.style.transform = `translate3d(0,${((1 - progress) * -8).toFixed(2)}px,0)`;
      root.toggleAttribute('data-visible', progress > 0.02);
      root.toggleAttribute('data-collapsed', progress > 0.72);
      root.setAttribute('data-mode', model.mode);

      const rail = root.querySelector<HTMLElement>('.scrollGlassRail');
      if (rail) {
        rail.style.opacity = String(foreground);
        rail.style.pointerEvents = progress > 0.66 ? 'auto' : 'none';
      }

      const interactive = model.mode === 'rail' && Boolean(model.rail) && progress > 0.66;
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
    const events = [
      'roster:viewchange',
      'roster:changes',
      'roster:breaks',
      'roster:chat-status',
      'roster:admin-account-action'
    ];
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[data-admin-tab],.scrollGlassRail button')) {
        window.setTimeout(updateModel, 0);
      }
    };
    events.forEach(name => window.addEventListener(name, refresh));
    document.addEventListener('click', onDocumentClick);
    window.addEventListener('scroll', scheduleScroll, { passive: true });
    window.addEventListener('resize', scheduleScroll, { passive: true });
    const observer = new MutationObserver(() => {
      const nextView = document.body.getAttribute('data-view') || 'today';
      if (nextView !== model.view) refresh();
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
  }, [reducedMotion, model.view, model.mode, model.rail?.items.map(item => item.key + item.active).join('|')]);

  const setRailTouch = (event: ReactPointerEvent<HTMLElement>) => {
    const root = barRef.current;
    if (!root) return;
    const rail = event.currentTarget.closest<HTMLElement>('.scrollGlassRail');
    const rect = rail?.getBoundingClientRect() || root.getBoundingClientRect();
    root.style.setProperty('--glass-touch-x', clamp(event.clientX - rect.left, 0, rect.width).toFixed(1) + 'px');
    root.style.setProperty('--glass-touch-y', clamp(event.clientY - rect.top, 0, rect.height).toFixed(1) + 'px');
    root.setAttribute('data-glass-touching', 'true');
  };
  const releaseRailTouch = () => barRef.current?.removeAttribute('data-glass-touching');

  return <header
    ref={barRef}
    className={'scrollGlassHeader scrollGlass-' + model.view + ' scrollGlassMode-' + model.mode}
    aria-hidden="true"
  >
    {model.mode !== 'off' && <div className="scrollGlassMaterial" aria-hidden="true" />}
    <div className="scrollGlassStack">
      {model.mode === 'compact' && <div className="scrollGlassContent">
        <motion.span
          key={modelKey}
          className="scrollGlassCompactTitle"
          initial={reducedMotion ? false : { opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.14 }}
        >
          <span>{model.title}</span>
        </motion.span>
      </div>}
      {model.mode === 'rail' && model.rail && <LayoutGroup id="scroll-glass-rail-admin">
        <nav
          className="scrollGlassRail scrollGlassRail-admin"
          role="tablist"
          aria-label={model.rail.ariaLabel}
          onPointerDown={setRailTouch}
          onPointerMove={event => {
            if (event.buttons) setRailTouch(event);
          }}
          onPointerUp={releaseRailTouch}
          onPointerCancel={releaseRailTouch}
          onPointerLeave={releaseRailTouch}
        >
          <span className="scrollGlassTouchGlow" aria-hidden="true" />
          {model.rail.items.map(item => <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={item.active}
            className={item.active ? 'active' : ''}
            onClick={() => activateAdminRailItem(item.key)}
          >
            {item.active && <motion.span
              layoutId="scroll-glass-rail-lens-admin"
              className="scrollGlassRailLens"
              transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 44, mass: 0.52 }}
              aria-hidden="true"
            />}
            <span className="scrollGlassRailLabel">{item.label}</span>
          </button>)}
        </nav>
      </LayoutGroup>}
    </div>
  </header>;
}

export function mountScrollChrome(host: HTMLElement) {
  createRoot(host).render(<ScrollGlassChrome />);
}
