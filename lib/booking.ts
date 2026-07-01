import { prisma } from "@/lib/db";
import {
  getBookingService,
  type BookingService,
} from "@/content/booking-services";
import { BUSINESS_HOURS } from "@/lib/booking-config";

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
  /** HH:MM clinic-local label. */
  label: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isOpenDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return BUSINESS_HOURS.openDays.includes(weekday);
}

/** Candidate slot start instants for a YYYY-MM-DD and a service duration. */
export function generateSlots(dateStr: string, durationMin: number): Date[] {
  if (!isOpenDate(dateStr)) return [];
  const [y, m, d] = dateStr.split("-").map(Number);
  const out: Date[] = [];
  const start = BUSINESS_HOURS.startHour * 60;
  const end = BUSINESS_HOURS.endHour * 60;
  for (let t = start; t + durationMin <= end; t += BUSINESS_HOURS.stepMin) {
    out.push(new Date(Date.UTC(y, m - 1, d, Math.floor(t / 60), t % 60)));
  }
  return out;
}

/** Open slots for a date + service: candidates minus past times and booked starts. */
export async function openSlots(
  dateStr: string,
  serviceKey: string,
): Promise<SlotDto[]> {
  const svc = getBookingService(serviceKey);
  const duration = svc?.durationMin ?? DEFAULT_DURATION_MIN;
  const candidates = generateSlots(dateStr, duration);
  if (candidates.length === 0) return [];

  const dayStart = candidates[0];
  const dayEnd = new Date(
    candidates[candidates.length - 1].getTime() + duration * 60000,
  );
  const booked = await prisma.appointment.findMany({
    where: {
      start: { gte: dayStart, lt: dayEnd },
      status: { not: "CANCELLED" },
    },
    select: { start: true },
  });
  const takenStarts = new Set(booked.map((b) => b.start.getTime()));

  const now = Date.now();
  return candidates
    .filter((c) => c.getTime() > now && !takenStarts.has(c.getTime()))
    .map((c) => ({
      start: c.toISOString(),
      label: `${pad(c.getUTCHours())}:${pad(c.getUTCMinutes())}`,
    }));
}

/** Find-or-create the single shared default practitioner (self-heals if unseeded). */
export async function getDefaultPractitionerId(): Promise<string> {
  const existing = await prisma.practitioner.findFirst({
    orderBy: { id: "asc" },
  });
  if (existing) return existing.id;
  const created = await prisma.practitioner.create({
    data: { name: "Mone Beauty Clinic", role: "Specialist" },
  });
  return created.id;
}

/** Find-or-create the DB Service row for a booking-service (Service.slug = key). */
export async function getServiceId(svc: BookingService): Promise<string> {
  const existing = await prisma.service.findUnique({
    where: { slug: svc.key },
  });
  if (existing) return existing.id;
  const created = await prisma.service.create({
    data: { slug: svc.key, category: svc.category },
  });
  return created.id;
}
