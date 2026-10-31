import { Hero } from "./hero";
import { ServicesSection } from "./services-section";
import { ProductsSection } from "./products-section";
import { ProjectsSection } from "./projects-section";
import { LibrarySection } from "./library-section";
import { AcademySection } from "./academy-section";
import { ContactSection } from "./contact-section";
import { Footer } from "./footer";
import type { HomeContent } from "./home-data";

export function Home({ content }: { content: HomeContent }) {
  return (
    <div>
      {/* 1 — Hero: "We engineer intelligent systems." */}
      <Hero />

      {/* 2 — Services: Engineering across the entire stack */}
      <ServicesSection services={content.services} />

      {/* 3 — Products: Products born from engineering problems */}
      <ProductsSection products={content.products} />

      {/* 4 — Projects: What we've built */}
      <ProjectsSection projects={content.projects} total={content.projectTotal} />

      {/* 5 — Library: What we're learning */}
      <LibrarySection articles={content.articles} />

      {/* 6 — Academy: Build your way into deeper knowledge */}
      <AcademySection courses={content.courses} />

      {/* Contact CTA */}
      <ContactSection />

      <Footer />
    </div>
  );
}
