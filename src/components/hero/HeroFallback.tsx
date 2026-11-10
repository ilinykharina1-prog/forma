import Image from "next/image";
import { STAGES } from "@/content/site";

/** Статичная версия для устройств без WebGL и режима уменьшения движения. */
export function HeroFallback() {
  return (
    <section id="top" className="wrap pt-[120px] pb-24">
      <p className="eyebrow">Архитектура • Проектирование • Строительство</p>
      <h1 className="mt-6 text-[clamp(3rem,9vw,9rem)] leading-[0.98] font-extralight tracking-[-0.045em]">ДОМ НАЧИНАЕТСЯ С&nbsp;ИДЕИ</h1>
      <ol className="mt-16 grid gap-x-6 gap-y-16 md:grid-cols-2">
        {STAGES.map((s) => (
          <li key={s.n}>
            <div className="relative aspect-video overflow-hidden bg-line">
              <Image src={s.image} alt={`Этап ${s.n}: ${s.title}`} fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover" />
            </div>
            <h2 className="eyebrow mt-4">
              {s.n} / {s.title}
            </h2>
            <p className="mt-2 max-w-md text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
      <a href="#contact" className="mt-16 inline-flex min-h-14 items-center bg-ink px-6 text-[15px] font-medium text-white transition-colors hover:bg-accent">
        Обсудить проект
      </a>
    </section>
  );
}
