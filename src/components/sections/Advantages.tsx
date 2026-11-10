import { Layers, PenTool, Eye, KeyRound } from "lucide-react";
import { Headline, Reveal } from "@/components/ui/motion";
import { ADVANTAGES, t } from "@/content/site";

const ICONS = [PenTool, Eye, Layers, KeyRound];

export function Advantages() {
  return (
    <section className="bg-night text-white">
      <div className="wrap section">
        <Headline className="display max-w-[18ch]">{t("Больше, чем строительство. Полный контроль над каждым этапом.")}</Headline>
        <div className="mt-24 grid border-t border-line-inv md:grid-cols-2">
          {ADVANTAGES.map((a, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal key={a.title} delay={i * 0.06} className={`group border-b border-line-inv ${i % 2 === 0 ? "md:border-r md:pr-12" : "md:pl-12"}`}>
                <article className="flex h-full flex-col justify-between gap-16 py-8 md:min-h-96 md:py-12">
                  <div className="flex items-start justify-between">
                    <span className="text-[clamp(4.5rem,9vw,9rem)] leading-[0.85] font-extralight tracking-[-0.05em] text-white/30 transition-colors duration-700 group-hover:text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Icon size={24} strokeWidth={1} className="text-white/60 transition-transform duration-700 ease-arch group-hover:-translate-y-1" />
                  </div>
                  <div>
                    <h3 className="text-[clamp(1.5rem,2.3vw,2.25rem)] leading-tight">{a.title}</h3>
                    <p className="mt-2 max-w-md text-white/65">{a.text}</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
