import assert from "node:assert/strict";
import test from "node:test";
import { webcrypto } from "node:crypto";

import { buildAuthorizationUrl, decryptProviderCredential, encryptProviderCredential, oauthConfigFrom, revokeAppleCredential, verifyProviderIdToken } from "../app/oauth.ts";

const bytesToBase64Url = bytes => Buffer.from(bytes).toString("base64url");
const jsonToBase64Url = value => Buffer.from(JSON.stringify(value)).toString("base64url");

async function signedToken(claims) {
  const pair = await webcrypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const header = jsonToBase64Url({ alg: "RS256", kid: "test-key", typ: "JWT" });
  const payload = jsonToBase64Url(claims);
  const signingInput = `${header}.${payload}`;
  const signature = await webcrypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(signingInput));
  const jwk = await webcrypto.subtle.exportKey("jwk", pair.publicKey);
  return { token: `${signingInput}.${bytesToBase64Url(new Uint8Array(signature))}`, jwk: { ...jwk, kid: "test-key", alg: "RS256", use: "sig" } };
}

test("Google and Apple sign-in stay hidden until every production setting is present", () => {
  assert.equal(oauthConfigFrom("google", {}).available, false);
  assert.equal(oauthConfigFrom("google", { PUBLIC_APP_ORIGIN: "http://localhost:3000", GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" }).available, false);
  assert.equal(oauthConfigFrom("google", { PUBLIC_APP_ORIGIN: "https://stylishme.na", GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" }).available, true);
  assert.equal(oauthConfigFrom("apple", { PUBLIC_APP_ORIGIN: "https://stylishme.na", APPLE_CLIENT_ID: "id" }).available, false);
  assert.equal(oauthConfigFrom("apple", { PUBLIC_APP_ORIGIN: "https://stylishme.na", APPLE_CLIENT_ID: "id", APPLE_CLIENT_SECRET: "secret", AUTH_CREDENTIAL_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }).available, true);
});

test("authorization URLs use provider endpoints, nonce, state and S256 PKCE", () => {
  const google = oauthConfigFrom("google", { PUBLIC_APP_ORIGIN: "https://stylishme.na", GOOGLE_CLIENT_ID: "google-id", GOOGLE_CLIENT_SECRET: "secret" });
  const url = new URL(buildAuthorizationUrl(google, { state: "state-value", nonce: "nonce-value", codeChallenge: "challenge" }));
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("state"), "state-value");
  assert.equal(url.searchParams.get("nonce"), "nonce-value");
  assert.equal(url.searchParams.get("code_challenge"), "challenge");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("redirect_uri"), "https://stylishme.na/api/auth/oauth/google/callback");

  const apple = oauthConfigFrom("apple", { PUBLIC_APP_ORIGIN: "https://stylishme.na", APPLE_CLIENT_ID: "apple-id", APPLE_CLIENT_SECRET: "secret", AUTH_CREDENTIAL_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" });
  const appleUrl = new URL(buildAuthorizationUrl(apple, { state: "state", nonce: "nonce", codeChallenge: "challenge" }));
  assert.equal(appleUrl.origin, "https://appleid.apple.com");
  assert.equal(appleUrl.searchParams.get("response_mode"), "form_post");
});

test("ID tokens are accepted only after signature and critical claim validation", async () => {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: "https://accounts.google.com",
    aud: "google-id",
    sub: "provider-person-1",
    email: "customer@example.com",
    email_verified: true,
    nonce: "expected-nonce",
    exp: now + 300,
    iat: now,
    name: "Customer Name",
  };
  const { token, jwk } = await signedToken(claims);
  const config = oauthConfigFrom("google", { PUBLIC_APP_ORIGIN: "https://stylishme.na", GOOGLE_CLIENT_ID: "google-id", GOOGLE_CLIENT_SECRET: "secret" });
  const fetcher = async () => Response.json({ keys: [jwk] });
  const verified = await verifyProviderIdToken(token, config, "expected-nonce", fetcher);
  assert.equal(verified.subject, "provider-person-1");
  assert.equal(verified.email, "customer@example.com");

  await assert.rejects(() => verifyProviderIdToken(token, config, "wrong-nonce", fetcher), /identity response/i);
  const unverified = await signedToken({ ...claims, email_verified: false });
  await assert.rejects(() => verifyProviderIdToken(unverified.token, config, "expected-nonce", async () => Response.json({ keys: [unverified.jwk] })), /verified email/i);
});
test("Apple revocation credentials are encrypted at rest and sent only to Apple revoke", async () => {
  const encryptionKey = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const encrypted = await encryptProviderCredential("private-refresh-token", encryptionKey);
  assert.doesNotMatch(encrypted, /private-refresh-token/);
  assert.equal(await decryptProviderCredential(encrypted, encryptionKey), "private-refresh-token");
  const config = oauthConfigFrom("apple", { PUBLIC_APP_ORIGIN: "https://stylishme.na", APPLE_CLIENT_ID: "apple-id", APPLE_CLIENT_SECRET: "secret", AUTH_CREDENTIAL_ENCRYPTION_KEY: encryptionKey });
  let request;
  await revokeAppleCredential(config, "private-refresh-token", async (url, init) => { request = { url, init }; return new Response(null, { status: 200 }); });
  assert.equal(request.url, "https://appleid.apple.com/auth/revoke");
  assert.match(String(request.init.body), /token=private-refresh-token/);
});
