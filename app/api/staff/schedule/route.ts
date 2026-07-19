import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auditForUser, requireApiUser } from "@/lib/auth";
import { getDefaultPractitionerId } from "@/lib/booking";
import type { AuthUser } from "@/lib/auth";
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

async function resolvePractitionerId(user: AuthUser, requested?: unknown) {
  if (user.role === "ADMIN") {
    const id = String(requested ?? "");
    return id || getDefaultPractitionerId();
  }
  const staff = await prisma.staffUser.findUnique({
    where: { userId: user.id },
    select: { practitionerId: true },
  });
  return staff?.practitionerId ?? null;
}

export async function GET(req: NextRequest) {
  const user = await requireApiUser(["ADMIN", "STAFF"]);
  if (!user) return forbidden();
  const { searchParams } = new URL(req.url);
  const requestedDate = searchParams.get("date") ?? ymdFromDate(new Date());
  const date = dateFromYmd(requestedDate);
  if (!date) return bad("invalid_date");

  const practitionerId = await resolvePractitionerId(
    user,
    searchParams.get("practitionerId"),
  );
  if (!practitionerId) return forbidden();

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
  if (user.role !== "ADMIN") {
    await auditForUser(
      user,
      "availability_mutation_denied",
      "Availability",
      null,
      {
        outcome: "DENIED",
        request: req,
      },
    );
    return forbidden();
  }
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return bad("invalid_json");
  }

  const dateStr = String(payload.date ?? "");
  const date = dateFromYmd(dateStr);
  if (!date) return bad("invalid_date");
  const practitionerId = await resolvePractitionerId(
    user,
    payload.practitionerId,
  );
  if (!practitionerId) return forbidden();

  const slots = normalizeSlots(payload.slots);
  const saved = await prisma.availability.upsert({
    where: { practitionerId_date: { practitionerId, date } },
    update: { slots },
    create: { practitionerId, date, slots },
    select: { date: true, slots: true },
  });

  return NextResponse.json({
    date: ymdFromDate(saved.date),
    slots: normalizeSlots(saved.slots),
  });
}

export async function PUT(req: NextRequest) {
  const user = await requireApiUser(["ADMIN", "STAFF"]);
  if (!user) return forbidden();
  if (user.role !== "ADMIN") {
    await auditForUser(
      user,
      "availability_mutation_denied",
      "Availability",
      null,
      {
        outcome: "DENIED",
        request: req,
      },
    );
    return forbidden();
  }
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return bad("invalid_json");
  }

  const fromDate = String(payload.fromDate ?? ymdFromDate(new Date()));
  const daysAhead = Math.min(90, Math.max(1, Number(payload.daysAhead ?? 30)));
  const start = dateFromYmd(fromDate);
  if (!start) return bad("invalid_date");
  const practitionerId = await resolvePractitionerId(
    user,
    payload.practitionerId,
  );
  if (!practitionerId) return forbidden();

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
