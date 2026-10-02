export type RosterEventMap = {
  'roster:viewchange': { view: string };
  'roster:night': Record<string, unknown>;
  'roster:personal-night': Record<string, unknown>;
  'roster:breaks': Record<string, unknown>;
  'roster:recent-activity': Record<string, unknown>;
  'roster:changes': Record<string, unknown>;
  'roster:changes-workflow': Record<string, unknown>;
  'roster:changes-confirmation': Record<string, unknown>;
  'roster:changes-feedback': Record<string, unknown>;
  'roster:full-roster': { cards: unknown[] };
  'roster:account': Record<string, unknown>;
  'roster:share-app': Record<string, unknown>;
  'roster:passkeys': Record<string, unknown>;
  'roster:admin-accounts': Record<string, unknown>;
  'roster:chat-overview': Record<string, unknown>;
  'roster:chat-messages': Record<string, unknown>;
  'roster:chat-status': Record<string, unknown>;
  'roster:releasenotes': {
    entries: { version: string; date: string; title: string; changes: string[] }[];
    showHistory: boolean;
  };
  'roster:screeninfo': { items: [string, string][] };
};

export function onRosterEvent<K extends keyof RosterEventMap>(
  name: K,
  handler: (detail: RosterEventMap[K], event: CustomEvent<RosterEventMap[K]>) => void
) {
  const listener = (event: Event) => {
    const custom = event as CustomEvent<RosterEventMap[K]>;
    handler(custom.detail, custom);
  };
  window.addEventListener(name, listener as EventListener);
  return () => window.removeEventListener(name, listener as EventListener);
}
