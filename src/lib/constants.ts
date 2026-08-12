export const siteConfig = {
  name: "Vilniaus tinklinio centras",
  abbreviation: "VTC",
  slogan: "Čempionai išauga per darbą.",
  description:
    "Vaikų ir paauglių tinklinio treniruotės Vilniuje. Auginame jaunus tinklininkus, ugdome charakterį ir meilę sportui.",
  url: "https://vilniaus-tinklinio-centras.lt",
  contact: {
    email: null,
    phone: null,
    address: "Vilnius, Lietuva",
  },
  social: {
    facebook: {
      name: "Vilniaus tinklinio centras",
      url: "https://www.facebook.com/",
    },
    instagram: {
      handle: "vilniaustinkliniocentras_vtc",
      url: "https://www.instagram.com/vilniaustinkliniocentras_vtc",
    },
  },
} as const;

export const headerNavLinks = [
  { href: "/", label: "Pradžia" },
  { href: "/apie", label: "Apie klubą" },
  { href: "/#treniruotes", label: "Treniruotės" },
  { href: "/grupes", label: "Komandos" },
  { href: "/kontaktai", label: "Naujienos" },
  { href: "/#galerija", label: "Galerija" },
  { href: "/kontaktai", label: "Kontaktai" },
] as const;

export const navLinks = headerNavLinks;

export const images = {
  logo: "/logo.jpg",
  hero: "/images/hero/hero%20main.jpg",
  community: {
    one: "/images/community/community-1.jpg.jpeg",
    two: "/images/community/community-2.jpg.jpeg",
  },
  youth: {
    team: "/images/youth/youth-1.jpg.jpeg",
  },
  competitions: [
    "/images/competitions/competition-1.jpg.jpeg",
    "/images/competitions/competition-2.jpg.jpeg",
    "/images/competitions/competition-3.jpg.jpeg",
  ],
} as const;

export const galleryImages = [
  {
    src: images.community.two,
    alt: "Vaikų tinklinio treniruotė Vilniaus tinklinio centre – bendruomenė salėje",
  },
  {
    src: images.youth.team,
    alt: "Jaunimo tinklinio komanda treniruotėje Vilniuje",
  },
  {
    src: images.competitions[0],
    alt: "Vilniaus tinklinio centro komanda varžybose",
  },
  {
    src: images.competitions[1],
    alt: "Vaikų tinklinio varžybų akimirkos – VTC komanda",
  },
  {
    src: images.competitions[2],
    alt: "Tinklinio rungtynės – Vilniaus tinklinio centras",
  },
] as const;
