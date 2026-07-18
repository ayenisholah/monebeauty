import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync("app/globals.css", "utf8");

test("homepage hero media stays within the mobile viewport", () => {
  const baseRule = styles.match(/\.hr-hero-image \{([^}]*)\}/)?.[1] ?? "";

  assert.match(baseRule, /width: 100%/);
  assert.match(baseRule, /aspect-ratio: 4\/3/);
  assert.doesNotMatch(baseRule, /min-(?:width|height)/);
});

test("homepage hero restores the desktop cinematic ratio", () => {
  assert.match(
    styles,
    /@media \(min-width: 768px\) \{[\s\S]*?\.hr-hero-image \{\s*aspect-ratio: 21\/9;\s*\}/,
  );
});
