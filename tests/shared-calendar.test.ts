import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  availabilityCovers,
  applyAvailabilityRange,
  generateStaffSlots,
  openSlotRange,
  workingRangeForDate,
} from "../lib/staff-schedule";

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
const blockApi = readFileSync("app/api/calendar/blocks/route.ts", "utf8");
const scheduleApi = readFileSync("app/api/staff/schedule/route.ts", "utf8");
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

test("availability range updates preserve other quarters", () => {
  const base = generateStaffSlots("2026-07-21", {
    openDays: [2],
    startHour: 10,
    endHour: 12,
    stepMin: 30,
  });
  const changed = applyAvailabilityRange(
    base,
    "2026-07-21",
    630,
    675,
    "closed",
  );
  assert.equal(changed.length, 8);
  assert.deepEqual(
    changed
      .filter((slot) => slot.status === "closed")
      .map((slot) => slot.start.slice(11, 16)),
    ["10:30", "10:45", "11:00"],
  );
  assert.equal(
    applyAvailabilityRange([], "2026-07-21", 600, 630, "open").length,
    2,
  );
});

test("working-hour helpers expose only configured dates and open slot bounds", () => {
  const hours = { openDays: [1], startHour: 10, endHour: 18, stepMin: 30 };
  assert.equal(generateStaffSlots("2026-07-20", hours).length, 16);
  assert.equal(generateStaffSlots("2026-07-21", hours).length, 0);
  assert.deepEqual(workingRangeForDate("2026-07-20", hours), {
    startMinute: 600,
    endMinute: 1080,
  });
  assert.deepEqual(
    openSlotRange([
      {
        start: "2026-07-20T10:30:00.000Z",
        end: "2026-07-20T11:00:00.000Z",
        status: "open",
      },
      {
        start: "2026-07-20T17:00:00.000Z",
        end: "2026-07-20T17:30:00.000Z",
        status: "open",
      },
      {
        start: "2026-07-20T09:00:00.000Z",
        end: "2026-07-20T09:30:00.000Z",
        status: "closed",
      },
    ]),
    { startMinute: 630, endMinute: 1050 },
  );
});

test("calendar exposes all-employee views and confirmed drag editing", () => {
  assert.match(calendar, /"day" \| "week" \| "month"/);
  assert.match(calendar, /data\.practitioners\.map/);
  assert.match(calendar, /DndContext/);
  assert.match(calendar, /DragOverlay/);
  assert.match(calendar, /handleDragStart/);
  assert.match(calendar, /Confirm calendar change/);
  assert.match(calendar, /appointment\.clientName/);
  assert.match(calendar, /appointment\.procedure/);
  assert.match(calendar, /appointment\.room\?\.name/);
  assert.match(calendar, /calendarWorkingBounds/);
  assert.match(calendar, /outsideAppointments/);
  assert.doesNotMatch(calendar, /const HOUR_START = 6/);
  assert.match(calendar, /grid-cols-\[140px_minmax\(0,1fr\)\]/);
  assert.match(calendar, /InternalServicePaletteEditor/);
  assert.match(calendar, /cell:\$\{day\}:\$\{practitioner\.id\}:\$\{minute\}/);
  assert.match(
    calendar,
    /calendarDropStart\(targetDate, Number\(targetMinuteRaw\)\)/,
  );
  assert.match(calendar, /startMinute: 10 \* 60/);
  assert.match(calendar, /endMinute: 19 \* 60/);
  assert.match(calendar, /transparent \$\{hourHeight - 1\}px/);
  assert.match(calendar, /border-0 bg-transparent/);
  assert.match(calendar, /isOver && "bg-accent\/20/);
  assert.match(calendar, /length: view === "day" \? 1 : 7/);
  assert.match(calendar, /lg:min-h-\[34px\]/);
  assert.match(calendar, /const employeeButtonCls =\s*"[^"]*min-h-\[34px\]/);
  assert.match(calendarApi, /dragLabel:/);
  assert.match(calendarApi, /defaultEnabled:/);
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

test("staff can create confirmed appointments from a button or selected range", () => {
  assert.match(calendar, /t\.create/);
  assert.match(calendar, /applyRangeAction\("appointment"\)/);
  assert.match(calendar, /durationMin/);
  assert.match(appointmentForm, /Search clients/);
  assert.match(appointmentForm, /Add a new client/);
  assert.match(createApi, /status: "CONFIRMED"/);
  assert.match(createApi, /channel: "staff"/);
  assert.match(createApi, /notifyAppointmentConfirmation/);
  assert.match(createApi, /gdpr_booking_staff/);
});

test("day and week support rectangular range actions without an inner vertical scroll", () => {
  assert.match(calendar, /overflow-x-auto overflow-y-hidden/);
  assert.match(calendar, /TIME_GRID_EDGE_PADDING = 12/);
  assert.match(
    calendar,
    /height: timelineHeight \+ TIME_GRID_EDGE_PADDING \* 2/,
  );
  assert.match(calendar, /normalizeCalendarRange/);
  assert.match(calendar, /applyRangeAction\("block"\)/);
  assert.match(calendar, /applyRangeAction\("open"\)/);
  assert.match(calendar, /applyRangeAction\("closed"\)/);
  assert.match(scheduleApi, /export async function PATCH/);
  assert.match(scheduleApi, /applyAvailabilityRange/);
  assert.match(blockApi, /exactTargets/);
});

test("month dates remain navigable without availability or events", () => {
  const monthView = calendar.slice(calendar.indexOf("function MonthView"));
  assert.doesNotMatch(monthView, /disabled=\{!working/);
  assert.match(monthView, /onClick=\{\(\) => onOpenDay\(date\)\}/);
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
