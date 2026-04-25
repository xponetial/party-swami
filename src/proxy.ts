import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/events/:path*",
    "/admin/:path*",
    "/billing/:path*",
    "/images/:path*",
    "/vendors/dashboard/:path*",
    "/planners/dashboard/:path*",
    "/login",
    "/signup",
    "/forgot-password",
  ],
};
