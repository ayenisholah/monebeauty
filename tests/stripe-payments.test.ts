import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { eurosToMinor, minorToEuros } from "../lib/stripe";

const webhook = readFileSync("app/api/webhooks/stripe/route.ts", "utf8");
const payments = readFileSync("lib/stripe-payments.ts", "utf8");
const checkout = readFileSync("app/api/checkout/route.ts", "utf8");

test("EUR conversion is exact and rejects excessive precision", () => {
  assert.equal(eurosToMinor("0"), 0);
  assert.equal(eurosToMinor("39.50"), 3950);
  assert.equal(eurosToMinor("1000.1"), 100010);
  assert.equal(minorToEuros(3950), "39.50");
  assert.throws(() => eurosToMinor("1.001"));
  assert.throws(() => eurosToMinor("-1"));
});

test("Stripe webhook verifies raw signatures and records event ids", () => {
  assert.match(webhook, /await req\.text\(\)/);
  assert.match(webhook, /constructEvent/);
  assert.match(webhook, /stripeWebhookEvent\.upsert/);
  assert.match(webhook, /existing\?\.status === "COMPLETED"/);
  assert.match(webhook, /checkout\.session\.async_payment_succeeded/);
  assert.match(webhook, /refund\.updated/);
});

test("website checkout owns prices and appointments remain outside Stripe", () => {
  assert.match(checkout, /prisma\.product\.findMany/);
  assert.match(checkout, /unit_amount: eurosToMinor\(product\.price\)/);
  assert.match(checkout, /metadata = \{[\s\S]*?source: "website"/);
  assert.doesNotMatch(checkout, /appointment/i);
  assert.match(payments, /stripe_session_amount_mismatch/);
  assert.match(payments, /item\.vouchers\.length >= item\.qty/);
});
