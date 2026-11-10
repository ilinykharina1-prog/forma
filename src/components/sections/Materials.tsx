"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { EASE, Headline } from "@/components/ui/motion";
import { MATERIALS, t } from "@/content/site";

export function Materials() {
  const [active, setActive] = useState(0);
  const m = MATERIALS[active];
  return (
    <section id="materials" className="bg-white">
      <div className="wrap section">
        <Headline className="display lg:ml-[33.33%]">{t("Продумано до мельчайших деталей.")}</Headline>
        <div className="grid-12 mt-16 gap-y-8 lg:mt-24">
          <ul role="tablist" aria-label="Материалы" className="col-span-12 flex snap-x gap-6 overflow-x-auto pb-2 [scrollbar-width:none] lg:col-span-4 lg:block lg:overflow-visible">
            {MATERIALS.map((item, i) => (
              <li key={item.name} role="presentation" className="shrink-0 snap-start lg:border-b lg:border-line">
                <button
                  type="button"
                  role="tab"
                  aria-selected={active === i}
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  className={`min-h-11 py-2 text-left text-lg transition-colors duration-500 lg:w-full lg:py-4 lg:text-[22px] lg:leading-tight ${active === i ? "text-ink" : "text-muted hover:text-ink"}`}
                >
                  <span className={active === i ? "border-b border-ink pb-1 lg:border-0" : ""}>{t(item.name)}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="col-span-12 lg:col-span-8">
            <div className="grid gap-8 md:grid-cols-[3fr_2fr] md:gap-6">
              <div className="relative aspect-[4/3] overflow-hidden bg-line md:aspect-[4/5]">
                <AnimatePresence initial={false}>
                  <motion.div key={m.image} className="absolute inset-0" initial={{ clipPath: "inset(0 100% 0 0)" }} animate={{ clipPath: "inset(0 0% 0 0)" }} exit={{ opacity: 0.99 }} transition={{ duration: 0.9, ease: EASE }}>
                    <Image src={m.image} alt={m.name} fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
                  </motion.div>
                </AnimatePresence>
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={m.name} className="flex flex-col justify-end" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: EASE }} role="tabpanel">
                  <h3 className="text-[clamp(1.75rem,2.6vw,2.5rem)] leading-[1.1] tracking-tight">{t(m.name)}</h3>
                  <p className="mt-4 text-muted">{m.text}</p>
                  <ul className="mt-8 border-t border-line">
                    {m.pros.map((p) => (
                      <li key={p} className="border-b border-line py-4">
                        {t(p)}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
