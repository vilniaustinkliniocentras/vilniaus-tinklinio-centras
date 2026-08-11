import Image from "next/image";
import Link from "next/link";
import { AnimateIn } from "@/components/ui/AnimateIn";
import { images } from "@/lib/constants";

export function AboutClub() {
  return (
    <section className="section-padding bg-vtc-gray-50" aria-labelledby="about-heading">
      <div className="container-narrow">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <AnimateIn>
            <div>
              <h2
                id="about-heading"
                className="font-display text-balance text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl"
              >
                Apie klubą
              </h2>
              <div className="mt-8 space-y-5 text-lg leading-relaxed text-gray-600">
                <p>
                  Vilniaus tinklinio centras – vieta, kur vaikai ir paaugliai mokosi tinklinio
                  saugioje, draugiškoje ir motyvuojančioje aplinkoje.
                </p>
                <p>
                  Siekiame, kad kiekvienas vaikas augtų ne tik kaip sportininkas, bet ir kaip
                  komandos narys bei asmenybė.
                </p>
              </div>
              <Link
                href="/apie"
                className="mt-8 inline-flex items-center gap-2 font-semibold text-vtc-navy transition-colors hover:text-vtc-navy-dark"
              >
                Sužinoti daugiau
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </AnimateIn>

          <AnimateIn delay={150}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-2xl shadow-vtc-navy/10 sm:aspect-[5/4] lg:aspect-[4/5]">
              <Image
                src={images.community.one}
                alt="Vaikų tinklinio treniruotės Vilniaus tinklinio centre"
                fill
                className="object-cover transition-transform duration-700 hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
