import { useSyncExternalStore } from 'react';
import { useReducedMotion } from 'motion/react';

const listeners = new Set<() => void>();
let preferenceObserver: MutationObserver | undefined;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!preferenceObserver) {
    preferenceObserver = new MutationObserver(() => listeners.forEach(notify => notify()));
    preferenceObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { preferenceObserver?.disconnect(); preferenceObserver = undefined; }
  };
}

export function motionIsReduced() {
  return document.body.classList.contains('personalMotionReduced') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Saved motion preferences apply to JS animations as well as CSS. */
export function useProductReducedMotion() {
  const personal = useSyncExternalStore(subscribe, () => document.body.classList.contains('personalMotionReduced'), () => false);
  return Boolean(useReducedMotion() || personal);
}

export function productHaptic(kind: 'selection' | 'success' = 'selection') {
  try { if (!motionIsReduced() && document.visibilityState === 'visible') navigator.vibrate?.(kind === 'success' ? 12 : 7); } catch { /* Optional on supported devices. */ }
}

export function scrollToProductElement(element?: HTMLElement | null, block: ScrollLogicalPosition = 'center') {
  element?.scrollIntoView({ behavior: motionIsReduced() ? 'auto' : 'smooth', block });
}
