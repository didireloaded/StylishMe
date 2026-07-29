export type OAuthProvider = "google" | "apple";

export type OAuthConfig = {
  available: boolean;
  provider: OAuthProvider;
  clientId: string;
  clientSecret: string;
  teamId: string;
  keyId: string;
  privateKey: string;
  credentialEncryptionKey: string;
  publicOrigin: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  jwksUrl: string;
  issuers: string[];
};

export type VerifiedProviderIdentity = {
  subject: string;
  email: string;
  name: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const trim = (value: unknown) => typeof value === "string" ? value.trim() : "";
const base64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
const decodeBase64Url = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
};
const jsonPart = (value: unknown) => base64Url(encoder.encode(JSON.stringify(value)));
const secureEquals = (left: string, right: string) => {
  if (!left || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
};
const validHttpsOrigin = (value: unknown) => {
  try {
    const url = new URL(trim(value));
    return url.protocol === "https:" && url.pathname === "/" && !url.search && !url.hash ? url.origin : "";
  } catch { return ""; }
};
const validEncryptionKey = (value: string) => {
  try { return decodeBase64Url(value).byteLength === 32; } catch { return false; }
};

export function oauthConfigFrom(provider: OAuthProvider, source: Record<string, unknown>): OAuthConfig {
  const publicOrigin = validHttpsOrigin(source.PUBLIC_APP_ORIGIN);
  const isGoogle = provider === "google";
  const clientId = trim(isGoogle ? source.GOOGLE_CLIENT_ID : source.APPLE_CLIENT_ID);
  const clientSecret = trim(isGoogle ? source.GOOGLE_CLIENT_SECRET : source.APPLE_CLIENT_SECRET);
  const teamId = trim(source.APPLE_TEAM_ID);
  const keyId = trim(source.APPLE_KEY_ID);
  const privateKey = trim(source.APPLE_PRIVATE_KEY).replaceAll("\\n", "\n");
  const credentialEncryptionKey = trim(source.AUTH_CREDENTIAL_ENCRYPTION_KEY);
  const appleCredentials = Boolean(clientSecret || (teamId && keyId && privateKey));
  const available = Boolean(publicOrigin && clientId && (isGoogle ? clientSecret : appleCredentials && validEncryptionKey(credentialEncryptionKey)));
  return {
    available,
    provider,
    clientId,
    clientSecret,
    teamId,
    keyId,
    privateKey,
    credentialEncryptionKey,
    publicOrigin,
    redirectUri: publicOrigin ? `${publicOrigin}/api/auth/oauth/${provider}/callback` : "",
    authorizationUrl: isGoogle ? "https://accounts.google.com/o/oauth2/v2/auth" : "https://appleid.apple.com/auth/authorize",
    tokenUrl: isGoogle ? "https://oauth2.googleapis.com/token" : "https://appleid.apple.com/auth/token",
    jwksUrl: isGoogle ? "https://www.googleapis.com/oauth2/v3/certs" : "https://appleid.apple.com/auth/keys",
    issuers: isGoogle ? ["https://accounts.google.com", "accounts.google.com"] : ["https://appleid.apple.com"],
  };
}

export const currentOAuthConfig = (provider: OAuthProvider) => oauthConfigFrom(provider, process.env);
export const oauthAvailability = (source: Record<string, unknown> = process.env) => ({
  google: oauthConfigFrom("google", source).available,
  apple: oauthConfigFrom("apple", source).available,
});

function requireConfig(config: OAuthConfig) {
  if (!config.available) throw new Error(`${config.provider === "google" ? "Google" : "Apple"} sign-in is not configured`);
}

export function buildAuthorizationUrl(config: OAuthConfig, input: { state: string; nonce: string; codeChallenge: string }) {
  requireConfig(config);
  const url = new URL(config.authorizationUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.provider === "google" ? "openid email profile" : "name email");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  if (config.provider === "google") {
    url.searchParams.set("code_challenge", input.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  } else {
    url.searchParams.set("response_mode", "form_post");
  }
  return url.toString();
}

async function appleClientSecret(config: OAuthConfig, now = new Date()) {
  if (config.clientSecret) return config.clientSecret;
  if (!config.teamId || !config.keyId || !config.privateKey) throw new Error("Apple sign-in is not configured");
  const pkcs8 = config.privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const key = await crypto.subtle.importKey("pkcs8", decodeBase64Url(pkcs8.replaceAll("+", "-").replaceAll("/", "_")), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const issuedAt = Math.floor(now.getTime() / 1000);
  const header = jsonPart({ alg: "ES256", kid: config.keyId });
  const payload = jsonPart({ iss: config.teamId, iat: issuedAt, exp: issuedAt + 300, aud: "https://appleid.apple.com", sub: config.clientId });
  const input = `${header}.${payload}`;
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(input));
  return `${input}.${base64Url(new Uint8Array(signature))}`;
}

export async function exchangeAuthorizationCode(config: OAuthConfig, input: { code: string; codeVerifier: string }, fetcher: typeof fetch = fetch) {
  requireConfig(config);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.provider === "apple" ? await appleClientSecret(config) : config.clientSecret,
  });
  if (config.provider === "google") body.set("code_verifier", input.codeVerifier);
  const response = await fetcher(config.tokenUrl, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, body, redirect: "error" });
  if (!response.ok) throw new Error("The identity provider could not complete sign-in");
  const payload = await response.json() as { id_token?: unknown; refresh_token?: unknown };
  const idToken = trim(payload.id_token);
  if (!idToken || idToken.length > 20_000) throw new Error("The identity provider returned an invalid response");
  return { idToken, refreshToken: trim(payload.refresh_token) || null };
}

export async function verifyProviderIdToken(token: string, config: OAuthConfig, expectedNonce: string, fetcher: typeof fetch = fetch, now = new Date()): Promise<VerifiedProviderIdentity> {
  requireConfig(config);
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some(part => !part || part.length > 16_000)) throw new Error("The identity response is invalid");
  let header: Record<string, unknown>; let claims: Record<string, unknown>;
  try {
    header = JSON.parse(decoder.decode(decodeBase64Url(parts[0]))) as Record<string, unknown>;
    claims = JSON.parse(decoder.decode(decodeBase64Url(parts[1]))) as Record<string, unknown>;
  } catch { throw new Error("The identity response is invalid"); }
  const kid = trim(header.kid);
  if (header.alg !== "RS256" || !kid) throw new Error("The identity response is invalid");
  const keysResponse = await fetcher(config.jwksUrl, { headers: { accept: "application/json" }, redirect: "error" });
  if (!keysResponse.ok) throw new Error("The identity provider is temporarily unavailable");
  const keysBody = await keysResponse.json() as { keys?: Array<JsonWebKey & { kid?: string; alg?: string; use?: string }> };
  const jwk = keysBody.keys?.find(key => key.kid === kid && key.kty === "RSA" && (!key.alg || key.alg === "RS256") && (!key.use || key.use === "sig"));
  if (!jwk) throw new Error("The identity response is invalid");
  const publicKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const validSignature = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, decodeBase64Url(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`));
  if (!validSignature) throw new Error("The identity response is invalid");
  const audience = Array.isArray(claims.aud) ? claims.aud.filter(item => typeof item === "string") : [trim(claims.aud)].filter(Boolean);
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const expiresAt = Number(claims.exp);
  const issuedAt = Number(claims.iat);
  const subject = trim(claims.sub).slice(0, 255);
  const email = trim(claims.email).toLowerCase().slice(0, 180);
  const nonce = trim(claims.nonce);
  const verifiedEmail = claims.email_verified === true || claims.email_verified === "true";
  const issuerValid = config.issuers.includes(trim(claims.iss));
  const authorizedPartyValid = audience.length <= 1 || trim(claims.azp) === config.clientId;
  if (!issuerValid || !audience.includes(config.clientId) || !authorizedPartyValid || !Number.isFinite(expiresAt) || expiresAt < nowSeconds - 60 || !Number.isFinite(issuedAt) || issuedAt > nowSeconds + 300 || !secureEquals(nonce, expectedNonce) || !subject) throw new Error("The identity response is invalid");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !verifiedEmail) throw new Error("The identity provider did not supply a verified email address");
  const name = trim(claims.name).replace(/[\u0000-\u001f]/g, "").slice(0, 80);
  return { subject, email, name };
}

export async function encryptProviderCredential(value: string, keyValue: string) {
  if (!validEncryptionKey(keyValue)) throw new Error("Provider credential encryption is not configured");
  const key = await crypto.subtle.importKey("raw", decodeBase64Url(keyValue), "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: encoder.encode("stylishme:provider-refresh:v1") }, key, encoder.encode(value));
  return `v1.${base64Url(iv)}.${base64Url(new Uint8Array(encrypted))}`;
}

export async function decryptProviderCredential(value: string, keyValue: string) {
  const [version, encodedIv, encodedValue] = value.split(".");
  if (version !== "v1" || !validEncryptionKey(keyValue)) throw new Error("Provider credential cannot be read");
  const key = await crypto.subtle.importKey("raw", decodeBase64Url(keyValue), "AES-GCM", false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decodeBase64Url(encodedIv), additionalData: encoder.encode("stylishme:provider-refresh:v1") }, key, decodeBase64Url(encodedValue));
  return decoder.decode(decrypted);
}

export async function revokeAppleCredential(config: OAuthConfig, refreshToken: string, fetcher: typeof fetch = fetch) {
  requireConfig(config);
  if (config.provider !== "apple") return;
  const body = new URLSearchParams({ token: refreshToken, token_type_hint: "refresh_token", client_id: config.clientId, client_secret: await appleClientSecret(config) });
  const response = await fetcher("https://appleid.apple.com/auth/revoke", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, redirect: "error" });
  if (!response.ok) throw new Error("Apple access could not be revoked");
}
