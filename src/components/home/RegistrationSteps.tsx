import { AnimateIn } from "@/components/ui/AnimateIn";

const steps = [
  "Užpildykite registracijos formą",
  "Susisieksime su jumis",
  "Pakviesime į pirmą nemokamą treniruotę",
  "Parinksime tinkamiausią grupę",
];

export function RegistrationSteps() {
  return (
    <section className="section-padding bg-vtc-gray-50" aria-labelledby="registration-steps-heading">
      <div className="container-narrow">
        <AnimateIn>
          <div className="mb-16 max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-vtc-navy">
              Registracija
            </p>
            <h2
              id="registration-steps-heading"
              className="font-display text-balance text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl"
            >
              Kaip vyksta registracija?
            </h2>
          </div>
        </AnimateIn>

        <AnimateIn delay={100}>
          <ol className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-2">
            {steps.map((step, index) => (
              <li
                key={step}
                className="flex flex-col items-center gap-4 lg:flex flex-1 lg:flex-row lg:items-center lg:gap-2"
              >
                <div className="w-full min-w-0 flex-1 rounded-3xl bg-white p-5 shadow-sm sm:p-6 lg:p-8">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-vtc-navy font-display text-lg font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="mt-4 break-words font-display text-base font-bold leading-snug text-gray-900 sm:text-lg">
                    {step}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-2xl font-light text-vtc-navy/40"
                  >
                    <span className="lg:hidden">↓</span>
                    <span className="hidden lg:inline">→</span>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </AnimateIn>
      </div>
    </section>
  );
}
