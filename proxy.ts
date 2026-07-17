import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { canonicalizeLegacyPublicPath } from "./lib/public-routes";

const localeMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const canonicalPath = canonicalizeLegacyPublicPath(request.nextUrl.pathname);
  if (canonicalPath) {
    const destination = request.nextUrl.clone();
    destination.pathname = canonicalPath;
    return NextResponse.redirect(destination, 308);
  }
  return localeMiddleware(request);
}

export const config = {
  // Localize public and admin routes; API, internals, and static files stay untouched.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
