import { useProductReducedMotion } from './product-motion';
import { AnimatePresence, motion } from 'motion/react';
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
  busy?: boolean;
  message?: string;
  error?: boolean;
};

let root: Root | undefined;

function send(action: string, value?: string, role?: string) {
  window.dispatchEvent(new CustomEvent('roster:admin-account-action', { detail: { action, value, role } }));
}

function Stat({ value, label, tone }: { value: number; label: string; tone: 'teal' | 'amber' | 'neutral' }) {
  const classes = tone === 'teal'
    ? 'tw:border-blue-400/30 tw:bg-blue-400/10'
    : tone === 'amber'
      ? 'tw:border-amber-400/35 tw:bg-amber-400/10'
      : 'tw:border-black/8 tw:bg-[var(--surface)] tw:dark:border-white/10';
  return <div className={`tw:rounded-[14px] tw:border tw:p-3 ${classes}`}><strong className="tw:block tw:text-xl tw:tracking-[-0.03em]">{value}</strong><span className="tw:mt-0.5 tw:block tw:text-[0.7rem] tw:font-semibold tw:text-[var(--muted)]">{label}</span></div>;
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
        <button type="button" disabled={!online} onClick={() => send('approve', request.userId)} className="tw:min-h-11 tw:rounded-xl tw:bg-blue-600 tw:px-3 tw:text-sm tw:font-bold tw:text-white tw:disabled:opacity-55">Approve</button>
        <button type="button" disabled={!online} onClick={() => { if (window.confirm(`Reject the access request from ${request.name}?`)) send('reject', request.userId); }} className="tw:min-h-11 tw:rounded-xl tw:bg-[var(--surface)] tw:px-3 tw:text-sm tw:font-bold tw:disabled:opacity-55">Reject</button>
      </div>
    </motion.article>)}</AnimatePresence>
  </section>;
}

function AccountControls({ account, online }: { account: Account; online: boolean }) {
  const [open, setOpen] = useState(false);
  return <div className="adminAccountControls">
    <button type="button" className="mini soft" disabled={account.current || !online} aria-expanded={open} onClick={() => setOpen(!open)}>{account.current ? 'Your account' : open ? 'Close' : 'Manage'}</button>
    {open && <div className="adminAccountEditor">
      <label><span>Access level</span><select aria-label={`Access level for ${account.name}`} value={account.role} disabled={!online} onChange={event => {
        const role = event.target.value;
        if (window.confirm(`Give ${account.name} ${role === 'admin' ? 'administrator' : 'member'} access for ${account.email}?${role === 'admin' ? ' Administrators can manage accounts and the roster.' : ''}`)) send('role', account.email, role);
      }}><option value="member">Member</option><option value="admin">Administrator</option></select></label>
      <button type="button" disabled={!online} className={account.active ? 'mini danger' : 'mini primary'} onClick={() => {
        if (!account.active || window.confirm(`Deactivate app access for ${account.name} (${account.email})? They will lose app access. Historical rosters and the permanent rotation stay unchanged.`)) send('toggle', account.email);
      }}>{account.active ? 'Deactivate' : 'Reactivate'}</button>
    </div>}
  </div>;
}

function AccountList({ items, online }: { items: Account[]; online: boolean }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const reduced = useProductReducedMotion();
  const visible = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return items.filter(item => (filter === 'all' || (filter === 'active') === item.active) && (!search || item.name.toLocaleLowerCase().includes(search) || item.email.toLocaleLowerCase().includes(search)));
  }, [filter, items, query]);
  return <section className="tw:grid tw:gap-3" aria-labelledby="memberAccountsHeading">
    <div><h3 id="memberAccountsHeading" className="tw:text-base tw:font-bold">App access</h3><p className="tw:mt-0.5 tw:text-xs tw:text-[var(--muted)]">Manage sign-in permissions without changing the roster rotation.</p></div>
    <label className="tw:relative tw:block"><span className="tw:sr-only">Search authorised accounts</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name or email" className="tw:min-h-11 tw:w-full tw:rounded-xl tw:border tw:border-black/10 tw:bg-[var(--surface)] tw:px-3 tw:text-sm tw:dark:border-white/12" /></label>
    <div className="tw:grid tw:grid-cols-3 tw:gap-2" role="group" aria-label="Filter accounts">{(['all', 'active', 'inactive'] as const).map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`tw:min-h-10 tw:rounded-xl tw:px-2 tw:text-xs tw:font-bold tw:capitalize ${filter === value ? 'tw:bg-blue-600 tw:text-white' : 'tw:bg-[var(--surface)] tw:text-[var(--muted)]'}`}>{value}</button>)}</div>
    <div className="tw:grid tw:gap-2">
      <AnimatePresence initial={false} mode="popLayout">
        {visible.map((account, index) => <motion.article layout key={account.email} initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.16, delay: reduced ? 0 : Math.min(index * 0.015, 0.08) }} className="adminAccountRow tw:flex tw:items-center tw:gap-3 tw:rounded-[16px] tw:border tw:border-black/[0.06] tw:bg-[var(--card)] tw:p-3 tw:dark:border-white/[0.08]">
          <span className={`tw:grid tw:h-10 tw:w-10 tw:shrink-0 tw:place-items-center tw:rounded-full tw:text-sm tw:font-extrabold ${account.active ? 'tw:bg-blue-500/14 tw:text-blue-700 tw:dark:text-blue-300' : 'tw:bg-[var(--surface)] tw:text-[var(--muted)]'}`}>{account.name.trim().charAt(0).toUpperCase() || '?'}</span>
          <span className="tw:min-w-0 tw:flex-1"><span className="tw:flex tw:flex-wrap tw:items-center tw:gap-1.5"><strong className="tw:truncate tw:text-sm">{account.name}</strong>{account.current && <em className="tw:rounded-full tw:bg-sky-500/12 tw:px-2 tw:py-0.5 tw:text-[0.62rem] tw:font-bold tw:not-italic tw:text-sky-700 tw:dark:text-sky-300">Current account</em>}</span><small className="tw:mt-0.5 tw:block tw:truncate tw:text-xs tw:text-[var(--muted)]">{account.email}</small><small className="tw:mt-1 tw:block tw:text-xs tw:font-semibold tw:text-[var(--muted)]">{account.role === 'admin' ? 'Administrator' : 'Member'} · {account.active ? 'Active' : 'Inactive'}</small></span>
          <AccountControls account={account} online={online} />
        </motion.article>)}
      </AnimatePresence>
      {!visible.length && <div className="tw:rounded-2xl tw:border tw:border-dashed tw:border-black/12 tw:bg-[var(--surface)] tw:p-5 tw:text-center tw:text-sm tw:text-[var(--muted)] tw:dark:border-white/14">No accounts match this search and filter.</div>}
    </div>
  </section>;
}

function AdminAccounts({ model }: { model: AdminAccountsExperience }) {
  const available = model.online && !model.busy;
  const current = model.accounts.find(account => account.current);
  return <div className="tw:grid tw:gap-5" aria-busy={!!model.busy}>
    {current && <div className="adminAccessIdentity"><strong>Signed in as {current.name}</strong><span>{current.email}</span><small>{current.role === 'admin' ? 'Administrator' : 'Member'}</small></div>}
    <p className={'formMessage ' + (model.error ? 'error' : '')} role={model.error ? 'alert' : 'status'} aria-live="polite">{model.message || 'Each sign-in email has its own access level. Google uses the email you choose.'}</p>
    <div className="tw:grid tw:grid-cols-3 tw:gap-2" aria-label="Account totals"><Stat value={model.activeCount} label="Active" tone="teal" /><Stat value={model.pending.length} label="Pending" tone={model.pending.length ? 'amber' : 'neutral'} /><Stat value={model.inactiveCount} label="Inactive" tone="neutral" /></div>
    {!model.online && <div className="tw:rounded-2xl tw:border tw:border-amber-400/35 tw:bg-amber-400/10 tw:p-3 tw:text-sm tw:font-semibold">Account changes are unavailable while this device is offline.</div>}
    <PendingRequests requests={model.pending} online={available} />
    <details className="adminAddAccount"><summary>Add an account</summary><section className="tw:grid tw:gap-3 tw:rounded-2xl tw:bg-[var(--surface)] tw:p-4" aria-labelledby="addMemberHeading"><div><h3 id="addMemberHeading" className="tw:text-base tw:font-bold">Add a member directly</h3><p className="tw:mt-0.5 tw:text-xs tw:text-[var(--muted)]">Approve the exact email used for password or Google sign-in. Existing accounts are managed below.</p></div><div className="tw:grid tw:gap-2 tw:sm:grid-cols-2"><label className="tw:grid tw:gap-1.5"><span className="tw:text-xs tw:font-bold tw:text-[var(--muted)]">Name</span><input id="accountName" autoComplete="off" autoCapitalize="words" placeholder="Nurse name" className="tw:min-h-11 tw:rounded-xl tw:border tw:border-black/10 tw:bg-[var(--card)] tw:px-3 tw:text-sm tw:dark:border-white/12" /></label><label className="tw:grid tw:gap-1.5"><span className="tw:text-xs tw:font-bold tw:text-[var(--muted)]">Sign-in email</span><input id="accountEmail" type="email" inputMode="email" autoComplete="off" placeholder="Email used to sign in" className="tw:min-h-11 tw:rounded-xl tw:border tw:border-black/10 tw:bg-[var(--card)] tw:px-3 tw:text-sm tw:dark:border-white/12" /></label></div><button id="addAccountBtn" type="button" disabled={!available} onClick={() => send('add')} className="tw:min-h-11 tw:w-full tw:rounded-xl tw:bg-blue-600 tw:px-4 tw:text-sm tw:font-bold tw:text-white tw:disabled:opacity-55">Add member</button></section></details>
    <AccountList items={model.accounts} online={available} />
  </div>;
}

export function renderAdminAccountsExperience(model: AdminAccountsExperience) {
  const host = document.getElementById('adminAccountsExperience');
  if (!host) return;
  host.dataset.reactReady = 'true';
  if (!root) root = createRoot(host);
  root.render(<AdminAccounts model={model} />);
}
