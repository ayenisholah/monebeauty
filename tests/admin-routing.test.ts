import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN_SEGMENTS, LEGACY_ADMIN_SEGMENTS, adminBase, adminHref } from "../lib/admin-routing";

test("admin paths use Finnish segments in every locale", () => {
  assert.equal(adminBase("fi"), "/admin");
  assert.equal(adminBase("en"), "/en/admin");
  assert.equal(adminBase("ru"), "/ru/admin");
  assert.equal(adminHref("fi", "clients"), "/admin/asiakkaat");
  assert.equal(adminHref("en", "technologies", "uusi"), "/en/admin/teknologiat/uusi");
  assert.equal(adminHref("ru", "chat", "record-id"), "/ru/admin/keskustelut/record-id");
});

test("legacy English modules map to Finnish segments", () => {
  const expected = {
    login: ADMIN_SEGMENTS.login,
    clients: ADMIN_SEGMENTS.clients,
    services: ADMIN_SEGMENTS.services,
    technologies: ADMIN_SEGMENTS.technologies,
    content: ADMIN_SEGMENTS.content,
    products: ADMIN_SEGMENTS.products,
    pricing: ADMIN_SEGMENTS.pricing,
    blog: ADMIN_SEGMENTS.blog,
    chat: ADMIN_SEGMENTS.chat,
  };
  for (const [legacy, canonical] of Object.entries(expected)) {
    assert.equal(LEGACY_ADMIN_SEGMENTS[legacy], canonical);
  }
});

