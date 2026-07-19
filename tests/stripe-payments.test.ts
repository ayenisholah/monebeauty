import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  checkoutCancelTokenHash,
  createCheckoutCancelToken,
  eurosToMinor,
  minorToEuros,
} from "../lib/stripe";

const webhook = readFileSync("app/api/webhooks/stripe/route.ts", "utf8");
const payments = readFileSync("lib/stripe-payments.ts", "utf8");
const checkout = readFileSync("app/api/checkout/route.ts", "utf8");
const cancellation = readFileSync("app/api/checkout/cancel/route.ts", "utf8");
const operations = readFileSync("components/admin/AdminOperations.tsx", "utf8");
const schema = readFileSync("prisma/schema.prisma", "utf8");

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

test("checkout cancellation tokens are opaque and stored only as hashes", () => {
  const first = createCheckoutCancelToken();
  const second = createCheckoutCancelToken();
  assert.match(first.token, /^[A-Za-z0-9_-]{43}$/);
  assert.match(first.hash, /^[a-f0-9]{64}$/);
  assert.equal(first.hash, checkoutCancelTokenHash(first.token));
  assert.notEqual(first.token, second.token);
  assert.notEqual(first.hash, second.hash);
  assert.match(schema, /checkoutCancelTokenHash\s+String\?\s+@unique/);
  assert.match(schema, /cancelRequestedAt\s+DateTime\?/);
  assert.match(schema, /FAILED\s+CANCELLED\s+EXPIRED/);
});

test("Stripe return expires the session and leaves order state to the webhook", () => {
  assert.match(checkout, /new URL\("\/api\/checkout\/cancel", siteUrl\(\)\)/);
  assert.match(checkout, /checkoutCancelTokenHash: cancellation\.hash/);
  assert.doesNotMatch(checkout, /status: "PROCESSING"/);
  assert.match(cancellation, /checkoutCancelTokenHash\(token\)/);
  assert.match(cancellation, /cancelRequestedAt: new Date\(\)/);
  assert.match(cancellation, /checkout\.sessions\.expire\(session\.id\)/);
  assert.match(cancellation, /checkoutCancelTokenHash: null/);
  assert.doesNotMatch(cancellation, /prisma\.order\.(?:update|updateMany)/);
  assert.match(
    payments,
    /status === "EXPIRED" && attempt\.cancelRequestedAt \? "CANCELLED" : status/,
  );
  assert.match(payments, /customer_cancelled_stripe_checkout/);
});

test("admin derives and filters the awaiting-payment order state", () => {
  assert.match(
    operations,
    /const orderFilterStatuses = \["AWAITING_PAYMENT", \.\.\.orderStatuses\]/,
  );
  assert.match(
    operations,
    /source === "WEBSITE_STRIPE"[\s\S]*?order\.status === "PENDING"[\s\S]*?\["UNPAID", "PROCESSING"\]/,
  );
  assert.match(
    operations,
    /source: "WEBSITE_STRIPE",[\s\S]*?status: "PENDING",[\s\S]*?paymentStatus: \{ in: \["UNPAID", "PROCESSING"\] \}/,
  );
});
