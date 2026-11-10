"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { EASE, Headline } from "@/components/ui/motion";
import { SERVICES, t } from "@/content/site";

export function Services() {
  const [active, setActive] = useState(0);
  return (
    <section id="services" className="border-t border-line">
      <div className="wrap section">
        <Headline className="display max-w-[16ch]">{t("Полный цикл создания вашего дома.")}</Headline>
        <div className="grid-12 mt-16 lg:mt-24">
          <ol className="col-span-12 border-t border-line lg:col-span-7">
            {SERVICES.map((s, i) => (
              <li key={s.title} className="border-b border-line" onMouseEnter={() => setActive(i)}>
                <button type="button" onClick={() => setActive(i)} onFocus={() => setActive(i)} aria-pressed={active === i} className="flex w-full cursor-default items-baseline gap-6 py-4 text-left md:py-6">
                  <span className="w-8 shrink-0 text-sm text-accent tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className={`text-[clamp(1.625rem,3.3vw,3.5rem)] leading-[1.1] font-light tracking-[-0.025em] transition-all duration-700 ease-arch ${active === i ? "translate-x-2 text-ink" : "text-muted"}`}>{t(s.title)}</span>
                </button>
                <AnimatePresence initial={false}>
                  {active === i && (
                    <motion.div className="overflow-hidden lg:hidden" initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.6, ease: EASE }}>
                      <div className="relative mb-6 aspect-video">
                        <Image src={s.image} alt="" fill sizes="100vw" className="object-cover" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ol>
          <div className="col-span-4 col-start-9 hidden lg:block">
            <div className="sticky top-24 aspect-[4/5] overflow-hidden bg-line">
              {SERVICES.map((s, i) => (
                <Image key={s.image} src={s.image} alt="" fill sizes="33vw" className={`object-cover transition-all duration-1000 ease-arch ${i === active ? "scale-100 opacity-100" : "scale-105 opacity-0"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
