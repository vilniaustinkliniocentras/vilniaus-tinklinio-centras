import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import { rootMetadata } from "@/lib/seo/metadata";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = rootMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="lt" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body className="flex min-h-screen min-w-0 flex-col overflow-x-clip font-sans">
        <OrganizationJsonLd />
        <Header />
        <main className="min-w-0 flex-1 overflow-x-clip pt-[4.75rem]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
