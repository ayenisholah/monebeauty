import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function tsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? tsxFiles(path)
      : entry.name.endsWith(".tsx")
        ? [path]
        : [];
  });
}

const applicationSource = [...tsxFiles("app"), ...tsxFiles("components")]
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");
const select = readFileSync("components/ui/ThemedSelect.tsx", "utf8");
const calendar = readFileSync("components/ui/CalendarPicker.tsx", "utf8");
const clinicDate = readFileSync("lib/clinic-date.ts", "utf8");
const time = readFileSync("components/ui/TimePicker.tsx", "utf8");
const staff = readFileSync("app/api/staff/schedule/route.ts", "utf8");

test("application forms contain no native select, date, or time pickers", () => {
  assert.doesNotMatch(applicationSource, /<select\b/);
  assert.doesNotMatch(applicationSource, /type=["'](?:date|time)["']/);
});

test("themed controls expose accessible custom interaction semantics", () => {
  assert.match(select, /aria-haspopup="listbox"/);
  assert.match(select, /role="option"/);
  assert.match(select, /ArrowDown/);
  assert.match(calendar, /role="grid"/);
  assert.match(clinicDate, /Europe\/Helsinki/);
  assert.doesNotMatch(calendar, /useLocale/);
  assert.match(calendar, /locale: string/);
  assert.match(time, /role="listbox"/);
});

test("staff schedule resolves the clinic resource on the server", () => {
  assert.match(staff, /getDefaultPractitionerId\(\)/);
  assert.doesNotMatch(staff, /payload\.practitionerId/);
  assert.doesNotMatch(staff, /searchParams\.get\("practitionerId"\)/);
});
