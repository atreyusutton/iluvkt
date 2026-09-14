import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-border bg-surface p-5 shadow-sm", className)} {...props} />;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-display text-lg font-semibold">{children}</h2>
      {action}
    </div>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "rose";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110 shadow-sm",
  secondary: "border border-border bg-surface text-ink hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "border border-border bg-surface text-bad hover:bg-surface-2",
  rose: "bg-rose text-white hover:brightness-110 shadow-sm",
};

const sizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };

export function buttonClass(variant: Variant = "primary", size: keyof typeof sizes = "md") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50 select-none",
    variants[variant],
    sizes[size],
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button className={cn(buttonClass(variant, size), className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link className={cn(buttonClass(variant, size), className)} {...props} />;
}

export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-sm text-ink-3">{eyebrow}</div>}
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-2">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </header>
  );
}

const pillTones = {
  neutral: "bg-surface-2 text-ink-2",
  accent: "bg-accent-soft text-accent",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  rose: "bg-rose-soft text-rose",
};

export function Pill({ tone = "neutral", children, className }: { tone?: keyof typeof pillTones; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", pillTones[tone], className)}>
      {children}
    </span>
  );
}

export function ProgressRing({
  value,
  max,
  size = 140,
  stroke = 12,
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={fraction >= 1 ? "var(--good)" : "var(--accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function ProgressBar({ value, max, tone = "accent" }: { value: number; max: number; tone?: "accent" | "good" | "rose" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = { accent: "bg-accent", good: "bg-good", rose: "bg-rose" }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-ink-2">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-ink-3">{label}</div>
      <div className="mt-1 font-display text-3xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-sm text-ink-3">{hint}</div>}
    </div>
  );
}
