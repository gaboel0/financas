import type { LucideIcon } from "lucide-react";
import { iconFor } from "./icons";

export type Tone = "blue" | "rose" | "green" | "amber" | "violet" | "slate" | "orange" | "sky";

const TONES: Record<Tone, string> = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  slate: "bg-neutral-100 text-neutral-600 dark:bg-neutral-500/15 dark:text-neutral-300",
  orange: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
};

/** Ícone lucide dentro de um bloco colorido arredondado. */
export function Tile({
  icon, tone = "blue", size = "md",
}: {
  icon: LucideIcon | string | null | undefined;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = typeof icon === "function" || (typeof icon === "object" && icon) ? (icon as LucideIcon) : iconFor(icon as string | null);
  const box = size === "sm" ? "size-8 rounded-lg" : size === "lg" ? "size-12 rounded-2xl" : "size-10 rounded-xl";
  const ic = size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${box} ${TONES[tone]}`}>
      <Icon className={ic} strokeWidth={2} />
    </span>
  );
}
