import { useProductReducedMotion } from './product-motion';
import { motion } from 'motion/react';
import { createRoot, type Root } from 'react-dom/client';
import { Badge, Pressable } from './ui-system';

export type QuickActionsModel = {
  contextLabel: string;
  dateLabel: string;
  staffingLabel: string;
  planLabel: string;
  attentionCount: number;
  canEdit: boolean;
  editReason?: string;
};

let root: Root | undefined;

function act(action: 'absence' | 'overtime' | 'review' | 'private-chat' | 'share') {
  window.dispatchEvent(new CustomEvent('roster:quick-action', { detail: { action } }));
}

function Icon({ kind }: { kind: 'absence' | 'overtime' | 'review' | 'chat' | 'share' }) {
  if (kind === 'absence') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M4.5 18c.6-3 2.2-4.5 4.5-4.5 1.1 0 2 .3 2.8.8M15 14l5 5M20 14l-5 5"/></svg>;
  if (kind === 'overtime') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M4.5 18c.7-3 2.2-4.5 4.5-4.5S13 15 13.5 18M18 8v6M15 11h6"/></svg>;
  if (kind === 'review') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5z"/><path d="M8 9h8M8 13h5"/><path d="m14.5 16 1.5 1.5 3-3"/></svg>;
  if (kind === 'chat') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v11H9l-5 3v-14Z"/><path d="M12 8v6M9 11h6"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7.5 8.5 12 4l4.5 4.5"/><path d="M5 12v7h14v-7"/></svg>;
}

function PrimaryAction({ action, icon, title, detail, disabled }: {
  action: 'absence' | 'overtime';
  icon: 'absence' | 'overtime';
  title: string;
  detail: string;
  disabled?: boolean;
}) {
  return <Pressable
    type="button"
    className="quickPrimaryAction"
    disabled={disabled}
    aria-label={title}
    onClick={() => act(action)}
  >
    <span className="quickPrimaryIcon"><Icon kind={icon} /></span>
    <span className="quickPrimaryCopy"><strong>{title}</strong><small>{detail}</small></span>
  </Pressable>;
}

function CompactAction({ action, icon, title, detail }: {
  action: 'private-chat' | 'share';
  icon: 'chat' | 'share';
  title: string;
  detail: string;
}) {
  return <Pressable type="button" className="quickCompactAction" onClick={() => act(action)} aria-label={title}>
    <span className="quickCompactIcon"><Icon kind={icon} /></span>
    <span><strong>{title}</strong><small>{detail}</small></span>
  </Pressable>;
}

function QuickActions({ model }: { model: QuickActionsModel }) {
  const reduced = useProductReducedMotion();
  const blocked = !model.canEdit;
  const editReason = model.editReason || 'Shared editing is temporarily unavailable.';
  const contextAria = model.contextLabel + ', ' + model.dateLabel + ', ' + model.staffingLabel + ', ' + model.planLabel;
  const attentionDetail = model.attentionCount
    ? model.attentionCount + ' item' + (model.attentionCount === 1 ? '' : 's') + ' need attention'
    : 'Staffing, allocation and confirmation';

  return <motion.div
    className="quickActionsExperience quickActionsFocused"
    initial={reduced ? false : { opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={reduced ? { duration: 0 } : { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
  >
    <div className="quickActionsContextBar" aria-label={contextAria}>
      <span className="quickContextNight"><small>{model.contextLabel}</small><strong>{model.dateLabel}</strong></span>
      <span className="quickContextPlan"><b>{model.staffingLabel}</b><small>{model.planLabel}</small></span>
    </div>

    <section className="quickPrimaryGrid" aria-label="Staffing actions">
      <PrimaryAction
        action="absence"
        icon="absence"
        title="Report an absence"
        detail={blocked ? editReason : 'Leave or sickness'}
        disabled={blocked}
      />
      <PrimaryAction
        action="overtime"
        icon="overtime"
        title="Add overtime cover"
        detail={blocked ? editReason : 'Cover this night'}
        disabled={blocked}
      />
    </section>

    <Pressable type="button" className="quickReviewAction" onClick={() => act('review')}>
      <span className="quickReviewIcon"><Icon kind="review" /></span>
      <span className="quickReviewCopy">
        <small>{model.attentionCount ? 'Needs attention' : 'Tonight'}</small>
        <strong>{model.attentionCount ? 'Review changes' : 'Review this night'}</strong>
        <span>{attentionDetail}</span>
      </span>
      {model.attentionCount ? <Badge tone="warning" className="quickReviewBadge">{model.attentionCount}</Badge> : null}
      <span className="quickActionChevron" aria-hidden="true">›</span>
    </Pressable>

    <div className="quickCommunicationGrid" aria-label="Communication">
      <CompactAction action="private-chat" icon="chat" title="New private message" detail="One colleague" />
      <CompactAction action="share" icon="share" title="Share Night Roster" detail="QR or apps" />
    </div>

    <p className="quickActionsPrivacy">Account and roster data stay private.</p>
  </motion.div>;
}

export function renderQuickActions(model: QuickActionsModel) {
  const host = document.getElementById('quickActionsExperience');
  if (!host) return;
  host.dataset.reactReady = 'true';
  if (!root) root = createRoot(host);
  root.render(<QuickActions model={model} />);
}
