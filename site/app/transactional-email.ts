export type EmailConfig = { available: boolean; apiKey: string; from: string; publicOrigin: string };

export class EmailUnavailableError extends Error {
  constructor(message = "Account email is temporarily unavailable") {
    super(message);
    this.name = "EmailUnavailableError";
  }
}

export function currentEmailConfig(source: Record<string, string | undefined> = process.env): EmailConfig {
  const apiKey = source.RESEND_API_KEY?.trim() ?? "";
  const from = source.AUTH_EMAIL_FROM?.trim() ?? "";
  const candidate = source.PUBLIC_APP_ORIGIN?.trim() ?? "";
  let publicOrigin = "";
  try {
    const url = new URL(candidate);
    if (url.protocol === "https:") publicOrigin = url.origin;
  } catch {}
  return { available: Boolean(apiKey && from && publicOrigin), apiKey, from, publicOrigin };
}

export async function sendTransactionalEmail(
  config: EmailConfig,
  message: { to: string; subject: string; text: string },
  fetcher: typeof fetch = fetch,
) {
  if (!config.available) throw new EmailUnavailableError();
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.from, to: [message.to], subject: message.subject, text: message.text }),
  });
  if (!response.ok) throw new EmailUnavailableError("Account email could not be sent");
  return response.json().catch(() => ({}));
}
