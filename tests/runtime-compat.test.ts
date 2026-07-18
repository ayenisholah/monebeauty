import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DatePicker } from "../components/ui/CalendarPicker";
import { clinicTodayYmd } from "../lib/clinic-date";
import { groupBy } from "../lib/collections";

test("content rows group in stable insertion order on Node 20", () => {
  const rows = [
    { slug: "about", locale: "fi" },
    { slug: "about", locale: "en" },
    { slug: "services", locale: "fi" },
  ];
  const groups = groupBy(rows, (row) => row.slug);

  assert.deepEqual([...groups.keys()], ["about", "services"]);
  assert.deepEqual(
    groups.get("about")?.map((row) => row.locale),
    ["fi", "en"],
  );
});

test("clinic date uses the Helsinki calendar day", () => {
  assert.equal(
    clinicTodayYmd(new Date("2026-07-18T21:30:00.000Z")),
    "2026-07-19",
  );
});

test("date picker renders without a next-intl provider", () => {
  for (const locale of ["en", "fi", "ru"]) {
    const html = renderToStaticMarkup(
      createElement(DatePicker, {
        locale,
        defaultValue: "2026-07-18",
        ariaLabel: "Choose date",
      }),
    );
    assert.match(html, /2026/);
    assert.match(html, /aria-haspopup="dialog"/);
  }
});
