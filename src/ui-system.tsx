import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { LayoutGroup, motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

const toneClasses = {
  neutral: 'tw:bg-black/5 tw:text-[var(--muted)] tw:dark:bg-white/8',
  accent: 'tw:bg-teal-500/12 tw:text-[var(--accent-strong)]',
  success: 'tw:bg-emerald-500/12 tw:text-emerald-700 tw:dark:text-emerald-300',
  warning: 'tw:bg-amber-500/14 tw:text-amber-700 tw:dark:text-amber-300',
  danger: 'tw:bg-rose-500/12 tw:text-rose-700 tw:dark:text-rose-300',
  info: 'tw:bg-sky-500/12 tw:text-sky-700 tw:dark:text-sky-300'
} as const;

type UiTone = keyof typeof toneClasses;

export function Pressable({
  children,
  className = '',
  ...props
}: HTMLMotionProps<'button'> & { children: ReactNode }) {
  const reduced = useReducedMotion();
  return <motion.button
    {...props}
    whileTap={props.disabled || reduced ? undefined : { scale: 0.975 }}
    transition={{ type: 'spring', stiffness: 540, damping: 38, mass: 0.45 }}
    className={cx('tw:touch-manipulation tw:select-none tw:outline-none tw:focus-visible:ring-2 tw:focus-visible:ring-teal-500/45 tw:focus-visible:ring-offset-2 tw:focus-visible:ring-offset-[var(--bg)]', className)}
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
      'tw:@container tw:overflow-hidden tw:rounded-[22px] tw:border tw:border-black/8 tw:bg-[var(--card)] tw:shadow-[0_10px_28px_rgba(12,22,30,0.06)] tw:dark:border-white/10',
      className
    )}
  >{children}</div>;
}

export function GlassSurface({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div
    {...props}
    className={cx(
      'tw:rounded-[22px] tw:border tw:border-white/18 tw:bg-white/55 tw:shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_12px_32px_rgba(0,0,0,0.10)] tw:backdrop-blur-2xl tw:backdrop-saturate-150 tw:dark:border-white/10 tw:dark:bg-[#121216]/60',
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
  return <span className={cx(
    'tw:inline-flex tw:min-h-6 tw:items-center tw:justify-center tw:rounded-full tw:px-2.5 tw:py-1 tw:text-[0.68rem] tw:font-bold tw:leading-none',
    toneClasses[tone],
    className
  )}>{children}</span>;
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
    'tw:grid tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-full tw:bg-teal-500/12 tw:font-bold tw:text-[var(--accent-strong)] tw:ring-1 tw:ring-black/5 tw:dark:ring-white/10',
    sizes[size],
    className
  )}>
    {src ? <img src={src} alt="" className="tw:h-full tw:w-full tw:object-cover" /> : initial}
  </span>;
}

export function EmptyState({ title, detail, icon }: { title: string; detail?: string; icon?: ReactNode }) {
  return <div className="tw:grid tw:min-h-36 tw:place-items-center tw:px-5 tw:py-8 tw:text-center">
    <div className="tw:max-w-64">
      {icon ? <div className="tw:mx-auto tw:mb-3 tw:grid tw:h-11 tw:w-11 tw:place-items-center tw:rounded-2xl tw:bg-black/5 tw:text-[var(--muted)] tw:dark:bg-white/8">{icon}</div> : null}
      <strong className="tw:block tw:text-sm tw:font-bold">{title}</strong>
      {detail ? <span className="tw:mt-1 tw:block tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">{detail}</span> : null}
    </div>
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
      <strong className="tw:block tw:truncate tw:text-[0.92rem] tw:font-semibold tw:tracking-[-0.012em]">{title}</strong>
      {subtitle ? <small className="tw:mt-0.5 tw:block tw:text-xs tw:leading-relaxed tw:text-[var(--muted)]">{subtitle}</small> : null}
    </span>
    {trailing ? <span className="tw:ml-auto tw:shrink-0">{trailing}</span> : null}
    {onClick ? <span className="tw:ml-1 tw:shrink-0 tw:text-xl tw:font-light tw:text-[var(--muted)]" aria-hidden="true">›</span> : null}
  </>;

  const common = 'tw:flex tw:min-h-14 tw:w-full tw:items-center tw:gap-3 tw:px-3.5 tw:py-3 tw:text-left';
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
  const reduced = useReducedMotion();
  return <LayoutGroup id={ariaLabel}>
    <div
      role="group"
      aria-label={ariaLabel}
      className="tw:grid tw:grid-cols-[repeat(var(--segment-count),minmax(0,1fr))] tw:gap-1 tw:rounded-[18px] tw:border tw:border-black/8 tw:bg-black/[0.035] tw:p-1 tw:dark:border-white/9 tw:dark:bg-white/[0.045]"
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
            compact ? 'tw:min-h-10 tw:py-2' : 'tw:min-h-13 tw:py-2.5',
            selected ? 'tw:text-[var(--text)]' : 'tw:text-[var(--muted)]'
          )}
        >
          {selected ? <motion.span
            layoutId="selection"
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 42, mass: 0.55 }}
            className="tw:absolute tw:inset-0 tw:-z-10 tw:rounded-[14px] tw:border tw:border-black/7 tw:bg-[var(--card)] tw:shadow-[0_4px_12px_rgba(0,0,0,0.07)] tw:dark:border-white/10"
          /> : null}
          <span className="tw:flex tw:items-center tw:justify-center tw:gap-1.5">
            {option.icon}
            <strong className="tw:truncate tw:text-xs tw:font-bold">{option.label}</strong>
          </span>
          {!compact && option.detail ? <small className="tw:mt-1 tw:block tw:truncate tw:text-[0.62rem] tw:leading-tight tw:opacity-75">{option.detail}</small> : null}
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
    <span className="tw:text-xs tw:font-bold tw:text-[var(--muted)]">{label}</span>
    {children}
    {hint ? <small className="tw:text-[0.7rem] tw:leading-relaxed tw:text-[var(--muted)]">{hint}</small> : null}
  </label>;
}
