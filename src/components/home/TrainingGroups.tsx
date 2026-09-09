import Link from "next/link";
import { AnimateIn } from "@/components/ui/AnimateIn";
import { HOMEPAGE_TRAINING_GROUPS } from "@/lib/constants/training-groups";

export function TrainingGroups() {
  return (
    <section
      id="treniruotes"
      className="section-padding scroll-mt-24 bg-white"
      aria-labelledby="groups-heading"
    >
      <div className="container-narrow">
        <AnimateIn>
          <div className="mb-16 max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-vtc-navy">
              Treniruotės
            </p>
            <h2
              id="groups-heading"
              className="font-display text-balance text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl"
            >
              Treniruočių grupės
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-gray-500">
              Grupės formuojamos pagal amžių, patirtį ir sportinį pasirengimą. Kiekvienas
              sportininkas gauna tinkamą treniruočių programą.
            </p>
          </div>
        </AnimateIn>

        <div className="grid gap-6 sm:grid-cols-2 lg:gap-8">
          {HOMEPAGE_TRAINING_GROUPS.map((group, index) => (
            <AnimateIn key={group.value} delay={index * 100}>
              <article className="group relative h-full overflow-hidden rounded-3xl bg-vtc-gray-50 p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-vtc-navy/5 sm:p-8 lg:p-10">
                <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-vtc-navy/5 transition-transform duration-500 group-hover:scale-150" />
                <p className="relative text-sm font-semibold uppercase tracking-wider text-vtc-navy">
                  {group.age}
                </p>
                <h3 className="relative mt-3 break-words font-display text-xl font-bold text-gray-900 sm:text-2xl">
                  {group.title}
                </h3>
                <p className="relative mt-4 leading-relaxed text-gray-500">{group.description}</p>
                {group.schedule && (
                  <p className="relative mt-4 break-words text-sm font-medium leading-snug text-vtc-navy">
                    {group.schedule}
                  </p>
                )}
              </article>
            </AnimateIn>
          ))}
        </div>

        <AnimateIn delay={200}>
          <div className="mt-12 text-center">
            <Link
              href="/registracija"
              className="mx-auto inline-flex min-h-12 w-full max-w-md items-center justify-center rounded-full bg-vtc-navy px-6 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-vtc-navy-dark hover:shadow-lg sm:w-auto sm:px-8 sm:py-4 sm:text-base"
            >
              Registruotis į treniruotes
            </Link>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
