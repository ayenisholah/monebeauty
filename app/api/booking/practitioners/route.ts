import { NextResponse, type NextRequest } from "next/server";
import { eligiblePractitioners } from "@/lib/booking";

/** GET /api/booking/practitioners?service=<key> -> { practitioners }. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const service = searchParams.get("service") ?? "";

  try {
    const practitioners = await eligiblePractitioners(service);
    return NextResponse.json({ practitioners });
  } catch {
    return NextResponse.json({ practitioners: [], degraded: true });
  }
}
