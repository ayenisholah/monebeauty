import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { getDefaultPractitionerId } from "@/lib/booking";
import {
  dateFromYmd,
  generateStaffSlots,
  normalizeSlots,
  normalizeWorkingHours,
  slotsWithBookedStatus,
  ymdFromDate,
} from "@/lib/staff-schedule";

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

function forbidden() {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

async function allowedPractitionerIds(userId: string, role: string) {
  if (role === "ADMIN") {
    const practitioners = await prisma.practitioner.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    });
    return { practitioners, ids: practitioners.map((p) => p.id) };
  }
  const staff = await prisma.staffUser.findUnique({
    where: { userId },
    include: { practitioner: { select: { id: true, name: true, role: true } } },
  });
  const practitioners = staff?.practitioner ? [staff.practitioner] : [];
  return { practitioners, ids: practitioners.map((p) => p.id) };
}

async function practitionerIdOrDefault(id: string | null) {
  if (id) {
    const found = await prisma.practitioner.findUnique({
      where: { id },
      select: { id: true },
    });
    if (found) return found.id;
  }
  return getDefaultPractitionerId();
}

export async function GET(req: NextRequest) {
  const user = await requireApiUser(["ADMIN", "STAFF"]);
  if (!user) return forbidden();
  const { searchParams } = new URL(req.url);
  const requestedDate = searchParams.get("date") ?? ymdFromDate(new Date());
  const date = dateFromYmd(requestedDate);
  if (!date) return bad("invalid_date");

  const { practitioners, ids } = await allowedPractitionerIds(
    user.id,
    user.role,
  );
  if (ids.length === 0) return forbidden();
  const requestedPractitionerId = await practitionerIdOrDefault(
    searchParams.get("practitionerId"),
  );
  const practitionerId = ids.includes(requestedPractitionerId)
    ? requestedPractitionerId
    : ids[0];

  const availability = await prisma.availability.findUnique({
    where: { practitionerId_date: { practitionerId, date } },
    select: { slots: true },
  });
  const appointments = await prisma.appointment.findMany({
    where: {
      practitionerId,
      start: { gte: date, lt: new Date(date.getTime() + 24 * 60 * 60000) },
    },
    orderBy: { start: "asc" },
    include: {
      client: { select: { fullName: true, phone: true, email: true } },
      service: { select: { slug: true } },
    },
  });

  const baseSlots = availability
    ? normalizeSlots(availability.slots)
    : generateStaffSlots(requestedDate);

  return NextResponse.json({
    practitioners,
    practitionerId,
    date: requestedDate,
    slots: slotsWithBookedStatus(baseSlots, appointments),
    appointments: appointments.map((appt) => ({
      id: appt.id,
      start: appt.start.toISOString(),
      end: appt.end.toISOString(),
      status: appt.status,
      serviceSlug: appt.service.slug,
      procedureTitle: appt.procedureTitle,
      procedurePrice: appt.procedurePrice,
      clientName: appt.client.fullName,
      clientPhone: appt.client.phone,
      clientEmail: appt.client.email,
      notes: appt.notes,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await requireApiUser(["ADMIN", "STAFF"]);
  if (!user) return forbidden();
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return bad("invalid_json");
  }

  const practitionerId = String(payload.practitionerId ?? "");
  const dateStr = String(payload.date ?? "");
  const date = dateFromYmd(dateStr);
  if (!practitionerId) return bad("practitioner_required");
  if (!date) return bad("invalid_date");
  const { ids } = await allowedPractitionerIds(user.id, user.role);
  if (!ids.includes(practitionerId)) return forbidden();

  const slots = normalizeSlots(payload.slots);
  const saved = await prisma.availability.upsert({
    where: { practitionerId_date: { practitionerId, date } },
    update: { slots },
    create: { practitionerId, date, slots },
    select: { practitionerId: true, date: true, slots: true },
  });

  return NextResponse.json({
    practitionerId: saved.practitionerId,
    date: ymdFromDate(saved.date),
    slots: normalizeSlots(saved.slots),
  });
}

export async function PUT(req: NextRequest) {
  const user = await requireApiUser(["ADMIN", "STAFF"]);
  if (!user) return forbidden();
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return bad("invalid_json");
  }

  const practitionerId = String(payload.practitionerId ?? "");
  const fromDate = String(payload.fromDate ?? ymdFromDate(new Date()));
  const daysAhead = Math.min(90, Math.max(1, Number(payload.daysAhead ?? 30)));
  const start = dateFromYmd(fromDate);
  if (!practitionerId) return bad("practitioner_required");
  if (!start) return bad("invalid_date");
  const { ids } = await allowedPractitionerIds(user.id, user.role);
  if (!ids.includes(practitionerId)) return forbidden();

  const hours = normalizeWorkingHours({
    openDays: Array.isArray(payload.openDays)
      ? payload.openDays.map(Number)
      : undefined,
    startHour: Number(payload.startHour),
    endHour: Number(payload.endHour),
    stepMin: Number(payload.stepMin),
  });

  let changed = 0;
  for (let i = 0; i <= daysAhead; i++) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    const dateStr = ymdFromDate(date);
    const slots = generateStaffSlots(dateStr, hours);
    await prisma.availability.upsert({
      where: { practitionerId_date: { practitionerId, date } },
      update: { slots },
      create: { practitionerId, date, slots },
    });
    changed += 1;
  }

  return NextResponse.json({ changed, workingHours: hours });
}
