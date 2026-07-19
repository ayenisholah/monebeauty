import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { temporaryPasswordError } from "../lib/password-policy";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const auth = readFileSync("lib/auth.ts", "utf8");
const staffActions = readFileSync("lib/staff-account-actions.ts", "utf8");
const staffAccounts = readFileSync(
  "components/admin/StaffAccounts.tsx",
  "utf8",
);
const passwordField = readFileSync(
  "components/admin/AdminPasswordField.tsx",
  "utf8",
);
const authPasswordField = readFileSync(
  "components/account/AuthPasswordField.tsx",
  "utf8",
);
const clientLogin = readFileSync(
  "app/(public)/[locale]/oma-tili/kirjaudu/page.tsx",
  "utf8",
);
const clientRegistration = readFileSync(
  "app/(public)/[locale]/oma-tili/rekisteroidy/page.tsx",
  "utf8",
);
const staffLogin = readFileSync(
  "app/(public)/[locale]/henkilosto/kirjaudu/page.tsx",
  "utf8",
);
const deleteControl = readFileSync(
  "components/admin/DeleteStaffAccount.tsx",
  "utf8",
);
const clientActions = readFileSync("lib/client-account-actions.ts", "utf8");
const booking = readFileSync("app/api/booking/route.ts", "utf8");
const staffDetails = readFileSync(
  "app/api/staff/appointments/[id]/route.ts",
  "utf8",
);
const staffSchedule = readFileSync("app/api/staff/schedule/route.ts", "utf8");
const auditExport = readFileSync("app/api/admin/audit/export/route.ts", "utf8");
const adminRouter = readFileSync("components/admin/AdminRouter.tsx", "utf8");
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

test("staff creation owns its calendar profile and temporary password policy", () => {
  assert.equal(temporaryPasswordError(""), "password_required");
  assert.equal(temporaryPasswordError("x"), null);
  assert.equal(temporaryPasswordError("x".repeat(128)), null);
  assert.equal(temporaryPasswordError("x".repeat(129)), "password_too_long");
  assert.match(staffActions, /prisma\.\$transaction/);
  assert.match(staffActions, /tx\.practitioner\.findMany/);
  assert.match(staffActions, /tx\.practitioner\.create/);
  assert.match(
    staffActions,
    /staff: \{ create: \{ practitionerId, daysOff: \[\] \} \}/,
  );
  assert.doesNotMatch(staffAccounts, /Calendar employee|name="practitionerId"/);
  assert.doesNotMatch(staffAccounts, /minLength=\{12\}/);
});

test("staff account controls are complete, visible, and admin-only", () => {
  assert.match(staffAccounts, /All staff accounts/);
  assert.match(staffAccounts, /resetStaffPasswordAction/);
  assert.match(staffAccounts, /revokeStaffSessionsAction/);
  assert.match(staffAccounts, /setStaffStatusAction/);
  assert.match(staffAccounts, /<DeleteStaffAccount/);
  assert.match(passwordField, /visible \? "text" : "password"/);
  assert.match(passwordField, /<EyeSlash/);
  assert.match(passwordField, /aria-pressed=\{visible\}/);
  assert.match(deleteControl, /confirmation\.trim\(\)\.toLowerCase\(\)/);
  assert.match(staffActions, /deleteStaffAccountAction/);
  assert.match(
    staffActions,
    /confirmationEmail !== normalizeEmail\(target\.email\)/,
  );
  assert.match(staffActions, /where: \{ id, role: "STAFF" \}/);
  assert.match(staffActions, /retainedCalendarHistory: true/);
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
  assert.match(authPasswordField, /visible \? "text" : "password"/);
  assert.match(authPasswordField, /<EyeSlash/);
  assert.match(authPasswordField, /Näytä salasana/);
  assert.match(clientActions, /renderAccountActionEmail/);
  assert.match(clientActions, /\.\.\.verificationEmail/);
  assert.match(clientActions, /\.\.\.passwordResetEmail/);
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

test("client sessions can reach admin login while staff stay in their portal", () => {
  assert.match(
    adminRouter,
    /if \(user\.role === "STAFF"\)\s+redirect\(localizedPath\(PUBLIC_PATHS\.staff, locale\)\)/,
  );
  assert.match(
    adminRouter,
    /if \(user\.role !== "ADMIN"\) redirect\(adminHref\(locale, "login"\)\)/,
  );
});

test("authentication screens identify their account role", () => {
  assert.match(clientLogin, /Sign in to your client account/);
  assert.match(clientLogin, /eyebrow: "Client portal"/);
  assert.match(clientRegistration, /Create a client account/);
  assert.match(clientRegistration, /eyebrow: "Client portal"/);
  assert.match(staffLogin, /Sign in to the staff portal/);
  assert.match(staffLogin, /eyebrow: "Staff portal"/);
});

test("admin login uses the accessible password visibility control", () => {
  assert.match(passwordField, /autoComplete = "new-password"/);
  assert.match(passwordField, /autoComplete=\{autoComplete\}/);
  assert.match(adminRouter, /<AdminPasswordField/);
  assert.match(adminRouter, /autoComplete="current-password"/);
  assert.match(adminRouter, /showLabel=\{copy\.login\.showPassword\}/);
  assert.match(adminRouter, /hideLabel=\{copy\.login\.hidePassword\}/);
});
