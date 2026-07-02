import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match public localized paths except admin, API, Next internals, and files with an extension.
  matcher: ["/((?!admin|api|_next|_vercel|.*\\..*).*)"],
};
