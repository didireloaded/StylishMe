export const ACCOUNT_RESET_VERSION = "2026-07-23-v1";
export const ACCOUNT_RESET_MARKER = `stylishme-session-reset:${ACCOUNT_RESET_VERSION}`;

type StorageLike = Pick<Storage, "key" | "length" | "getItem" | "removeItem" | "setItem">;

export function clearStylishMeSession(storage: StorageLike) {
  if (storage.getItem(ACCOUNT_RESET_MARKER) === "complete") return false;

  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => Boolean(key?.startsWith("stylishme-")));

  keys.forEach((key) => storage.removeItem(key));
  storage.setItem(ACCOUNT_RESET_MARKER, "complete");
  return true;
}

export function clearPrivateAccountState(storage: StorageLike, email: string) {
  const identity = email.trim().toLowerCase();
  if (!identity) return;
  const privateKeys = [
    `stylishme-state:${identity}`,
    `stylishme-account-role:${identity}`,
    `stylishme-seller-draft:${identity}`,
    `stylishme-try-on:${identity}`,
    `stylishme-notifications:${identity}`,
  ];
  privateKeys.forEach(key => storage.removeItem(key));
}

export function safeInternalReturnTo(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://stylishme.local");
    if (url.origin !== "https://stylishme.local") return fallback;
    if (["/login", "/api/auth/logout"].includes(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
