import type { HTMLAttributes, ReactNode } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';

type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'div' | 'article';
  children: ReactNode;
  className?: string;
};

export function ContentSurface({ as = 'section', children, className = '', ...props }: SurfaceProps) {
  const Tag = as;
  return <Tag className={`contentSurface ${className}`} {...props}>{children}</Tag>;
}

export function SectionHeader({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <div className="liquidSectionHeader">
    <div className="liquidSectionHeaderCopy">
      <h2>{title}</h2>
      {detail ? <p>{detail}</p> : null}
    </div>
    {action ? <div className="liquidSectionHeaderAction">{action}</div> : null}
  </div>;
}

export function Metric({ label, value, tone = 'neutral', onClick }: {
  label: string;
  value: ReactNode;
  tone?: 'neutral' | 'teal' | 'warning' | 'info' | 'critical';
  onClick?: () => void;
}) {
  const reduced = useReducedMotion();
  const inner = <>
    <strong>{value}</strong>
    <span>{label}</span>
  </>;
  if (!onClick) return <div className={`metric metric-${tone}`}>{inner}</div>;
  return <motion.button
    type="button"
    whileTap={reduced ? undefined : { scale: 0.975 }}
    className={`metric metric-${tone} metricInteractive`}
    onClick={onClick}
  >{inner}</motion.button>;
}

export function StatusBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'teal' | 'warning' | 'info' | 'critical' }) {
  return <span className={`statusBadge statusBadge-${tone}`}>{children}</span>;
}

export function GlassIconButton({ children, className = '', ...props }: HTMLMotionProps<'button'>) {
  const reduced = useReducedMotion();
  return <motion.button
    {...props}
    whileTap={reduced ? undefined : { scale: 0.94 }}
    className={`glassIconButton ${className}`}
  >{children}</motion.button>;
}
