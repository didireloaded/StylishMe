import type { D1DatabaseLike } from "./inventory-reservations";
import { currentOAuthConfig, decryptProviderCredential, revokeAppleCredential } from "./oauth";

export async function revokeAccountProviderCredentials(db: D1DatabaseLike, email: string, fetcher: typeof fetch = fetch) {
  const credentials = await db.prepare(`SELECT c.encrypted_refresh_token AS encryptedRefreshToken FROM auth_provider_credentials c
    JOIN auth_identities i ON i.id = c.identity_id WHERE i.account_email = ? AND i.provider = 'apple'`).bind(email).all<{ encryptedRefreshToken: string }>();
  if (!(credentials.results ?? []).length) return;
  const config = currentOAuthConfig("apple");
  if (!config.available) throw new Error("Apple account revocation is not configured");
  for (const credential of credentials.results ?? []) {
    const token = await decryptProviderCredential(credential.encryptedRefreshToken, config.credentialEncryptionKey);
    await revokeAppleCredential(config, token, fetcher);
  }
}
