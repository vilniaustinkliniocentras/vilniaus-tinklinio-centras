import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Apie mus",
  description:
    "Sužinokite apie Vilniaus tinklinio centrą – jaunimo tinklinio klubą Vilniuje, orientuotą į discipliną, tobulėjimą ir komandinį darbą.",
  path: "/apie",
});

export default function ApiePage() {
  return (
    <div className="section-padding bg-white">
      <div className="container-narrow">
        <SectionHeading
          headingLevel={1}
          title="Apie mus"
          subtitle="Vilniaus tinklinio centras – vieta, kur vaikai ir paaugliai auga per darbą, komandą ir meilę tinkliniui."
        />

        <div className="mx-auto min-w-0 max-w-3xl space-y-6 text-gray-700 leading-relaxed">
          <p>
            <strong className="text-vtc-blue-900">Vilniaus tinklinio centras (VTC)</strong>{" "}
            – jaunimo tinklinio klubas, įkurtas Vilniuje ir skirtas vaikams bei paaugliams,
            kurie nori sistemingai mokytis tinklinio, tobulėti ir patirti komandinio sporto
            džiaugsmą.
          </p>

          <h2 className="text-xl font-semibold text-vtc-blue-900">Mūsų misija</h2>
          <p>
            Kuriame profesionalią, saugią ir motyvuojančią treniruočių aplinką, kurioje
            kiekvienas jaunasis sportininkas gali augti ne tik kaip žaidėjas, bet ir kaip
            asmenybė. Tikime, kad tikri čempionai išauga per nuoseklų darbą, o ne per
            skubotus sprendimus.
          </p>

          <h2 className="text-xl font-semibold text-vtc-blue-900">Mūsų vertybės</h2>
          <ul className="list-inside list-disc space-y-2 pl-2">
            <li>
              <strong>Disciplina</strong> – nuoseklus darbas kiekvienoje treniruotėje
            </li>
            <li>
              <strong>Tobulėjimas</strong> – individualus progresas per ilgalaikį ugdymą
            </li>
            <li>
              <strong>Komandinis darbas</strong> – pagarba, palaikymas ir bendradarbiavimas
            </li>
            <li>
              <strong>Ilgalaikis progresas</strong> – orientacija į tvarų sportininko vystymąsi
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-vtc-blue-900">Kam skirtas klubas?</h2>
          <p>
            VTC treniruotės skirtos vaikams ir paaugliams Vilniuje – tiek pradedantiesiems,
            tiek jau turintiems tinklinio patirties. Grupės formuojamos pagal amžių, patirtį
            ir įgūdžių lygį, kad kiekvienas sportininkas gautų tinkamą treniruočių programą.
          </p>

          <h2 className="text-xl font-semibold text-vtc-blue-900">Bendradarbiavimas su tėvais</h2>
          <p>
            Tėvai ir globėjai yra svarbi mūsų bendruomenės dalis. Siekiame aiškios,
            atviros komunikacijos – informuojame apie treniruočių eigą, vaiko progresą ir
            klubo veiklą. Kartu kuriame aplinką, kurioje vaikas jaučiasi saugus ir motyvuotas.
          </p>
        </div>
      </div>
    </div>
  );
}
