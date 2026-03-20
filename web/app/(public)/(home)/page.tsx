import { HeroSection } from "../_components/geral/hero-section";
import { TechStackMarquee } from "../_components/geral/tech-stack-marquee";
import { TechBentoGrid } from "../_components/geral/bento-grid";
import { FeaturedProjects } from "../_components/projetos/featured-projects";
import { AcademicBackground } from "../_components/geral/academic-background";
import { getProjectsListAction } from "@/actions/projects.actions";
import { ProjectResponse } from "@/types/index";
import { ContactSection } from "../_components/geral/contact-section";
import { Divider } from "../_components/geral/divider";

export const revalidate = 3600; // Cache da página de 1 hora no Next.js

export default async function HomePage() {
  let featuredProjects: ProjectResponse[] = [];

  try {
    // Traz apenas os projetos marcados como destaque (true)
    const response = await getProjectsListAction(true);
    featuredProjects = response.projects || [];
  } catch (error) {
    console.error(
      "[System Error] Falha de I/O ao carregar módulos de projeto na Home:",
      error,
    );
  }

  return (
    <div className="flex w-full flex-col">
      {/* 1. O Topo: Apresentação e Terminal CI/CD */}
      <HeroSection />

      {/* 2. Divisor Visual: Letreiro infinito das tecnologias */}
      <TechStackMarquee />

      {/* 3. A Fundação: Grid Bento com as stacks detalhadas */}
      <TechBentoGrid />

      <Divider label="SYS.PROJECTS" />

      {/* 4. A Prática: Projetos reais do banco de dados */}
      {/* Nota: passei a variável aqui. Depois podemos plugar ela dentro do componente! */}
      <FeaturedProjects projects={featuredProjects} />

      {/* 5. A Teoria: Background e especializações */}
      <AcademicBackground />
      <Divider label="SYS.CONTACT" />
      <ContactSection />
    </div>
  );
}
