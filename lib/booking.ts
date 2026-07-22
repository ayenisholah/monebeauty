import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BUSINESS_HOURS } from "@/lib/booking-config";
import type { Locale } from "@/i18n/routing";
import {
  availabilityCovers,
  generateStaffSlots,
  normalizeSlots,
  parseWorkingHours,
  type WorkingHoursInput,
} from "@/lib/staff-schedule";
import {
  clinicDateBounds,
  clinicTimeFromInstant,
  parseClinicDateTime,
} from "@/lib/clinic-time";

export { BUSINESS_HOURS };

const DEFAULT_DURATION_MIN = 60;
type SchedulingClient = Prisma.TransactionClient | typeof prisma;

export interface SlotDto {
  start: string;
  end: string;
  label: string;
  practitionerId: string;
  roomId: string;
  deviceId: string | null;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function logicalDate(dateStr: string) {
  const parsed = parseClinicDateTime(dateStr);
  return parsed
    ? new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day))
    : null;
}

function addDays(dateStr: string, amount: number) {
  const date = logicalDate(dateStr);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

/** Candidate starts for a clinic date, represented as real instants. */
export function generateSlots(
  dateStr: string,
  durationMin: number,
  input: Partial<WorkingHoursInput> = {},
): Date[] {
  const schedule = parseWorkingHours(input);
  const availability = generateStaffSlots(dateStr, schedule);
  const starts = new Map<string, Date>();
  for (const slot of availability) {
    const start = new Date(slot.start);
    const end = new Date(start.getTime() + durationMin * 60_000);
    if (availabilityCovers(availability, start, end)) {
      starts.set(start.toISOString(), start);
    }
  }
  return [...starts.values()].sort(
    (left, right) => left.getTime() - right.getTime(),
  );
}

async function serviceRecord(
  client: SchedulingClient,
  serviceKey: string,
  locale?: Locale,
) {
  const db = client as typeof prisma;
  const service = await db.service.findFirst({
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
      requiresDevice: true,
      capabilities: {
        where: {
          practitioner: { active: true },
          room: { active: true },
        },
        orderBy: [
          { practitioner: { displayOrder: "asc" } },
          { room: { displayOrder: "asc" } },
        ],
        select: {
          practitioner: { select: { id: true, workingHours: true } },
          room: { select: { id: true } },
          devices: {
            where: { device: { active: true } },
            orderBy: { device: { displayOrder: "asc" } },
            select: { device: { select: { id: true } } },
          },
        },
      },
    },
  });
  return service ? { svc: service, serviceId: service.id } : null;
}

function candidateAvailability(
  dateStr: string,
  durationMin: number,
  override: unknown | undefined,
  workingHours: unknown,
) {
  const available =
    override === undefined
      ? generateStaffSlots(dateStr, parseWorkingHours(workingHours))
      : normalizeSlots(override);
  return available
    .filter((slot) => slot.status === "open")
    .map((slot) => new Date(slot.start))
    .filter((start) => {
      const end = new Date(start.getTime() + durationMin * 60_000);
      return availabilityCovers(available, start, end);
    });
}

async function collectSlotCandidates(
  {
    dates,
    serviceKey,
    locale,
  }: { dates: string[]; serviceKey: string; locale?: Locale },
  client: SchedulingClient = prisma,
): Promise<SlotDto[]> {
  if (!dates.length) return [];
  const db = client as typeof prisma;
  const record = await serviceRecord(client, serviceKey, locale);
  if (!record) return [];
  const duration = record.svc.durationMin ?? DEFAULT_DURATION_MIN;
  const completeCapabilities = record.svc.capabilities.filter(
    (item) => !record.svc.requiresDevice || item.devices.length > 0,
  );
  const practitionerIds = Array.from(
    new Set(completeCapabilities.map((item) => item.practitioner.id)),
  );
  if (!completeCapabilities.length || !practitionerIds.length) return [];

  const firstBounds = clinicDateBounds(dates[0]);
  const lastBounds = clinicDateBounds(dates.at(-1)!);
  const logicalDates = dates
    .map(logicalDate)
    .filter((date): date is Date => Boolean(date));
  if (!firstBounds || !lastBounds || logicalDates.length !== dates.length)
    return [];

  const roomIds = Array.from(
    new Set(completeCapabilities.map((item) => item.room.id)),
  );
  const deviceIds = Array.from(
    new Set(
      completeCapabilities.flatMap((item) =>
        item.devices.map((link) => link.device.id),
      ),
    ),
  );
  const resourceOr = [
    { practitionerId: { in: practitionerIds } },
    { roomId: { in: roomIds } },
    ...(deviceIds.length ? [{ deviceId: { in: deviceIds } }] : []),
  ];
  const [availabilityRows, booked, blocked] = await Promise.all([
    db.availability.findMany({
      where: {
        practitionerId: { in: practitionerIds },
        date: { in: logicalDates },
      },
      select: { practitionerId: true, date: true, slots: true },
    }),
    db.appointment.findMany({
      where: {
        status: { not: "CANCELLED" },
        start: { lt: lastBounds.end },
        end: { gt: firstBounds.start },
        OR: resourceOr,
      },
      select: {
        practitionerId: true,
        roomId: true,
        deviceId: true,
        start: true,
        end: true,
      },
    }),
    db.calendarBlock.findMany({
      where: {
        status: "ACTIVE",
        start: { lt: lastBounds.end },
        end: { gt: firstBounds.start },
        OR: [
          {
            participants: { some: { practitionerId: { in: practitionerIds } } },
          },
          { roomId: { in: roomIds } },
          ...(deviceIds.length ? [{ deviceId: { in: deviceIds } }] : []),
        ],
      },
      select: {
        roomId: true,
        deviceId: true,
        start: true,
        end: true,
        participants: { select: { practitionerId: true } },
      },
    }),
  ]);

  const overrides = new Map(
    availabilityRows.map((row) => [
      `${row.practitionerId}:${row.date.toISOString().slice(0, 10)}`,
      row.slots,
    ]),
  );
  const practitionerOrder = new Map(
    practitionerIds.map((id, index) => [id, index]),
  );
  const roomOrder = new Map(roomIds.map((id, index) => [id, index]));
  const deviceOrder = new Map(deviceIds.map((id, index) => [id, index]));
  const now = Date.now();
  const out: SlotDto[] = [];

  for (const dateStr of dates) {
    for (const capability of completeCapabilities) {
      const practitioner = capability.practitioner;
      const key = `${practitioner.id}:${dateStr}`;
      const starts = candidateAvailability(
        dateStr,
        duration,
        overrides.has(key) ? overrides.get(key) : undefined,
        practitioner.workingHours,
      );
      for (const start of starts) {
        if (start.getTime() <= now) continue;
        const end = new Date(start.getTime() + duration * 60_000);
        const employeeBusy =
          booked.some(
            (appointment) =>
              appointment.practitionerId === practitioner.id &&
              overlaps(start, end, appointment.start, appointment.end),
          ) ||
          blocked.some(
            (block) =>
              block.participants.some(
                (participant) => participant.practitionerId === practitioner.id,
              ) && overlaps(start, end, block.start, block.end),
          );
        if (employeeBusy) continue;

        const room = capability.room;
        const roomFree =
          booked.every(
            (appointment) =>
              appointment.roomId !== room.id ||
              !overlaps(start, end, appointment.start, appointment.end),
          ) &&
          blocked.every(
            (block) =>
              block.roomId !== room.id ||
              !overlaps(start, end, block.start, block.end),
          );
        if (!roomFree) continue;
        const freeDevices = record.svc.requiresDevice
          ? capability.devices
              .map((link) => link.device)
              .filter(
                (device) =>
                  booked.every(
                    (appointment) =>
                      appointment.deviceId !== device.id ||
                      !overlaps(start, end, appointment.start, appointment.end),
                  ) &&
                  blocked.every(
                    (block) =>
                      block.deviceId !== device.id ||
                      !overlaps(start, end, block.start, block.end),
                  ),
              )
          : [null];
        for (const device of freeDevices) {
          out.push({
            start: start.toISOString(),
            end: end.toISOString(),
            label: clinicTimeFromInstant(start),
            practitionerId: practitioner.id,
            roomId: room.id,
            deviceId: device?.id ?? null,
          });
        }
      }
    }
  }

  return out.sort(
    (left, right) =>
      left.start.localeCompare(right.start) ||
      (practitionerOrder.get(left.practitionerId) ?? 0) -
        (practitionerOrder.get(right.practitionerId) ?? 0) ||
      (roomOrder.get(left.roomId) ?? 0) - (roomOrder.get(right.roomId) ?? 0) ||
      (left.deviceId ? (deviceOrder.get(left.deviceId) ?? 0) : -1) -
        (right.deviceId ? (deviceOrder.get(right.deviceId) ?? 0) : -1),
  );
}

export async function openSlots(args: {
  dateStr: string;
  serviceKey: string;
  locale?: Locale;
}): Promise<SlotDto[]> {
  const candidates = await collectSlotCandidates({
    dates: [args.dateStr],
    serviceKey: args.serviceKey,
    locale: args.locale,
  });
  const seen = new Set<string>();
  return candidates.filter((slot) => {
    if (seen.has(slot.start)) return false;
    seen.add(slot.start);
    return true;
  });
}

export async function openPublicSlotCandidates(
  args: {
    dateStr: string;
    serviceKey: string;
    locale?: Locale;
    start: string;
  },
  client: SchedulingClient = prisma,
) {
  return (
    await collectSlotCandidates(
      {
        dates: [args.dateStr],
        serviceKey: args.serviceKey,
        locale: args.locale,
      },
      client,
    )
  ).filter((slot) => slot.start === args.start);
}

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
  const dates: string[] = [];
  for (let date = fromDate; date && date <= toDate; date = addDays(date, 1)) {
    dates.push(date);
    if (dates.length > 63) break;
  }
  const candidates = await collectSlotCandidates({ dates, serviceKey, locale });
  // Slot instants can be the previous UTC date; map through the requested candidate labels.
  return dates.filter((date) =>
    candidates.some((slot) => {
      const bounds = clinicDateBounds(date);
      return (
        bounds &&
        new Date(slot.start) >= bounds.start &&
        new Date(slot.start) < bounds.end
      );
    }),
  );
}

export async function openPublicSlots(args: {
  dateStr: string;
  serviceKey: string;
  locale?: Locale;
}) {
  return openSlots(args);
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

export async function getServiceId(serviceKey: string): Promise<string> {
  const existing = await serviceRecord(prisma, serviceKey);
  if (!existing) throw new Error("unknown_service");
  return existing.serviceId;
}

export async function appointmentByReference(reference: string) {
  const id = reference.trim();
  if (!id) return null;
  return prisma.appointment.findFirst({
    where: { OR: [{ id }, { id: { endsWith: id } }] },
    include: { client: true, service: true },
  });
}
