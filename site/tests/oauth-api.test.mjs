import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const read = path => fs.readFile(new URL(path, import.meta.url), "utf8");

test("OAuth routes use one-time server state and never expose provider secrets", async () => {
  const [start, callback, providers, migration] = await Promise.all([
    read("../app/api/auth/oauth/[provider]/start/route.ts"),
    read("../app/api/auth/oauth/[provider]/callback/route.ts"),
    read("../app/api/auth/providers/route.ts"),
    read("../drizzle/0011_oauth_state.sql"),
  ]);
  assert.match(start, /createOAuthAttempt/);
  assert.doesNotMatch(start, /searchParams\.get\("intent"\)/);
  assert.match(start, /HttpOnly; Secure; SameSite=None/);
  assert.match(callback, /consumeOAuthAttempt/);
  assert.match(callback, /verifyProviderIdToken/);
  assert.match(callback, /createSession/);
  assert.match(callback, /account-link-required/);
  assert.match(callback, /attempt\.intent === "link"/);
  assert.doesNotMatch(providers, /CLIENT_SECRET|PRIVATE_KEY|apiKey|clientSecret/);
  assert.match(migration, /state_hash TEXT NOT NULL UNIQUE/);
  assert.match(migration, /binding_hash TEXT NOT NULL/);
  assert.match(migration, /used_at TEXT/);
  const deletion = await read("../app/api/account-deletion/process/route.ts");
  assert.match(deletion, /revokeAccountProviderCredentials/);
});

test("new provider accounts must complete a private profile photo before receiving a session", async () => {
  const [callback, completionRoute, completionPage, form] = await Promise.all([
    read("../app/api/auth/oauth/[provider]/callback/route.ts"),
    read("../app/api/auth/oauth/complete/route.ts"),
    read("../app/complete-profile/page.tsx"),
    read("../app/OAuthProfileForm.tsx"),
  ]);
  assert.match(callback, /createPendingOAuthProfile/);
  assert.doesNotMatch(callback, /complete-profile\?token=/);
  assert.match(callback, /stylishme_oauth_profile/);
  assert.doesNotMatch(callback, /createSession\([^)]*pending/i);
  assert.match(completionRoute, /inspectProfileImage/);
  assert.match(completionRoute, /consumePendingOAuthProfile/);
  assert.match(completionRoute, /createSession/);
  assert.match(completionPage, /no-store/);
  assert.match(form, /Profile photo/);
  assert.doesNotMatch(form, /name="password"/);
  assert.doesNotMatch(completionRoute, /createPasswordHash/);
  const deletionRoute = await read("../app/api/account/deletion/route.ts");
  assert.match(deletionRoute, /requestAccountDeletionConfirmation/);
  assert.doesNotMatch(form, /type="hidden" name="token"/);
});

test("linking a provider requires an authenticated account and password re-check", async () => {
  const [link, connections, settings] = await Promise.all([
    read("../app/api/auth/oauth/[provider]/link/route.ts"),
    read("../app/api/account/connections/route.ts"),
    read("../app/AccountConnections.tsx"),
  ]);
  assert.match(link, /getStylishMeUser/);
  assert.match(link, /passwordMatches/);
  assert.match(link, /intent: "link"/);
  assert.match(connections, /auth_identities WHERE account_email/);
  assert.match(settings, /Confirm your password/);
});

test("provider buttons are configuration-driven without coming-soon placeholders", async () => {
  const [login, form] = await Promise.all([read("../app/login/page.tsx"), read("../app/AuthForm.tsx")]);
  assert.match(login, /oauthAvailability/);
  assert.match(form, /Continue with Google/);
  assert.match(form, /Continue with Apple/);
  assert.doesNotMatch(form, /Coming soon/);
  assert.match(form, /"\/api\/auth\/oauth\/" \+ provider \+ "\/start\?"/);
});
