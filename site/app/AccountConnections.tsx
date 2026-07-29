"use client";

import { FormEvent, useEffect, useState } from "react";

type Provider = "google" | "apple";
type Connections = { available: Record<Provider, boolean>; connected: Record<Provider, boolean>; passwordEnabled: boolean };

export default function AccountConnections() {
  const [connections, setConnections] = useState<Connections | null>(null);
  const [selected, setSelected] = useState<Provider | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/account/connections", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(setConnections).catch(() => undefined); }, []);
  if (!connections || (!connections.available.google && !connections.available.apple)) return null;
  const connect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selected || busy) return; setBusy(true); setMessage("");
    try {
      const password = String(new FormData(event.currentTarget).get("password") ?? "");
      const response = await fetch(`/api/auth/oauth/${selected}/link`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password, returnTo: "/?view=settings" }) });
      const body = await response.json() as { error?: string; authorizationUrl?: string };
      if (!response.ok || !body.authorizationUrl) throw new Error(body.error ?? "Unable to connect this account");
      window.location.assign(body.authorizationUrl);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Unable to connect this account"); setBusy(false); }
  };
  return <section className="settings-card"><h2>Connected sign-in</h2><p>{connections.passwordEnabled ? "Connect a provider only after confirming your StylishMe password." : "Your provider sign-in is active. Set a StylishMe password before connecting another provider."}</p>{!connections.passwordEnabled ? <a href="/forgot-password?returnTo=%2F%3Fview%3Dsettings">Set a password securely</a> : null}
    {(["google", "apple"] as Provider[]).filter(provider => connections.available[provider]).map(provider => <div className="connection-row" key={provider}><span><strong>{provider === "google" ? "Google" : "Apple"}</strong><small>{connections.connected[provider] ? "Connected" : "Not connected"}</small></span>{connections.connected[provider] ? <b aria-label={`${provider} connected`}>✓</b> : <button className="outline-button" type="button" disabled={!connections.passwordEnabled} onClick={() => { setSelected(provider); setMessage(""); }}>Connect</button>}</div>)}
    {selected && connections.passwordEnabled ? <form onSubmit={connect}><label>Confirm your password<input name="password" type="password" autoComplete="current-password" required/></label><button className="entry-primary" disabled={busy}>{busy ? "Connecting…" : `Continue to ${selected === "google" ? "Google" : "Apple"}`}</button><button className="auth-link-button" type="button" onClick={() => setSelected(null)}>Cancel</button></form> : null}
    {message ? <small role="alert">{message}</small> : null}
  </section>;
}
