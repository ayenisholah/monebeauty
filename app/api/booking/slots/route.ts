import { NextResponse, type NextRequest } from "next/server";
import { openPublicSlots } from "@/lib/booking";
import { routing, type Locale } from "@/i18n/routing";

/** GET /api/booking/slots?date=YYYY-MM-DD&service=<key> → { slots }. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const service = searchParams.get("service") ?? "";
  const localeParam = searchParams.get("locale");
  const locale = routing.locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : routing.defaultLocale;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  try {
    const slots = await openPublicSlots({
      dateStr: date,
      serviceKey: service,
      locale,
    });
    return NextResponse.json({
      slots: slots.map(({ start, end, label }) => ({ start, end, label })),
    });
  } catch (err) {
    // DB unavailable — empty slots so the wizard shows its call/email fallback.
    console.error("[booking/slots] failed", err);
    return NextResponse.json({ slots: [], degraded: true });
  }
}
