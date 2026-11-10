"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { Button, Headline, Reveal } from "@/components/ui/motion";
import { t } from "@/content/site";

export function FinalCta() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-parallax]", { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true } });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative flex min-h-svh items-end overflow-hidden bg-night text-white">
      <div data-parallax className="absolute -inset-y-[8%] inset-x-0">
        <Image src="/assets/images/final-house.webp" alt="Готовый дом FORMA на закате" fill sizes="100vw" className="object-cover" />
      </div>
      <div className="absolute inset-0 bg-night/70" />
      <div className="wrap relative z-10 grid-12 gap-y-8 py-24">
        <Headline className="display col-span-12 lg:col-span-9">{t("Ваш будущий дом начинается с одного разговора.")}</Headline>
        <Reveal className="col-span-12 lg:col-span-5" delay={0.1}>
          <p className="lead text-white/85">{t("Расскажите о своей идее. Мы поможем превратить её в архитектурный проект и продуманный план строительства.")}</p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Button href="#contact" tone="light">
              Обсудить мой проект
            </Button>
            <a href="#projects" className="link-line inline-flex min-h-14 items-center self-start px-0 text-[15px] sm:px-6">
              Посмотреть проекты
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
