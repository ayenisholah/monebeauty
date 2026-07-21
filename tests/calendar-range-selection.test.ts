import assert from "node:assert/strict";
import test from "node:test";
import {
  calendarRangeContains,
  calendarRangeStart,
  groupCalendarRangeTargets,
  normalizeCalendarRange,
} from "../lib/calendar-range-selection";

const columns = [
  { date: "2026-07-21", practitionerId: "a" },
  { date: "2026-07-21", practitionerId: "b" },
  { date: "2026-07-22", practitionerId: "a" },
  { date: "2026-07-22", practitionerId: "b" },
];

test("calendar ranges normalize reverse drags into a rectangular band", () => {
  const selection = normalizeCalendarRange(
    { ...columns[3], columnIndex: 3, minute: 12 * 60 },
    { ...columns[1], columnIndex: 1, minute: 10 * 60 + 30 },
    columns,
  );
  assert.deepEqual(selection, {
    startMinute: 630,
    endMinute: 735,
    startColumnIndex: 1,
    endColumnIndex: 3,
    targets: columns.slice(1, 4),
  });
  assert.equal(calendarRangeContains(selection, 2, 690), true);
  assert.equal(calendarRangeContains(selection, 0, 690), false);
  assert.equal(calendarRangeContains(selection, 2, 735), false);
});

test("calendar range targets group exact employees by date", () => {
  assert.deepEqual(groupCalendarRangeTargets(columns.slice(1)), [
    { date: "2026-07-21", practitionerIds: ["b"] },
    { date: "2026-07-22", practitionerIds: ["a", "b"] },
  ]);
});

test("calendar range starts remain quarter-hour exact", () => {
  assert.equal(
    calendarRangeStart("2026-07-21", 10 * 60 + 45),
    "2026-07-21T10:45:00.000Z",
  );
  assert.equal(calendarRangeStart("bad", 600), null);
  assert.equal(calendarRangeStart("2026-07-21", 607), null);
});
