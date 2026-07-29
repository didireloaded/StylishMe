import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = path => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("signup requires configured email delivery and does not create a session before verification", () => {
  const signup = read("../app/api/auth/signup/route.ts");
  assert.match(signup, /currentEmailConfig/);
  assert.match(signup, /requestEmailVerification/);
  assert.doesNotMatch(signup, /createSession/);
  assert.match(signup, /verificationRequired/);
});

test("login blocks unverified, deleted, and deletion-pending accounts", () => {
  const login = read("../app/api/auth/login/route.ts");
  assert.match(login, /email_verified_at/);
  assert.match(login, /deleted_at/);
  assert.match(login, /account_deletion_requests/);
});

test("verification, password recovery, and deletion routes exist and stay uncached", () => {
  const sources = [
    "../app/api/auth/verification/request/route.ts",
    "../app/api/auth/verification/confirm/route.ts",
    "../app/api/auth/password/forgot/route.ts",
    "../app/api/auth/password/reset/route.ts",
    "../app/api/account/deletion/route.ts",
    "../app/api/account-deletion/process/route.ts",
  ].map(read).join("\n");
  assert.match(sources, /cache-control.*no-store/i);
  assert.match(sources, /safeRelativeReturnPath/);
  assert.match(sources, /consumeAuthAttempt/);
  assert.match(sources, /STYLISHME_ADMIN_API_KEY/);
});

test("the authentication UI exposes real recovery and verification states", () => {
  const form = read("../app/AuthForm.tsx");
  const login = read("../app/login/page.tsx");
  assert.match(form, /Forgot password/);
  assert.match(form, /Resend verification/);
  assert.match(login, /check-email/);
});
