import { images, siteConfig } from "@/lib/constants";

export const seoConfig = {
  defaultTitle: "Tinklinio treniruotės vaikams Vilniuje | Vilniaus tinklinio centras",
  defaultDescription:
    "Tinklinio treniruotės vaikams ir paaugliams Vilniuje. Grupės pagal amžių ir pasirengimą. Pirma treniruotė nemokama. Registracija į 2026–2027 sezoną jau vyksta.",
  keywords: [
    "tinklinio treniruotės",
    "tinklinio treniruotės Vilnius",
    "vaikų tinklinis",
    "vaikų tinklinio treniruotės",
    "tinklinio būrelis",
    "tinklinis vaikams",
    "tinklinis Vilniuje",
    "Vilniaus tinklinio centras",
  ],
  openGraph: {
    title: "Tinklinio treniruotės vaikams Vilniuje",
    description: "Registracija į naują sezoną jau vyksta. Pirma treniruotė nemokama.",
  },
  ogImage: {
    url: images.hero,
    alt: "Tinklinio treniruotė vaikams Vilniuje",
  },
  organization: {
    name: "Vilniaus tinklinio centras",
    venue: "Savanorių sporto arena",
    streetAddress: "Savanorių pr. 178B",
    addressLocality: "Vilnius",
    addressCountry: "LT",
    telephone: "+37062824887",
    email: "vilniaustinkliniocentras@gmail.com",
  },
  publicRoutes: ["/", "/registracija", "/apie", "/grupes", "/kontaktai"] as const,
} as const;

export { siteConfig };
