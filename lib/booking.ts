import { prisma } from "@/lib/db";
import { BUSINESS_HOURS } from "@/lib/booking-config";
import type { Locale } from "@/i18n/routing";
import {
  availabilityCovers,
  parseWorkingHours,
  type WorkingHoursInput,
} from "@/lib/staff-schedule";

/**
 * Lean booking slot logic. Times are treated as clinic wall-clock (Helsinki) and stored as
 * the matching UTC instant — a deliberate simplification for the first iteration (no
 * per-practitioner availability; a single shared default practitioner). The bookable window
 * lives in `lib/booking-config.ts` (client-safe) and is re-exported here for convenience.
 */
export { BUSINESS_HOURS };

const DEFAULT_DURATION_MIN = 60;

export interface SlotDto {
  /** ISO start instant. */
  start: string;
  /** ISO end instant. */
  end: string;
  /** HH:MM clinic-local label. */
  label: string;
  /** Practitioner that will receive the booking. */
  practitionerId: string;
  /** Internally allocated room; omitted from the public slots response. */
  roomId: string;
  /** Internally allocated physical device, when the service requires one. */
  deviceId: string | null;
}

type AvailabilitySlot = {
  start: string;
  end?: string;
  status?: "open" | "closed" | "booked";
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isOpenDate(
  dateStr: string,
  hours: WorkingHoursInput = parseWorkingHours(undefined),
): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return hours.openDays.includes(weekday);
}

/** Candidate slot start instants for a YYYY-MM-DD and a service duration. */
export function generateSlots(
  dateStr: string,
  durationMin: number,
  input: Partial<WorkingHoursInput> = {},
): Date[] {
  const hours = parseWorkingHours(input);
  if (!isOpenDate(dateStr, hours)) return [];
  const [y, m, d] = dateStr.split("-").map(Number);
  const out: Date[] = [];
  const start = hours.startHour * 60;
  const end = hours.endHour * 60;
  for (let t = start; t + durationMin <= end; t += hours.stepMin) {
    out.push(new Date(Date.UTC(y, m - 1, d, Math.floor(t / 60), t % 60)));
  }
  return out;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function dateLabel(date: Date): string {
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

async function serviceRecord(serviceKey: string, locale?: Locale) {
  const service = await prisma.service.findFirst({
    where: {
      slug: serviceKey,
      bookable: true,
      archivedAt: null,
      ...(locale
        ? { contents: { some: { locale, status: "PUBLISHED" } } }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      durationMin: true,
      practitioners: {
        where: { active: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: { id: true, workingHours: true },
      },
      requiresDevice: true,
      rooms: {
        where: { active: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: { id: true },
      },
      devices: {
        where: { active: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: { id: true },
      },
    },
  });
  return service ? { svc: service, serviceId: service.id } : null;
}

async function candidateSlotsForPractitioner(
  dateStr: string,
  durationMin: number,
  practitionerId: string,
  workingHours: WorkingHoursInput,
): Promise<Array<{ start: Date; end: Date }>> {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const availability = await prisma.availability.findUnique({
    where: { practitionerId_date: { practitionerId, date } },
    select: { slots: true },
  });

  if (availability) {
    const raw = Array.isArray(availability.slots)
      ? (availability.slots as AvailabilitySlot[])
      : [];
    return raw
      .filter((slot) => (slot.status ?? "open") === "open")
      .map((slot) => {
        const start = new Date(slot.start);
        const end = new Date(start.getTime() + durationMin * 60000);
        return { start, end };
      })
      .filter(
        (slot) =>
          !Number.isNaN(slot.start.getTime()) &&
          !Number.isNaN(slot.end.getTime()) &&
          slot.end.getTime() > slot.start.getTime() &&
          availabilityCovers(availability.slots, slot.start, slot.end),
      );
  }

  return generateSlots(dateStr, durationMin, workingHours).map((start) => ({
    start,
    end: new Date(start.getTime() + durationMin * 60000),
  }));
}

async function collectSlotCandidates({
  dateStr,
  serviceKey,
  locale,
}: {
  dateStr: string;
  serviceKey: string;
  locale?: Locale;
}): Promise<SlotDto[]> {
  const record = await serviceRecord(serviceKey, locale);
  if (!record) return [];
  const duration = record.svc.durationMin ?? DEFAULT_DURATION_MIN;
  const practitionerIds = record.svc.practitioners.map((item) => item.id);
  if (!practitionerIds.length || record.svc.rooms.length === 0) return [];
  if (record.svc.requiresDevice && record.svc.devices.length === 0) return [];

  const [y, m, d] = dateStr.split("-").map(Number);
  const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const dayEnd = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
  const booked = await prisma.appointment.findMany({
    where: {
      start: { gte: dayStart, lt: dayEnd },
      status: { not: "CANCELLED" },
      OR: [
        { practitionerId: { in: practitionerIds } },
        { roomId: { in: record.svc.rooms.map((room) => room.id) } },
        ...(record.svc.devices.length
          ? [
              {
                deviceId: {
                  in: record.svc.devices.map((device) => device.id),
                },
              },
            ]
          : []),
      ],
    },
    select: {
      practitionerId: true,
      roomId: true,
      deviceId: true,
      start: true,
      end: true,
    },
  });
  const blocked = await prisma.calendarBlock.findMany({
    where: {
      status: "ACTIVE",
      start: { lt: dayEnd },
      end: { gt: dayStart },
      OR: [
        { participants: { some: { practitionerId: { in: practitionerIds } } } },
        { roomId: { in: record.svc.rooms.map((room) => room.id) } },
        ...(record.svc.devices.length
          ? [
              {
                deviceId: { in: record.svc.devices.map((device) => device.id) },
              },
            ]
          : []),
      ],
    },
    select: {
      roomId: true,
      deviceId: true,
      start: true,
      end: true,
      participants: { select: { practitionerId: true } },
    },
  });

  const now = Date.now();
  const out: SlotDto[] = [];
  for (const practitioner of record.svc.practitioners) {
    const candidates = await candidateSlotsForPractitioner(
      dateStr,
      duration,
      practitioner.id,
      parseWorkingHours(practitioner.workingHours),
    );
    for (const candidate of candidates) {
      if (candidate.start.getTime() <= now) continue;
      const employeeClash = booked.some(
        (booking) =>
          booking.practitionerId === practitioner.id &&
          overlaps(candidate.start, candidate.end, booking.start, booking.end),
      );
      const employeeBlock = blocked.some(
        (block) =>
          block.participants.some(
            (participant) => participant.practitionerId === practitioner.id,
          ) && overlaps(candidate.start, candidate.end, block.start, block.end),
      );
      if (employeeClash || employeeBlock) continue;
      const room = record.svc.rooms.find(
        (item) =>
          booked.every(
            (booking) =>
              booking.roomId !== item.id ||
              !overlaps(
                candidate.start,
                candidate.end,
                booking.start,
                booking.end,
              ),
          ) &&
          blocked.every(
            (block) =>
              block.roomId !== item.id ||
              !overlaps(candidate.start, candidate.end, block.start, block.end),
          ),
      );
      if (!room) continue;
      const device = record.svc.requiresDevice
        ? record.svc.devices.find(
            (item) =>
              booked.every(
                (booking) =>
                  booking.deviceId !== item.id ||
                  !overlaps(
                    candidate.start,
                    candidate.end,
                    booking.start,
                    booking.end,
                  ),
              ) &&
              blocked.every(
                (block) =>
                  block.deviceId !== item.id ||
                  !overlaps(
                    candidate.start,
                    candidate.end,
                    block.start,
                    block.end,
                  ),
              ),
          )
        : null;
      if (record.svc.requiresDevice && !device) continue;
      out.push({
        start: candidate.start.toISOString(),
        end: candidate.end.toISOString(),
        label: dateLabel(candidate.start),
        practitionerId: practitioner.id,
        roomId: room.id,
        deviceId: device?.id ?? null,
      });
    }
  }
  return out.sort(
    (a, b) =>
      a.start.localeCompare(b.start) ||
      practitionerIds.indexOf(a.practitionerId) -
        practitionerIds.indexOf(b.practitionerId),
  );
}

/** Open public/admin slots, deduplicated to the first available employee. */
export async function openSlots(args: {
  dateStr: string;
  serviceKey: string;
  locale?: Locale;
}): Promise<SlotDto[]> {
  const candidates = await collectSlotCandidates(args);
  const seen = new Set<string>();
  return candidates.filter((slot) => {
    if (seen.has(slot.start)) return false;
    seen.add(slot.start);
    return true;
  });
}

/** Ordered internal candidates used by the locked public booking transaction. */
export async function openPublicSlotCandidates(args: {
  dateStr: string;
  serviceKey: string;
  locale?: Locale;
  start: string;
}) {
  return (await collectSlotCandidates(args)).filter(
    (slot) => slot.start === args.start,
  );
}

/** Dates with at least one currently bookable slot, resolved in one batched query. */
export async function openPublicDates({
  fromDate,
  toDate,
  serviceKey,
  locale,
}: {
  fromDate: string;
  toDate: string;
  serviceKey: string;
  locale?: Locale;
}): Promise<string[]> {
  const from = new Date(`${fromDate}T00:00:00.000Z`);
  const through = new Date(`${toDate}T00:00:00.000Z`);
  const until = new Date(through.getTime() + 24 * 60 * 60 * 1000);
  const requested: string[] = [];
  for (
    let cursor = new Date(from);
    cursor < until;
    cursor = new Date(cursor.getTime() + 86400000)
  ) {
    requested.push(cursor.toISOString().slice(0, 10));
  }
  const dates: string[] = [];
  for (let index = 0; index < requested.length; index += 7) {
    const batch = requested.slice(index, index + 7);
    const results = await Promise.all(
      batch.map((dateStr) => openSlots({ dateStr, serviceKey, locale })),
    );
    results.forEach((slots, offset) => {
      if (slots.length) dates.push(batch[offset]);
    });
  }
  return dates;
}

/** Public availability uses the ordered qualified employee roster. */
export async function openPublicSlots({
  dateStr,
  serviceKey,
  locale,
}: {
  dateStr: string;
  serviceKey: string;
  locale?: Locale;
}): Promise<SlotDto[]> {
  return openSlots({ dateStr, serviceKey, locale });
}

export async function getFirstActivePractitionerId(): Promise<string> {
  const practitioner = await prisma.practitioner.findFirst({
    where: { active: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  if (!practitioner) throw new Error("employee_required");
  return practitioner.id;
}

/** Resolve an existing database-owned booking service; runtime never self-seeds content. */
export async function getServiceId(serviceKey: string): Promise<string> {
  const existing = await serviceRecord(serviceKey);
  if (!existing) throw new Error("unknown_service");
  return existing.serviceId;
}

export async function appointmentByReference(reference: string) {
  const id = reference.trim();
  if (!id) return null;
  return prisma.appointment.findFirst({
    where: {
      OR: [{ id }, { id: { endsWith: id } }],
    },
    include: { client: true, service: true },
  });
}
