import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { availabilityCovers } from "../lib/staff-schedule";

const calendar = readFileSync("components/calendar/SharedCalendar.tsx", "utf8");
const calendarApi = readFileSync("app/api/calendar/route.ts", "utf8");
const moveApi = readFileSync(
  "app/api/calendar/appointments/[id]/route.ts",
  "utf8",
);
const createApi = readFileSync(
  "app/api/calendar/appointments/route.ts",
  "utf8",
);
const appointmentForm = readFileSync(
  "components/calendar/AppointmentForm.tsx",
  "utf8",
);
const migration = readFileSync(
  "prisma/migrations/20260719110000_shared_employee_calendar/migration.sql",
  "utf8",
);

test("availability must cover the complete procedure without gaps", () => {
  const slots = [
    {
      start: "2026-07-20T10:00:00.000Z",
      end: "2026-07-20T10:30:00.000Z",
      status: "open",
    },
    {
      start: "2026-07-20T10:30:00.000Z",
      end: "2026-07-20T11:00:00.000Z",
      status: "open",
    },
  ];
  assert.equal(
    availabilityCovers(
      slots,
      new Date("2026-07-20T10:00:00.000Z"),
      new Date("2026-07-20T11:00:00.000Z"),
    ),
    true,
  );
  assert.equal(
    availabilityCovers(
      [slots[0], { ...slots[1], start: "2026-07-20T10:45:00.000Z" }],
      new Date("2026-07-20T10:00:00.000Z"),
      new Date("2026-07-20T11:00:00.000Z"),
    ),
    false,
  );
  assert.equal(
    availabilityCovers(
      [{ ...slots[0], status: "closed" }, slots[1]],
      new Date("2026-07-20T10:00:00.000Z"),
      new Date("2026-07-20T11:00:00.000Z"),
    ),
    false,
  );
});

test("calendar exposes all-employee views and confirmed drag editing", () => {
  assert.match(calendar, /"day" \| "week" \| "month"/);
  assert.match(calendar, /data\.practitioners\.map/);
  assert.match(calendar, /DndContext/);
  assert.match(calendar, /Confirm calendar change/);
  assert.match(calendar, /appointment\.clientName/);
  assert.match(calendar, /appointment\.procedure/);
  assert.match(calendar, /appointment\.room\?\.name/);
});

test("calendar view persists independently for admin and staff", () => {
  assert.match(calendar, /mone-calendar-view:admin/);
  assert.match(calendar, /mone-calendar-view:staff/);
  assert.match(calendar, /localStorage\.getItem\(viewStorageKey\)/);
  assert.match(calendar, /localStorage\.setItem\(viewStorageKey, next\)/);
  assert.match(
    calendar,
    /value === "day" \|\| value === "week" \|\| value === "month"/,
  );
  assert.match(calendar, /if \(!viewReady\) return/);
  assert.match(calendar, /changeView\("day"\)/);
});

test("calendar primary actions keep a contrasting accent treatment", () => {
  const primaryButton = calendar.match(
    /const primaryButtonCls = cn\(([\s\S]*?)\);/,
  )?.[1];

  assert.ok(primaryButton);
  assert.match(primaryButton, /bg-accent/);
  assert.match(primaryButton, /text-page/);
  assert.doesNotMatch(primaryButton, /bg-card|text-body/);
  assert.ok(
    (calendar.match(/className=\{primaryButtonCls\}/g)?.length ?? 0) >= 3,
  );
});

test("calendar permissions restrict staff operations to their linked employee", () => {
  assert.match(calendarApi, /requireApiUser\(\["ADMIN", "STAFF"\]\)/);
  assert.match(calendarApi, /user\.role === "STAFF"/);
  assert.match(calendarApi, /id: ownPractitionerId!/);
  assert.match(calendarApi, /canManageAppointments: true/);
  assert.match(calendarApi, /canEditOwnAvailability/);
  assert.doesNotMatch(moveApi, /user\.role !== "ADMIN"/);
  assert.match(moveApi, /appointment\.practitionerId !== ownPractitionerId/);
  assert.match(moveApi, /practitionerId !== ownPractitionerId/);
  assert.match(createApi, /practitionerId !== ownPractitionerId/);
  assert.match(moveApi, /qualified\.has\(practitionerId\)/);
});

test("staff can create confirmed appointments from a button or open time", () => {
  assert.match(calendar, /t\.create/);
  assert.match(calendar, /onCreate\(slot\.start, practitioner\.id\)/);
  assert.match(appointmentForm, /Search clients/);
  assert.match(appointmentForm, /Add a new client/);
  assert.match(createApi, /status: "CONFIRMED"/);
  assert.match(createApi, /channel: "staff"/);
  assert.match(createApi, /notifyAppointmentConfirmation/);
  assert.match(createApi, /gdpr_booking_staff/);
});

test("staff can edit open and closed times only through own availability", () => {
  assert.match(calendar, /openAvailabilityEditor/);
  assert.match(calendar, /saveAvailability/);
  assert.match(calendar, /\["open", "closed"\]/);
  assert.match(calendarApi, /canEditOwnAvailability/);
});

test("database rejects employee, room, and device overlaps", () => {
  assert.match(migration, /Appointment_employee_no_overlap/);
  assert.match(migration, /Appointment_room_no_overlap/);
  assert.match(migration, /Appointment_device_no_overlap/);
  assert.match(migration, /tsrange\("start", "end", '\[\)'\)/);
  assert.match(migration, /CREATE EXTENSION IF NOT EXISTS btree_gist/);
});

test("time and employee moves are audited and notify the client", () => {
  assert.match(moveApi, /CALENDAR_UPDATED/);
  assert.match(moveApi, /appointment_calendar_updated/);
  assert.match(moveApi, /scheduleChanged/);
  assert.match(moveApi, /notifyAppointmentChange/);
});
