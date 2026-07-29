"use client";

import { FormEvent, useState } from "react";

export default function ForgotPasswordForm({ returnTo }: { returnTo: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/password/forgot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email"), returnTo }) });
      const body = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to send reset email");
      setMessage(body.message ?? "Check your email for a reset link.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to send reset email");
    } finally { setBusy(false); }
  };
  return <form className="account-auth" onSubmit={submit}>
    <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
    {message && <p className="signed-out-note" role="status">{message}</p>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    <button className="entry-primary" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
    <a href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Back to sign in</a>
  </form>;
}
