"use client";

import { MotionConfig as FMConfig } from "framer-motion";

export function MotionConfig({ children }: { children: React.ReactNode }) {
  return <FMConfig reducedMotion="user">{children}</FMConfig>;
}
