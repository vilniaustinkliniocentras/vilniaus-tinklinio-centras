import type { NextRequest } from "next/server";
import { updateCoachSession } from "@/lib/supabase/coach-middleware";

/**
 * Coach session refresh only. Matcher excludes /admin, public pages,
 * registration, contract upload, and payments so those flows stay unchanged.
 */
export async function middleware(request: NextRequest) {
  return updateCoachSession(request);
}

export const config = {
  matcher: ["/treneris", "/treneris/:path*", "/auth/callback"],
};
