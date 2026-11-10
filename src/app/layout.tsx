import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { MotionConfig } from "@/components/ui/MotionRoot";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["200", "300", "400", "500"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FORMA — архитектура и строительство загородных домов",
  description: "Проектируем и строим премиальные загородные дома: от анализа участка до передачи ключей.",
};

export const viewport: Viewport = {
  themeColor: "#f4f2ed",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={manrope.variable}>
      <body>
        <MotionConfig>{children}</MotionConfig>
      </body>
    </html>
  );
}
