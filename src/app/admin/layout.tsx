import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className="border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-center text-sm text-amber-900"
        role="note"
      >
        <strong>Laikina apsauga:</strong> šis administravimo puslapis naudoja paprastą
        slaptažodžio apsaugą, tinkamą tik vietinei plėtrai. Prieš paleidžiant produkcijoje
        būtina įdiegti tikrą autentifikaciją.
      </div>
      {children}
    </>
  );
}
