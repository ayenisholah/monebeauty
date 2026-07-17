import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DEFAULT_BOOKING_PRACTITIONER_NAME } from "../lib/booking-config";

const wizard = readFileSync("components/booking/BookingWizard.tsx", "utf8");
const bookingRoute = readFileSync("app/api/booking/route.ts", "utf8");
const slotsRoute = readFileSync("app/api/booking/slots/route.ts", "utf8");
const bookingLib = readFileSync("lib/booking.ts", "utf8");
const rescheduleRoute = readFileSync(
  "app/api/booking/reschedule/route.ts",
  "utf8",
);

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

test("provider details stay hidden until the completed confirmation", () => {
  const completedConfirmation = wizard.slice(
    wizard.indexOf("if (confirmation)"),
    wizard.indexOf("const stepLabels"),
  );
  const publicSteps = wizard.slice(
    wizard.indexOf("const stepLabels"),
    wizard.indexOf("const inputCls"),
  );
  assert.match(completedConfirmation, /confirmation\.practitionerName/);
  assert.doesNotMatch(publicSteps, /practitionerName|summary\.practitioner/);
});

test("public booking APIs ignore forged practitioner values", () => {
  assert.match(bookingRoute, /openPublicSlots/);
  assert.match(slotsRoute, /openPublicSlots/);
  assert.doesNotMatch(bookingRoute, /payload\.practitionerId/);
  assert.doesNotMatch(slotsRoute, /searchParams\.get\("practitioner"\)/);
  assert.match(bookingRoute, /practitionerId = matchingSlot\.practitionerId/);
});

test("the named clinic provider is stable while internal rescheduling stays practitioner-aware", () => {
  assert.equal(DEFAULT_BOOKING_PRACTITIONER_NAME, "Mone Beauty Clinic");
  assert.match(
    bookingLib,
    /where: \{ name: DEFAULT_BOOKING_PRACTITIONER_NAME \}/,
  );
  assert.match(bookingLib, /role: "Specialist"/);
  assert.match(bookingLib, /services: \{ connect: \{ id: serviceId \} \}/);
  assert.match(
    bookingLib,
    /openPublicSlots[\s\S]*?practitionerId = await getDefaultPractitionerId\(record\.serviceId\)[\s\S]*?openSlots/,
  );
  assert.match(
    rescheduleRoute,
    /openSlots\([\s\S]*?practitionerId: appointment\.practitionerId/,
  );
  assert.match(
    bookingRoute,
    /status: \{ not: "CANCELLED" \}[\s\S]*?start: \{ lt: endDate \}[\s\S]*?end: \{ gt: startDate \}/,
  );
});
