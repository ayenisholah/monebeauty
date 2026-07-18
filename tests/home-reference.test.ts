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

test("desktop header keeps the logo left and navigation right", () => {
  const desktopRules =
    styles.match(
      /@media \(min-width: 1180px\) \{([\s\S]*?)\r?\n\}\r?\n@media \(min-width: 1200px\)/,
    )?.[1] ?? "";

  assert.match(desktopRules, /grid-template-columns: auto minmax\(0, 1fr\)/);
  assert.doesNotMatch(desktopRules, /\.hr-left/);
  assert.match(desktopRules, /\.hr-right \{[\s\S]*?justify-content: flex-end/);
  assert.match(
    desktopRules,
    /\.hr-nav a:not\(\.hr-btn\) \{[\s\S]*?white-space: nowrap/,
  );
  assert.match(
    desktopRules,
    /\.hr-right \.hr-btn \{[\s\S]*?height: 44px;[\s\S]*?flex: none;[\s\S]*?white-space: nowrap/,
  );
  assert.match(desktopRules, /\.hr-mobile \{\s*display: none/);
});
