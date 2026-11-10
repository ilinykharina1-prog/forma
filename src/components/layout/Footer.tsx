import Link from "next/link";
import { CONTACTS, NAV, t } from "@/content/site";
import { Logo } from "./Header";

function Contact({ label, value, href }: { label: string; value: string | null; href?: (v: string) => string }) {
  return (
    <li>
      {value ? (
        <a className="link-line" href={href ? href(value) : value}>
          {href ? value : label}
        </a>
      ) : (
        <span className="text-white/45">{label}: будет указан</span>
      )}
    </li>
  );
}

export function Footer() {
  return (
    <footer className="bg-night text-white">
      <div className="wrap grid-12 gap-y-16 py-24">
        <div className="col-span-12 lg:col-span-5">
          <Logo className="text-[32px]" />
          <p className="mt-6 max-w-sm text-white/65">{t("Архитектура и строительство загородных домов: от первого чертежа до передачи ключей.")}</p>
        </div>
        <nav aria-label="Разделы сайта" className="col-span-6 lg:col-span-3">
          <p className="eyebrow mb-6 text-white/45">Разделы</p>
          <ul className="space-y-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <a className="link-line" href={n.href}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="col-span-6 lg:col-span-2">
          <p className="eyebrow mb-6 text-white/45">Контакты</p>
          <ul className="space-y-2">
            <Contact label="Телефон" value={CONTACTS.phone} href={(v) => `tel:${v.replace(/[^+\d]/g, "")}`} />
            <Contact label="Почта" value={CONTACTS.email} href={(v) => `mailto:${v}`} />
            <Contact label="Адрес" value={CONTACTS.address} href={(v) => `https://yandex.ru/maps/?text=${encodeURIComponent(v)}`} />
          </ul>
        </div>
        <div className="col-span-12 lg:col-span-2">
          <p className="eyebrow mb-6 text-white/45">Соцсети</p>
          <ul className="space-y-2">
            <Contact label="Telegram" value={CONTACTS.telegram} />
            <Contact label="WhatsApp" value={CONTACTS.whatsapp} />
            <Contact label="Instagram" value={CONTACTS.instagram} />
          </ul>
        </div>
      </div>
      <div className="border-t border-line-inv">
        <div className="wrap flex flex-col justify-between gap-2 py-6 text-sm text-white/55 sm:flex-row">
          <span>© {new Date().getFullYear()} FORMA</span>
          <Link href="/privacy" className="link-line">
            Политика конфиденциальности
          </Link>
        </div>
      </div>
    </footer>
  );
}
