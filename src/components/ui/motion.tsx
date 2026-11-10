"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;
const viewport = { once: true, margin: "-12% 0px" } as const;

export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Заголовок поднимается из-за линии маски. */
export function Headline({ children, className, as: Tag = "h2" }: { children: string; className?: string; as?: "h2" | "h3" }) {
  const MotionTag = Tag === "h2" ? motion.h2 : motion.h3;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: "0.5em", clipPath: "inset(0 0 100% 0)" }}
      whileInView={{ opacity: 1, y: 0, clipPath: "inset(-10% 0 -15% 0)" }}
      viewport={viewport}
      transition={{ duration: 1.1, ease: EASE }}
    >
      {children}
    </MotionTag>
  );
}

/** Изображение открывается шторкой снизу вверх. */
export function MaskImage({
  src,
  alt,
  className,
  sizes,
  position,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  position?: string;
  priority?: boolean;
}) {
  // Наблюдаем за необрезанным контейнером: сам элемент с маской браузер может считать невидимым.
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, viewport);
  return (
    <div ref={ref} className={`relative overflow-hidden ${className ?? ""}`}>
      <motion.div
        className="absolute inset-0"
        initial={{ clipPath: "inset(100% 0 0 0)" }}
        animate={{ clipPath: inView ? "inset(0% 0 0 0)" : "inset(100% 0 0 0)" }}
        transition={{ duration: 1.3, ease: EASE }}
      >
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: "cover", objectPosition: position }} />
      </motion.div>
    </div>
  );
}

export function Counter({ to, className }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(to);

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(0, to, { duration: 1.6, ease: EASE, onUpdate: (v) => setValue(Math.round(v)) });
    return () => controls.stop();
  }, [inView, reduced, to]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}

type ButtonProps = {
  href?: string;
  children: React.ReactNode;
  tone?: "ink" | "light" | "ghost";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
};

/** Единственная форма кнопки на сайте: прямой угол, стрелка уходит вправо-вверх. */
export function Button({ href, children, tone = "ink", className = "", type = "button", disabled, onClick }: ButtonProps) {
  const tones = {
    ink: "bg-ink text-white hover:bg-accent",
    light: "bg-white text-ink hover:bg-accent hover:text-white",
    ghost: "border border-current hover:bg-white hover:text-ink hover:border-white",
  };
  const cls = `group inline-flex min-h-14 items-center justify-between gap-8 px-6 text-[15px] font-medium transition-colors duration-500 disabled:opacity-60 ${tones[tone]} ${className}`;
  const inner = (
    <>
      <span>{children}</span>
      <ArrowUpRight size={18} strokeWidth={1.5} className="transition-transform duration-500 ease-arch group-hover:translate-x-1 group-hover:-translate-y-1" />
    </>
  );
  return href ? (
    <a href={href} className={cls} onClick={onClick}>
      {inner}
    </a>
  ) : (
    <button type={type} className={cls} disabled={disabled} onClick={onClick}>
      {inner}
    </button>
  );
}

/** Подпись, следующая за курсором над изображением. Только для устройств с мышью. */
export function useCursorLabel() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 28 });
  const sy = useSpring(y, { stiffness: 260, damping: 28 });
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - box.left);
    y.set(e.clientY - box.top);
  };
  return { sx, sy, onMove };
}
