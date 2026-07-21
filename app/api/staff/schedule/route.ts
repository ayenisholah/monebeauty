import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auditForUser, requireApiUser } from "@/lib/auth";
import { getFirstActivePractitionerId } from "@/lib/booking";
import type { AuthUser } from "@/lib/auth";
import {
  dateFromYmd,
  generateStaffSlots,
  normalizeSlots,
  normalizeWorkingHours,
  parseWorkingHours,
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
    return id || getFirstActivePractitionerId();
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
  const practitionerId = await resolvePractitionerId(
    user,
    searchParams.get("practitionerId"),
  );
  if (!practitionerId) return forbidden();
  const rangeFrom = searchParams.get("from");
  const rangeTo = searchParams.get("to");
  if (rangeFrom && rangeTo) {
    const from = dateFromYmd(rangeFrom);
    const to = dateFromYmd(rangeTo);
    if (
      !from ||
      !to ||
      to < from ||
      to.getTime() - from.getTime() > 62 * 86400000
    )
      return bad("invalid_range");
    const through = new Date(to.getTime() + 86400000);
    const [practitioner, rows] = await Promise.all([
      prisma.practitioner.findUnique({
        where: { id: practitionerId },
        select: { workingHours: true },
      }),
      prisma.availability.findMany({
        where: { practitionerId, date: { gte: from, lt: through } },
        select: { date: true, slots: true },
      }),
    ]);
    const workingHours = parseWorkingHours(practitioner?.workingHours);
    const byDate = new Map(
      rows.map((row) => [
        row.date.toISOString().slice(0, 10),
        normalizeSlots(row.slots),
      ]),
    );
    const dates: string[] = [];
    for (
      let cursor = new Date(from);
      cursor < through;
      cursor = new Date(cursor.getTime() + 86400000)
    ) {
      const date = ymdFromDate(cursor);
      const slots = byDate.get(date) ?? generateStaffSlots(date, workingHours);
      if (slots.some((slot) => slot.status === "open")) dates.push(date);
    }
    return NextResponse.json({ dates, workingHours });
  }
  const requestedDate = searchParams.get("date") ?? ymdFromDate(new Date());
  const date = dateFromYmd(requestedDate);
  if (!date) return bad("invalid_date");

  const [availability, practitioner] = await Promise.all([
    prisma.availability.findUnique({
      where: { practitionerId_date: { practitionerId, date } },
      select: { slots: true },
    }),
    prisma.practitioner.findUnique({
      where: { id: practitionerId },
      select: { workingHours: true },
    }),
  ]);
  const appointments = await prisma.appointment.findMany({
    where: {
      ...(searchParams.get("excludeId")
        ? { id: { not: searchParams.get("excludeId")! } }
        : {}),
      practitionerId,
      status: { not: "CANCELLED" },
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
    : generateStaffSlots(
        requestedDate,
        parseWorkingHours(practitioner?.workingHours),
      );

  return NextResponse.json({
    date: requestedDate,
    workingHours: parseWorkingHours(practitioner?.workingHours),
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

  const dateStr = String(payload.date ?? "");
  const date = dateFromYmd(dateStr);
  if (!date) return bad("invalid_date");
  const practitionerId = await resolvePractitionerId(
    user,
    payload.practitionerId,
  );
  if (!practitionerId) return forbidden();

  if (
    user.role === "STAFF" &&
    payload.practitionerId &&
    String(payload.practitionerId) !== practitionerId
  ) {
    await auditForUser(
      user,
      "availability_mutation_denied",
      "Availability",
      null,
      { outcome: "DENIED", request: req },
    );
    return forbidden();
  }

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

  if (
    user.role === "STAFF" &&
    payload.practitionerId &&
    String(payload.practitionerId) !== practitionerId
  ) {
    await auditForUser(
      user,
      "availability_mutation_denied",
      "Availability",
      null,
      { outcome: "DENIED", request: req },
    );
    return forbidden();
  }

  const hours = normalizeWorkingHours({
    openDays: Array.isArray(payload.openDays)
      ? payload.openDays.map(Number)
      : undefined,
    startHour: Number(payload.startHour),
    endHour: Number(payload.endHour),
    stepMin: Number(payload.stepMin),
  });

  const writes: Prisma.PrismaPromise<unknown>[] = [
    prisma.practitioner.update({
      where: { id: practitionerId },
      data: { workingHours: hours },
    }),
  ];
  for (let i = 0; i <= daysAhead; i++) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    const dateStr = ymdFromDate(date);
    const slots = generateStaffSlots(dateStr, hours);
    writes.push(
      prisma.availability.upsert({
        where: { practitionerId_date: { practitionerId, date } },
        update: { slots },
        create: { practitionerId, date, slots },
      }),
    );
  }

  await prisma.$transaction(writes);

  return NextResponse.json({ changed: daysAhead + 1, workingHours: hours });
}
