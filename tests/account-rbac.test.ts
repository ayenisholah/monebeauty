import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const auth = readFileSync("lib/auth.ts", "utf8");
const staffActions = readFileSync("lib/staff-account-actions.ts", "utf8");
const clientActions = readFileSync("lib/client-account-actions.ts", "utf8");
const booking = readFileSync("app/api/booking/route.ts", "utf8");
const staffDetails = readFileSync(
  "app/api/staff/appointments/[id]/route.ts",
  "utf8",
);
const staffSchedule = readFileSync("app/api/staff/schedule/route.ts", "utf8");
const auditExport = readFileSync("app/api/admin/audit/export/route.ts", "utf8");
const migration = readFileSync(
  "prisma/migrations/20260719160000_account_portals_staff_rbac/migration.sql",
  "utf8",
);

test("accounts have explicit lifecycle, verification, and forced-password state", () => {
  assert.match(schema, /enum AccountStatus/);
  assert.match(schema, /mustChangePassword\s+Boolean/);
  assert.match(schema, /emailVerifiedAt\s+DateTime\?/);
  assert.match(schema, /model AccountToken/);
  assert.match(auth, /password\.length < 12/);
  assert.match(auth, /user\.role === "STAFF" && user\.mustChangePassword/);
});

test("staff credentials are admin-created and force a first-login reset without email", () => {
  assert.match(staffActions, /createStaffAccountAction/);
  assert.match(staffActions, /temporaryPassword/);
  assert.match(staffActions, /mustChangePassword: true/);
  assert.match(staffActions, /changeStaffPasswordAction/);
  assert.match(staffActions, /session\.deleteMany/);
  assert.doesNotMatch(staffActions, /sendEmail/);
});

test("staff data is read-only and sensitive appointment access is audited", () => {
  assert.match(staffSchedule, /user\.role !== "ADMIN"/);
  assert.match(staffSchedule, /availability_mutation_denied/);
  assert.match(staffDetails, /appointment\.practitionerId !== own/);
  assert.match(staffDetails, /appointment_sensitive_details_viewed/);
  assert.match(staffDetails, /contraindications/);
});

test("client accounts are verified and guest appointments use single-use claims", () => {
  assert.match(clientActions, /PENDING_VERIFICATION/);
  assert.match(clientActions, /VERIFY_EMAIL/);
  assert.match(clientActions, /CLAIM_APPOINTMENT/);
  assert.match(booking, /accountClient/);
  assert.match(booking, /appointment-claim/);
  assert.match(
    migration,
    /AppointmentChangeRequest_one_pending_per_appointment/,
  );
});

test("audit export is admin-only and audit records carry security context", () => {
  assert.match(auditExport, /requireApiUser\(\["ADMIN"\]\)/);
  assert.match(schema, /ipAddress\s+String\?/);
  assert.match(schema, /userAgent\s+String\?/);
  assert.match(schema, /outcome\s+AuditOutcome/);
  assert.doesNotMatch(auditExport, /delete/);
});
