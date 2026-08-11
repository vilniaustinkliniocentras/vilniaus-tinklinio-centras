interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  light?: boolean;
  eyebrow?: string;
  headingLevel?: 1 | 2;
}

export function SectionHeading({
  title,
  subtitle,
  centered = true,
  light = false,
  eyebrow,
  headingLevel = 2,
}: SectionHeadingProps) {
  const HeadingTag = headingLevel === 1 ? "h1" : "h2";

  return (
    <div className={`mb-14 lg:mb-16 ${centered ? "text-center" : ""}`}>
      {eyebrow && (
        <p
          className={`mb-4 text-xs font-semibold uppercase tracking-[0.2em] ${
            light ? "text-vtc-blue-300" : "text-vtc-blue-600"
          }`}
        >
          {eyebrow}
        </p>
      )}
      <HeadingTag
        className={`font-display text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl ${
          light ? "text-white" : "text-vtc-blue-950"
        }`}
      >
        {title}
      </HeadingTag>
      {subtitle && (
        <p
          className={`mt-5 text-base leading-relaxed sm:text-lg md:text-xl ${
            light ? "text-vtc-blue-100/90" : "text-gray-600"
          } ${centered ? "mx-auto max-w-2xl" : "max-w-2xl"}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
