import type { Metadata } from "next";
import { CoachAuthCallback } from "@/components/coach/CoachAuthCallback";

export const metadata: Metadata = {
  title: "Prisijungimas",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthCallbackPage() {
  return <CoachAuthCallback />;
}
