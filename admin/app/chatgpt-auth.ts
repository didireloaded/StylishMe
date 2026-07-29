import { headers } from "next/headers";

export type ChatGPTUser = {
  displayName: string;
  email: string;
};
export function allowedOwnerEmails() {
  return new Set((process.env.STYLISHME_ADMIN_OWNER_EMAILS ?? "")
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(Boolean));
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  if (!email || !allowedOwnerEmails().has(email.trim().toLowerCase())) return null;
  const encodedName = requestHeaders.get("oai-authenticated-user-full-name");
  const encoding = requestHeaders.get("oai-authenticated-user-full-name-encoding");
  let displayName = email;
  if (encodedName && encoding === "percent-encoded-utf-8") {
    try { displayName = decodeURIComponent(encodedName); } catch {}
  }
  return { displayName, email };
}
