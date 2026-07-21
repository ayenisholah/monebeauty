import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  calendarDropStart,
  normalizeEmployeeSelection,
  normalizeInternalPalette,
  truncateCalendarAlias,
} from "../lib/calendar-preferences";
import {
  INTERNAL_CALENDAR_SERVICES,
  INTERNAL_PALETTE_MAX_SELECTED,
} from "../lib/internal-calendar-services";

test("internal palette defaults match the approved Finnish shortcuts", () => {
  const palette = normalizeInternalPalette(null);
  assert.deepEqual(
    palette
      .slice(0, 4)
      .map(({ key, alias, enabled }) => ({ key, alias, enabled })),
    [
      { key: "lunch", alias: "Ruokatauko", enabled: true },
      { key: "personal", alias: "Henkilökoh", enabled: true },
      { key: "errand", alias: "Työmeno", enabled: true },
      { key: "sick", alias: "Sairasloma", enabled: true },
    ],
  );
  assert.equal(palette.length, 119);
  assert.equal(palette.filter((item) => item.enabled).length, 4);
  assert.equal(palette.find((item) => item.key === "vacation")?.enabled, false);
});

test("palette order, visibility, and 14-character aliases normalize safely", () => {
  const palette = normalizeInternalPalette([
    { key: "vacation", alias: "  Pitkä lomajakso  ", enabled: false },
    { key: "lunch", alias: "", enabled: true },
    { key: "unknown", alias: "Ignored", enabled: true },
  ]);
  assert.equal(palette[0].key, "vacation");
  assert.equal(palette[0].alias, "Pitkä lomajaks");
  assert.equal(palette[0].enabled, false);
  assert.equal(palette[1].alias, "Ruokatauko");
  assert.equal(truncateCalendarAlias("123456789012345"), "12345678901234");
  assert.equal(palette.length, 119);
});

test("the generated catalog exactly preserves all Finnish source rows", () => {
  const lines = readFileSync("internal-services.txt", "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .slice(4)
    .filter((line, index, all) => index < all.length - 1 || line.trim());
  const rows = Array.from({ length: lines.length / 2 }, (_, index) => ({
    labelFi: lines[index * 2].trim(),
    dragLabel: lines[index * 2 + 1].trim(),
  }));
  assert.equal(INTERNAL_CALENDAR_SERVICES.length, 119);
  assert.deepEqual(
    INTERNAL_CALENDAR_SERVICES.map(({ labelFi, dragLabel }) => ({
      labelFi,
      dragLabel,
    })),
    rows,
  );
  assert.equal(
    new Set(INTERNAL_CALENDAR_SERVICES.map((service) => service.key)).size,
    119,
  );
  assert.ok(
    INTERNAL_CALENDAR_SERVICES.every(
      (service) => Array.from(service.dragLabel).length <= 14,
    ),
  );
});

test("palette normalization caps selected services at the Timma limit", () => {
  const palette = normalizeInternalPalette(
    INTERNAL_CALENDAR_SERVICES.slice(0, 30).map((service) => ({
      key: service.key,
      alias: service.dragLabel,
      enabled: true,
    })),
  );
  assert.equal(
    palette.filter((item) => item.enabled).length,
    INTERNAL_PALETTE_MAX_SELECTED,
  );
});

test("staff selection stays own-only while admin selection restores valid ids", () => {
  assert.deepEqual(
    normalizeEmployeeSelection(["b", "stale"], ["a", "b"], null),
    ["b"],
  );
  assert.deepEqual(normalizeEmployeeSelection(["b"], ["a", "b"], "a"), ["a"]);
  assert.deepEqual(normalizeEmployeeSelection(null, ["a", "b"], null), [
    "a",
    "b",
  ]);
});

test("calendar drop targets resolve exact quarter-hour starts", () => {
  assert.equal(
    calendarDropStart("2026-07-21", 10 * 60 + 45),
    "2026-07-21T10:45:00.000Z",
  );
  assert.equal(calendarDropStart("2026-07-21", 10 * 60 + 7), null);
  assert.equal(calendarDropStart("bad", 600), null);
});
