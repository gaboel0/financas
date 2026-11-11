import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Tile, type Tone } from "./Tile";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`card-shadow rounded-2xl bg-card p-6 ${className}`}>{children}</section>
  );
}

export function CardHeader({
  icon, tone, title, subtitle, right,
}: {
  icon: LucideIcon | string;
  tone: Tone;
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <Tile icon={icon} tone={tone} />
        <div>
          <h2 className="text-[15px] font-semibold leading-tight">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {right}
    </header>
  );
}

export function Pill({
  children, tone = "slate",
}: {
  children: ReactNode;
  tone?: "green" | "rose" | "amber" | "blue" | "slate";
}) {
  const t = {
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    slate: "bg-neutral-100 text-neutral-600 dark:bg-neutral-500/15 dark:text-neutral-300",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${t}`}>{children}</span>;
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-soft px-4 py-8 text-center text-sm text-muted">{children}</div>
  );
}

export function Progress({ value, tone = "primary", marker }: { value: number; tone?: "primary" | "green" | "amber" | "rose"; marker?: number }) {
  const bg = { primary: "bg-primary", green: "bg-emerald-500", amber: "bg-amber-400", rose: "bg-rose-500" }[tone];
  return (
    <div className="relative h-2.5 w-full rounded-full bg-soft">
      <div data-bar="" className={`h-full origin-left rounded-full ${bg}`} style={{ width: `${Math.min(Math.max(value, 0), 1) * 100}%` }} />
      {marker !== undefined ? (
        <span
          className="absolute -top-1 h-4.5 w-0.5 rounded bg-ink/70"
          style={{ left: `${Math.min(Math.max(marker, 0), 1) * 100}%` }}
        />
      ) : null}
    </div>
  );
}
