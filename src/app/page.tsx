import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/hero/Hero";
import { About } from "@/components/sections/About";
import { Advantages } from "@/components/sections/Advantages";
import { Projects } from "@/components/sections/Projects";
import { Services } from "@/components/sections/Services";
import { Materials } from "@/components/sections/Materials";
import { Process } from "@/components/sections/Process";
import { FinalCta } from "@/components/sections/FinalCta";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <Advantages />
        <Projects />
        <Services />
        <Materials />
        <Process />
        <FinalCta />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
