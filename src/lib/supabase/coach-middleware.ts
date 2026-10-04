import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const LOGIN_PATH = "/treneris/prisijungti";
const RESET_PASSWORD_PATH = "/treneris/atkurti-slaptazodi";
const DASHBOARD_PATH = "/treneris";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

function redirectWithCookies(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirectResponse = NextResponse.redirect(url);
  copyCookies(supabaseResponse, redirectResponse);
  return redirectResponse;
}

/**
 * Refresh the coach Supabase session and enforce /treneris access.
 * Does not read or write the admin vtc_admin_auth cookie.
 */
export async function updateCoachSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLogin = pathname === LOGIN_PATH;
  const isResetPassword = pathname === RESET_PASSWORD_PATH;
  const isCallback = pathname.startsWith("/auth/callback");

  if (isCallback) {
    return supabaseResponse;
  }

  let activeCoach = false;
  if (user) {
    const { data: coach } = await supabase
      .from("coaches")
      .select("id")
      .eq("auth_user_id", user.id)
      .eq("active", true)
      .maybeSingle();
    activeCoach = Boolean(coach?.id);
  }

  if (pathname === DASHBOARD_PATH || pathname.startsWith(`${DASHBOARD_PATH}/`)) {
    if (isLogin || isResetPassword) {
      if (isLogin && activeCoach) {
        return redirectWithCookies(request, supabaseResponse, DASHBOARD_PATH);
      }
      return supabaseResponse;
    }

    if (!user || !activeCoach) {
      if (user && !activeCoach) {
        await supabase.auth.signOut();
      }
      return redirectWithCookies(request, supabaseResponse, LOGIN_PATH);
    }
  }

  return supabaseResponse;
}
