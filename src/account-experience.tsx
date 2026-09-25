import { motion, useReducedMotion } from 'motion/react';
import { createRoot, type Root } from 'react-dom/client';
import { useState } from 'react';

type ThemeChoice = 'light' | 'system' | 'dark';
type AccountExperience = { theme: ThemeChoice; installed: boolean };

const roots = new Map<string, Root>();

function rootFor(id: string) {
  const host = document.getElementById(id);
  if (!host) return undefined;
  let root = roots.get(id);
  if (!root) {
    root = createRoot(host);
    roots.set(id, root);
  }
  return root;
}

function act(action: string, value?: string) {
  window.dispatchEvent(new CustomEvent('roster:account-action', { detail: { action, value } }));
}

function Appearance({ initial }: { initial: ThemeChoice }) {
  const [selected, setSelected] = useState(initial);
  const choices: { value: ThemeChoice; label: string; detail: string }[] = [
    { value: 'light', label: 'Light', detail: 'Always bright' },
    { value: 'system', label: 'Automatic', detail: 'Match this device' },
    { value: 'dark', label: 'Dark', detail: 'Always dark' }
  ];
  return <div className="tw:grid tw:grid-cols-3 tw:gap-2" role="group" aria-label="Appearance">
    {choices.map(choice => <motion.button
      key={choice.value}
      type="button"
      whileTap={{ scale: 0.97 }}
      aria-pressed={selected === choice.value}
      onClick={() => { setSelected(choice.value); act('theme', choice.value); }}
      className={`tw:min-w-0 tw:rounded-2xl tw:border tw:px-2 tw:py-3 tw:text-center ${selected === choice.value ? 'tw:border-teal-500 tw:bg-teal-500/12 tw:text-[var(--accent-strong)]' : 'tw:border-black/8 tw:bg-[var(--surface)] tw:text-[var(--muted)] dark:tw:border-white/10'}`}
    >
      <strong className="tw:block tw:text-sm">{choice.label}</strong>
      <span className="tw:mt-1 tw:block tw:text-[0.64rem] tw:leading-tight">{choice.detail}</span>
    </motion.button>)}
  </div>;
}

function AccountActions({ installed }: { installed: boolean }) {
  const reduced = useReducedMotion();
  const actions = [
    { action: 'guide', title: 'View app guide', detail: 'Replay Night Roster’s complete introduction' },
    !installed && { action: 'install', title: 'Install Night Roster', detail: 'Add the private PWA to this device' },
    { action: 'versions', title: 'Version history', detail: 'Review previous releases and safety improvements' }
  ].filter(Boolean) as { action: string; title: string; detail: string }[];
  return <div className="tw:grid tw:gap-2">
    {actions.map((item, index) => <motion.button
      type="button"
      key={item.action}
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.16, delay: reduced ? 0 : index * 0.025 }}
      whileTap={{ scale: reduced ? 1 : 0.985 }}
      onClick={() => act(item.action)}
      className="tw:flex tw:w-full tw:items-center tw:justify-between tw:gap-3 tw:rounded-2xl tw:border tw:border-black/8 tw:bg-[var(--card)] tw:px-4 tw:py-3.5 tw:text-left dark:tw:border-white/10"
    >
      <span className="tw:min-w-0">
        <strong className="tw:block tw:text-sm">{item.title}</strong>
        <small className="tw:mt-0.5 tw:block tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">{item.detail}</small>
      </span>
      <span className="tw:text-xl tw:font-light tw:text-[var(--muted)]" aria-hidden="true">›</span>
    </motion.button>)}
  </div>;
}

export function renderAccountExperience(model: AccountExperience) {
  rootFor('appearanceExperience')?.render(<Appearance key={model.theme} initial={model.theme} />);
  rootFor('accountActionsExperience')?.render(<AccountActions installed={model.installed} />);
}
