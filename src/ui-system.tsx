import { productMotion, useProductReducedMotion } from './product-motion';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { LayoutGroup, motion, type HTMLMotionProps } from 'motion/react';

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export type UiTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export function Pressable({
  children,
  className = '',
  ...props
}: HTMLMotionProps<'button'> & { children: ReactNode }) {
  const reduced = useProductReducedMotion();
  return <motion.button
    {...props}
    whileTap={props.disabled || reduced ? undefined : { scale: 0.98 }}
    transition={productMotion.settle}
    className={cx('tw:touch-manipulation tw:select-none tw:outline-none tw:focus-visible:ring-2 tw:focus-visible:ring-blue-500/42 tw:focus-visible:ring-offset-2 tw:focus-visible:ring-offset-[var(--bg)]', className)}
  >{children}</motion.button>;
}

export function Surface({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div
    {...props}
    className={cx(
      'uiSurface tw:@container',
      className
    )}
  >{children}</div>;
}

export function GlassSurface({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return <div
    {...props}
    className={cx(
      'productGlassSurface',
      className
    )}
  >{children}</div>;
}

export function Metric({ label, value, tone = 'neutral', onClick }: {
  label: string;
  value: ReactNode;
  tone?: 'neutral' | 'teal' | 'warning' | 'info' | 'critical';
  onClick?: () => void;
}) {
  const inner = <>
    <strong>{value}</strong>
    <span>{label}</span>
  </>;
  if (!onClick) return <div className={`metric metric-${tone}`}>{inner}</div>;
  return <Pressable
    type="button"
    className={`metric metric-${tone} metricInteractive`}
    onClick={onClick}
  >{inner}</Pressable>;
}

export function Badge({ children, tone = 'neutral', className = '' }: {
  children: ReactNode;
  tone?: UiTone;
  className?: string;
}) {
  return <span className={cx('statusBadge', `statusBadge--${tone}`, className)}>{children}</span>;
}

export function Avatar({ initial, src, size = 'md', className = '' }: {
  initial: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'tw:h-9 tw:w-9 tw:text-xs',
    md: 'tw:h-11 tw:w-11 tw:text-sm',
    lg: 'tw:h-14 tw:w-14 tw:text-lg'
  };
  return <span className={cx(
    'tw:grid tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-full tw:bg-blue-500/12 tw:font-bold tw:text-[var(--accent-strong)] tw:ring-1 tw:ring-black/5 tw:dark:ring-white/10',
    sizes[size],
    className
  )}>
    {src ? <img src={src} alt="" className="tw:h-full tw:w-full tw:object-cover" /> : initial}
  </span>;
}

export function EmptyState({ title, detail, icon }: { title: string; detail?: string; icon?: ReactNode }) {
  return <div className="productEmptyState">
    <span className="productEmptyMark" aria-hidden="true">{icon || <svg viewBox="0 0 24 24"><path d="M8 12l3 3 5-6" /><circle cx="12" cy="12" r="9" /></svg>}</span>
    <span className="productEmptyCopy"><strong>{title}</strong>{detail && <small>{detail}</small>}</span>
  </div>;
}

export function GroupedList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Surface className={cx('tw:divide-y tw:divide-black/7 tw:dark:divide-white/8', className)}>{children}</Surface>;
}

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  className = '',
  ariaLabel
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  const content = <>
    {leading ? <span className="tw:shrink-0">{leading}</span> : null}
    <span className="tw:min-w-0 tw:flex-1">
      <strong className="tw:block tw:break-words tw:text-[0.96rem] tw:font-semibold tw:tracking-[-0.012em]">{title}</strong>
      {subtitle ? <small className="tw:mt-0.5 tw:block tw:text-[0.8rem] tw:leading-relaxed tw:text-[var(--muted)]">{subtitle}</small> : null}
    </span>
    {trailing ? <span className="tw:ml-auto tw:shrink-0">{trailing}</span> : null}
    {onClick ? <span className="tw:ml-1 tw:shrink-0 tw:text-xl tw:font-light tw:text-[var(--muted)]" aria-hidden="true">›</span> : null}
  </>;

  const common = 'tw:flex tw:min-h-[60px] tw:w-full tw:items-center tw:gap-3.5 tw:px-4 tw:py-3.5 tw:text-left';
  if (!onClick) return <div className={cx(common, className)}>{content}</div>;
  return <Pressable type="button" onClick={onClick} aria-label={ariaLabel} className={cx(common, 'tw:bg-transparent', className)}>{content}</Pressable>;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  compact = false
}: {
  value: T;
  options: Array<{ value: T; label: string; detail?: string; icon?: ReactNode }>;
  onChange: (value: T) => void;
  ariaLabel: string;
  compact?: boolean;
}) {
  const reduced = useProductReducedMotion();
  return <LayoutGroup id={ariaLabel}>
    <div
      role="group"
      aria-label={ariaLabel}
      className="tw:grid tw:grid-cols-[repeat(var(--segment-count),minmax(0,1fr))] tw:gap-1 tw:rounded-[15px] tw:border tw:border-black/[0.045] tw:bg-black/[0.035] tw:p-1 tw:dark:border-white/[0.07] tw:dark:bg-white/[0.055]"
      style={{ '--segment-count': options.length } as CSSProperties}
    >
      {options.map(option => {
        const selected = value === option.value;
        return <Pressable
          key={option.value}
          type="button"
          aria-pressed={selected}
          onClick={() => onChange(option.value)}
          className={cx(
            'tw:relative tw:isolate tw:min-w-0 tw:rounded-[14px] tw:bg-transparent tw:px-2 tw:text-center',
            compact ? 'tw:min-h-11 tw:py-2' : 'tw:min-h-13 tw:py-2.5',
            selected ? 'tw:text-[var(--text)]' : 'tw:text-[var(--muted)]'
          )}
        >
          {selected ? <motion.span
            layoutId="selection"
            transition={reduced ? { duration: 0 } : productMotion.selection}
            className="tw:absolute tw:inset-0 tw:-z-10 tw:rounded-[12px] tw:border tw:border-black/[0.045] tw:bg-[var(--card)] tw:shadow-[0_1px_2px_rgba(0,0,0,0.035)] tw:dark:border-white/[0.07]"
          /> : null}
          <span className="tw:flex tw:items-center tw:justify-center tw:gap-1.5">
            {option.icon}
            <strong className="tw:whitespace-normal tw:text-[0.8rem] tw:font-bold">{option.label}</strong>
          </span>
          {!compact && option.detail ? <small className="tw:mt-1 tw:block tw:whitespace-normal tw:text-[0.7rem] tw:leading-tight tw:opacity-75">{option.detail}</small> : null}
        </Pressable>;
      })}
    </div>
  </LayoutGroup>;
}

export function FieldShell({ label, hint, children, className = '' }: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return <label className={cx('tw:grid tw:min-w-0 tw:gap-1.5', className)}>
    <span className="tw:text-[0.8rem] tw:font-bold tw:text-[var(--muted)]">{label}</span>
    {children}
    {hint ? <small className="tw:text-[0.76rem] tw:leading-relaxed tw:text-[var(--muted)]">{hint}</small> : null}
  </label>;
}
