import { Hero } from "../components/Hero";
import { ServicesSection } from "../components/ServicesSection";
import { ProductsSection } from "../components/ProductsSection";
import { ProjectsSection } from "../components/ProjectsSection";
import { LibrarySection } from "../components/LibrarySection";
import { AcademySection } from "../components/AcademySection";
import { ContactSection } from "../components/ContactSection";
import { Footer } from "../components/Footer";

export function Home() {
  return (
    <div>
      {/* 1 — Hero: "We engineer intelligent systems." */}
      <Hero />

      {/* 2 — Services: Engineering across the entire stack */}
      <ServicesSection />

      {/* 3 — Products: Products born from engineering problems */}
      <ProductsSection />

      {/* 4 — Projects: What we've built */}
      <ProjectsSection />

      {/* 5 — Library: What we're learning */}
      <LibrarySection />

      {/* 6 — Academy: Build your way into deeper knowledge */}
      <AcademySection />

      {/* Contact CTA */}
      <ContactSection />

      <Footer />
    </div>
  );
}
