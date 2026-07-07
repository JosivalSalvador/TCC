import { HeroSection } from "../_components/hero-section";
import { HowItWorksSection } from "../_components/how-it-works-section";
import { FeaturesSection } from "../_components/features-section";
import { PublicFooter } from "../_components/footer";

export const metadata = {
  title: "Início",
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <PublicFooter />
    </>
  );
}
