"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, invalidate, useFrame, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Quality } from "./core";
import { cameraAt, createWorld } from "./world";

interface Props {
  progressRef: RefObject<number>;
  quality: Quality;
  onReady: () => void;
}

function Rig({ progressRef, quality, onReady }: Props) {
  const gl = useThree((s) => s.gl);
  const world = useMemo(() => createWorld(gl, quality), [gl, quality]);
  const smooth = useRef(progressRef.current);
  const target = useMemo(() => new THREE.Vector3(), []);
  const announced = useRef(false);

  useEffect(() => {
    // Контур дома вычерчивается при первом показе сцены.
    gsap.ticker.lagSmoothing(0); // чертёж идёт по реальному времени, даже если вкладка была в фоне
    const state = { v: 0 };
    world.setDrawing(0);
    const tween = gsap.to(state, {
      v: 1,
      duration: 3.2,
      delay: 0.5,
      ease: "power1.inOut",
      onUpdate: () => {
        world.setDrawing(state.v);
        invalidate();
      },
    });
    return () => {
      tween.kill();
      world.dispose();
    };
  }, [world]);

  useFrame((state, delta) => {
    // Лёгкая инерция: сцена догоняет скролл, но не отстаёт заметно.
    const goal = progressRef.current;
    const gap = goal - smooth.current;
    if (Math.abs(gap) < 0.00008) smooth.current = goal;
    else {
      smooth.current += gap * (1 - Math.exp(-Math.min(delta, 1 / 6) * 9));
      invalidate();
    }
    const p = smooth.current;
    world.update(p);

    // Туман и окружение three.js читает только у корневой сцены.
    state.scene.fog = world.scene.fog;
    state.scene.environment = world.scene.environment;
    state.scene.environmentIntensity = world.scene.environmentIntensity;

    const cam = state.camera as THREE.PerspectiveCamera;
    const { width: w, height: h } = state.size;
    const aspect = w / h;
    cameraAt(p, cam.position, target, aspect);
    cam.lookAt(target);

    // Сдвиг кадра освобождает место под текст, дом остаётся главным акцентом.
    // На первом экране контур дома уходит ещё правее, из-под заголовка.
    const shiftX = aspect > 1.2 ? -w * (0.09 + 0.12 * (1 - Math.min(1, p / 0.1))) : 0;
    const shiftY = aspect <= 1.2 ? -h * 0.2 : 0;
    cam.setViewOffset(w, h, shiftX, shiftY, w, h);

    if (!announced.current) {
      announced.current = true;
      // Постер убирается только после того, как первый кадр реально показан.
      requestAnimationFrame(() => requestAnimationFrame(onReady));
    }
  });

  return <primitive object={world.scene} />;
}

export default function HouseCanvas(props: Props) {
  const max = props.quality === "high" ? 1.75 : 1.5;
  const [dpr, setDpr] = useState(Math.min(max, typeof window === "undefined" ? 1 : window.devicePixelRatio));
  return (
    <Canvas
      frameloop="demand"
      dpr={dpr}
      shadows="percentage"
      camera={{ fov: 30, near: 1, far: 1000, position: [-21, 3, 47] }}
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.92 }}
      className="absolute! inset-0"
      aria-hidden
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <Rig {...props} />
    </Canvas>
  );
}
