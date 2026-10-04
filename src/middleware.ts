import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { SESSION_COOKIE, sessionSecret, verifySession } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";

  // 1. Locale prefix: /  -> /ar, /conferences -> /ar/conferences
  if (!isLocale(firstSegment)) {
    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // 2. Admin area requires a signed session with an admin/organizer role.
  if (pathname.startsWith(`/${firstSegment}/admin`)) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verifySession(token, sessionSecret()) : null;
    if (!session || !["admin", "organizer"].includes(session.role)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${firstSegment}/login`;
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();
  response.cookies.set(LOCALE_COOKIE, firstSegment, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export const config = {
  // Skip Next internals, API routes and static files (anything with an extension).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
