"use client";

import { FormEvent, useEffect, useState } from "react";

type Blocker = { code: string; route: string; message: string };

export default function AccountDeletionControl() {
  const [pending, setPending] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [passwordEnabled, setPasswordEnabled] = useState(true);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { void fetch("/api/account/deletion", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(body => { setPending(Boolean(body?.pending)); setScheduledFor(body?.scheduledFor ?? null); setPasswordEnabled(body?.passwordEnabled !== false); setBlockers(body?.eligibility?.blockers ?? []); }).catch(() => undefined); }, []);
  const schedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    if (form.get("confirmation") !== "DELETE") { setBusy(false); return setMessage("Enter DELETE exactly to continue"); }
    const response = await fetch("/api/account/deletion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: form.get("password"), returnTo: "/?view=settings" }) });
    const body = await response.json().catch(() => ({})) as { error?: string; scheduledFor?: string; confirmationRequired?: boolean; blockers?: Blocker[] };
    setBusy(false);
    if (!response.ok) { if (body.blockers) setBlockers(body.blockers); return setMessage(body.error ?? "Unable to schedule deletion"); }
    if (body.confirmationRequired) return setMessage("Check your verified email and confirm within 30 minutes. The recovery period starts after confirmation.");
    setPending(true); setScheduledFor(body.scheduledFor ?? null); setMessage("Deletion scheduled. You can cancel during the seven-day recovery period.");
    window.location.replace("/login?reason=account-deleted");
  };
  const cancel = async () => {
    setBusy(true); setMessage(""); const response = await fetch("/api/account/deletion", { method: "DELETE" }); setBusy(false);
    if (!response.ok) return setMessage("Unable to cancel deletion");
    setPending(false); setScheduledFor(null); setMessage("Your account will stay active.");
  };
  return <section className="settings-card danger-zone"><h2>Delete my StylishMe account</h2>{pending ? <><p>Your account is scheduled for deletion{scheduledFor ? ` on ${new Date(scheduledFor).toLocaleDateString("en-NA")}` : ""}. Required order and financial history is anonymized and retained.</p><button className="outline-button" disabled={busy} onClick={() => void cancel()}>Keep my account</button></> : blockers.length ? <><p>Resolve these items before deleting your account.</p>{blockers.map(blocker => <a key={blocker.code} href={blocker.route}>{blocker.message}</a>)}</> : <form onSubmit={schedule}><p>This starts a seven-day recovery period. Close an active seller store first. Your private profile, saved data and photos will then be removed.</p><label>Enter DELETE to confirm<input name="confirmation" required autoComplete="off" /></label>{passwordEnabled ? <label>Confirm your password<input name="password" type="password" autoComplete="current-password" required /></label> : <p>We will send a private confirmation link to your verified email.</p>}<button className="outline-button" disabled={busy}>{busy ? "Requesting…" : passwordEnabled ? "Delete my StylishMe account" : "Email deletion confirmation"}</button></form>}{message && <small role="status">{message}</small>}</section>;
}
