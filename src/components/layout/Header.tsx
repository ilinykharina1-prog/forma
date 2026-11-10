"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NAV } from "@/content/site";
import { Button, EASE } from "@/components/ui/motion";

export function Logo({ className = "" }: { className?: string }) {
  return <span className={`text-[22px] font-light tracking-[0.32em] ${className}`}>FORMA</span>;
}

export function Header() {
  const [solid, setSolid] = useState(false);
  const [dusk, setDusk] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const hero = document.getElementById("top");
      setSolid(hero ? hero.getBoundingClientRect().bottom < 72 : window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const onDusk = (e: Event) => setDusk((e as CustomEvent<boolean>).detail);
    window.addEventListener("forma:dusk", onDusk);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("forma:dusk", onDusk);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const light = dusk && !solid;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-700 ${solid ? "bg-paper/95 border-b border-line text-ink" : light ? "text-white" : "text-ink"}`}
      >
        <div className="wrap flex h-[72px] items-center justify-between">
          <a href="#top" aria-label="FORMA — наверх">
            <Logo />
          </a>
          <nav aria-label="Основная навигация" className="hidden items-center gap-8 lg:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="link-line py-1 text-[15px]">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <a
              href="#contact"
              className={`hidden min-h-11 items-center border px-6 text-[15px] transition-colors duration-500 sm:inline-flex ${
                light ? "border-white hover:bg-white hover:text-ink" : "border-ink hover:bg-ink hover:text-white"
              }`}
            >
              Обсудить проект
            </a>
            <button className="flex size-11 items-center justify-center lg:hidden" onClick={() => setOpen(true)} aria-label="Открыть меню" aria-expanded={open}>
              <Menu strokeWidth={1.25} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col bg-night text-white"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.7, ease: EASE }}
            role="dialog"
            aria-modal="true"
            aria-label="Меню"
          >
            <div className="wrap flex h-[72px] items-center justify-between">
              <Logo />
              <button className="flex size-11 items-center justify-center" onClick={() => setOpen(false)} aria-label="Закрыть меню">
                <X strokeWidth={1.25} />
              </button>
            </div>
            <nav aria-label="Мобильная навигация" className="wrap flex flex-1 flex-col justify-center gap-4">
              {NAV.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="py-1 text-[40px] leading-tight font-light tracking-tight">
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="wrap pb-8">
              <Button href="#contact" tone="light" className="w-full" onClick={() => setOpen(false)}>
                Обсудить проект
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
