"use client";

import { FormEvent, useState } from "react";

export default function ResetPasswordForm({ token, returnTo }: { token: string; returnTo: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const form = new FormData(event.currentTarget);
      const password = String(form.get("password") ?? "");
      if (password !== String(form.get("confirmPassword") ?? "")) throw new Error("Passwords do not match");
      const response = await fetch("/api/auth/password/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password, returnTo }) });
      const body = await response.json() as { error?: string; returnTo?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to reset password");
      window.location.replace(body.returnTo ?? "/login?reason=password-reset");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to reset password"); setBusy(false); }
  };
  return <form className="account-auth" onSubmit={submit}>
    <label>New password<input name="password" type="password" autoComplete="new-password" minLength={10} required /><small>At least 10 characters with a letter and number.</small></label>
    <label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required /></label>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <button className="entry-primary" disabled={busy}>{busy ? "Saving…" : "Set new password"}</button>
  </form>;
}
