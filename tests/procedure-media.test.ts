import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import pages from "../content/generated/pages.json";
import { PROCEDURE_MEDIA_SEED } from "../content/procedure-media";
import type { Locale } from "../i18n/routing";
import { resolveProcedureImage } from "../lib/procedure-media";
import { parseProcedures } from "../lib/procedures";

const locales: Locale[] = ["en", "fi", "ru"];
const services = {
  facial: "services/face",
  body: "services/body",
  trichology: "services/tricho",
  laser: "services/laser",
  rf: "services/mikroneulanrf",
  brows: "services/eyebrows",
  packages: "services/packages",
} as const;

test("every localized treatment card has a specific non-adjacent image", () => {
  let procedureCount = 0;
  for (const [serviceSlug, page] of Object.entries(services)) {
    for (const locale of locales) {
      const procedures = parseProcedures(pages[page][locale].body);
      const images = procedures.map((procedure) =>
        resolveProcedureImage({
          serviceSlug,
          locale,
          procedure,
          records: [],
        }),
      );
      procedureCount += procedures.length;
      assert.equal(images.every(Boolean), true, `${serviceSlug}/${locale}`);
      assert.equal(
        images.some((image, index) => index > 0 && image === images[index - 1]),
        false,
        `${serviceSlug}/${locale} repeats adjacent imagery`,
      );
    }
  }
  assert.equal(procedureCount, 331);
});

test("procedure media uses 46 committed images with provenance", () => {
  const images = new Set(PROCEDURE_MEDIA_SEED.map((item) => item.image));
  assert.equal(images.size, 46);
  for (const item of PROCEDURE_MEDIA_SEED) {
    assert.match(item.image, /^\/media\//);
    assert.match(item.sourceUrl, /^https:\/\//);
    assert.match(item.sourceLicense, /^(CLINIC_ARCHIVE|PEXELS)$/);
    assert.equal(existsSync(`public${item.image}`), true, item.image);
  }
  assert.equal(
    PROCEDURE_MEDIA_SEED.filter((item) => item.sourceLicense === "PEXELS")
      .length,
    3,
  );
});

test("saved procedure media overrides bootstrap without relying on order", () => {
  const definition = PROCEDURE_MEDIA_SEED.find(
    (item) => item.serviceSlug === "body" && item.identities.en.length > 0,
  );
  assert.ok(definition);
  const procedure = definition.identities.en[0];
  const resolved = resolveProcedureImage({
    serviceSlug: "body",
    locale: "en",
    procedure: { ...procedure, description: "", price: "" },
    records: [
      { key: definition.key, image: "/media/custom.jpg", identities: {} },
      {
        key: definition.key,
        image: "/media/override.jpg",
        identities: definition.identities,
      },
    ].reverse(),
  });
  assert.equal(resolved, "/media/override.jpg");
});
