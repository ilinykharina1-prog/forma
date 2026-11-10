"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button, Counter, EASE, Headline, Reveal, useCursorLabel } from "@/components/ui/motion";
import { PROJECTS, Project, t } from "@/content/site";

function Card({ project, className, ratio, sizes, onOpen }: { project: Project; className: string; ratio: string; sizes: string; onOpen: () => void }) {
  const { sx, sy, onMove } = useCursorLabel();
  const [hover, setHover] = useState(false);
  const frameRef = useRef<HTMLButtonElement>(null);
  const inView = useInView(frameRef, { once: true, margin: "-10% 0px" });
  return (
    <article className={className}>
      <button
        ref={frameRef}
        type="button"
        onClick={onOpen}
        onMouseMove={onMove}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label={`Смотреть проект: ${project.name}`}
        className={`group relative block w-full cursor-pointer overflow-hidden ${ratio}`}
      >
        <motion.div
          className="absolute inset-0"
          initial={{ clipPath: "inset(100% 0 0 0)" }}
          animate={{ clipPath: inView ? "inset(0% 0 0 0)" : "inset(100% 0 0 0)" }}
          transition={{ duration: 1.3, ease: EASE }}
        >
          <Image src={project.image} alt={`${project.name}, демонстрационный концепт`} fill sizes={sizes} className="object-cover transition-transform duration-[1.4s] ease-arch group-hover:scale-[1.04]" />
        </motion.div>
        <motion.span
          aria-hidden
          style={{ x: sx, y: sy }}
          animate={{ opacity: hover ? 1 : 0, scale: hover ? 1 : 0.8 }}
          className="pointer-events-none absolute top-0 left-0 hidden -translate-1/2 bg-white px-4 py-2 text-sm whitespace-nowrap text-ink [@media(pointer:fine)]:block"
        >
          Смотреть проект
        </motion.span>
      </button>
      <div className="mt-6 flex items-start justify-between gap-6">
        <div>
          <h3 className="text-[clamp(1.5rem,2.3vw,2.25rem)] leading-tight">{project.name}</h3>
          <p className="mt-2 max-w-lg text-muted">{project.text}</p>
          <button type="button" onClick={onOpen} className="group/link mt-4 inline-flex min-h-11 items-center gap-2 text-[15px] font-medium">
            <span className="link-line">Смотреть проект</span>
            <ArrowUpRight size={16} strokeWidth={1.5} className="transition-transform duration-500 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
          </button>
        </div>
        <dl className="shrink-0 text-right text-sm text-muted">
          <dd className="text-[28px] leading-none font-light text-ink">
            <Counter to={project.area} />
            &nbsp;м²
          </dd>
          <dt className="sr-only">Площадь</dt>
          <dd className="mt-2">{project.floors}</dd>
          <dd className="mt-1 hidden max-w-44 sm:block">{project.style}</dd>
        </dl>
      </div>
    </article>
  );
}

export function Projects() {
  const [active, setActive] = useState<Project | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!active) return;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  return (
    <section id="projects" className="wrap section">
      <div className="grid-12 items-end gap-y-6">
        <Headline className="display col-span-12 lg:col-span-9">{t("Архитектура, которая говорит сама за себя.")}</Headline>
        <Reveal className="col-span-12 lg:col-span-3">
          <p className="text-muted lg:text-right">{t("Демонстрационные концепты: показывают подход, а не реализованные объекты.")}</p>
        </Reveal>
      </div>
      <div className="grid-12 mt-16 gap-y-16 lg:mt-24">
        <Card project={PROJECTS[0]} onOpen={() => setActive(PROJECTS[0])} className="col-span-12" ratio="aspect-[4/3] md:aspect-[21/10]" sizes="100vw" />
        <Card project={PROJECTS[1]} onOpen={() => setActive(PROJECTS[1])} className="col-span-12 md:col-span-7" ratio="aspect-[4/3]" sizes="(min-width:768px) 58vw, 100vw" />
        <Card project={PROJECTS[2]} onOpen={() => setActive(PROJECTS[2])} className="col-span-12 md:col-span-5 md:mt-32" ratio="aspect-[4/3]" sizes="(min-width:768px) 42vw, 100vw" />
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={active.name}
            className="fixed inset-0 z-[70] overflow-y-auto bg-night text-white"
            initial={{ clipPath: "inset(100% 0 0 0)" }}
            animate={{ clipPath: "inset(0% 0 0 0)" }}
            exit={{ clipPath: "inset(100% 0 0 0)" }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <button ref={closeRef} onClick={() => setActive(null)} aria-label="Закрыть проект" className="fixed top-4 right-4 z-10 flex size-12 items-center justify-center bg-white text-ink transition-colors hover:bg-accent hover:text-white md:top-8 md:right-8">
              <X strokeWidth={1.25} />
            </button>
            <div className="relative h-[56svh] md:h-[72svh]">
              <Image src={active.image} alt={active.name} fill sizes="100vw" className="object-cover" />
            </div>
            <div className="wrap grid-12 gap-y-8 py-16">
              <div className="col-span-12 lg:col-span-7">
                <p className="eyebrow text-white/55">Проект {active.n} · Демонстрационный концепт</p>
                <h3 className="display mt-4">{active.name}</h3>
              </div>
              <div className="col-span-12 lg:col-span-4 lg:col-start-9">
                <p className="lead text-white/75">{active.more}</p>
                <p className="mt-6 text-white/55">
                  {active.area}&nbsp;м² · {active.floors} · {active.style}
                </p>
                <Button href="#contact" tone="light" className="mt-8 w-full" onClick={() => setActive(null)}>
                  Обсудить похожий дом
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
