import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function About() {
  return (
    <section className="section-padding bg-white" aria-labelledby="about-heading">
      <div className="container-narrow">
        <SectionHeading
          title="Apie mus"
          subtitle="Kuriame aplinką, kurioje vaikai ir paaugliai auga per sistemingą darbą ir komandinį žaidimą."
        />

        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6 text-gray-600 leading-relaxed">
            <p>
              <strong className="text-vtc-blue-900">Vilniaus tinklinio centras (VTC)</strong>{" "}
              – jaunimo tinklinio klubas Vilniuje, skirtas vaikams ir paaugliams, kurie nori
              mokytis, tobulėti ir patirti komandinio sporto džiaugsmą.
            </p>
            <p>
              Mūsų tikslas – ne tik ugdyti tinklinio įgūdžius, bet ir formuoti atsakingus,
              disciplinuotus bei motyvuotus jaunuosius sportininkus. Tikime, kad tikras
              progresas ateina per nuoseklų darbą, pagarbą komandos draugams ir ilgalaikį
              tobulėjimą.
            </p>
            <p>
              Dirbame su tėvais kaip partneriais – aiškiai komunikuojame, palaikome vaikų
              vystymąsi ir kuriame saugią, profesionalią treniruočių aplinką.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {values.map((value) => (
              <div
                key={value.title}
                className="rounded-xl border border-vtc-blue-100 bg-vtc-blue-50 p-6"
              >
                <div
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-vtc-blue-700 text-white"
                  aria-hidden="true"
                >
                  {value.icon}
                </div>
                <h3 className="font-semibold text-vtc-blue-900">{value.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/apie"
            className="inline-flex items-center gap-2 font-semibold text-vtc-blue-700 transition-colors hover:text-vtc-blue-900"
          >
            Skaityti daugiau apie klubą
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

const values = [
  {
    title: "Disciplina",
    description: "Nuoseklus darbas ir atsakomybė kiekvienoje treniruotėje.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Tobulėjimas",
    description: "Individualus progresas per ilgalaikį ir sistemingą ugdymą.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    title: "Komanda",
    description: "Bendradarbiavimas, pagarba ir palaikymas aikštelėje.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: "Progresas",
    description: "Aiškūs tikslai ir matomas augimas kiekviename etape.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
];
