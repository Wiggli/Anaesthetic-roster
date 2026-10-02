export type RosterRevision = number & { readonly __brand: 'RosterRevision' };
export type SyncState = 'starting' | 'live' | 'stale' | 'reconnecting' | 'offline' | 'error' | 'access-lost';
export type NightSelectionState = 'automatic-next' | 'automatic-current' | 'manual';
export type RosterRoleKey = 'first1' | 'first2' | 'second1' | 'second2' | 'pager' | 'reliever' | 'seventh' | 'fullLW';

export type NightContext = {
  index: number;
  automaticDate: string | null;
  selectedDate: string | null;
  selectedIsAutomatic: boolean;
  isCurrent: boolean;
  calendarDate: string;
  operationalDate: string;
  phase: 'evening' | 'first' | 'second' | 'complete' | 'next' | 'selected';
  nowMs: number;
  selectionMode: 'automatic' | 'manual';
};

export type EffectiveNight = Partial<Record<RosterRoleKey, string>> & {
  date?: string;
  mode?: string;
};

export type StaffingAssignment = {
  id: string;
  nurse_name?: string;
  allocation_key?: RosterRoleKey | null;
};

export type StaffingPlan = {
  count: number;
  unresolved: RosterRoleKey[];
  validAssignments: StaffingAssignment[];
  requiresCoverageChoice?: boolean;
  requiresSeventhDecision?: boolean;
  coreComplete?: boolean;
};

export type NightPlan = {
  date: string;
  base: Record<string, unknown>;
  effective: EffectiveNight;
  staffing: StaffingPlan;
  provisional: boolean;
  labourOrder: Record<string, unknown> | null;
  labourPending: boolean;
  tasks: string[];
  revision: RosterRevision;
  confirmed: boolean;
};

export type MutationErrorCode =
  | 'ROSTER_REVISION_CONFLICT'
  | 'PLAN_INCOMPLETE'
  | 'STAFF_NOT_EFFECTIVE'
  | 'SCHEMA_TOO_OLD'
  | 'PERMISSION_DENIED'
  | 'OPERATION_REPLAYED'
  | 'STALE_CLIENT'
  | 'INVALID_ROSTER_DATE'
  | 'INVALID_ROTATION'
  | 'INVALID_SEVENTH_CYCLE'
  | 'ROTATION_VERSION_EXISTS'
  | 'PUBLISH_REGRESSION'
  | 'UNKNOWN';

export type MutationResult<T = unknown> = {
  data: T | null;
  error: { code?: string; message?: string } | null;
  recovered?: boolean;
  conflictChanges?: Array<{ label: string; before: unknown; after: unknown }>;
};

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
