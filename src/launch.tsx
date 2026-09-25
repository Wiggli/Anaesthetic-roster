import { createRoot } from 'react-dom/client';
import { motion, useReducedMotion } from 'motion/react';
import './tailwind.css';

function LaunchMotto() {
  const reducedMotion = useReducedMotion();
  return (
    <motion.p
      className="launchMotto tw:text-center"
      initial={reducedMotion ? false : { opacity: 0.8 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.24 }}
    >
      Fair by design. Flexible under pressure. Safe in practice.
    </motion.p>
  );
}

// The roster engine still owns operational views; React owns isolated shell regions.
const mount = document.getElementById('reactLaunchMotto');
if (mount) createRoot(mount).render(<LaunchMotto />);

const navigation = document.getElementById('reactNavigation');
if (navigation) {
  let loading = false;
  const onAuthorised = () => {
    if (loading || document.body.classList.contains('authPending')) return;
    loading = true;
    observer.disconnect();
    // Leave the working HTML controls in place if the optional chunk fails.
    import('./navigation').then(({ mountNavigation }) => mountNavigation(navigation)).catch(() => {
      loading = false;
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    });
  };
  const observer = new MutationObserver(onAuthorised);
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  onAuthorised();
}

let screenInfoRequest = 0;
window.addEventListener('roster:screeninfo', (event: Event) => {
  if (document.body.classList.contains('authPending')) return;
  const items = (event as CustomEvent<{ items: [string, string][] }>).detail.items;
  const request = ++screenInfoRequest;
  import('./screen-info').then(({ renderScreenInfo }) => {
    if (request === screenInfoRequest) renderScreenInfo(items);
  }).catch(() => { /* The escaped HTML sheet remains available. */ });
});
