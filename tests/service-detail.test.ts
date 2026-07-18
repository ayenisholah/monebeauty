import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detail = readFileSync(
  "components/services/ServiceDetailPage.tsx",
  "utf8",
);
const card = readFileSync("components/services/TreatmentCard.tsx", "utf8");

test("service detail matches the technology full-bleed hero", () => {
  assert.match(detail, /relative isolate/);
  assert.match(detail, /min-h-\[clamp\(380px,56vh,600px\)\]/);
  assert.match(detail, /fill\s+priority/);
  assert.match(detail, /sizes="100vw"/);
  assert.match(
    detail,
    /bg-gradient-to-t from-\[rgba\(34,30,27,\.88\)\] via-\[rgba\(34,30,27,\.42\)\] to-\[rgba\(34,30,27,\.16\)\]/,
  );
  assert.match(detail, /variant=\{heroImage \? "primaryOnDark"/);
  assert.match(detail, /absolute inset-0 bg-alt/);
  assert.doesNotMatch(detail, /shadow-card sm:min-h/);
});

test("service detail uses a responsive sticky summary rail", () => {
  assert.match(detail, /nav:grid-cols-\[minmax\(0,320px\)_minmax\(0,1fr\)\]/);
  assert.match(detail, /<aside className="nav:sticky/);
  assert.match(detail, /nav:top-\[104px\]/);
  assert.match(detail, /className="w-full justify-center"/);
});

test("service detail preserves procedure cards and booking context", () => {
  assert.match(detail, /showTreatmentCards && bookingKey/);
  assert.match(detail, /<TreatmentCard/);
  assert.match(detail, /bookingKey=\{bookingKey\}/);
  assert.match(card, /query: \{ service: bookingKey, procedure: index \+ 1 \}/);
});

test("service detail falls back to approved markdown without procedures", () => {
  assert.match(detail, /<Markdown variant="technology">/);
  assert.match(detail, /service\.content\.whatItIs/);
  assert.equal((detail.match(/<h1/g) ?? []).length, 1);
  assert.doesNotMatch(detail, /BookServiceCta/);
});
