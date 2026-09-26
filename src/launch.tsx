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

let breakPlanRequest = 0;
window.addEventListener('roster:breaks', (event: Event) => {
  if (document.body.classList.contains('authPending')) return;
  const model = (event as CustomEvent).detail;
  const request = ++breakPlanRequest;
  import('./clinical-experience').then(({ renderBreaksExperience }) => {
    if (request === breakPlanRequest) renderBreaksExperience(model);
  }).catch(() => { /* The core workflow remains available if the optional view cannot load. */ });
});

let nightRequest = 0;
window.addEventListener('roster:night', (event: Event) => {
  if (document.body.classList.contains('authPending')) return;
  const model = (event as CustomEvent).detail;
  const request = ++nightRequest;
  import('./clinical-experience').then(({ renderNightExperience }) => {
    if (request === nightRequest) renderNightExperience(model);
  }).catch(() => { /* A failed optional view never changes the roster calculation. */ });
});

window.addEventListener('roster:personal-night', (event: Event) => {
  import('./clinical-experience').then(({ renderPersonalNightExperience }) => renderPersonalNightExperience((event as CustomEvent).detail));
});

window.addEventListener('roster:recent-activity', (event: Event) => {
  import('./clinical-experience').then(({ renderRecentActivityExperience }) => renderRecentActivityExperience((event as CustomEvent).detail));
});

window.addEventListener('roster:changes', (event: Event) => {
  import('./changes-experience').then(({ renderChangesExperience }) => renderChangesExperience((event as CustomEvent).detail));
});

window.addEventListener('roster:full-roster', (event: Event) => {
  import('./roster-experience').then(({ renderRosterExperience }) => renderRosterExperience((event as CustomEvent).detail.cards));
});

window.addEventListener('roster:account', (event: Event) => {
  import('./account-experience').then(({ renderAccountExperience }) => renderAccountExperience((event as CustomEvent).detail));
});

window.addEventListener('roster:passkeys', (event: Event) => {
  import('./account-experience').then(({ renderPasskeyExperience }) => renderPasskeyExperience((event as CustomEvent).detail));
});

window.addEventListener('roster:admin-accounts', (event: Event) => {
  import('./admin-experience').then(({ renderAdminAccountsExperience }) => renderAdminAccountsExperience((event as CustomEvent).detail));
});

window.addEventListener('roster:chat-overview', (event: Event) => {
  import('./chat-experience').then(({ renderChatOverview }) => renderChatOverview((event as CustomEvent).detail));
});

window.addEventListener('roster:chat-messages', (event: Event) => {
  import('./chat-experience').then(({ renderChatMessages }) => renderChatMessages((event as CustomEvent).detail));
});
