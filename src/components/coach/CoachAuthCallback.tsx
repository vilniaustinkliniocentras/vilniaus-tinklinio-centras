"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createCoachBrowserClient } from "@/lib/supabase/coach-browser";
import type { EmailOtpType } from "@supabase/supabase-js";

const OTP_TYPES: EmailOtpType[] = [
  "invite",
  "signup",
  "magiclink",
  "recovery",
  "email",
  "email_change",
];

function safeNextPath(value: string | null): string {
  if (
    value &&
    value.startsWith("/treneris") &&
    !value.startsWith("//") &&
    !value.includes("\\")
  ) {
    return value;
  }
  return "/treneris";
}

function isOtpType(value: string): value is EmailOtpType {
  return OTP_TYPES.includes(value as EmailOtpType);
}

/**
 * Completes invite / recovery / PKCE redirects.
 * Invite emails are not PKCE; tokens may arrive as ?code, ?token_hash, or #access_token.
 */
export function CoachAuthCallback() {
  const router = useRouter();
  const [message, setMessage] = useState("Jungiamasi...");

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      const supabase = createCoachBrowserClient();
      if (!supabase) {
        setMessage("Trenerio zona laikinai nepasiekiama.");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const next = safeNextPath(params.get("next") ?? hashParams.get("next"));
      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const type = params.get("type");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      let errorMessage: string | null = null;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          errorMessage = error.message;
        }
      } else if (tokenHash && type && isOtpType(type)) {
        const { error } = await supabase.auth.verifyOtp({
          type,
          token_hash: tokenHash,
        });
        if (error) {
          errorMessage = error.message;
        }
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          errorMessage = error.message;
        }
      }

      if (cancelled) {
        return;
      }

      if (errorMessage) {
        setMessage("Nepavyko užbaigti prisijungimo. Bandykite dar kartą.");
        router.replace("/treneris/prisijungti");
        return;
      }

      router.replace(next);
    }

    void completeAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="section-padding bg-vtc-gray-50">
      <div className="container-narrow mx-auto max-w-lg text-center">
        <p className="text-sm text-gray-600" role="status">
          {message}
        </p>
      </div>
    </div>
  );
}
