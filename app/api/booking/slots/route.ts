import { NextResponse, type NextRequest } from "next/server";
import { openSlots } from "@/lib/booking";

/** GET /api/booking/slots?date=YYYY-MM-DD&service=<key> → { slots }. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const service = searchParams.get("service") ?? "";
  const practitioner = searchParams.get("practitioner") ?? "any";

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  try {
    const slots = await openSlots({
      dateStr: date,
      serviceKey: service,
      practitionerId: practitioner,
    });
    return NextResponse.json({ slots });
  } catch {
    // DB unavailable — empty slots so the wizard shows its call/email fallback.
    return NextResponse.json({ slots: [], degraded: true });
  }
}
