import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { appointmentSms, orderSms, smsSegments } from "../lib/sms";
import { normalizeInternationalPhone } from "../lib/phone";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const router = readFileSync("components/admin/AdminRouter.tsx", "utf8");
const shell = readFileSync("components/admin/AdminShell.tsx", "utf8");
const operations = readFileSync("components/admin/AdminOperations.tsx", "utf8");
const actions = readFileSync("lib/admin-actions.ts", "utf8");
const checkout = readFileSync("app/api/checkout/route.ts", "utf8");
const reschedule = readFileSync("app/api/booking/reschedule/route.ts", "utf8");

test("orders and appointments are first-class admin modules", () => {
  assert.match(shell, /module: "appointments"/);
  assert.match(shell, /module: "orders"/);
  assert.match(router, /module: "appointments"/);
  assert.match(router, /module: "orders"/);
  assert.match(router, /<AppointmentsAdmin/);
  assert.match(router, /<OrdersAdmin/);
  assert.match(router, /appointmentsNeedingAction/);
  assert.match(router, /ordersNeedingAction/);
  assert.match(operations, /name="from"/);
  assert.match(operations, /name="to"/);
  assert.match(operations, /name="practitioner"/);
  assert.match(operations, /value="ALL"/);
});

test("operation lifecycle data and delivery attempts are durable", () => {
  assert.match(schema, /enum OrderStatus \{[\s\S]*?CONFIRMED/);
  assert.match(schema, /model AppointmentEvent/);
  assert.match(schema, /model OutboundMessage/);
  assert.match(schema, /model DeliveryAttempt/);
  assert.match(schema, /dedupeKey\s+String\?\s+@unique/);
  assert.match(actions, /where: \{ id, status: "PENDING" \}/);
  assert.match(actions, /status: "CONFIRMED", confirmedAt: new Date\(\)/);
  assert.match(actions, /status: "RESCHEDULED",\s*confirmedAt: null/);
  assert.match(actions, /reason\.length < 3/);
});

test("checkout retains notes and public rescheduling requires reconfirmation", () => {
  assert.match(checkout, /phone,\s*notes,\s*consentGdpr/);
  assert.match(checkout, /notifyOrderReceipt/);
  assert.match(reschedule, /status: "BOOKED"/);
  assert.match(reschedule, /confirmedAt: null/);
  assert.match(reschedule, /notifyAppointmentChange/);
});

test("international phone numbers normalize to E.164", () => {
  assert.equal(normalizeInternationalPhone("040 123 4567"), "+358401234567");
  assert.equal(
    normalizeInternationalPhone("+234 (807) 123-4567"),
    "+2348071234567",
  );
  assert.equal(normalizeInternationalPhone("001 202 555 0123"), "+12025550123");
  assert.equal(normalizeInternationalPhone("123"), null);
});

test("automatic transactional SMS stays concise in every locale", () => {
  const appointment = {
    id: "appointment-abcdefgh",
    start: new Date("2026-07-20T10:00:00.000Z"),
    client: { fullName: "Ada Client" },
    procedureTitle: "Facial care",
  };
  const order = {
    id: "order-abcdefgh",
    total: 79,
    currency: "EUR",
  };
  for (const locale of ["fi", "en", "ru"] as const) {
    for (const message of [
      appointmentSms(appointment, locale, "confirmation", "Facial care"),
      appointmentSms(appointment, locale, "reminder_24h", "Facial care"),
      orderSms(order, locale, "confirmation"),
      orderSms(order, locale, "cancellation", "Unavailable"),
    ]) {
      assert.ok(smsSegments(message).segments <= 2, `${locale}: ${message}`);
      assert.match(message, /ABCDEFGH/);
      assert.doesNotMatch(message, /ada@example|notes/i);
    }
  }
});
