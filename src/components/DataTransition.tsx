"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { animate, stagger } from "animejs";

const intFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Escreve o valor (em centavos) num <Money> (spans data-int/data-dec) ou num <Brl> (texto). */
function paint(el: HTMLElement, cents: number) {
  const intEl = el.querySelector<HTMLElement>("[data-int]");
  const decEl = el.querySelector<HTMLElement>("[data-dec]");
  const abs = Math.abs(Math.round(cents));
  if (intEl && decEl) {
    intEl.textContent = intFmt.format(Math.floor(abs / 100));
    decEl.textContent = `,${String(abs % 100).padStart(2, "0")}`;
  } else {
    el.textContent = brlFmt.format(Math.round(cents) / 100);
  }
}

/**
 * Transição ao trocar de dados (mês, Mês/Geral, página): os cards entram em cascata
 * e os valores em R$ contam do zero até o valor novo. Usa anime.js; respeita "reduzir movimento".
 */
export function DataTransition() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const main = document.querySelector("main");
    if (!main) return;

    const cards = main.querySelectorAll<HTMLElement>("section");
    const cardAnim = cards.length
      ? animate(cards, {
          opacity: [0, 1],
          translateY: [14, 0],
          scale: [0.985, 1],
          duration: 520,
          delay: stagger(55),
          ease: "outCubic",
        })
      : null;

    // linhas das listas entram em cascata dentro de cada card (só as primeiras, o resto já aparece)
    const rows = [...cards].flatMap((c) => [...c.querySelectorAll<HTMLElement>("li")].slice(0, 10));
    const rowAnim = rows.length
      ? animate(rows, {
          opacity: [0, 1],
          translateY: [8, 0],
          duration: 420,
          delay: stagger(28, { start: 140 }),
          ease: "outCubic",
        })
      : null;

    // barras de progresso crescem da esquerda
    const bars = [...main.querySelectorAll<HTMLElement>("[data-bar]")];
    const barAnim = bars.length
      ? animate(bars, { scaleX: [0, 1], duration: 900, delay: stagger(40, { start: 200 }), ease: "outExpo" })
      : null;

    const money = [...main.querySelectorAll<HTMLElement>("[data-cents]")];
    const counters = money.map((el, i) => {
      const target = Number(el.dataset.cents);
      if (!Number.isFinite(target) || target === 0) return null;
      const state = { v: 0 };
      paint(el, 0);
      return animate(state, {
        v: target,
        duration: 900,
        delay: Math.min(i * 12, 400),
        ease: "outExpo",
        onUpdate: () => paint(el, state.v),
        onComplete: () => paint(el, target),
      });
    });

    return () => {
      cardAnim?.cancel();
      rowAnim?.cancel();
      barAnim?.cancel();
      [...rows, ...bars].forEach((el) => {
        el.style.opacity = "";
        el.style.transform = "";
      });
      counters.forEach((c) => c?.cancel());
      // garante o valor final se a animação for interrompida no meio
      money.forEach((el) => {
        const t = Number(el.dataset.cents);
        if (Number.isFinite(t)) paint(el, t);
      });
      cards.forEach((c) => {
        c.style.opacity = "";
        c.style.transform = "";
      });
    };
  }, [pathname, search]);

  return null;
}
