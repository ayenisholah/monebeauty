import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detail = readFileSync(
  "components/technology/TechnologyDetailPage.tsx",
  "utf8",
);
const markdown = readFileSync("components/Markdown.tsx", "utf8");

test("technology detail uses the homepage editorial card composition", () => {
  assert.match(detail, /<Container width="narrow">/);
  assert.match(detail, /aspect-\[16\/10\]/);
  assert.match(detail, /min-\[860px\]:grid-cols-2/);
  assert.match(detail, /min-\[860px\]:max-h-\[340px\]/);
  assert.match(detail, /p-\[clamp\(26px,3\.4vw,46px\)\]/);
  assert.match(detail, /text-\[clamp\(34px,4\.2vw,56px\)\]/);
  assert.doesNotMatch(detail, /shadow-card/);
});

test("technology article opts into bounded editorial markdown", () => {
  assert.match(detail, /<Markdown variant="technology">/);
  assert.match(markdown, /variant\?: MarkdownVariant/);
  assert.match(markdown, /variant = "default"/);
  assert.match(markdown, /mx-auto max-w-\[760px\]/);
  assert.match(markdown, /max-h-\[460px\]/);
  assert.match(markdown, /w-auto max-w-full/);
  assert.match(markdown, /object-contain/);
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
