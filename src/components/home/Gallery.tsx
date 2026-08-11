"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AnimateIn } from "@/components/ui/AnimateIn";
import { galleryImages } from "@/lib/constants";

export function Gallery() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const close = useCallback(() => setLightboxIndex(null), []);

  const goNext = useCallback(() => {
    setLightboxIndex((current) =>
      current === null ? null : (current + 1) % galleryImages.length
    );
  }, []);

  const goPrev = useCallback(() => {
    setLightboxIndex((current) =>
      current === null
        ? null
        : (current - 1 + galleryImages.length) % galleryImages.length
    );
  }, []);

  useEffect(() => {
    if (lightboxIndex === null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxIndex, close, goNext, goPrev]);

  return (
    <>
      <section
        id="galerija"
        className="section-padding scroll-mt-24 overflow-x-clip bg-vtc-gray-50"
        aria-labelledby="gallery-heading"
      >
        <div className="container-narrow">
          <AnimateIn>
            <div className="mb-16 max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-vtc-navy">
                Galerija
              </p>
              <h2
                id="gallery-heading"
                className="font-display text-balance text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl"
              >
                Mūsų akimirkos
              </h2>
              <p className="mt-5 text-lg text-gray-500">
                Treniruotės, varžybos ir bendruomenės gyvenimas VTC.
              </p>
            </div>
          </AnimateIn>

          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 lg:gap-6">
            {galleryImages.map((image, index) => (
              <AnimateIn key={image.src} delay={index * 80}>
                <button
                  type="button"
                  className="group mb-4 block w-full overflow-hidden rounded-2xl break-inside-avoid focus-visible:ring-2 focus-visible:ring-vtc-navy focus-visible:ring-offset-2 lg:mb-6"
                  onClick={() => setLightboxIndex(index)}
                  aria-label={`Atidaryti nuotrauką: ${image.alt}`}
                >
                  <div
                    className={`relative w-full overflow-hidden ${
                      index % 3 === 0 ? "aspect-[3/4]" : index % 3 === 1 ? "aspect-square" : "aspect-[4/3]"
                    }`}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-vtc-navy/0 transition-colors duration-300 group-hover:bg-vtc-navy/20" />
                  </div>
                </button>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex animate-fade-in items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Nuotraukų galerija"
          onClick={close}
        >
          <button
            type="button"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            onClick={close}
            aria-label="Uždaryti"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            type="button"
            className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:flex"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Ankstesnė nuotrauka"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:flex"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Kita nuotrauka"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div
            className="relative max-h-[85vh] w-full max-w-5xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
              <Image
                src={galleryImages[lightboxIndex].src}
                alt={galleryImages[lightboxIndex].alt}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
            <p className="mt-4 text-center text-sm text-white/70">
              {galleryImages[lightboxIndex].alt}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
