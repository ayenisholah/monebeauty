import { NextResponse, type NextRequest } from "next/server";
import { eligiblePractitioners } from "@/lib/booking";
import { routing, type Locale } from "@/i18n/routing";

/** GET /api/booking/practitioners?service=<key> -> { practitioners }. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const service = searchParams.get("service") ?? "";
  const localeParam = searchParams.get("locale");
  const locale = routing.locales.includes(localeParam as Locale) ? localeParam as Locale : routing.defaultLocale;

  try {
    const practitioners = await eligiblePractitioners(service, locale);
    return NextResponse.json({ practitioners });
  } catch {
    return NextResponse.json({ practitioners: [], degraded: true });
  }
}
