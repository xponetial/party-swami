import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sanitizeNextPath } from "@/lib/auth/urls";

function getProviderDashboardPath(user: { user_metadata?: Record<string, unknown> } | null) {
  const membershipType = typeof user?.user_metadata?.membership_type === "string"
    ? user.user_metadata.membership_type.toLowerCase()
    : null;

  if (membershipType === "vendor") return "/vendors/dashboard";
  if (membershipType === "planner") return "/planners/dashboard";
  return null;
}

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage =
    pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password";
  const isProtectedPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/vendors/dashboard") ||
    pathname.startsWith("/planners/dashboard");
  const providerDashboardPath = getProviderDashboardPath(user);
  const isHostOnlyPage =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/images");

  if (!user && isProtectedPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  if (user && providerDashboardPath) {
    if (isHostOnlyPage) {
      return NextResponse.redirect(new URL(providerDashboardPath, request.url));
    }

    if (providerDashboardPath === "/vendors/dashboard" && pathname.startsWith("/planners/dashboard")) {
      return NextResponse.redirect(new URL(providerDashboardPath, request.url));
    }

    if (providerDashboardPath === "/planners/dashboard" && pathname.startsWith("/vendors/dashboard")) {
      return NextResponse.redirect(new URL(providerDashboardPath, request.url));
    }
  }

  if (user && isAuthPage) {
    const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
    const redirectPath = providerDashboardPath && nextPath === "/dashboard" ? providerDashboardPath : nextPath;
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return response;
}
