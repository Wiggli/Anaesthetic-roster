import { motion } from 'motion/react';
import { createRoot, type Root } from 'react-dom/client';
import { useState } from 'react';
import { Badge, EmptyState, FieldShell, GroupedList, ListRow, Pressable, SegmentedControl, Surface } from './ui-system';

type ThemeChoice = 'light' | 'system' | 'dark';
type ProfileExperience = {
  name: string;
  jobTitle: string;
  rosterName: string;
  approvedName: string;
  email: string;
  options: { value: string; label: string }[];
  initial: string;
  photoUrl?: string;
  featureAvailable: boolean;
  pendingPhoto: boolean;
  message?: string;
  messageType?: string;
  changed?: boolean;
};
type AccountExperience = { theme: ThemeChoice; installed: boolean; profile?: ProfileExperience };
type PasskeyExperience = { message: string; items: { id: string; label: string }[] };

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

function act(action: string, value?: unknown) {
  window.dispatchEvent(new CustomEvent('roster:account-action', { detail: { action, value } }));
}

function ProfileEditor({ model }: { model: ProfileExperience }) {
  const [dirty, setDirty] = useState(!!model.changed);
  const [photoUrl, setPhotoUrl] = useState(model.photoUrl || '');
  const initial = model.initial || '?';
  const markDirty = () => { setDirty(true); act('profile-input'); };
  return <motion.section
    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
    className="tw:grid tw:gap-4 tw:rounded-3xl tw:border tw:border-black/8 tw:bg-[var(--card)] tw:p-4 tw:shadow-sm tw:dark:border-white/10"
    aria-labelledby="profileHeading"
  >
    <div className="tw:flex tw:items-center tw:gap-3">
      <div className="tw:relative tw:shrink-0">
        <button type="button" id="profilePhotoButton" aria-label="Choose profile photo" onClick={() => document.getElementById('profilePhotoInput')?.click()} className="tw:relative tw:grid tw:h-20 tw:w-20 tw:place-items-center tw:overflow-hidden tw:rounded-full tw:bg-[var(--surface)] tw:text-2xl tw:font-bold tw:text-[var(--accent-strong)] tw:ring-4 tw:ring-teal-500/10">
          {photoUrl ? <img id="profilePhotoPreview" src={photoUrl} alt="Your profile photo" className="tw:h-full tw:w-full tw:object-cover" /> : <span id="profilePhotoInitial">{initial}</span>}
          <span className="tw:absolute tw:bottom-0 tw:right-0 tw:grid tw:h-7 tw:w-7 tw:place-items-center tw:rounded-full tw:bg-[var(--accent-strong)] tw:text-sm tw:text-white" aria-hidden="true">+</span>
        </button>
      </div>
      <div className="tw:min-w-0">
        <h3 id="profileHeading" className="tw:text-base tw:font-bold">Personal details</h3>
        <p className="tw:mt-1 tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">Your photo, preferred name and role title appear in Your night. Shared changes still use your approved account identity.</p>
        <div className="tw:mt-2 tw:flex tw:flex-wrap tw:gap-2">
          <button type="button" id="changeProfilePhoto" onClick={() => document.getElementById('profilePhotoInput')?.click()} className="tw:rounded-full tw:bg-[var(--surface)] tw:px-3 tw:py-1.5 tw:text-xs tw:font-bold">Choose photo</button>
          <button type="button" id="removeProfilePhoto" onClick={() => { setPhotoUrl(''); act('profile-photo-remove'); }} className={`tw:rounded-full tw:bg-rose-500/10 tw:px-3 tw:py-1.5 tw:text-xs tw:font-bold tw:text-rose-700 tw:dark:text-rose-200 ${model.photoUrl || model.pendingPhoto ? '' : 'tw:hidden'}`}>{model.pendingPhoto ? 'Cancel' : 'Remove'}</button>
        </div>
        <input id="profilePhotoInput" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => { const file = event.currentTarget.files?.[0]; if (file) { setDirty(true); act('profile-photo', file); } event.currentTarget.value = ''; }} />
      </div>
    </div>
    <div className="tw:@container tw:grid tw:gap-3">
      <div className="tw:grid tw:gap-3 tw:@md:grid-cols-2">
        <FieldShell label="Preferred name">
          <input id="profileName" defaultValue={model.name} maxLength={60} autoComplete="name" placeholder="How the app greets you" onInput={markDirty} className="tw:min-h-11 tw:rounded-xl tw:border tw:border-black/10 tw:bg-[var(--surface)] tw:px-3 tw:text-sm tw:outline-none tw:focus:border-teal-500/50 tw:focus:ring-2 tw:focus:ring-teal-500/15 tw:dark:border-white/12" />
        </FieldShell>
        <FieldShell label="Role title" hint="Optional">
          <input id="profileJobTitle" defaultValue={model.jobTitle} maxLength={80} autoComplete="organization-title" placeholder="For example, Anaesthetic Nurse" onInput={markDirty} className="tw:min-h-11 tw:rounded-xl tw:border tw:border-black/10 tw:bg-[var(--surface)] tw:px-3 tw:text-sm tw:outline-none tw:focus:border-teal-500/50 tw:focus:ring-2 tw:focus:ring-teal-500/15 tw:dark:border-white/12" />
        </FieldShell>
      </div>
      <FieldShell label="Your roster name" hint="Used only to highlight your allocation on this device.">
        <select id="profileRosterName" defaultValue={model.rosterName} onChange={markDirty} className="tw:min-h-11 tw:rounded-xl tw:border tw:border-black/10 tw:bg-[var(--surface)] tw:px-3 tw:text-sm tw:font-semibold tw:outline-none tw:focus:border-teal-500/50 tw:focus:ring-2 tw:focus:ring-teal-500/15 tw:dark:border-white/12">
          <option value="">Do not highlight a name</option>
          {model.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </FieldShell>
    </div>
    <div className="tw:rounded-2xl tw:bg-[var(--surface)] tw:px-3.5 tw:py-3"><span className="tw:block tw:text-xs tw:font-bold tw:text-[var(--muted)]">Approved account</span><b id="profileApprovedName" className="tw:mt-1 tw:block tw:text-sm">{model.approvedName}</b><small id="profileEmail" className="tw:mt-0.5 tw:block tw:text-xs tw:text-[var(--muted)]">{model.email}</small></div>
    {!model.featureAvailable && <p className="formMessage error" role="alert">Ask the administrator to run the V32 profile upgrade before saving your profile.</p>}
    <button type="button" id="saveProfileBtn" onClick={() => act('profile-save')} className={`primary wide ${dirty ? '' : 'hidden'}`} disabled={!model.featureAvailable}>Save profile</button>
    <div id="profileMessage" className={`formMessage ${model.messageType || ''}`} role="status" aria-live="polite">{model.message || ''}</div>
  </motion.section>;
}

function Appearance({ initial }: { initial: ThemeChoice }) {
  const [selected, setSelected] = useState(initial);
  const choices: { value: ThemeChoice; label: string; detail: string }[] = [
    { value: 'light', label: 'Light', detail: 'Always bright' },
    { value: 'system', label: 'Automatic', detail: 'Match this device' },
    { value: 'dark', label: 'Dark', detail: 'Always dark' }
  ];
  return <SegmentedControl
    value={selected}
    options={choices}
    ariaLabel="Appearance"
    onChange={value => {
      setSelected(value);
      act('theme', value);
    }}
  />;
}

function AccountActions({ installed }: { installed: boolean }) {
  const actions = [
    { action: 'guide', title: 'View app guide', detail: 'Replay Night Roster’s complete introduction', icon: '✦' },
    !installed && { action: 'install', title: 'Install Night Roster', detail: 'Add the private PWA to this device', icon: '↓' },
    { action: 'versions', title: 'Version history', detail: 'Review previous releases and safety improvements', icon: '↺' }
  ].filter(Boolean) as { action: string; title: string; detail: string; icon: string }[];

  return <GroupedList>
    {actions.map(item => <ListRow
      key={item.action}
      leading={<span className="tw:grid tw:h-9 tw:w-9 tw:place-items-center tw:rounded-xl tw:bg-teal-500/10 tw:text-sm tw:font-bold tw:text-[var(--accent-strong)]" aria-hidden="true">{item.icon}</span>}
      title={item.title}
      subtitle={item.detail}
      onClick={() => act(item.action)}
    />)}
  </GroupedList>;
}

function Passkeys({ model }: { model: PasskeyExperience }) {
  if (!model.items.length) return <Surface>
    <EmptyState title="No passkeys on this device" detail={model.message} />
  </Surface>;

  return <GroupedList>{model.items.map(item => <motion.div layout key={item.id}>
    <ListRow
      leading={<span className="tw:grid tw:h-9 tw:w-9 tw:place-items-center tw:rounded-xl tw:bg-emerald-500/10 tw:text-sm tw:font-bold tw:text-emerald-700 tw:dark:text-emerald-300" aria-hidden="true">⌁</span>}
      title={item.label}
      subtitle="Ready for password-free sign in"
      trailing={<span className="tw:flex tw:items-center tw:gap-2">
        <Badge tone="success">Ready</Badge>
        <Pressable type="button" onClick={() => act('passkey-remove', item.id)} className="tw:min-h-9 tw:rounded-full tw:bg-rose-500/10 tw:px-3 tw:text-xs tw:font-bold tw:text-rose-700 tw:dark:text-rose-200">Remove</Pressable>
      </span>}
    />
  </motion.div>)}</GroupedList>;
}

export function renderAccountExperience(model: AccountExperience) {
  if (model.profile) rootFor('profileExperience')?.render(<ProfileEditor model={model.profile} />);
  rootFor('appearanceExperience')?.render(<Appearance key={model.theme} initial={model.theme} />);
  rootFor('accountActionsExperience')?.render(<AccountActions installed={model.installed} />);
}

export function renderPasskeyExperience(model: PasskeyExperience) {
  rootFor('passkeyList')?.render(<Passkeys model={model} />);
}
