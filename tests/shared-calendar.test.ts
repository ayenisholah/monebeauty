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

test("calendar primary actions keep a contrasting accent treatment", () => {
  const primaryButton = calendar.match(
    /const primaryButtonCls = cn\(([\s\S]*?)\);/,
  )?.[1];

  assert.ok(primaryButton);
  assert.match(primaryButton, /bg-accent/);
  assert.match(primaryButton, /text-page/);
  assert.doesNotMatch(primaryButton, /bg-card|text-body/);
  assert.equal(calendar.match(/className=\{primaryButtonCls\}/g)?.length, 2);
});

test("calendar permissions restrict staff to their own read-only column", () => {
  assert.match(calendarApi, /requireApiUser\(\["ADMIN", "STAFF"\]\)/);
  assert.match(
    calendarApi,
    /user\.role === "STAFF"[\s\S]*?id: ownPractitionerId/,
  );
  assert.match(calendarApi, /editable: user\.role === "ADMIN"/);
  assert.match(moveApi, /user\.role !== "ADMIN"/);
  assert.match(moveApi, /calendar_mutation_denied/);
  assert.match(moveApi, /qualified\.has\(practitionerId\)/);
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
  assert.match(moveApi, /timeOrEmployeeChanged/);
  assert.match(moveApi, /notifyAppointmentChange/);
});
