import Link from "next/link";
import { AnimateIn } from "@/components/ui/AnimateIn";

export function RegistrationCTA() {
  return (
    <section
      className="relative overflow-hidden bg-vtc-navy"
      aria-labelledby="cta-heading"
    >
      <div
        className="absolute inset-0 opacity-20"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 50%, white 0%, transparent 40%)",
        }}
      />

      <div className="container-narrow relative section-padding text-center">
        <AnimateIn>
          <h2
            id="cta-heading"
            className="font-display text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            Registruok vaiką į tinklinio treniruotes
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/75">
            Užpildykite registracijos formą – susisieksime ir padėsime pasirinkti tinkamiausią
            grupę.
          </p>
          <Link
            href="/registracija"
            className="mx-auto mt-10 inline-flex min-h-12 w-full max-w-md items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-vtc-navy transition-all duration-300 hover:scale-[1.02] hover:bg-white/95 hover:shadow-2xl sm:w-auto sm:px-10 sm:py-4 sm:text-base"
          >
            Registruotis dabar
          </Link>
        </AnimateIn>
      </div>
    </section>
  );
}
