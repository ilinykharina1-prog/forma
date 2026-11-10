"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { Headline, Reveal } from "@/components/ui/motion";
import { PROCESS, t } from "@/content/site";

export function Process() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-line]",
        { scaleX: 0, scaleY: 0 },
        { scaleX: 1, scaleY: 1, ease: "none", scrollTrigger: { trigger: root.current, start: "top 75%", end: "bottom 55%", scrub: 0.6 } },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="process" className="wrap section">
      <Headline className="display">{t("Путь от идеи до ключей.")}</Headline>
      <div ref={root} className="relative mt-16 lg:mt-24">
        {/* Вертикальная линия на мобильных, горизонтальная с 1024 px */}
        <div className="absolute top-0 bottom-0 left-[3px] w-px bg-line lg:top-[3px] lg:right-0 lg:bottom-auto lg:h-px lg:w-auto" />
        <div data-line className="absolute top-0 bottom-0 left-[3px] w-px origin-top bg-accent lg:top-[3px] lg:right-0 lg:bottom-auto lg:h-px lg:w-auto lg:origin-left" />
        <ol className="grid gap-12 lg:grid-cols-6 lg:gap-6">
          {PROCESS.map((step, i) => (
            <Reveal key={step} delay={i * 0.07}>
              <li className="relative pl-8 lg:pt-12 lg:pl-0">
                <span className="absolute top-2 left-0 size-[7px] bg-accent lg:top-0" />
                <span className="text-[clamp(2.5rem,4vw,4rem)] leading-none font-extralight tracking-tight">{i + 1}</span>
                <p className="mt-4 max-w-xs text-lg leading-snug lg:pr-4">{step}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
