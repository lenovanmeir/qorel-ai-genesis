import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { Problem } from "@/components/site/Problem";
import { Process } from "@/components/site/Process";
import { LoomOffer } from "@/components/site/LoomOffer";
import { Services } from "@/components/site/Services";
import { CaseStudies } from "@/components/site/CaseStudies";
import { WhyUs } from "@/components/site/WhyUs";
import { Testimonials } from "@/components/site/Testimonials";
import { FinalCTA } from "@/components/site/FinalCTA";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QoreLabs.io: AI-Powered Websites That Convert & Automate" },
      {
        name: "description",
        content:
          "QoreLabs redesigns outdated websites into high-converting AI-powered systems. Get a free Loom audit and book your strategy call.",
      },
      { property: "og:title", content: "QoreLabs.io: AI-Powered Websites That Convert & Automate" },
      {
        property: "og:description",
        content:
          "Modern AI-powered websites that turn visitors into customers and automate your operations.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Problem />
      <Process />
      <LoomOffer />
      <Services />
      <CaseStudies />
      <WhyUs />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </main>
  );
}
