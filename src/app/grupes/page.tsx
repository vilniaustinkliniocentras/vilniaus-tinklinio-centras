import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Grupės",
  description:
    "Sužinokite, kaip Vilniaus tinklinio centre formuojamos treniruočių grupės pagal amžių, patirtį ir įgūdžių lygį.",
  path: "/grupes",
});

const groupCriteria = [
  {
    title: "Amžius",
    description:
      "Grupės formuojamos atsižvelgiant į sportininko amžių. Tai leidžia pritaikyti treniruočių krūvį, techninius reikalavimus ir ugdymo metodus pagal vaiko vystymosi etapą.",
    details: [
      "Treniruočių turinys pritaikytas amžiaus grupei",
      "Fizinis krūvis atitinka vystymosi poreikius",
      "Socialinis ir emocinis ugdymas grupės kontekste",
    ],
  },
  {
    title: "Patirtis",
    description:
      "Atskiriame pradedančiuosius nuo jau turinčių tinklinio patirties sportininkų. Taip kiekvienas jaunasis žaidėjas gali mokytis savo tempu ir jaustis komfortiškai grupėje.",
    details: [
      "Pradedantiesiems – pagrindų ir technikos ugdymas",
      "Patyrusiems – tobulinimas ir varžybinio lygio rengimas",
      "Sklandus perėjimas tarp grupių augant įgūdžiams",
    ],
  },
  {
    title: "Įgūdžių lygis",
    description:
      "Reguliariai vertiname kiekvieno sportininko progresą. Esant poreikiui, pritaikome grupę taip, kad vaikas gautų optimalų ugdymą – nei per lengvą, nei per sudėtingą.",
    details: [
      "Individualus požiūris į kiekvieno progresą",
      "Grupės pritaikymas pagal techninius įgūdžius",
      "Nuolatinis grįžtamasis ryšys su tėvais",
    ],
  },
];

export default function GrupesPage() {
  return (
    <div className="section-padding bg-white">
      <div className="container-narrow">
        <SectionHeading
          headingLevel={1}
          title="Treniruočių grupės"
          subtitle="Grupės formuojamos pagal amžių, patirtį ir įgūdžių lygį – taip kiekvienas sportininkas gauna tinkamą treniruočių programą."
        />

        <div className="space-y-8">
          {groupCriteria.map((criteria) => (
            <article
              key={criteria.title}
              className="rounded-xl border border-vtc-blue-100 bg-vtc-blue-50/50 p-5 sm:p-6 md:p-8"
            >
              <h2 className="text-xl font-semibold text-vtc-blue-900">{criteria.title}</h2>
              <p className="mt-3 text-gray-700 leading-relaxed">{criteria.description}</p>
              <ul className="mt-4 space-y-2">
                {criteria.details.map((detail) => (
                  <li key={detail} className="flex min-w-0 items-start gap-2 text-sm text-gray-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-vtc-blue-600" aria-hidden="true" />
                    {detail}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-xl bg-vtc-blue-900 p-6 text-center text-white sm:p-8">
          <h2 className="text-xl font-semibold">Registracija į grupes</h2>
          <p className="mx-auto mt-3 max-w-xl text-vtc-blue-100">
            Tikslios grupių sudėtys, amžiaus intervalai ir treniruočių grafikai bus paskelbti
            netrukus. Registruodamiesi nurodykite vaiko amžių, patirtį ir pageidaujamus
            treniruočių laikus – padėsime parinkti tinkamiausią grupę.
          </p>
          <Link
            href="/registracija"
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-white px-6 py-3 font-semibold text-vtc-blue-900 transition-colors hover:bg-vtc-blue-50 sm:w-auto"
          >
            Registruotis
          </Link>
        </div>
      </div>
    </div>
  );
}
