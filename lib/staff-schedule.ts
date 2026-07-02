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

function validDateParts(dateStr: string) {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return { y: Number(y), m: Number(m), d: Number(d) };
}

export function dateFromYmd(dateStr: string): Date | null {
  const parts = validDateParts(dateStr);
  if (!parts) return null;
  return new Date(Date.UTC(parts.y, parts.m - 1, parts.d, 0, 0, 0));
}

export function ymdFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function normalizeWorkingHours(
  value: Partial<WorkingHoursInput>,
): WorkingHoursInput {
  const openDays = Array.isArray(value.openDays)
    ? value.openDays
        .map(Number)
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : BUSINESS_HOURS.openDays;
  const startHour = Number.isInteger(value.startHour)
    ? Math.min(22, Math.max(0, Number(value.startHour)))
    : BUSINESS_HOURS.startHour;
  const endHour = Number.isInteger(value.endHour)
    ? Math.min(24, Math.max(startHour + 1, Number(value.endHour)))
    : BUSINESS_HOURS.endHour;
  const stepMin = [15, 30, 45, 60, 90, 120].includes(Number(value.stepMin))
    ? Number(value.stepMin)
    : BUSINESS_HOURS.stepMin;
  return { openDays: [...new Set(openDays)], startHour, endHour, stepMin };
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
