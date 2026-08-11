"use client";

import { FormEvent, useEffect, useState } from "react";

type Blocker = { code: string; count: number; route: string; message: string };
type Status = { pending: boolean; scheduledFor: string | null; passwordEnabled: boolean; eligibility: { allowed: boolean; blockers: Blocker[] } };

async function responseBody(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text) as Record<string, unknown>; }
  catch { return { error: response.ok ? "Unexpected response" : "Unable to complete this request" }; }
}

export default function StoreClosureControl({ storeName }: { storeName: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { void fetch("/api/seller/store-closure", { cache: "no-store" }).then(async response => response.ok ? setStatus(await response.json() as Status) : undefined).catch(() => undefined); }, []);
  const close = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/seller/store-closure", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ storeName: data.get("storeName"), password: data.get("password") }) });
    const body = await responseBody(response); setBusy(false);
    if (!response.ok) return setMessage(typeof body.error === "string" ? body.error : "Unable to close your store");
    if (body.confirmationRequired) return setMessage("Check your verified email to confirm store closure.");
    localStorage.removeItem("stylishme-entry-role");
    window.location.replace("/?role=customer&reason=store-closed");
  };
  const cancel = async () => {
    setBusy(true); const response = await fetch("/api/seller/store-closure", { method: "DELETE" }); setBusy(false);
    if (response.ok) { setStatus(current => current ? { ...current, pending: false, scheduledFor: null } : current); setMessage("Your store will stay open."); }
    else setMessage("Unable to restore your store right now.");
  };
  return <section className="form-card danger-zone"><h2>Close my store</h2>{status?.pending ? <><p>Your store is closed to new customers and scheduled for final removal{status.scheduledFor ? ` on ${new Date(status.scheduledFor).toLocaleDateString("en-NA")}` : ""}. Your customer account remains active.</p><button type="button" disabled={busy} onClick={() => void cancel()}>Keep my store</button></> : <><p>Your customer account will remain active. Products become unavailable immediately and eligible private store data is removed after seven days.</p>{!reviewing ? <button type="button" className="outline-button" onClick={() => setReviewing(true)}>Review store closure</button> : status && !status.eligibility.allowed ? <div>{status.eligibility.blockers.map(blocker => <a key={blocker.code} href={blocker.route}>{blocker.message}</a>)}</div> : <form onSubmit={close}><label>Enter your store name<input name="storeName" required autoComplete="off" /></label>{status?.passwordEnabled !== false && <label>Confirm your password<input name="password" type="password" required autoComplete="current-password" /></label>}<button className="outline-button" disabled={busy}>{busy ? "Closing store…" : `Close ${storeName}`}</button></form>}</>}{message && <small role="status">{message}</small>}</section>;
}
