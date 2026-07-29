"use client";

import { FormEvent, useEffect, useState } from "react";

export default function AccountDeletionControl() {
  const [pending, setPending] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { void fetch("/api/account/deletion", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(body => { setPending(Boolean(body?.pending)); setScheduledFor(body?.scheduledFor ?? null); }).catch(() => undefined); }, []);
  const schedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setMessage("");
    const password = new FormData(event.currentTarget).get("password");
    const response = await fetch("/api/account/deletion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password, returnTo: "/?view=settings" }) });
    const body = await response.json() as { error?: string; scheduledFor?: string };
    setBusy(false);
    if (!response.ok) return setMessage(body.error ?? "Unable to schedule deletion");
    setPending(true); setScheduledFor(body.scheduledFor ?? null); setMessage("Deletion scheduled. You can cancel during the 30-day grace period.");
  };
  const cancel = async () => {
    setBusy(true); setMessage("");
    const response = await fetch("/api/account/deletion", { method: "DELETE" });
    setBusy(false);
    if (!response.ok) return setMessage("Unable to cancel deletion");
    setPending(false); setScheduledFor(null); setMessage("Your account will stay active.");
  };
  return <section className="settings-card"><h2>Delete account</h2>{pending ? <><p>Your account is scheduled for deletion{scheduledFor ? ` on ${new Date(scheduledFor).toLocaleDateString("en-NA")}` : ""}. Order and financial records required for marketplace accounting are anonymized and retained.</p><button className="outline-button" disabled={busy} onClick={() => void cancel()}>Keep my account</button></> : <form onSubmit={schedule}><p>This starts a 30-day grace period. Your private profile, saved data and photos will then be removed.</p><label>Confirm your password<input name="password" type="password" autoComplete="current-password" required /></label><button className="outline-button" disabled={busy}>{busy ? "Scheduling…" : "Request account deletion"}</button></form>}{message && <small role="status">{message}</small>}</section>;
}
