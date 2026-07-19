import { NextResponse, type NextRequest } from "next/server";
import { auditForUser, requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffPractitionerId } from "@/lib/calendar-scheduling";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser(["ADMIN", "STAFF"]);
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const own = await staffPractitionerId(user);
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          fullName: true,
          email: true,
          phone: true,
          contraindications: true,
        },
      },
      service: { select: { slug: true } },
      room: { select: { name: true } },
      device: { select: { name: true } },
    },
  });
  if (
    !appointment ||
    (user.role === "STAFF" && appointment.practitionerId !== own)
  ) {
    await auditForUser(
      user,
      "appointment_sensitive_access_denied",
      "Appointment",
      id,
      { outcome: "DENIED", request: req },
    );
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (user.role === "STAFF")
    await auditForUser(
      user,
      "appointment_sensitive_details_viewed",
      "Appointment",
      id,
      { request: req },
    );
  return NextResponse.json({
    id: appointment.id,
    client: appointment.client,
    procedure: appointment.procedureTitle ?? appointment.service.slug,
    start: appointment.start.toISOString(),
    end: appointment.end.toISOString(),
    notes: appointment.notes,
    room: appointment.room?.name ?? null,
    device: appointment.device?.name ?? null,
  });
}
