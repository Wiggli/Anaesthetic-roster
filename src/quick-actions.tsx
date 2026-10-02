import { motion, useReducedMotion } from 'motion/react';
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

function ActionRow({ action, icon, title, detail, disabled, badge }: {
  action: 'absence' | 'overtime' | 'review' | 'private-chat' | 'share';
  icon: 'absence' | 'overtime' | 'review' | 'chat' | 'share';
  title: string;
  detail: string;
  disabled?: boolean;
  badge?: number;
}) {
  return <Pressable
    type="button"
    className="quickActionRow"
    disabled={disabled}
    aria-label={title}
    onClick={() => act(action)}
  >
    <span className="quickActionIcon"><Icon kind={icon} /></span>
    <span className="quickActionCopy"><strong>{title}</strong><small>{detail}</small></span>
    {badge ? <Badge tone="warning" className="quickActionBadge">{badge}</Badge> : null}
    <span className="quickActionChevron" aria-hidden="true">›</span>
  </Pressable>;
}

function QuickActions({ model }: { model: QuickActionsModel }) {
  const reduced = useReducedMotion();
  const blocked = !model.canEdit;
  const editReason = model.editReason || 'Shared editing is temporarily unavailable.';
  const contextAria = model.contextLabel + ', ' + model.dateLabel + ', ' + model.staffingLabel;
  const attentionDetail = model.attentionCount + ' item' + (model.attentionCount === 1 ? '' : 's') + ' need attention';
  return <motion.div
    className="quickActionsExperience"
    initial={reduced ? false : { opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38, mass: 0.62 }}
  >
    <div className="quickActionsContext" aria-label={contextAria}>
      <span><b>{model.contextLabel}</b><strong>{model.dateLabel}</strong></span>
      <span><b>{model.staffingLabel}</b><small>{model.planLabel}</small></span>
    </div>

    <section className="quickActionGroup" aria-labelledby="quickStaffingHeading">
      <div className="quickActionGroupHeading">
        <span id="quickStaffingHeading">This night</span>
        {blocked ? <small>{editReason}</small> : <small>Changes stay linked across Night and Breaks.</small>}
      </div>
      <div className="quickActionList">
        <ActionRow action="absence" icon="absence" title="Report an absence" detail={blocked ? editReason : 'Record confirmed leave or sickness'} disabled={blocked} />
        <ActionRow action="overtime" icon="overtime" title="Add overtime cover" detail={blocked ? editReason : 'Add a nurse covering this selected night'} disabled={blocked} />
        <ActionRow action="review" icon="review" title={model.attentionCount ? 'Review changes needing attention' : 'Review this night’s changes'} detail={model.attentionCount ? attentionDetail : 'Open staffing, allocation and confirmation'} badge={model.attentionCount} />
      </div>
    </section>

    <section className="quickActionGroup quickActionGroupSecondary" aria-labelledby="quickCommunicationHeading">
      <div className="quickActionGroupHeading"><span id="quickCommunicationHeading">Communication</span></div>
      <div className="quickActionList">
        <ActionRow action="private-chat" icon="chat" title="New private message" detail="Message one roster colleague" />
        <ActionRow action="share" icon="share" title="Share Night Roster" detail="QR code, Messages, WhatsApp and more" />
      </div>
    </section>
    <p className="quickActionsPrivacy">Quick actions never share your account or roster data.</p>
  </motion.div>;
}

export function renderQuickActions(model: QuickActionsModel) {
  const host = document.getElementById('quickActionsExperience');
  if (!host) return;
  host.dataset.reactReady = 'true';
  if (!root) root = createRoot(host);
  root.render(<QuickActions model={model} />);
}
