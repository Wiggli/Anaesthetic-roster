const tracks = {
  bollywood: {
    notes: [64, 65, 68, 69, 68, 65, 64, 62, 64],
    spacing: 0.19,
    bright: true
  },
  night: {
    notes: [57, 64, 69, 71, 69],
    spacing: 0.28,
    bright: false
  }
};

type Track = keyof typeof tracks;
const setting = 'anaes_opening_tune';
const defaultTrack: Track = 'bollywood';

export function mountOpeningTune() {
  // Account pages are detached until their menu item is opened.
  const account = window as Window & { accountPresentationElement?: (id: string) => HTMLElement | null };
  const toggle = account.accountPresentationElement?.('openingTuneEnabled') as HTMLInputElement | null;
  const picker = account.accountPresentationElement?.('openingTuneTrack') as HTMLSelectElement | null;
  const preview = account.accountPresentationElement?.('openingTunePreview');
  const status = account.accountPresentationElement?.('openingTuneStatus');
  if (!toggle || !picker || !(preview instanceof HTMLButtonElement) || !status) return;

  const Audio = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  let context: AudioContext | undefined;
  let playing: GainNode | undefined;
  let enabled = false;
  let track: Track = defaultTrack;
  try {
    const saved = JSON.parse(localStorage.getItem(setting) || 'null');
    enabled = saved?.enabled === true;
    if (Object.hasOwn(tracks, saved?.track)) track = saved.track;
  } catch { /* The feature is optional if storage is unavailable. */ }

  toggle.checked = enabled;
  picker.value = track;
  toggle.disabled = !Audio;
  picker.disabled = !Audio;
  preview.disabled = !Audio;
  if (!Audio) status.textContent = 'Opening tunes are unavailable in this browser.';

  function save() {
    try { localStorage.setItem(setting, JSON.stringify({ enabled, track })); } catch {
      if (status) status.textContent = 'This browser could not remember your choice.';
    }
  }

  function stop() {
    playing?.disconnect();
    playing = undefined;
  }

  function play(audio: AudioContext, selected: Track) {
    stop();
    const song = tracks[selected];
    const output = audio.createGain();
    output.gain.value = 0.33;
    output.connect(audio.destination);
    playing = output;
    const start = audio.currentTime + 0.025;

    function note(at: number, frequency: number, length: number, volume: number, type: OscillatorType, endFrequency?: number) {
      const oscillator = audio.createOscillator();
      const envelope = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, at);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + length);
      envelope.gain.setValueAtTime(0.001, at);
      envelope.gain.linearRampToValueAtTime(volume, at + 0.016);
      envelope.gain.exponentialRampToValueAtTime(0.001, at + length);
      oscillator.connect(envelope).connect(output);
      oscillator.start(at);
      oscillator.stop(at + length);
    }

    song.notes.forEach((pitch, index) => {
      const at = start + song.spacing * index;
      const frequency = 440 * 2 ** ((pitch - 69) / 12);
      const final = index === song.notes.length - 1;
      note(at, frequency, final ? 0.44 : 0.22, 0.36, 'triangle');
      if (song.bright) {
        note(at, frequency * 2, 0.09, 0.09, 'sine');
        note(at, index % 2 ? 205 : 120, 0.11, 0.2, 'sine', index % 2 ? 124 : 61);
      }
    });
    window.setTimeout(() => {
      output.disconnect();
      if (playing === output) playing = undefined;
    }, 2400);
  }

  // A fresh iPhone launch can require an explicit gesture before Web Audio runs.
  const launch = document.getElementById('launchScreen');
  let launchPending = false;
  let launchHandled = false;
  let openingDeadline = 0;

  function cancelOpening() {
    launchPending = false;
    document.removeEventListener('click', firstTap, true);
  }

  async function startOpening() {
    if (!Audio || !launchPending || !enabled || Date.now() > openingDeadline ||
        document.visibilityState !== 'visible' || (navigator.userActivation && !navigator.userActivation.hasBeenActive)) return;
    try {
      context ||= new Audio();
      if (context.state !== 'running') await context.resume();
      if (context.state === 'running' && launchPending && enabled && Date.now() <= openingDeadline && document.visibilityState === 'visible') {
        cancelOpening();
        play(context, track);
      }
    } catch { /* Audio never delays or interrupts roster startup. */ }
  }

  function firstTap() { void startOpening(); }

  function onLaunchReady() {
    if (!launch?.classList.contains('ready') || launchHandled) return;
    launchHandled = true;
    observer.disconnect();
    if (!enabled || !Audio || document.visibilityState !== 'visible') return;
    launchPending = true;
    openingDeadline = Date.now() + 6000;
    document.addEventListener('click', firstTap, true);
    window.setTimeout(cancelOpening, 6000);
    void startOpening();
  }

  const observer = new MutationObserver(onLaunchReady);
  if (launch) observer.observe(launch, { attributes: true, attributeFilter: ['class'] });
  onLaunchReady();

  toggle.addEventListener('change', () => {
    enabled = toggle.checked;
    if (!enabled) { cancelOpening(); stop(); }
    save();
  });
  picker.addEventListener('change', () => {
    if (Object.hasOwn(tracks, picker.value)) track = picker.value as Track;
    save();
  });
  preview.addEventListener('click', async () => {
    if (!Audio) return;
    cancelOpening();
    status.textContent = '';
    try {
      context ||= new Audio();
      if (context.state !== 'running') await context.resume();
      if (context.state === 'running' && document.visibilityState === 'visible') play(context, track);
    } catch { status.textContent = 'The tune could not play. Tap Preview to try again.'; }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') { cancelOpening(); stop(); }
  });
}
