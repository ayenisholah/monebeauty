import { BUSINESS_HOURS } from "@/lib/booking-config";

export type StaffSlotStatus = "open" | "closed" | "booked";

export type StaffSlot = {
  start: string;
  end: string;
  status: StaffSlotStatus;
};

export type WorkingHoursInput = {
  openDays: number[];
  startHour: number;
  endHour: number;
  stepMin: number;
};

export type WorkingMinuteRange = { startMinute: number; endMinute: number };

function validDateParts(dateStr: string) {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return { y: Number(y), m: Number(m), d: Number(d) };
}

export function dateFromYmd(dateStr: string): Date | null {
  const parts = validDateParts(dateStr);
  if (!parts) return null;
  const date = new Date(Date.UTC(parts.y, parts.m - 1, parts.d, 0, 0, 0));
  if (
    date.getUTCFullYear() !== parts.y ||
    date.getUTCMonth() !== parts.m - 1 ||
    date.getUTCDate() !== parts.d
  )
    return null;
  return date;
}

export function ymdFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function normalizeWorkingHours(
  value: Partial<WorkingHoursInput> | null | undefined,
): WorkingHoursInput {
  const input = value ?? {};
  const openDays = Array.isArray(input.openDays)
    ? input.openDays
        .map(Number)
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : BUSINESS_HOURS.openDays;
  const startHour = Number.isInteger(input.startHour)
    ? Math.min(22, Math.max(0, Number(input.startHour)))
    : BUSINESS_HOURS.startHour;
  const endHour = Number.isInteger(input.endHour)
    ? Math.min(24, Math.max(startHour + 1, Number(input.endHour)))
    : BUSINESS_HOURS.endHour;
  const stepMin = [15, 30, 45, 60, 90, 120].includes(Number(input.stepMin))
    ? Number(input.stepMin)
    : BUSINESS_HOURS.stepMin;
  return { openDays: [...new Set(openDays)], startHour, endHour, stepMin };
}

export function parseWorkingHours(value: unknown): WorkingHoursInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return normalizeWorkingHours(undefined);
  }
  return normalizeWorkingHours(value as Partial<WorkingHoursInput>);
}

export function workingRangeForDate(
  dateStr: string,
  value: unknown,
): WorkingMinuteRange | null {
  const date = dateFromYmd(dateStr);
  if (!date) return null;
  const hours = parseWorkingHours(value);
  if (!hours.openDays.includes(date.getUTCDay())) return null;
  return { startMinute: hours.startHour * 60, endMinute: hours.endHour * 60 };
}

export function openSlotRange(value: unknown): WorkingMinuteRange | null {
  const open = normalizeSlots(value).filter((slot) => slot.status === "open");
  if (!open.length) return null;
  return open.reduce<WorkingMinuteRange | null>((range, slot) => {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    const startMinute = start.getUTCHours() * 60 + start.getUTCMinutes();
    const endMinute = end.getUTCHours() * 60 + end.getUTCMinutes();
    return range
      ? {
          startMinute: Math.min(range.startMinute, startMinute),
          endMinute: Math.max(range.endMinute, endMinute),
        }
      : { startMinute, endMinute };
  }, null);
}

export function generateStaffSlots(
  dateStr: string,
  input: Partial<WorkingHoursInput> = {},
): StaffSlot[] {
  const date = dateFromYmd(dateStr);
  if (!date) return [];
  const hours = normalizeWorkingHours(input);
  if (!hours.openDays.includes(date.getUTCDay())) return [];

  const out: StaffSlot[] = [];
  for (
    let t = hours.startHour * 60;
    t + hours.stepMin <= hours.endHour * 60;
    t += hours.stepMin
  ) {
    const start = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        Math.floor(t / 60),
        t % 60,
      ),
    );
    const end = new Date(start.getTime() + hours.stepMin * 60000);
    out.push({
      start: start.toISOString(),
      end: end.toISOString(),
      status: "open",
    });
  }
  return out;
}

export function slotsWithBookedStatus(
  slots: StaffSlot[],
  appointments: Array<{ start: Date; end: Date; status: string }>,
): StaffSlot[] {
  return slots.map((slot) => {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    const booked = appointments.some(
      (appt) =>
        appt.status !== "CANCELLED" && start < appt.end && end > appt.start,
    );
    return booked ? { ...slot, status: "booked" } : slot;
  });
}

export function normalizeSlots(value: unknown): StaffSlot[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((slot) => {
      if (!slot || typeof slot !== "object") return null;
      const raw = slot as { start?: unknown; end?: unknown; status?: unknown };
      const start = String(raw.start ?? "");
      const end = String(raw.end ?? "");
      const status = String(raw.status ?? "open");
      if (Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
        return null;
      }
      if (!["open", "closed", "booked"].includes(status)) return null;
      return { start, end, status: status as StaffSlotStatus };
    })
    .filter((slot): slot is StaffSlot => Boolean(slot));
}

export function applyAvailabilityRange(
  rawSlots: unknown,
  dateStr: string,
  startMinute: number,
  endMinute: number,
  status: "open" | "closed",
): StaffSlot[] {
  const date = dateFromYmd(dateStr);
  if (
    !date ||
    !Number.isInteger(startMinute) ||
    !Number.isInteger(endMinute) ||
    startMinute < 0 ||
    endMinute > 1440 ||
    startMinute >= endMinute ||
    startMinute % 15 !== 0 ||
    endMinute % 15 !== 0
  )
    return [];

  const quarters = new Map<number, "open" | "closed">();
  for (const slot of normalizeSlots(rawSlots)) {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    const from = start.getUTCHours() * 60 + start.getUTCMinutes();
    const to = end.getUTCHours() * 60 + end.getUTCMinutes();
    for (let minute = from; minute + 15 <= to; minute += 15) {
      quarters.set(minute, slot.status === "closed" ? "closed" : "open");
    }
  }
  for (let minute = startMinute; minute < endMinute; minute += 15) {
    quarters.set(minute, status);
  }

  return [...quarters]
    .sort(([left], [right]) => left - right)
    .map(([minute, quarterStatus]) => {
      const start = new Date(date);
      start.setUTCMinutes(minute);
      const end = new Date(start.getTime() + 15 * 60_000);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        status: quarterStatus,
      };
    });
}

export function availabilityCovers(rawSlots: unknown, start: Date, end: Date) {
  const intervals = normalizeSlots(rawSlots)
    .filter((slot) => slot.status === "open")
    .map((slot) => ({ start: new Date(slot.start), end: new Date(slot.end) }))
    .filter((slot) => slot.end > slot.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  let cursor = start.getTime();
  for (const slot of intervals) {
    if (slot.end.getTime() <= cursor) continue;
    if (slot.start.getTime() > cursor) return false;
    cursor = Math.max(cursor, slot.end.getTime());
    if (cursor >= end.getTime()) return true;
  }
  return false;
}
