import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trenerio zona",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
