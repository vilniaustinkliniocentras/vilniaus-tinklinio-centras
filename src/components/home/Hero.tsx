import Image from "next/image";
import Link from "next/link";
import { images, siteConfig } from "@/lib/constants";

export function Hero() {
  return (
    <section className="relative -mt-[4.75rem] flex min-h-screen items-end overflow-hidden">
      <Image
        src={images.hero}
        alt="Tinklinio treniruotė vaikams Vilniuje"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
        quality={90}
      />

      <div
        className="absolute inset-0 bg-gradient-to-t from-vtc-navy/95 via-vtc-navy/70 to-vtc-navy/40"
        aria-hidden="true"
      />

      <div className="container-narrow relative w-full min-w-0 px-4 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-36 lg:px-12 lg:pb-32">
        <div className="max-w-3xl min-w-0">
          <p className="animate-fade-in-up mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-white/70 sm:tracking-[0.25em]">
            {siteConfig.abbreviation} · Vilnius
          </p>

          <h1 className="animate-fade-in-up animation-delay-100 font-display text-balance text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl sm:leading-[1.08] md:text-5xl lg:text-7xl">
            Tinklinio treniruotės vaikams ir paaugliams Vilniuje
          </h1>

          <p className="animate-fade-in-up animation-delay-200 mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg md:text-xl lg:text-2xl">
            Registracija į 2026–2027 sezoną jau vyksta. Pirmą treniruotę vaikas gali išbandyti
            nemokamai, be ilgalaikių įsipareigojimų. Padėsime parinkti tinkamiausią grupę pagal
            amžių ir pasirengimą.
          </p>

          <div className="animate-fade-in-up animation-delay-300 mt-10 flex w-full flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/registracija"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-5 py-3.5 text-center text-sm font-semibold leading-snug text-vtc-navy transition-all duration-300 hover:scale-[1.02] hover:bg-white/95 hover:shadow-xl sm:w-auto sm:px-8 sm:py-4 sm:text-base"
            >
              Registruotis į nemokamą pirmą treniruotę
            </Link>
            <Link
              href="/apie"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/35 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-white hover:bg-white/10 sm:w-auto sm:px-8 sm:py-4 sm:text-base"
            >
              Apie klubą
            </Link>
          </div>

          <ul className="animate-fade-in-up animation-delay-400 mt-6 flex flex-col gap-1.5 text-sm text-white/70 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-1">
            <li>✓ Pirma treniruotė nemokama</li>
            <li>✓ Grupės pagal amžių ir pasirengimą</li>
            <li>✓ Vietų skaičius ribotas</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
