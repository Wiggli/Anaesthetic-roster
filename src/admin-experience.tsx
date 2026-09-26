import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { createRoot, type Root } from 'react-dom/client';
import { useMemo, useState } from 'react';

type AccessRequest = {
  userId: string;
  name: string;
  email: string;
  requested: string;
};

type Account = {
  email: string;
  name: string;
  role: string;
  active: boolean;
  current: boolean;
};

export type AdminAccountsExperience = {
  activeCount: number;
  inactiveCount: number;
  pending: AccessRequest[];
  accounts: Account[];
  online: boolean;
};

let root: Root | undefined;

function send(action: string, value?: string) {
  window.dispatchEvent(new CustomEvent('roster:admin-account-action', { detail: { action, value } }));
}

function Stat({ value, label, tone }: { value: number; label: string; tone: 'teal' | 'amber' | 'neutral' }) {
  const classes = tone === 'teal'
    ? 'tw:border-teal-400/30 tw:bg-teal-400/10'
    : tone === 'amber'
      ? 'tw:border-amber-400/35 tw:bg-amber-400/10'
      : 'tw:border-black/8 tw:bg-[var(--surface)] tw:dark:border-white/10';
  return <div className={`tw:rounded-2xl tw:border tw:p-3 ${classes}`}><strong className="tw:block tw:text-xl">{value}</strong><span className="tw:mt-0.5 tw:block tw:text-xs tw:font-semibold tw:text-[var(--muted)]">{label}</span></div>;
}

function PendingRequests({ requests, online }: { requests: AccessRequest[]; online: boolean }) {
  if (!requests.length) return null;
  return <section className="tw:grid tw:gap-2" aria-labelledby="pendingAccessHeading">
    <div className="tw:flex tw:items-center tw:justify-between tw:gap-3"><div><h3 id="pendingAccessHeading" className="tw:text-base tw:font-bold">Pending access</h3><p className="tw:mt-0.5 tw:text-xs tw:text-[var(--muted)]">Review people who signed in and requested roster access.</p></div><span className="tw:rounded-full tw:bg-amber-400/15 tw:px-2.5 tw:py-1 tw:text-xs tw:font-bold tw:text-amber-800 tw:dark:text-amber-200">{requests.length} waiting</span></div>
    <AnimatePresence initial={false}>{requests.map(request => <motion.article layout key={request.userId} className="tw:rounded-2xl tw:border tw:border-amber-400/30 tw:bg-amber-400/8 tw:p-3.5">
      <div className="tw:flex tw:items-start tw:gap-3">
        <span className="tw:grid tw:h-10 tw:w-10 tw:shrink-0 tw:place-items-center tw:rounded-full tw:bg-amber-400/18 tw:text-sm tw:font-extrabold">{request.name.trim().charAt(0).toUpperCase() || '?'}</span>
        <div className="tw:min-w-0 tw:flex-1"><strong className="tw:block tw:truncate tw:text-sm">{request.name}</strong><span className="tw:mt-0.5 tw:block tw:truncate tw:text-xs tw:text-[var(--muted)]">{request.email}</span><small className="tw:mt-1 tw:block tw:text-xs tw:text-[var(--muted)]">Requested {request.requested}</small></div>
      </div>
      <div className="tw:mt-3 tw:grid tw:grid-cols-2 tw:gap-2">
        <button type="button" disabled={!online} onClick={() => send('approve', request.userId)} className="tw:min-h-11 tw:rounded-xl tw:bg-teal-600 tw:px-3 tw:text-sm tw:font-bold tw:text-white tw:disabled:opacity-55">Approve</button>
        <button type="button" disabled={!online} onClick={() => { if (window.confirm(`Reject the access request from ${request.name}?`)) send('reject', request.userId); }} className="tw:min-h-11 tw:rounded-xl tw:bg-[var(--surface)] tw:px-3 tw:text-sm tw:font-bold tw:disabled:opacity-55">Reject</button>
      </div>
    </motion.article>)}</AnimatePresence>
  </section>;
}

function AccountList({ items, online }: { items: Account[]; online: boolean }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const reduced = useReducedMotion();
  const visible = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return items.filter(item => (filter === 'all' || (filter === 'active') === item.active) && (!search || item.name.toLocaleLowerCase().includes(search) || item.email.toLocaleLowerCase().includes(search)));
  }, [filter, items, query]);
  return <section className="tw:grid tw:gap-3" aria-labelledby="memberAccountsHeading">
    <div><h3 id="memberAccountsHeading" className="tw:text-base tw:font-bold">Roster members</h3><p className="tw:mt-0.5 tw:text-xs tw:text-[var(--muted)]">Search the authorised list or review inactive accounts.</p></div>
    <label className="tw:relative tw:block"><span className="tw:sr-only">Search authorised accounts</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name or email" className="tw:min-h-11 tw:w-full tw:rounded-xl tw:border tw:border-black/10 tw:bg-[var(--surface)] tw:px-3 tw:text-sm tw:dark:border-white/12" /></label>
    <div className="tw:grid tw:grid-cols-3 tw:gap-2" role="group" aria-label="Filter accounts">{(['all', 'active', 'inactive'] as const).map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`tw:min-h-10 tw:rounded-xl tw:px-2 tw:text-xs tw:font-bold tw:capitalize ${filter === value ? 'tw:bg-teal-600 tw:text-white' : 'tw:bg-[var(--surface)] tw:text-[var(--muted)]'}`}>{value}</button>)}</div>
    <div className="tw:grid tw:gap-2">
      <AnimatePresence initial={false} mode="popLayout">
        {visible.map((account, index) => <motion.article layout key={account.email} initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.16, delay: reduced ? 0 : Math.min(index * 0.015, 0.08) }} className="tw:flex tw:items-center tw:gap-3 tw:rounded-2xl tw:border tw:border-black/8 tw:bg-[var(--card)] tw:p-3.5 tw:dark:border-white/10">
          <span className={`tw:grid tw:h-10 tw:w-10 tw:shrink-0 tw:place-items-center tw:rounded-full tw:text-sm tw:font-extrabold ${account.active ? 'tw:bg-teal-500/14 tw:text-teal-700 tw:dark:text-teal-300' : 'tw:bg-[var(--surface)] tw:text-[var(--muted)]'}`}>{account.name.trim().charAt(0).toUpperCase() || '?'}</span>
          <span className="tw:min-w-0 tw:flex-1"><span className="tw:flex tw:flex-wrap tw:items-center tw:gap-1.5"><strong className="tw:truncate tw:text-sm">{account.name}</strong>{account.current && <em className="tw:rounded-full tw:bg-sky-500/12 tw:px-2 tw:py-0.5 tw:text-[0.62rem] tw:font-bold tw:not-italic tw:text-sky-700 tw:dark:text-sky-300">Current account</em>}</span><small className="tw:mt-0.5 tw:block tw:truncate tw:text-xs tw:text-[var(--muted)]">{account.email}</small><small className="tw:mt-1 tw:block tw:text-xs tw:font-semibold tw:text-[var(--muted)]">{account.role} · {account.active ? 'Active' : 'Inactive'}</small></span>
          <button type="button" disabled={account.current || !online} title={account.current ? 'Your administrator account cannot be disabled here' : undefined} onClick={() => { if (!account.active || window.confirm(`Deactivate ${account.name}? They will no longer be able to sign in.`)) send('toggle', account.email); }} className={`tw:min-h-10 tw:shrink-0 tw:rounded-full tw:px-3 tw:text-xs tw:font-bold tw:disabled:opacity-55 ${account.active ? 'tw:bg-rose-500/10 tw:text-rose-700 tw:dark:text-rose-200' : 'tw:bg-teal-500/12 tw:text-teal-700 tw:dark:text-teal-200'}`}>{account.active ? 'Deactivate' : 'Activate'}</button>
        </motion.article>)}
      </AnimatePresence>
      {!visible.length && <div className="tw:rounded-2xl tw:border tw:border-dashed tw:border-black/12 tw:bg-[var(--surface)] tw:p-5 tw:text-center tw:text-sm tw:text-[var(--muted)] tw:dark:border-white/14">No accounts match this search and filter.</div>}
    </div>
  </section>;
}

function AdminAccounts({ model }: { model: AdminAccountsExperience }) {
  return <div className="tw:grid tw:gap-5">
    <div className="tw:grid tw:grid-cols-3 tw:gap-2" aria-label="Account totals"><Stat value={model.activeCount} label="Active" tone="teal" /><Stat value={model.pending.length} label="Pending" tone={model.pending.length ? 'amber' : 'neutral'} /><Stat value={model.inactiveCount} label="Inactive" tone="neutral" /></div>
    {!model.online && <div className="tw:rounded-2xl tw:border tw:border-amber-400/35 tw:bg-amber-400/10 tw:p-3 tw:text-sm tw:font-semibold">Account changes are unavailable while this device is offline.</div>}
    <PendingRequests requests={model.pending} online={model.online} />
    <section className="tw:grid tw:gap-3 tw:rounded-2xl tw:bg-[var(--surface)] tw:p-4" aria-labelledby="addMemberHeading"><div><h3 id="addMemberHeading" className="tw:text-base tw:font-bold">Add a member directly</h3><p className="tw:mt-0.5 tw:text-xs tw:text-[var(--muted)]">Pre-authorise a work email before the nurse creates an account.</p></div><div className="tw:grid tw:gap-2 tw:sm:grid-cols-2"><label className="tw:grid tw:gap-1.5"><span className="tw:text-xs tw:font-bold tw:text-[var(--muted)]">Name</span><input id="accountName" autoComplete="off" autoCapitalize="words" placeholder="Nurse name" className="tw:min-h-11 tw:rounded-xl tw:border tw:border-black/10 tw:bg-[var(--card)] tw:px-3 tw:text-sm tw:dark:border-white/12" /></label><label className="tw:grid tw:gap-1.5"><span className="tw:text-xs tw:font-bold tw:text-[var(--muted)]">Government email</span><input id="accountEmail" type="email" inputMode="email" autoComplete="off" placeholder="name@gov.mt" className="tw:min-h-11 tw:rounded-xl tw:border tw:border-black/10 tw:bg-[var(--card)] tw:px-3 tw:text-sm tw:dark:border-white/12" /></label></div><button id="addAccountBtn" type="button" disabled={!model.online} onClick={() => send('add')} className="tw:min-h-11 tw:w-full tw:rounded-xl tw:bg-teal-600 tw:px-4 tw:text-sm tw:font-bold tw:text-white tw:disabled:opacity-55">Add member</button></section>
    <AccountList items={model.accounts} online={model.online} />
  </div>;
}

export function renderAdminAccountsExperience(model: AdminAccountsExperience) {
  const host = document.getElementById('adminAccountsExperience');
  if (!host) return;
  host.dataset.reactReady = 'true';
  if (!root) root = createRoot(host);
  root.render(<AdminAccounts model={model} />);
}
