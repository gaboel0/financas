import { formatBRL, splitMoney } from "@/lib/format";

const SIZES = {
  xs: { box: "text-sm", cur: "text-[0.8em]", dec: "text-[0.8em]" },
  sm: { box: "text-base font-semibold", cur: "text-[0.75em]", dec: "text-[0.8em]" },
  md: { box: "text-xl font-semibold", cur: "text-[0.65em]", dec: "text-[0.65em]" },
  lg: { box: "text-3xl font-semibold tracking-tight", cur: "text-[0.5em]", dec: "text-[0.55em] text-muted" },
  xl: { box: "text-[2.6rem] leading-none font-semibold tracking-tight", cur: "text-[0.45em]", dec: "text-[0.5em] text-muted" },
} as const;

/** Valor em BRL com "R$" cinza e centavos menores: R$ 5.304,28 */
export function Money({
  cents, size = "md", className = "", showSign = false,
}: {
  cents: number;
  size?: keyof typeof SIZES;
  className?: string;
  showSign?: boolean;
}) {
  const { neg, int, dec } = splitMoney(cents);
  const s = SIZES[size];
  return (
    <span data-cents={cents} className={`money inline-flex items-baseline whitespace-nowrap tabular-nums ${s.box} ${className}`}>
      {neg ? <span className="mr-0.5">-</span> : showSign && cents > 0 ? <span className="mr-0.5">+</span> : null}
      <span className={`mr-1 font-medium text-muted ${s.cur}`}>R$</span>
      <span data-int="">{int}</span>
      <span data-dec="" className={`${s.dec} opacity-70`}>,{dec}</span>
    </span>
  );
}

/** Valor em texto simples (R$ 1.234,56) que some no modo "esconder valores". */
export function Brl({ cents }: { cents: number }) {
  return <span data-cents={cents} className="money">{formatBRL(cents)}</span>;
}
