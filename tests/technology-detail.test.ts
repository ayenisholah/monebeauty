import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detail = readFileSync(
  "components/technology/TechnologyDetailPage.tsx",
  "utf8",
);
const markdown = readFileSync("components/Markdown.tsx", "utf8");

test("technology detail leads with a full-bleed hero", () => {
  assert.match(detail, /relative isolate/);
  assert.match(detail, /min-h-\[clamp\(380px,56vh,600px\)\]/);
  assert.match(detail, /fill\s+priority/);
  assert.match(detail, /sizes="100vw"/);
  assert.match(
    detail,
    /bg-gradient-to-t from-\[rgba\(34,30,27,\.88\)\] via-\[rgba\(34,30,27,\.42\)\] to-\[rgba\(34,30,27,\.16\)\]/,
  );
  assert.match(detail, /text-cta-heading/);
  assert.match(detail, /font-normal/);
  assert.match(
    detail,
    /text-cta-heading \[text-shadow:0_1px_10px_rgba\(58,42,28,\.72\)\]/,
  );
  assert.doesNotMatch(detail, /text-cta-body/);
  assert.match(detail, /variant=\{image \? "primaryOnDark"/);
  assert.doesNotMatch(detail, /Container width="narrow"/);
  assert.doesNotMatch(detail, /aspect-\[16\/10\]/);
  assert.doesNotMatch(detail, /shadow-card/);
});

test("technology body uses a two-column layout with a sticky rail", () => {
  assert.match(detail, /nav:grid-cols-\[minmax\(0,320px\)_minmax\(0,1fr\)\]/);
  assert.match(detail, /<aside className="nav:sticky/);
  assert.match(detail, /<Markdown variant="technology">/);
});

test("technology markdown fills the column with full-width imagery", () => {
  assert.match(markdown, /variant\?: MarkdownVariant/);
  assert.match(markdown, /variant = "default"/);
  assert.match(markdown, /className="max-w-none"/);
  assert.doesNotMatch(markdown, /max-w-\[760px\]/);
  assert.doesNotMatch(markdown, /object-contain/);
  assert.match(markdown, /w-full rounded-\[var\(--radius\)\] object-cover/);
  assert.match(markdown, /loading="lazy"/);
});

test("technology markdown preserves one page h1 and ordered article headings", () => {
  assert.equal((detail.match(/<h1/g) ?? []).length, 1);
  assert.doesNotMatch(markdown, /<h1/);
  assert.match(markdown, /h1: \(\{ children \}\) => \(\s*<h2/);
  assert.match(markdown, /h2: \(\{ children \}\) =>\s*technology \? \(\s*<h3/);
  assert.match(markdown, /font-display/);
  assert.match(markdown, /font-sans/);
});
