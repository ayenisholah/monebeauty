import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Localize public and admin routes; API, internals, and static files stay untouched.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
