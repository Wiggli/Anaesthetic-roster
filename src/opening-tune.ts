import { localOpeningAudio } from './opening-audio-file';

const tracks = {
  bollywood: {
    notes: [64, 65, 68, 69, 68, 65, 64, 62, 64, 68, 69, 72, 71, 69, 68, 65, 64, 62, 64],
    spacing: 0.19,
    bright: true
  },
  night: {
    notes: [57, 64, 69, 71, 69],
    spacing: 0.28,
    bright: false
  }
};

type BuiltInTrack = keyof typeof tracks;
type Track = BuiltInTrack | 'file';
const fileLimit = 20 * 1024 * 1024;
const clipSeconds = 8;
const setting = 'anaes_opening_tune';
const defaultTrack: Track = 'bollywood';

export function mountOpeningTune() {
  // Account pages are detached until their menu item is opened.
  const account = window as Window & { accountPresentationElement?: (id: string) => HTMLElement | null };
  const toggle = account.accountPresentationElement?.('openingTuneEnabled') as HTMLInputElement | null;
  const picker = account.accountPresentationElement?.('openingTuneTrack') as HTMLSelectElement | null;
  const preview = account.accountPresentationElement?.('openingTunePreview') as HTMLButtonElement | null;
  const status = account.accountPresentationElement?.('openingTuneStatus');
  const fileInput = account.accountPresentationElement?.('openingTuneFile') as HTMLInputElement | null;
  const removeFile = account.accountPresentationElement?.('openingTuneRemove') as HTMLButtonElement | null;
  const fileLabel = account.accountPresentationElement?.('openingTuneFileName');
  const fileOption = picker?.querySelector<HTMLOptionElement>('option[value="file"]');
  if (!toggle || !picker || !(preview instanceof HTMLButtonElement) || !status) return;

  const Audio = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  let context: AudioContext | undefined;
  let playing: GainNode | undefined;
  let filePlayer: HTMLAudioElement | undefined;
  let fileUrl: string | undefined;
  let stopFileTimer: number | undefined;
  let enabled = true;
  let track: Track = defaultTrack;
  try {
    const saved = JSON.parse(localStorage.getItem(setting) || 'null');
    enabled = saved?.enabled !== false;
    if (saved?.track === 'file' || Object.hasOwn(tracks, saved?.track)) track = saved.track;
  } catch { /* The feature is optional if storage is unavailable. */ }

  toggle.checked = enabled;
  picker.value = track;
  toggle.disabled = !Audio && !fileInput;
  picker.disabled = !Audio && !fileInput;
  preview.disabled = !Audio;
  if (fileOption) fileOption.disabled = true;

  function setFile(file?: File) {
    stop();
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    fileUrl = file ? URL.createObjectURL(file) : undefined;
    if (fileOption) fileOption.disabled = !fileUrl;
    if (removeFile) removeFile.hidden = !fileUrl;
    if (fileLabel) fileLabel.textContent = file?.name ?? '';
    if (preview) preview.disabled = track === 'file' ? !fileUrl : !Audio;
  }
  const fileReady = fileInput ? localOpeningAudio().then(setFile).catch(() => {
    status.textContent = 'Saved audio files are unavailable in this browser.';
  }) : Promise.resolve();

  function save() {
    try { localStorage.setItem(setting, JSON.stringify({ enabled, track })); } catch {
      if (status) status.textContent = 'This browser could not remember your choice.';
    }
  }

  function stop() {
    playing?.disconnect();
    playing = undefined;
    window.clearTimeout?.(stopFileTimer);
    if (filePlayer) {
      filePlayer.pause();
      filePlayer = undefined;
    }
  }

  function play(audio: AudioContext, selected: BuiltInTrack) {
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
    }, (song.spacing * (song.notes.length - 1) + 0.55) * 1000);
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
    if (!launchPending || !enabled || Date.now() > openingDeadline ||
        document.visibilityState !== 'visible' || (navigator.userActivation && !navigator.userActivation.hasBeenActive)) return;
    try {
      if (track === 'file') {
        if (fileUrl && await playFile()) cancelOpening();
        return;
      }
      if (!Audio) return;
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
    if (!enabled || document.visibilityState !== 'visible') return;
    launchPending = true;
    openingDeadline = Date.now() + 6000;
    document.addEventListener('click', firstTap, true);
    window.setTimeout(cancelOpening, 6000);
    if (track === 'file') void fileReady.then(startOpening);
    else void startOpening();
  }

  const observer = new MutationObserver(onLaunchReady);
  if (launch) observer.observe(launch, { attributes: true, attributeFilter: ['class'] });
  onLaunchReady();

  toggle.addEventListener('change', () => {
    enabled = toggle.checked;
    if (!enabled) { cancelOpening(); stop(); }
    save();
  });
  function selectTrack(next: Track) {
    stop();
    track = next;
    picker!.value = next;
    preview!.disabled = next === 'file' ? !fileUrl : !Audio;
    save();
  }

  async function playFile() {
    if (!fileUrl || filePlayer) return false;
    stop();
    const player = new window.Audio(fileUrl);
    filePlayer = player;
    try {
      await player.play();
      if (player !== filePlayer) return false;
      stopFileTimer = window.setTimeout(stop, clipSeconds * 1000);
      player.addEventListener('ended', () => { if (player === filePlayer) stop(); }, { once: true });
      return true;
    } catch (error) {
      if (player === filePlayer) stop();
      throw error;
    }
  }

  picker.addEventListener('change', () => {
    if ((picker.value === 'file' && fileUrl) || Object.hasOwn(tracks, picker.value)) selectTrack(picker.value as Track);
  });
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    fileInput.value = '';
    if (!file.size || file.size > fileLimit || !/\.(mp3|m4a|aac|wav|ogg|opus|flac)$/i.test(file.name)) {
      status.textContent = 'Choose an audio file up to 20 MB, such as MP3 or M4A.';
      return;
    }
    fileInput.disabled = true;
    if (removeFile instanceof HTMLButtonElement) removeFile.disabled = true;
    try {
      await fileReady;
      await localOpeningAudio(file);
      setFile(file);
      selectTrack('file');
      status.textContent = 'Audio file saved on this device.';
    } catch { status.textContent = 'The audio file could not be saved.'; }
    finally {
      fileInput.disabled = false;
      if (removeFile instanceof HTMLButtonElement) removeFile.disabled = false;
    }
  });
  removeFile?.addEventListener('click', async () => {
    if (!(removeFile instanceof HTMLButtonElement)) return;
    removeFile.disabled = true;
    if (fileInput) fileInput.disabled = true;
    try {
      await localOpeningAudio(null);
      setFile();
      if (track === 'file') selectTrack(defaultTrack);
      status.textContent = 'Audio file removed.';
    } catch { status.textContent = 'The audio file could not be removed.'; }
    finally {
      removeFile.disabled = false;
      if (fileInput) fileInput.disabled = false;
    }
  });
  preview.addEventListener('click', async () => {
    cancelOpening();
    status.textContent = '';
    try {
      if (track === 'file') {
        stop();
        await playFile();
      } else if (Audio) {
        context ||= new Audio();
        if (context.state !== 'running') await context.resume();
        if (context.state === 'running' && document.visibilityState === 'visible') play(context, track);
      }
    } catch { status.textContent = 'The tune could not play. Try another audio file or track.'; }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') { cancelOpening(); stop(); }
  });
}
