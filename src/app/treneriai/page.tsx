import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Treneriai",
  description:
    "Vilniaus tinklinio centras dirba su kvalifikuotais treneriais, kurie padeda vaikams ir paaugliams augti per sistemingą tinklinio ugdymą.",
};

const coachApproach = [
  {
    title: "Metodika ir patirtis",
    description:
      "Mūsų treneriai turi tinklinio sporto ir jaunimo ugdymo patirties. Jie taiko struktūruotas treniruočių programas, pritaikytas skirtingo amžiaus ir lygio sportininkams.",
  },
  {
    title: "Individualus požiūris",
    description:
      "Kiekvienas vaikas yra unikalus. Treneriai stebi progresą, pritaiko ugdymą ir padeda sportininkui siekti asmeninių tikslų komandos kontekste.",
  },
  {
    title: "Profesionali komunikacija",
    description:
      "Treneriai palaiko pagarbius, atvirus santykius su vaikais ir tėvais. Aiškiai komunikuoja apie treniruočių tikslus, vaiko progresą ir lūkesčius.",
  },
  {
    title: "Nuolatinis tobulėjimas",
    description:
      "Trenerių komanda nuolat tobulina savo žinias ir kvalifikaciją, kad galėtų teikti aukščiausios kokybės jaunimo tinklinio ugdymą.",
  },
];

export default function TreneriaiPage() {
  return (
    <div className="section-padding bg-white">
      <div className="container-narrow">
        <SectionHeading
          title="Treneriai"
          subtitle="Klubas dirba su kvalifikuotais treneriais, kurie padeda vaikams ir paaugliams augti tiek kaip sportininkams, tiek kaip asmenybėms."
        />

        <div className="mx-auto mb-12 max-w-3xl text-center text-gray-700 leading-relaxed">
          <p>
            Mūsų trenerių komanda – patyrę specialistai, kurie ne tik moko tinklinio
            technikos, bet ir ugdo sportininko charakterį, atsakomybę ir meilę sportui.
            Kiekvienas treneris kuria saugią, motyvuojančią ir profesionalią treniruočių
            aplinką.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {coachApproach.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-vtc-blue-100 p-6"
            >
              <h2 className="text-lg font-semibold text-vtc-blue-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-xl bg-vtc-blue-50 p-8 text-center">
          <h2 className="text-xl font-semibold text-vtc-blue-900">Trenerių profiliai</h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-600">
            Išsamūs trenerių profiliai su kvalifikacijomis ir kontaktine informacija bus
            paskelbti netrukus. Jei turite klausimų dėl treniruočių, susisiekite su mumis.
          </p>
          <Link
            href="/kontaktai"
            className="mt-6 inline-flex items-center gap-2 font-semibold text-vtc-blue-700 transition-colors hover:text-vtc-blue-900"
          >
            Susisiekti
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
