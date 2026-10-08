import { useProductReducedMotion } from './product-motion';
import { motion } from 'motion/react';
import { createRoot, type Root } from 'react-dom/client';
import { useState, type CSSProperties } from 'react';
import { Badge, FieldShell, GroupedList, ListRow, Pressable, SegmentedControl } from './ui-system';

type ThemeChoice = 'light' | 'system' | 'dark';
type AccentKey = 'teal' | 'blue' | 'violet' | 'rose' | 'amber' | 'graphite';
type TextScale = 'standard' | 'large' | 'xlarge';
type MotionPref = 'system' | 'reduced';
type AvatarStyle = 'photo' | 'monogram' | 'spark';
type ShiftSymbol = 'spark' | 'moon' | 'cross' | 'diamond' | 'dot' | 'star';
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
  accentKey: AccentKey;
  textScale: TextScale;
  motionPref: MotionPref;
  avatarStyle: AvatarStyle;
  greetingEnabled: boolean;
};
type ShiftExperience = {
  name: string;
  tagline: string;
  accentKey: AccentKey;
  symbol: ShiftSymbol;
  initials: string;
  photoUrl?: string;
  pendingPhoto: boolean;
  featureAvailable: boolean;
  updatedBy?: string;
  message?: string;
  messageType?: string;
};
type AccountExperience = { theme: ThemeChoice; installed: boolean; newRelease?: boolean; version?: string; profile?: ProfileExperience; shift?: ShiftExperience };
type ShareExperience = { shareUrl: string; installed: boolean; nativeShare: boolean };
type PasskeyExperience = { message: string; items: { id: string; label: string }[] };

const roots = new Map<string, Root>();

function rootFor(id: string) {
  const host = document.getElementById(id) || (window as Window & { accountPresentationElement?: (id: string) => HTMLElement | null }).accountPresentationElement?.(id);
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

function shareAct(action: 'native' | 'copy' | 'install') {
  window.dispatchEvent(new CustomEvent('roster:share-action', { detail: { action } }));
}

const accentChoices: { value: AccentKey; label: string }[] = [
  { value: 'teal', label: 'Teal' },
  { value: 'blue', label: 'Blue' },
  { value: 'violet', label: 'Violet' },
  { value: 'rose', label: 'Rose' },
  { value: 'amber', label: 'Amber' },
  { value: 'graphite', label: 'Graphite' }
];

const symbolChoices: { value: ShiftSymbol; glyph: string; label: string }[] = [
  { value: 'spark', glyph: '✦', label: 'Spark' },
  { value: 'moon', glyph: '☾', label: 'Moon' },
  { value: 'cross', glyph: '✚', label: 'Cross' },
  { value: 'diamond', glyph: '◆', label: 'Diamond' },
  { value: 'dot', glyph: '●', label: 'Dot' },
  { value: 'star', glyph: '★', label: 'Star' }
];

function accentColour(key: AccentKey) {
  return ({
    teal: '#087970',
    blue: '#2563c4',
    violet: '#6748c8',
    rose: '#b33663',
    amber: '#945b0b',
    graphite: '#59616c'
  } as Record<AccentKey, string>)[key];
}

function symbolGlyph(key: ShiftSymbol) {
  return symbolChoices.find(item => item.value === key)?.glyph || '✦';
}

function IdentityImage({ src, fallback, className = '' }: { src?: string; fallback: string; className?: string }) {
  return <span className={'personalisationIdentityImage ' + className}>
    {src ? <img src={src} alt="" /> : <b aria-hidden="true">{fallback}</b>}
  </span>;
}

function ProfileEditor({ model, shift }: { model: ProfileExperience; shift?: ShiftExperience }) {
  const [tab, setTab] = useState<'me' | 'shift'>('me');
  const [previewName,setPreviewName] = useState(model.name);
  const [previewRole,setPreviewRole] = useState(model.jobTitle);
  const [dirty, setDirty] = useState(!!model.changed);
  const [accent, setAccent] = useState<AccentKey>(model.accentKey || 'teal');
  const [textScale, setTextScale] = useState<TextScale>(model.textScale || 'standard');
  const [motionPref, setMotionPref] = useState<MotionPref>(model.motionPref || 'system');
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(model.avatarStyle || 'photo');
  const [greetingEnabled, setGreetingEnabled] = useState(model.greetingEnabled !== false);
  const [shiftName, setShiftName] = useState(shift?.name || 'Anaesthetic Team');
  const [shiftTagline, setShiftTagline] = useState(shift?.tagline || '');
  const [shiftAccent, setShiftAccent] = useState<AccentKey>(shift?.accentKey || 'teal');
  const [shiftSymbol, setShiftSymbol] = useState<ShiftSymbol>(shift?.symbol || 'spark');
  const [shiftDirty, setShiftDirty] = useState(false);
  const reduced = useProductReducedMotion() || motionPref === 'reduced';
  const photoUrl = model.photoUrl || '';
  const initial = model.initial || '?';
  const displayName = previewName.trim() || model.approvedName || 'Your profile';
  const displayRole = previewRole.trim() || 'Anaesthetic team member';
  const markDirty = () => { setDirty(true); act('profile-input'); };
  const markShiftDirty = () => setShiftDirty(true);
  const personalFallback = avatarStyle === 'spark' ? '✦' : initial;
  const showPersonalPhoto = avatarStyle === 'photo' && !!photoUrl;
  const shiftFallback = shift?.photoUrl ? '' : (symbolGlyph(shiftSymbol) || shift?.initials || 'AT');

  return <motion.section
    initial={reduced ? false : { opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={reduced ? { duration: 0 } : { duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
    className="accountProfilePanel personalisationStudio"
    aria-labelledby="profileHeading"
  >
    <div className="personalisationStudioHeading">
      <span>Make it yours</span>
      <h3 id="profileHeading">Personalisation Studio</h3>
      <p>Personal styling stays yours. Shift identity is shared with the whole anaesthetic team.</p>
    </div>

    <div className="personalisationTabs" role="group" aria-label="Personalisation">
      <button type="button" className={tab === 'me' ? 'active' : ''} aria-pressed={tab === 'me'} onClick={() => setTab('me')}>Me</button>
      <button type="button" className={tab === 'shift' ? 'active' : ''} aria-pressed={tab === 'shift'} onClick={() => setTab('shift')}>Our Shift</button>
    </div>

    {tab === 'me' ? <>
      <section className="personalisationPreviewCard" style={{ '--identity-accent': accentColour(accent) } as CSSProperties}>
        <div className="personalisationPreviewGlow" />
        <IdentityImage src={showPersonalPhoto ? photoUrl : undefined} fallback={personalFallback} className="personalisationPreviewAvatar" />
        <div className="personalisationPreviewCopy">
          <span>Your Night Roster identity</span>
          <strong>{displayName}</strong>
          <small>{displayRole}</small>
        </div>
        <span className="personalisationPreviewPill">You</span>
        <div className="personalisationPreviewMini"><b>Night</b><span>Your allocation</span><small>Preview · {textScale === 'standard' ? 'Standard text' : textScale === 'large' ? 'Larger text' : 'Largest text'} · {motionPref === 'reduced' ? 'Reduced motion' : 'System motion'}</small></div>
      </section>

      <section className="personalisationGroup">
        <div className="personalisationGroupHeading">
          <span>Identity</span>
          <h4>Photo & avatar</h4>
          <p>Choose how your account appears in the app. Your verified roster identity never changes.</p>
        </div>
        <div className="personalisationAvatarEditor">
          <div className="accountHeroPhotoWrap">
            <button
              type="button"
              id="profilePhotoButton"
              aria-label="Choose profile photo"
              onClick={() => document.getElementById('profilePhotoInput')?.click()}
              className="accountPhotoButton accountHeroPhoto"
              style={{ '--identity-accent': accentColour(accent) } as CSSProperties}
            >
              <img id="profilePhotoPreview" src={photoUrl || 'data:image/gif;base64,R0lGODlhAQABAAAAACw='} alt="Your profile photo" className={showPersonalPhoto ? '' : 'hidden'} />
              <span id="profilePhotoInitial" className={showPersonalPhoto ? 'hidden' : ''}>{personalFallback}</span>
              <span className="accountPhotoEditBadge" aria-hidden="true">+</span>
            </button>
            <input id="profilePhotoInput" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => {
              const file = event.currentTarget.files?.[0];
              if (file) { setDirty(true); act('profile-photo', file); }
              event.currentTarget.value = '';
            }} />
          </div>
          <div className="personalisationAvatarStyles" role="group" aria-label="Avatar style">
            {([
              ['photo', 'Photo'],
              ['monogram', 'Initials'],
              ['spark', 'Spark']
            ] as [AvatarStyle, string][]).map(([value, label]) =>
              <button key={value} type="button" className={avatarStyle === value ? 'active' : ''} onClick={() => { setAvatarStyle(value); markDirty(); }}>{label}</button>
            )}
          </div>
          <input id="profileAvatarStyle" type="hidden" value={avatarStyle} readOnly />
          <div className="accountPhotoActions accountPhotoActionsPro">
            <button type="button" id="changeProfilePhoto" onClick={() => document.getElementById('profilePhotoInput')?.click()}>Choose photo</button>
            <button type="button" id="removeProfilePhoto" onClick={() => act('profile-photo-remove')} className={model.photoUrl || model.pendingPhoto ? '' : 'hidden'}>{model.pendingPhoto ? 'Cancel photo' : 'Remove photo'}</button>
          </div>
        </div>
      </section>

      <section className="personalisationGroup">
        <div className="personalisationGroupHeading compact">
          <span>About you</span>
          <h4>Profile details</h4>
          <p>Preferred name and professional title are private presentation details, not shared roster data.</p>
        </div>
        <div className="accountProfileFields tw:@container">
          <div className="accountNameFields tw:@md:grid-cols-2">
            <FieldShell label="Preferred name">
              <input id="profileName" defaultValue={model.name} maxLength={60} autoComplete="name" placeholder="How the app greets you" onInput={event => { setPreviewName(event.currentTarget.value); markDirty(); }} className="accountProfileInput" />
            </FieldShell>
            <FieldShell label="Professional title" hint="Optional">
              <input id="profileJobTitle" defaultValue={model.jobTitle} maxLength={80} autoComplete="organization-title" placeholder="For example, Senior Staff Nurse" onInput={event => { setPreviewRole(event.currentTarget.value); markDirty(); }} className="accountProfileInput" />
            </FieldShell>
          </div>
          <FieldShell label="Your roster name" hint="Private device highlight">
            <select id="profileRosterName" defaultValue={model.rosterName} onChange={markDirty} className="accountProfileInput accountProfileSelect">
              <option value="">Do not highlight a name</option>
              {model.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </FieldShell>
        </div>
      </section>

      <section className="personalisationGroup">
        <div className="personalisationGroupHeading compact">
          <span>Look & feel</span>
          <h4>Personal accent</h4>
          <p>Your accent colours identity details only. Clinical and warning colours stay fixed.</p>
        </div>
        <div className="personalisationSwatches" role="group" aria-label="Personal accent colour">
          {accentChoices.map(item => <button
            key={item.value}
            type="button"
            className={accent === item.value ? 'active' : ''}
            aria-label={item.label}
            aria-pressed={accent === item.value}
            onClick={() => { setAccent(item.value); markDirty(); }}
          ><i style={{ background: accentColour(item.value) }} /><span>{item.label}</span></button>)}
        </div>
        <input id="profileAccentKey" type="hidden" value={accent} readOnly />
      </section>

      <section className="personalisationGroup personalisationComfort">
        <div className="personalisationGroupHeading compact">
          <span>Comfort</span>
          <h4>Reading & motion</h4>
        </div>
        <div className="personalisationOptionGrid">
          <div>
            <b>Text size</b>
            <div className="personalisationChoiceRow" role="group" aria-label="Text size">
              {([
                ['standard', 'Normal'],
                ['large', 'Large'],
                ['xlarge', 'Extra large']
              ] as [TextScale, string][]).map(([value, label]) => <button key={value} type="button" className={textScale === value ? 'active' : ''} onClick={() => { setTextScale(value); markDirty(); }}>{label}</button>)}
            </div>
            <input id="profileTextScale" type="hidden" value={textScale} readOnly />
          </div>
          <div>
            <b>Motion</b>
            <div className="personalisationChoiceRow" role="group" aria-label="Motion preference">
              {([
                ['system', 'Device setting'],
                ['reduced', 'Calmer']
              ] as [MotionPref, string][]).map(([value, label]) => <button key={value} type="button" className={motionPref === value ? 'active' : ''} onClick={() => { setMotionPref(value); markDirty(); }}>{label}</button>)}
            </div>
            <input id="profileMotionPref" type="hidden" value={motionPref} readOnly />
          </div>
          <button type="button" className={'personalisationToggleRow ' + (greetingEnabled ? 'active' : '')} onClick={() => { setGreetingEnabled(!greetingEnabled); markDirty(); }} aria-pressed={greetingEnabled}>
            <span><b>Personal greeting</b><small>Show “Welcome back” with your preferred name when Night Roster opens.</small></span>
            <i>{greetingEnabled ? 'On' : 'Off'}</i>
          </button>
          <input id="profileGreetingEnabled" type="hidden" value={greetingEnabled ? '1' : '0'} readOnly />
        </div>
      </section>

      <div className="accountIdentity accountIdentityVerified">
        <span className="accountIdentityIcon" aria-hidden="true">✓</span>
        <div className="accountIdentityCopy">
          <span>Verified account identity</span>
          <b id="profileApprovedName">{model.approvedName}</b>
          <small id="profileEmail">{model.email}</small>
          <p>Shared roster actions continue to use this approved identity.</p>
        </div>
      </div>

      {!model.featureAvailable && <p className="formMessage error" role="alert">Personal profile storage is not available yet.</p>}
      <div className="accountSaveRow accountSaveRowPro">
        <div id="profileMessage" className={'formMessage ' + (model.messageType || '')} role="status" aria-live="polite">{model.message || ''}</div>
        <button type="button" id="saveProfileBtn" onClick={() => act('profile-save')} className={'primary accountProfileSave ' + (dirty ? '' : 'hidden')} disabled={!model.featureAvailable}>Save my personalisation</button>
      </div>
    </> : <>
      <section className="personalisationPreviewCard shiftPreviewCard" data-shift-accent={shiftAccent} style={{ '--identity-accent': accentColour(shiftAccent) } as CSSProperties}>
        <div className="personalisationPreviewGlow" />
        <IdentityImage src={shift?.photoUrl} fallback={shiftFallback || shift?.initials || 'AT'} className="personalisationPreviewAvatar shiftPreviewAvatar" />
        <div className="personalisationPreviewCopy">
          <span>Shared shift identity</span>
          <strong>{shiftName.trim() || 'Anaesthetic Team'}</strong>
          <small>{shiftTagline.trim() || 'Anaesthetic Night Team'}</small>
        </div>
        <span className="personalisationPreviewPill">Shared</span>
        <div className="personalisationPreviewMini"><span className="nightTeamIdentityContext"><span className="shiftIdentityMark" style={{ '--shift-identity-accent': accentColour(shiftAccent) } as CSSProperties}>{symbolGlyph(shiftSymbol)}</span><span className="shiftIdentityCopy"><strong>{shiftName.trim() || 'Anaesthetic Team'}</strong></span></span><small>Preview · Night, Changes, Breaks and Team Chat</small></div>
      </section>

      <section className="personalisationGroup">
        <div className="personalisationGroupHeading">
          <span>Our Shift</span>
          <h4>Name, picture & personality</h4>
          <p>Everyone on the roster sees the same identity across Night, Changes, Breaks and Team Chat.</p>
        </div>
        <div className="shiftPersonalisationPhotoRow">
          <button type="button" className="shiftPersonalisationPhoto" onClick={() => document.getElementById('shiftStudioPhotoInput')?.click()} style={{ '--identity-accent': accentColour(shiftAccent) } as CSSProperties}>
            <span id="shiftStudioPhotoPreviewWrap">
              {shift?.photoUrl ? <img id="shiftStudioPhotoPreview" src={shift.photoUrl} alt="Shift identity" /> : <b id="shiftStudioPhotoFallback">{symbolGlyph(shiftSymbol)}</b>}
            </span>
            <i aria-hidden="true">+</i>
          </button>
          <div>
            <b>Shift picture</b>
            <small>Private to authorised Night Roster users.</small>
            <div className="accountPhotoActions accountPhotoActionsPro">
              <button type="button" onClick={() => document.getElementById('shiftStudioPhotoInput')?.click()}>Choose picture</button>
              <button type="button" id="removeShiftPhotoBtn" className={shift?.photoUrl || shift?.pendingPhoto ? '' : 'hidden'} onClick={() => act('shift-photo-remove')}>{shift?.pendingPhoto ? 'Cancel picture' : 'Remove picture'}</button>
            </div>
          </div>
          <input id="shiftStudioPhotoInput" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => {
            const file = event.currentTarget.files?.[0];
            if (file) { setShiftDirty(true); act('shift-photo', file); }
            event.currentTarget.value = '';
          }} />
        </div>
        <div className="accountNameFields">
          <FieldShell label="Shift name">
            <input id="shiftStudioName" value={shiftName} maxLength={28} autoComplete="off" placeholder="For example, The Night Owls" onChange={event => { setShiftName(event.target.value); markShiftDirty(); }} className="accountProfileInput" />
          </FieldShell>
          <FieldShell label="Tagline" hint="Optional">
            <input id="shiftStudioTagline" value={shiftTagline} maxLength={56} autoComplete="off" placeholder="A short line for your team" onChange={event => { setShiftTagline(event.target.value); markShiftDirty(); }} className="accountProfileInput" />
          </FieldShell>
        </div>
      </section>

      <section className="personalisationGroup">
        <div className="personalisationGroupHeading compact">
          <span>Signature</span>
          <h4>Shift accent & symbol</h4>
          <p>These style only the shift identity surfaces, never clinical statuses.</p>
        </div>
        <div className="personalisationSwatches" role="group" aria-label="Shift accent colour">
          {accentChoices.map(item => <button key={item.value} type="button" className={shiftAccent === item.value ? 'active' : ''} aria-label={item.label} aria-pressed={shiftAccent === item.value} onClick={() => { setShiftAccent(item.value); markShiftDirty(); }}><i style={{ background: accentColour(item.value) }} /><span>{item.label}</span></button>)}
        </div>
        <input id="shiftStudioAccentKey" type="hidden" value={shiftAccent} readOnly />
        <div className="shiftSymbolPicker" role="group" aria-label="Shift symbol">
          {symbolChoices.map(item => <button key={item.value} type="button" className={shiftSymbol === item.value ? 'active' : ''} aria-label={item.label} aria-pressed={shiftSymbol === item.value} onClick={() => { setShiftSymbol(item.value); markShiftDirty(); }}><span>{item.glyph}</span><small>{item.label}</small></button>)}
        </div>
        <input id="shiftStudioSymbol" type="hidden" value={shiftSymbol} readOnly />
      </section>

      <div className="personalisationSafetyNote"><span aria-hidden="true">⚠</span><p><b>Team identity only.</b> Do not upload patient photographs or patient information.</p></div>
      {shift?.updatedBy && <p className="shiftPersonalisationMeta">Last changed by {shift.updatedBy}</p>}
      <div className="accountSaveRow accountSaveRowPro">
        <div id="shiftStudioMessage" className={'formMessage ' + (shift?.messageType || '')} role="status" aria-live="polite">{shift?.message || ''}</div>
        <button type="button" id="saveShiftPersonalisationBtn" onClick={() => act('shift-save')} className={'primary accountProfileSave ' + (shiftDirty || shift?.pendingPhoto ? '' : 'hidden')} disabled={!shift?.featureAvailable}>Save for everyone</button>
      </div>
    </>}
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
    { action: 'guide', title: 'Tutorial & app guide', detail: 'Replay the full tutorial or jump to any feature', icon: '✦' },
    { action: 'whatsnew', title: 'What’s new', detail: newRelease ? `New in version ${version || ''}` : 'See the latest Night Roster improvements', icon: '●', isNew: !!newRelease },
    !installed && { action: 'install', title: 'Install Night Roster', detail: 'Add Night Roster to this device', icon: '↓' },
    { action: 'share', title: 'Share Night Roster', detail: 'QR code, WhatsApp, Messages and more', icon: '↗' },
    { action: 'versions', title: 'Version history', detail: 'Browse every release without losing the current update', icon: '↺' }
  ].filter(Boolean) as { action: string; title: string; detail: string; icon: string; isNew?: boolean }[];
  return <GroupedList>{actions.map(item => <ListRow key={item.action} leading={<span className="accountActionIcon" aria-hidden="true">{item.icon}</span>} title={item.title} subtitle={item.detail} trailing={item.isNew ? <Badge tone="info">New</Badge> : undefined} onClick={() => act(item.action)} />)}</GroupedList>;
}

const SHARE_QR_TARGET = 'https://wiggli.github.io/Anaesthetic-roster/?welcome=1';
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
  const reduced = useProductReducedMotion();
  const qrMatches = model.shareUrl === SHARE_QR_TARGET;
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
      <div className="shareQrFrame">{qrMatches ? <ShareQr /> : <span className="shareQrUnavailable">Use Send or Copy link on this device.</span>}</div>
      <div className="shareQrSteps" aria-label="QR installation steps">
        <span><b>1</b>Open camera</span><span><b>2</b>Scan code</span><span><b>3</b>Tap the link</span>
      </div>
    </section>
    <div className="shareAppActions">
      <Pressable type="button" className="primary sharePrimaryAction" onClick={() => shareAct('native')}>
        <span aria-hidden="true">↗</span>{model.nativeShare ? 'Send Night Roster' : 'Copy app link'}
      </Pressable>
      <Pressable type="button" className="soft shareCopyAction" onClick={() => shareAct('copy')}>Copy link</Pressable>
      <Pressable type="button" className="shareInstallHelp" onClick={() => shareAct('install')}>Installation help <span aria-hidden="true">›</span></Pressable>
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
  if (model.profile) rootFor('profileExperience')?.render(<ProfileEditor model={model.profile} shift={model.shift} />);
  rootFor('appearanceExperience')?.render(<Appearance key={model.theme} initial={model.theme} />);
  rootFor('accountActionsExperience')?.render(<AccountActions installed={model.installed} newRelease={model.newRelease} version={model.version} />);
}

export function renderShareExperience(model: ShareExperience) {
  rootFor('shareAppExperience')?.render(<ShareApp model={model} />);
}

export function renderPasskeyExperience(model: PasskeyExperience) {
  rootFor('passkeyList')?.render(<Passkeys model={model} />);
}
