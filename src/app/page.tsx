import type { Metadata } from "next";
import { AboutClub } from "@/components/home/AboutClub";
import { Gallery } from "@/components/home/Gallery";
import { Hero } from "@/components/home/Hero";
import { RegistrationCTA } from "@/components/home/RegistrationCTA";
import { RegistrationSteps } from "@/components/home/RegistrationSteps";
import { TrainingGroups } from "@/components/home/TrainingGroups";
import { TrainingPricing } from "@/components/home/TrainingPricing";
import { WhyChoose } from "@/components/home/WhyChoose";
import { createPageMetadata } from "@/lib/seo/metadata";
import { seoConfig } from "@/lib/seo/config";

export const metadata: Metadata = createPageMetadata({
  title: seoConfig.defaultTitle,
  description: seoConfig.defaultDescription,
  path: "/",
  absoluteTitle: true,
  openGraphTitle: seoConfig.openGraph.title,
  openGraphDescription: seoConfig.openGraph.description,
});

export default function HomePage() {
  return (
    <>
      <Hero />
      <WhyChoose />
      <RegistrationSteps />
      <AboutClub />
      <TrainingGroups />
      <Gallery />
      <TrainingPricing />
      <RegistrationCTA />
    </>
  );
}
