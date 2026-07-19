import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_SEGMENTS,
  LEGACY_ADMIN_SEGMENTS,
  adminBase,
  adminHref,
  isUnprefixedAdminPath,
} from "../lib/admin-routing";

test("admin paths use Finnish segments in every locale", () => {
  assert.equal(adminBase("fi"), "/admin");
  assert.equal(adminBase("en"), "/en/admin");
  assert.equal(adminBase("ru"), "/ru/admin");
  assert.equal(adminHref("fi", "clients"), "/admin/asiakkaat");
  assert.equal(adminHref("fi", "appointments"), "/admin/ajanvaraukset");
  assert.equal(adminHref("fi", "calendar"), "/admin/kalenteri");
  assert.equal(adminHref("en", "orders"), "/en/admin/tilaukset");
  assert.equal(
    adminHref("en", "technologies", "uusi"),
    "/en/admin/teknologiat/uusi",
  );
  assert.equal(
    adminHref("ru", "chat", "record-id"),
    "/ru/admin/keskustelut/record-id",
  );
});

test("legacy English modules map to Finnish segments", () => {
  const expected = {
    login: ADMIN_SEGMENTS.login,
    clients: ADMIN_SEGMENTS.clients,
    calendar: ADMIN_SEGMENTS.calendar,
    appointments: ADMIN_SEGMENTS.appointments,
    orders: ADMIN_SEGMENTS.orders,
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

test("only unprefixed Finnish admin paths bypass locale rewriting", () => {
  assert.equal(isUnprefixedAdminPath("/admin"), true);
  assert.equal(isUnprefixedAdminPath("/admin/palvelut"), true);
  assert.equal(isUnprefixedAdminPath("/administrator"), false);
  assert.equal(isUnprefixedAdminPath("/en/admin"), false);
  assert.equal(isUnprefixedAdminPath("/ru/admin/asiakkaat"), false);
});
