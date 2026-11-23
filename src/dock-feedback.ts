import { motionIsReduced } from './product-motion';

type Rect = { x: number; y: number; width: number; height: number };
type Paint = { width: number; height: number; ratio: number; target: Rect; fill: string; stroke: string; animate: boolean };

/** Decoration only. The ordinary buttons continue to own touch, focus and routing. */
export function setupDockFeedback(bar: HTMLElement) {
  const fallback = document.createElement('span');
  fallback.className = 'dockSelectionLens';
  fallback.setAttribute('aria-hidden', 'true');
  bar.prepend(fallback);

  let canvas: HTMLCanvasElement | undefined;
  let worker: Worker | undefined;
  let failed = false;
  let ready = false;
  let disposed = false;
  let lastPaint: Paint | undefined;
  let boostTimer = 0;
  let readyTimer = 0;
  let releaseTimer = 0;
  let frame = 0;
  let boosting = false;
  let paused = false;
  let pressed = false;
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  const booster = document.createElement('div');
  booster.className = 'dockRefreshBoost';
  booster.setAttribute('aria-hidden', 'true');
  const content = document.createElement('span');
  booster.append(content);

  function stopBoost() {
    window.clearTimeout(boostTimer);
    cancelAnimationFrame(frame);
    frame = 0;
    boosting = false;
    booster.remove();
    bar.removeAttribute('data-feedback-animating');
  }

  function boost() {
    stopBoost();
    bar.dataset.feedbackAnimating = 'true';
    if (isIOS) {
      document.body.append(booster);
      booster.scrollTop = 0;
      booster.scrollTo({ top: 1024, behavior: 'smooth' });
      boosting = true;
      const flush = () => {
        if (!boosting) return;
        frame = requestAnimationFrame(flush);
      };
      frame = requestAnimationFrame(flush);
    }
    boostTimer = window.setTimeout(stopBoost, 400);
  }

  function disableWorker() {
    window.clearTimeout(readyTimer);
    worker?.terminate();
    worker = undefined;
    canvas?.remove();
    canvas = undefined;
    ready = false;
    failed = true;
    bar.dataset.feedbackRenderer = 'css';
    stopBoost();
  }

  function startWorker(paint: Paint) {
    if (worker || failed || motionIsReduced() || typeof Worker === 'undefined' ||
        typeof HTMLCanvasElement.prototype.transferControlToOffscreen !== 'function') return;
    try {
      canvas = document.createElement('canvas');
      canvas.className = 'dockFeedbackCanvas';
      canvas.setAttribute('aria-hidden', 'true');
      bar.prepend(canvas);
      worker = new Worker(new URL('./dock-feedback.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = event => {
        if (disposed) return;
        if (event.data.type === 'failed') { disableWorker(); return; }
        if (event.data.type === 'painted') {
          ready = true;
          window.clearTimeout(readyTimer);
          if (!paused && !motionIsReduced() && document.visibilityState === 'visible') {
            bar.dataset.feedbackRenderer = 'worker';
            if (event.data.animating) boost();
          }
        }
        if (event.data.type === 'settled') stopBoost();
      };
      worker.onerror = () => disableWorker();
      worker.onmessageerror = () => disableWorker();
      const offscreen = canvas.transferControlToOffscreen();
      worker.postMessage({ type: 'init', canvas: offscreen, paint: { ...paint, animate: false } }, [offscreen]);
      readyTimer = window.setTimeout(() => { if (!ready) disableWorker(); }, 1000);
    } catch { disableWorker(); }
  }

  function paint(button?: HTMLElement, animate = false) {
    if (disposed) return;
    const visible = document.visibilityState === 'visible' && !document.body.classList.contains('authPending') &&
      !bar.classList.contains('dockScrollHidden') && !document.body.classList.contains('keyboardVisible');
    const active = button || bar.querySelector<HTMLElement>(bar.classList.contains('actionsOpen') ? '[data-quick-rudder]' : 'button.active[data-v]');
    const shouldPause = !visible || !active;
    // Secondary pages have no active dock button. Do not remove and re-add
    // the paused class: that feeds our own class observer indefinitely.
    if (bar.classList.contains('dockFeedbackPaused') !== shouldPause) bar.classList.toggle('dockFeedbackPaused', shouldPause);
    if (!visible) {
      if (document.body.classList.contains('authPending') && worker) {
        window.clearTimeout(readyTimer);
        worker.terminate();
        worker = undefined;
        canvas?.remove();
        canvas = undefined;
        ready = false;
        bar.dataset.feedbackRenderer = 'css';
      }
      paused = true;
      worker?.postMessage({ type: 'pause' });
      stopBoost();
      return;
    }
    if (!active) {
      paused = true;
      worker?.postMessage({ type: 'pause' });
      stopBoost();
      return;
    }
    const bounds = bar.getBoundingClientRect();
    const rect = active.getBoundingClientRect();
    if (!bounds.width || !rect.width) return;
    const width = Math.min(76, rect.width - 4);
    const target: Rect = { x: rect.left - bounds.left + (rect.width - width) / 2, y: 3, width, height: 46 };
    const styles = getComputedStyle(bar);
    const next: Paint = {
      width: bounds.width, height: 54, ratio: Math.min(3, window.devicePixelRatio || 1), target,
      fill: styles.getPropertyValue('--unified-accent-soft').trim(),
      stroke: styles.getPropertyValue('--unified-border').trim(),
      animate: animate && !motionIsReduced()
    };
    // Resolve CSS colour expressions on the main thread before sending them.
    fallback.style.backgroundColor = next.fill;
    next.fill = getComputedStyle(fallback).backgroundColor;
    fallback.style.borderColor = next.stroke;
    next.stroke = getComputedStyle(fallback).borderColor;
    fallback.style.width = width + 'px';
    fallback.style.transform = `translate3d(${target.x}px,0,0)`;
    bar.dataset.feedbackRenderer ||= 'css';
    const previous = lastPaint;
    lastPaint = next;
    if (motionIsReduced()) {
      paused = true;
      worker?.postMessage({ type: 'pause' });
      bar.dataset.feedbackRenderer = 'css';
      stopBoost();
      return;
    }
    const changed = paused || !previous || previous.target.x !== target.x || previous.target.width !== width ||
      previous.fill !== next.fill || previous.stroke !== next.stroke || previous.width !== next.width;
    if (!changed && ready) return;
    paused = false;
    if (animate) startWorker(previous || next);
    if (worker) {
      worker.postMessage({ type: 'paint', paint: next });
      if (ready) bar.dataset.feedbackRenderer = 'worker';
    }
  }

  const sync = () => paint(undefined, true);
  const onPress = (event: PointerEvent) => {
    if (event.button !== 0 || event.isPrimary === false) return;
    const button = (event.target as Element)?.closest<HTMLElement>('button[data-v],button[data-quick-rudder]');
    if (button && bar.contains(button)) {
      pressed = true;
      window.clearTimeout(releaseTimer);
      paint(button, true);
    }
  };
  const onRelease = () => {
    if (!pressed) return;
    pressed = false;
    window.clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(sync, 60);
  };
  const onVisibility = () => paint();
  const onPreference = () => paint();
  const observer = new MutationObserver(mutations => {
    if (mutations.some(change => change.target === document.body && change.attributeName === 'class')) {
      paint(undefined, false);
    } else sync();
  });
  observer.observe(bar, { attributes: true, attributeFilter: ['class'] });
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-view', 'class'] });
  const resize = new ResizeObserver(() => paint());
  resize.observe(bar);
  // CSS variables can change with theme or personal accent settings.
  const appearance = new MutationObserver(() => paint());
  appearance.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
  bar.addEventListener('pointerdown', onPress, { passive: true });
  window.addEventListener('pointerup', onRelease, { passive: true });
  window.addEventListener('pointercancel', onRelease, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  reducedQuery.addEventListener('change', onPreference);
  paint();

  return () => {
    disposed = true;
    stopBoost();
    window.clearTimeout(readyTimer);
    window.clearTimeout(releaseTimer);
    observer.disconnect();
    appearance.disconnect();
    resize.disconnect();
    worker?.terminate();
    canvas?.remove();
    fallback.remove();
    bar.removeAttribute('data-feedback-renderer');
    bar.classList.remove('dockFeedbackPaused');
    bar.removeEventListener('pointerdown', onPress);
    window.removeEventListener('pointerup', onRelease);
    window.removeEventListener('pointercancel', onRelease);
    document.removeEventListener('visibilitychange', onVisibility);
    reducedQuery.removeEventListener('change', onPreference);
  };
}
