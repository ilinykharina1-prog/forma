"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { invalidate } from "@react-three/fiber";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { HeroFallback } from "./HeroFallback";
import { HeroOverlay } from "./HeroOverlay";
import { STAGES } from "@/content/site";

// Сцена загружается отдельным чанком и только в браузере.
const HouseCanvas = dynamic(() => import("@/three/HouseCanvas"), { ssr: false });

type Mode = "pending" | "3d" | "fallback";
type Quality = "high" | "low";

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!canvas.getContext("webgl2");
  } catch {
    return false;
  }
}

function stageIndexAt(p: number) {
  const i = STAGES.findIndex((s) => p < s.to);
  return i === -1 ? STAGES.length - 1 : i;
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("pending");
  const [quality, setQuality] = useState<Quality>("high");
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState(0);
  const [phase, setPhase] = useState<"intro" | "stages" | "final">("intro");
  const [dusk, setDusk] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const forced = new URLSearchParams(window.location.search).has("fallback");
    if (reduced || forced || !hasWebGL()) {
      setMode("fallback");
      return;
    }
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const asked = new URLSearchParams(window.location.search).get("q");
    setQuality(asked === "low" || window.innerWidth < 768 || memory < 4 ? "low" : "high");
    setMode("3d");
  }, []);

  useEffect(() => {
    if (mode !== "3d" || !sectionRef.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate(self) {
        const p = self.progress;
        progressRef.current = p;
        if (barRef.current) barRef.current.style.transform = `scaleY(${p})`;
        setStage(stageIndexAt(p));
        setPhase(p < 0.045 ? "intro" : p > 0.94 ? "final" : "stages");
        setDusk(p > 0.9);
        invalidate();
      },
    });
    const p = trigger.progress;
    progressRef.current = p;
    setStage(stageIndexAt(p));
    setPhase(p < 0.045 ? "intro" : p > 0.94 ? "final" : "stages");
    setDusk(p > 0.9);
    return () => trigger.kill();
  }, [mode]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("forma:dusk", { detail: dusk }));
  }, [dusk]);

  if (mode === "fallback") return <HeroFallback />;

  return (
    <section ref={sectionRef} id="top" aria-label="Строительство дома по этапам" className="relative h-[640vh] md:h-[800vh]">
      <div className="hero-stage sticky top-0 h-svh w-full overflow-hidden bg-paper" data-dusk={dusk}>
        {mode === "3d" && <HouseCanvas progressRef={progressRef} quality={quality} onReady={() => setReady(true)} />}
        <Image
          src={STAGES[0].image}
          alt=""
          fill
          priority
          sizes="100vw"
          className={`pointer-events-none object-cover transition-opacity duration-1000 ${ready ? "opacity-0" : "opacity-100"}`}
        />
        <HeroOverlay stage={stage} phase={phase} barRef={barRef} />
      </div>
    </section>
  );
}
