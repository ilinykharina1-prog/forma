"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { RefObject } from "react";
import { STAGES } from "@/content/site";
import { EASE } from "@/components/ui/motion";

const swap = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.3, ease: "easeIn" as const } },
};

export function HeroOverlay({
  stage,
  phase,
  barRef,
}: {
  stage: number;
  phase: "intro" | "stages" | "final";
  barRef: RefObject<HTMLDivElement | null>;
}) {
  const current = STAGES[stage];
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className={`hero-veil absolute inset-0 transition-opacity duration-700 ${phase === "intro" ? "opacity-0" : "opacity-100"}`} />
      <div className="wrap relative h-full">
        <div className="absolute inset-x-6 top-24 md:inset-x-12 md:top-[120px]">
          <AnimatePresence mode="wait">
            {phase === "intro" && (
              <motion.div key="intro" {...swap}>
                <p className="eyebrow">Архитектура • Проектирование • Строительство</p>
                <h1 className="mt-6 max-w-[11ch] text-[clamp(3rem,9.4vw,10rem)] leading-[0.96] font-extralight tracking-[-0.045em]">
                  ДОМ НАЧИНАЕТСЯ С&nbsp;ИДЕИ
                </h1>
              </motion.div>
            )}
            {phase === "stages" && (
              <motion.div key={current.n} {...swap} className="max-w-[calc(100%-48px)] md:max-w-md">
                <p className="text-[clamp(4rem,8vw,8rem)] leading-none font-extralight tracking-[-0.05em]">{current.n}</p>
                <h2 className="eyebrow mt-4 text-[13px]!">{current.title}</h2>
                <p className="mt-4 text-[17px] leading-[1.5] md:text-xl" style={{ color: "var(--hero-soft)" }}>
                  {current.text}
                </p>
              </motion.div>
            )}
            {phase === "final" && (
              <motion.div key="final" {...swap}>
                <p className="eyebrow">08 / Дом готов</p>
                <h2 className="mt-6 max-w-[10ch] text-[clamp(3rem,7.4vw,8rem)] leading-[0.98] font-extralight tracking-[-0.04em]">Создадим ваш дом?</h2>
                <a
                  href="#contact"
                  className="group pointer-events-auto mt-8 inline-flex min-h-14 items-center gap-8 bg-white px-6 text-[15px] font-medium text-ink transition-colors duration-500 hover:bg-accent hover:text-white"
                >
                  Обсудить проект
                  <ArrowUpRight size={18} strokeWidth={1.5} className="transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" />
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Вертикальный индикатор: восемь этапов на одной линии */}
        <div className="absolute top-1/2 right-6 flex -translate-y-1/2 items-stretch gap-3 md:right-12" aria-hidden>
          <div className="hidden flex-col justify-between text-right text-xs tabular-nums md:flex">
            {STAGES.map((s, i) => (
              <span key={s.n} className="block py-1 transition-opacity duration-500" style={{ opacity: i === stage ? 1 : 0.42 }}>
                {s.n}
              </span>
            ))}
          </div>
          <div className="relative h-48 w-px md:h-auto" style={{ background: "var(--hero-line)" }}>
            <div ref={barRef} className="absolute inset-0 origin-top" style={{ background: "var(--hero-fg)", transform: "scaleY(0)" }} />
          </div>
        </div>

        <AnimatePresence>
          {phase === "intro" && (
            <motion.p {...swap} className="absolute bottom-8 left-6 flex items-center gap-2 text-sm md:left-12">
              <ArrowDown size={16} strokeWidth={1.25} className="animate-bounce" />
              Листайте — дом построится на&nbsp;ваших глазах
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
