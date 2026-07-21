import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const wizard = readFileSync("components/booking/BookingWizard.tsx", "utf8");
const bookingRoute = readFileSync("app/api/booking/route.ts", "utf8");
const slotsRoute = readFileSync("app/api/booking/slots/route.ts", "utf8");
const availabilityRoute = readFileSync(
  "app/api/booking/availability/route.ts",
  "utf8",
);
const bookingLib = readFileSync("lib/booking.ts", "utf8");
const rescheduleRoute = readFileSync(
  "app/api/booking/reschedule/route.ts",
  "utf8",
);
const changeRequests = readFileSync("lib/change-request-actions.ts", "utf8");

test("the public wizard is Service -> Time -> You", () => {
  assert.match(wizard, /type Step = 1 \| 2 \| 3;/);
  assert.match(
    wizard,
    /t\("steps\.service"\),\s*t\("steps\.time"\),\s*t\("steps\.you"\)/,
  );
  assert.doesNotMatch(wizard, /steps\.practitioner/);
  assert.doesNotMatch(wizard, /api\/booking\/practitioners/);
  assert.match(wizard, /useState<Step>\(initialService \? 2 : 1\)/);
  assert.match(wizard, /function pickService[\s\S]*?setStep\(2\)/);
  assert.match(wizard, /function pickSlot[\s\S]*?setStep\(3\)/);
});

test("service and homepage handoffs load availability for a retained date", () => {
  assert.match(
    wizard,
    /function pickService[\s\S]*?setSlot\(null\)[\s\S]*?if \(date\) void loadSlots\(date, key\)/,
  );
  assert.match(
    wizard,
    /if \(preferredDate && resolvedService\) \{\s*void loadSlots\(preferredDate, resolvedService\)/,
  );
  assert.match(wizard, /slotsDegraded[\s\S]*?<FallbackBlock/);
});

test("provider details stay internal throughout the public booking flow", () => {
  const completedConfirmation = wizard.slice(
    wizard.indexOf("if (confirmation)"),
    wizard.indexOf("const stepLabels"),
  );
  const publicSteps = wizard.slice(
    wizard.indexOf("const stepLabels"),
    wizard.indexOf("const inputCls"),
  );
  assert.doesNotMatch(
    completedConfirmation,
    /practitionerName|summary\.practitioner/,
  );
  assert.doesNotMatch(publicSteps, /practitionerName|summary\.practitioner/);
});

test("public booking APIs ignore forged practitioner values", () => {
  assert.match(bookingRoute, /openPublicSlotCandidates/);
  assert.match(slotsRoute, /openPublicSlots/);
  assert.doesNotMatch(bookingRoute, /payload\.practitionerId/);
  assert.doesNotMatch(slotsRoute, /searchParams\.get\("practitioner"\)/);
  assert.match(bookingRoute, /practitionerId: matchingSlot\.practitionerId/);
});

test("the ordered qualified roster and exclusive resources control availability", () => {
  assert.match(bookingLib, /practitioners: \{/);
  assert.match(bookingLib, /displayOrder: "asc"/);
  assert.match(
    bookingLib,
    /for \(const practitioner of record\.svc\.practitioners\)/,
  );
  assert.match(bookingLib, /if \(seen\.has\(slot\.start\)\) return false/);
  assert.match(bookingLib, /record\.svc\.rooms\.length === 0/);
  assert.match(bookingLib, /record\.svc\.requiresDevice/);
  assert.match(bookingLib, /booking\.deviceId !== item\.id/);
  assert.match(rescheduleRoute, /openSlots/);
  assert.match(rescheduleRoute, /appointmentChangeRequest\.create/);
  assert.match(changeRequests, /practitionerId: matching\.practitionerId/);
  assert.match(changeRequests, /roomId: matching\.roomId/);
  assert.match(changeRequests, /deviceId: matching\.deviceId/);
  assert.match(bookingRoute, /for \(const candidate of candidates\)/);
  assert.match(bookingRoute, /lockAndFindReservationConflict/);
});

test("public date pickers receive batched resource-safe working dates", () => {
  assert.match(bookingLib, /openPublicDates/);
  assert.match(bookingLib, /index < requested\.length; index \+= 7/);
  assert.match(bookingLib, /batch\.map\(\(dateStr\) => openSlots/);
  assert.match(availabilityRoute, /62 \* 86400000/);
  assert.match(wizard, /api\/booking\/availability/);
  assert.match(wizard, /availableDates=\{availableDates\}/);
});
