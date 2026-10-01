import { motion, useReducedMotion } from 'motion/react';
import { createRoot, type Root } from 'react-dom/client';
import { useState } from 'react';
import { Badge, FieldShell, GroupedList, ListRow, Pressable, SegmentedControl } from './ui-system';

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
type AccountExperience = { theme: ThemeChoice; installed: boolean; newRelease?: boolean; version?: string; profile?: ProfileExperience };
type ShareExperience = { shareUrl: string; installed: boolean; nativeShare: boolean };
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
  const reduced = useReducedMotion();
  const photoUrl = model.photoUrl || '';
  const initial = model.initial || '?';
  const displayName = model.name.trim() || model.approvedName || 'Your profile';
  const displayRole = model.jobTitle.trim() || 'Anaesthetic team member';
  const markDirty = () => { setDirty(true); act('profile-input'); };

  return <motion.section
    initial={reduced ? false : { opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={reduced ? { duration: 0 } : { duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
    className="accountProfilePanel accountProfileProfessional"
    aria-labelledby="profileHeading"
  >
    <div className="accountProfileHero accountProfileHeroPro">
      <div className="accountHeroPhotoWrap">
        <button
          type="button"
          id="profilePhotoButton"
          aria-label="Choose profile photo"
          onClick={() => document.getElementById('profilePhotoInput')?.click()}
          className="accountPhotoButton accountHeroPhoto"
        >
          <img
            id="profilePhotoPreview"
            src={photoUrl || 'data:image/gif;base64,R0lGODlhAQABAAAAACw='}
            alt="Your profile photo"
            className={photoUrl ? '' : 'hidden'}
          />
          <span id="profilePhotoInitial" className={photoUrl ? 'hidden' : ''}>{initial}</span>
          <span className="accountPhotoEditBadge" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M8.5 7 10 5h4l1.5 2H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2.5Z"></path>
              <circle cx="12" cy="13" r="3.2"></circle>
            </svg>
          </span>
        </button>
        <input
          id="profilePhotoInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={event => {
            const file = event.currentTarget.files?.[0];
            if (file) {
              setDirty(true);
              act('profile-photo', file);
            }
            event.currentTarget.value = '';
          }}
        />
      </div>

      <div className="accountProfileIntro accountProfileIntroPro">
        <span className="accountPrivacyBadge">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 10V8a5 5 0 0 1 10 0v2"></path>
            <rect x="5" y="10" width="14" height="10" rx="3"></rect>
          </svg>
          Private profile
        </span>
        <h3 id="profileHeading">{displayName}</h3>
        <p className="accountProfileRole">{displayRole}</p>
        <small className="accountProfileEmail">{model.email}</small>
        <div className="accountPhotoActions accountPhotoActionsPro">
          <button type="button" id="changeProfilePhoto" onClick={() => document.getElementById('profilePhotoInput')?.click()}>
            Change photo
          </button>
          <button
            type="button"
            id="removeProfilePhoto"
            onClick={() => act('profile-photo-remove')}
            className={model.photoUrl || model.pendingPhoto ? '' : 'hidden'}
          >
            {model.pendingPhoto ? 'Cancel photo' : 'Remove photo'}
          </button>
        </div>
      </div>
    </div>

    <section className="accountProfileSection" aria-labelledby="profileAboutHeading">
      <div className="accountProfileSectionHeading">
        <span>Personal profile</span>
        <h4 id="profileAboutHeading">Personal details</h4>
        <p>Your preferred name and professional title are visible in your own Night view. They do not change shared roster records.</p>
      </div>

      <div className="accountProfileFields tw:@container">
        <div className="accountNameFields tw:@md:grid-cols-2">
          <FieldShell label="Preferred name">
            <input
              id="profileName"
              defaultValue={model.name}
              maxLength={60}
              autoComplete="name"
              placeholder="How the app greets you"
              onInput={markDirty}
              className="accountProfileInput"
            />
          </FieldShell>
          <FieldShell label="Professional title" hint="Optional">
            <input
              id="profileJobTitle"
              defaultValue={model.jobTitle}
              maxLength={80}
              autoComplete="organization-title"
              placeholder="For example, Senior Staff Nurse"
              onInput={markDirty}
              className="accountProfileInput"
            />
          </FieldShell>
        </div>
      </div>
    </section>

    <section className="accountProfileSection" aria-labelledby="profileRosterHeading">
      <div className="accountProfileSectionHeading compact">
        <span>On this device</span>
        <h4 id="profileRosterHeading">Roster highlight</h4>
        <p>Choose which roster name should be highlighted as yours. This remains a private device preference.</p>
      </div>
      <FieldShell label="Your roster name">
        <select
          id="profileRosterName"
          defaultValue={model.rosterName}
          onChange={markDirty}
          className="accountProfileInput accountProfileSelect"
        >
          <option value="">Do not highlight a name</option>
          {model.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </FieldShell>
    </section>

    <div className="accountIdentity accountIdentityVerified">
      <span className="accountIdentityIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 3 19 6v5c0 4.6-2.9 8-7 10-4.1-2-7-5.4-7-10V6l7-3Z"></path>
          <path d="m9 12 2 2 4-4"></path>
        </svg>
      </span>
      <div className="accountIdentityCopy">
        <span>Verified account identity</span>
        <b id="profileApprovedName">{model.approvedName}</b>
        <small id="profileEmail">{model.email}</small>
        <p>Shared roster actions use this approved identity.</p>
      </div>
    </div>

    {!model.featureAvailable && <p className="formMessage error" role="alert">Ask the administrator to run the V32 profile upgrade before saving your profile.</p>}

    <div className="accountSaveRow accountSaveRowPro">
      <div id="profileMessage" className={`formMessage ${model.messageType || ''}`} role="status" aria-live="polite">{model.message || ''}</div>
      <button
        type="button"
        id="saveProfileBtn"
        onClick={() => act('profile-save')}
        className={`primary accountProfileSave ${dirty ? '' : 'hidden'}`}
        disabled={!model.featureAvailable}
      >
        Save profile
      </button>
    </div>
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

function AccountActions({ installed, newRelease, version }: { installed: boolean; newRelease?: boolean; version?: string }) {
  const actions = [
    { action: 'guide', title: 'App guide', detail: 'Help for Night, Changes, Breaks, Chat and more', icon: '✦' },
    { action: 'whatsnew', title: 'What’s new', detail: newRelease ? `New in version ${version || ''}` : 'See the latest Night Roster improvements', icon: '●', isNew: !!newRelease },
    !installed && { action: 'install', title: 'Install Night Roster', detail: 'Add Night Roster to this device', icon: '↓' },
    { action: 'share', title: 'Share Night Roster', detail: 'QR code, WhatsApp, Messages and more', icon: '↗' },
    { action: 'versions', title: 'Version history', detail: 'Browse every release without losing the current update', icon: '↺' }
  ].filter(Boolean) as { action: string; title: string; detail: string; icon: string; isNew?: boolean }[];
  return <GroupedList>{actions.map(item => <ListRow key={item.action} leading={<span className="accountActionIcon" aria-hidden="true">{item.icon}</span>} title={item.title} subtitle={item.detail} trailing={item.isNew ? <Badge tone="info">New</Badge> : undefined} onClick={() => act(item.action)} />)}</GroupedList>;
}

const SHARE_QR_ROWS = [
  '111111100100111011110001001111111',
  '100000100011011110000010101000001',
  '101110101100010110010110001011101',
  '101110101110101111101011001011101',
  '101110101011100101010011101011101',
  '100000101010110111001100001000001',
  '111111101010101010101010101111111',
  '000000001000001100101111000000000',
  '101111100011011101000001101111100',
  '010101011101001010111101001101111',
  '110001100101000110101010011010110',
  '111100001010101100001111011011110',
  '010010110101100100100010110111010',
  '100011010101001111111001111001111',
  '111001100010001000101010111110110',
  '001111011000111010001101111101100',
  '010001101111110001011010110110001',
  '101010001100001011111101011101101',
  '110010100011110101000110000110110',
  '100010011111111011100111011111100',
  '011000110111101010010010010011001',
  '111001001101000101111101011000001',
  '101000100001000111001010010001110',
  '101011001011100100011110011011101',
  '100110100111101101110010111110010',
  '000000001110000010111000100010101',
  '111111100101001110100111101010110',
  '100000101011110100001101100011100',
  '101110101100111100100010111111010',
  '101110101000011111011001110010111',
  '101110101010101001001100001101000',
  '100000100010100010010110010010100',
  '111111101001111000001011100100010'
] as const;

function ShareQr() {
  const path = SHARE_QR_ROWS.flatMap((row, y) =>
    [...row].flatMap((cell, x) => cell === '1' ? [`M${x + 4} ${y + 4}h1v1h-1z`] : [])
  ).join('');
  return <svg className="shareQrSvg" viewBox="0 0 41 41" role="img" aria-labelledby="shareQrTitle" shapeRendering="crispEdges">
    <title id="shareQrTitle">Night Roster installation QR code</title>
    <rect width="41" height="41" fill="white" rx="2" />
    <path d={path} fill="#0b1116" />
  </svg>;
}

function ShareApp({ model }: { model: ShareExperience }) {
  const reduced = useReducedMotion();
  return <motion.div
    className="shareAppExperience"
    initial={reduced ? false : { opacity: 0, y: 8, scale: 0.99 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 32 }}
  >
    <section className="shareQrHero" aria-labelledby="shareQrHeading">
      <span className="shareQrEyebrow">For authorised theatre staff</span>
      <h3 id="shareQrHeading">Scan to get Night Roster</h3>
      <p>Open the phone camera, point it at the code, then tap the link that appears.</p>
      <div className="shareQrFrame"><ShareQr /></div>
      <div className="shareQrSteps" aria-label="QR installation steps">
        <span><b>1</b>Open camera</span><span><b>2</b>Scan code</span><span><b>3</b>Tap the link</span>
      </div>
    </section>
    <div className="shareAppActions">
      <Pressable type="button" className="primary sharePrimaryAction" onClick={() => act('share-native')}>
        <span aria-hidden="true">↗</span>{model.nativeShare ? 'Send Night Roster' : 'Copy app link'}
      </Pressable>
      <Pressable type="button" className="soft shareCopyAction" onClick={() => act('share-copy')}>Copy link</Pressable>
      <Pressable type="button" className="shareInstallHelp" onClick={() => act('share-install')}>Installation help <span aria-hidden="true">›</span></Pressable>
    </div>
    <p className="sharePrivacyNote"><span aria-hidden="true">⌁</span>This only shares the public app. It never shares your account or roster data.</p>
    {model.installed && <p className="shareInstalledNote">Night Roster is already installed on this phone.</p>}
    <code className="shareUrlText">{model.shareUrl.replace(/^https?:\/\//, '')}</code>
  </motion.div>;
}

function Passkeys({ model }: { model: PasskeyExperience }) {
  if (!model.items.length) return <div className="accountPasskeyEmpty" role="status"><strong>No passkeys added</strong><span>{model.message}</span></div>;

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
  rootFor('accountActionsExperience')?.render(<AccountActions installed={model.installed} newRelease={model.newRelease} version={model.version} />);
}

export function renderShareExperience(model: ShareExperience) {
  rootFor('shareAppExperience')?.render(<ShareApp model={model} />);
}

export function renderPasskeyExperience(model: PasskeyExperience) {
  rootFor('passkeyList')?.render(<Passkeys model={model} />);
}
