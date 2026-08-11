import { AnimateIn } from "@/components/ui/AnimateIn";

const reasons = [
  {
    title: "Grupės pagal amžių ir lygį",
    description: "Kiekvienam vaikui parenkame tinkamiausią treniruočių grupę.",
    icon: CoachIcon,
  },
  {
    title: "Pirma treniruotė be įsipareigojimų",
    description: "Vaikas gali išbandyti treniruotę prieš priimdamas sprendimą.",
    icon: CommunityIcon,
  },
  {
    title: "Komandinė aplinka",
    description: "Ugdome pagarbą, pasitikėjimą ir bendradarbiavimą.",
    icon: TrainingIcon,
  },
  {
    title: "Tobulėjimas kiekvienam",
    description: "Kiekvienas sportininkas progresuoja pagal savo galimybes.",
    icon: TrophyIcon,
  },
];

export function WhyChoose() {
  return (
    <section className="section-padding bg-white" aria-labelledby="why-heading">
      <div className="container-narrow">
        <AnimateIn>
          <div className="mb-16 max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-vtc-navy">
              Kodėl mes
            </p>
            <h2
              id="why-heading"
              className="font-display text-balance text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl"
            >
              Kodėl tėvai renkasi VTC?
            </h2>
          </div>
        </AnimateIn>

        <div className="grid gap-6 sm:grid-cols-2 lg:gap-8">
          {reasons.map((reason, index) => (
            <AnimateIn key={reason.title} delay={index * 100}>
              <article className="group h-full rounded-3xl bg-vtc-gray-50 p-6 transition-all duration-500 hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-vtc-navy/5 sm:p-8 lg:p-10">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-vtc-navy text-white transition-transform duration-500 group-hover:scale-110">
                  <reason.icon />
                </div>
                <h3 className="font-display text-xl font-bold text-gray-900">
                  {reason.title}
                </h3>
                <p className="mt-3 leading-relaxed text-gray-500">{reason.description}</p>
              </article>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function CoachIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

function TrainingIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.772.748 6.023 6.023 0 01-2.772-.748m15.002 0a6.023 6.023 0 002.772.748 6.023 6.023 0 002.772-.748" />
    </svg>
  );
}
