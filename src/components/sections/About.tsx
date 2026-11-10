import { Counter, Headline, MaskImage, Reveal } from "@/components/ui/motion";
import { PRINCIPLES, SCOPE, t } from "@/content/site";

export function About() {
  return (
    <section id="about" className="wrap section">
      <div className="grid-12 gap-y-16">
        <Headline className="display col-span-12 lg:col-span-9">{t("Создаём пространство, в котором хочется жить.")}</Headline>

        <MaskImage
          src="/assets/images/about.webp"
          alt="Фасад дома FORMA: деревянные ламели, тёмный металл и панорамное окно"
          sizes="(min-width:1024px) 50vw, 100vw"
          className="col-span-12 aspect-[4/5] lg:col-span-6 lg:row-span-2 lg:mt-16"
        />

        <div className="col-span-12 lg:col-span-5 lg:col-start-8 lg:mt-16">
          <Reveal>
            <p className="lead">{t("Мы объединяем архитектуру, инженерную точность и современные технологии строительства, чтобы создавать дома, отражающие образ жизни своих владельцев.")}</p>
          </Reveal>
          <ul className="mt-16 border-t border-line">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.n} delay={i * 0.08}>
                <li className="grid grid-cols-[48px_1fr] border-b border-line py-6">
                  <span className="text-accent tabular-nums">{p.n}</span>
                  <div>
                    <h3 className="text-[22px] leading-tight">{p.title}</h3>
                    <p className="mt-2 text-muted">{p.text}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>

        <dl className="col-span-12 grid grid-cols-3 gap-6 lg:col-span-5 lg:col-start-8 lg:self-end">
          {SCOPE.map((s) => (
            <div key={s.label}>
              <dd className="text-[clamp(2.5rem,5vw,4.5rem)] leading-none font-extralight tracking-tight">
                <Counter to={s.value} />
              </dd>
              <dt className="mt-2 text-sm leading-snug text-muted">{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
