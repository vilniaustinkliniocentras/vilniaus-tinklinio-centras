import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";

const coachQualities = [
  "Tinklinio metodikos ir jaunimo ugdymo žinios",
  "Individualus požiūris į kiekvieną sportininką",
  "Profesionali ir pagarbi komunikacija su vaikais ir tėvais",
  "Nuolatinis tobulėjimas ir kvalifikacijos kėlimas",
];

export function Coaches() {
  return (
    <section className="section-padding bg-vtc-blue-900 text-white" aria-labelledby="coaches-heading">
      <div className="container-narrow">
        <SectionHeading
          title="Treneriai"
          subtitle="Klubas dirba su kvalifikuotais treneriais, kurie padeda vaikams ir paaugliams augti tiek kaip sportininkams, tiek kaip asmenybėms."
          light
        />

        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4">
            <p className="leading-relaxed text-vtc-blue-100">
              Mūsų trenerių komanda – patyrę specialistai, turintys tinklinio sporto ir
              jaunimo ugdymo patirties. Jie kuria struktūruotas, saugias ir motyvuojančias
              treniruotes, pritaikytas skirtingo amžiaus ir lygio sportininkams.
            </p>
            <p className="leading-relaxed text-vtc-blue-100">
              Trenerių profiliai ir kontaktinė informacija bus paskelbti netrukus. Jei turite
              klausimų dėl treniruočių, susisiekite su mumis – mielai atsakysime.
            </p>
          </div>

          <ul className="space-y-3">
            {coachQualities.map((quality) => (
              <li key={quality} className="flex items-start gap-3">
                <span
                  className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-vtc-blue-600"
                  aria-hidden="true"
                >
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-vtc-blue-50">{quality}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/treneriai"
            className="inline-flex items-center gap-2 font-semibold text-white transition-colors hover:text-vtc-blue-200"
          >
            Daugiau apie trenerius
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
