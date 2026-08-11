import Link from "next/link";
import { AnimateIn } from "@/components/ui/AnimateIn";

const benefits = [
  { icon: "🏐", text: "2 treniruotės per savaitę" },
  { icon: "👥", text: "Grupės pagal amžių ir pasirengimą" },
  { icon: "✅", text: "Pirma treniruotė nemokama" },
  { icon: "📍", text: "Treniruotės vyksta Savanorių sporto arenoje" },
];

export function TrainingPricing() {
  return (
    <section className="section-padding bg-white" aria-labelledby="pricing-heading">
      <div className="container-narrow">
        <AnimateIn>
          <div className="mx-auto min-w-0 max-w-3xl rounded-3xl bg-vtc-gray-50 p-6 text-center shadow-sm sm:p-8 lg:p-12">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-vtc-navy">
              Kainoraštis
            </p>
            <h2
              id="pricing-heading"
              className="font-display text-balance text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
            >
              Treniruočių kaina
            </h2>

            <p className="mt-8 font-display text-4xl font-bold tracking-tight text-vtc-navy sm:text-5xl lg:text-6xl">
              69 €{" "}
              <span className="text-xl font-semibold text-gray-500 sm:text-2xl lg:text-3xl">/ mėn.</span>
            </p>

            <ul className="mt-10 space-y-4 text-left">
              {benefits.map((benefit) => (
                <li
                  key={benefit.text}
                  className="flex items-start gap-4 rounded-2xl bg-white px-4 py-4 shadow-sm sm:px-5"
                >
                  <span className="shrink-0 text-xl leading-none" aria-hidden="true">
                    {benefit.icon}
                  </span>
                  <span className="min-w-0 break-words text-sm leading-relaxed text-gray-700 sm:text-base lg:text-lg">
                    {benefit.text}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href="/registracija"
              className="mt-10 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-vtc-navy px-5 py-3.5 text-center text-sm font-semibold leading-snug text-white transition-all duration-300 hover:bg-vtc-navy-dark hover:shadow-lg sm:w-auto sm:px-8 sm:py-4 sm:text-base"
            >
              Registruotis į nemokamą pirmą treniruotę
            </Link>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
