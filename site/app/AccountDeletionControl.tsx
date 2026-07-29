"use client";

import { FormEvent, useEffect, useState } from "react";

export default function AccountDeletionControl() {
  const [pending, setPending] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [passwordEnabled, setPasswordEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { void fetch("/api/account/deletion", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(body => { setPending(Boolean(body?.pending)); setScheduledFor(body?.scheduledFor ?? null); setPasswordEnabled(body?.passwordEnabled !== false); }).catch(() => undefined); }, []);
  const schedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setMessage("");
    const password = new FormData(event.currentTarget).get("password");
    const response = await fetch("/api/account/deletion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password, returnTo: "/?view=settings" }) });
    const body = await response.json() as { error?: string; scheduledFor?: string; confirmationRequired?: boolean };
    setBusy(false);
    if (!response.ok) return setMessage(body.error ?? "Unable to schedule deletion");
    if (body.confirmationRequired) return setMessage("Check your verified email and confirm within 30 minutes. The grace period starts after confirmation.");
    setPending(true); setScheduledFor(body.scheduledFor ?? null); setMessage("Deletion scheduled. You can cancel during the 30-day grace period.");
  };
  const cancel = async () => {
    setBusy(true); setMessage("");
    const response = await fetch("/api/account/deletion", { method: "DELETE" });
    setBusy(false);
    if (!response.ok) return setMessage("Unable to cancel deletion");
    setPending(false); setScheduledFor(null); setMessage("Your account will stay active.");
  };
  return <section className="settings-card"><h2>Delete account</h2>{pending ? <><p>Your account is scheduled for deletion{scheduledFor ? ` on ${new Date(scheduledFor).toLocaleDateString("en-NA")}` : ""}. Order and financial records required for marketplace accounting are anonymized and retained.</p><button className="outline-button" disabled={busy} onClick={() => void cancel()}>Keep my account</button></> : <form onSubmit={schedule}><p>This starts a 30-day grace period. Your private profile, saved data and photos will then be removed.</p>{passwordEnabled ? <label>Confirm your password<input name="password" type="password" autoComplete="current-password" required /></label> : <p>We will send a private confirmation link to your verified email.</p>}<button className="outline-button" disabled={busy}>{busy ? "Requesting…" : passwordEnabled ? "Request account deletion" : "Email deletion confirmation"}</button></form>}{message && <small role="status">{message}</small>}</section>;
}
