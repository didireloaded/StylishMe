"use client";

import { FormEvent, useRef, useState } from "react";

export default function AuthForm({ returnTo, signedOut = false, reason = "" }: { returnTo: string; signedOut?: boolean; reason?: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<"customer" | "seller">("customer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [photoName, setPhotoName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    const form = event.currentTarget;
    try {
      const response = mode === "signup"
        ? await fetch("/api/auth/signup", { method: "POST", body: new FormData(form) })
        : await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: new FormData(form).get("email"), password: new FormData(form).get("password"), returnTo }) });
      const body = await response.json() as { error?: string; returnTo?: string; verificationRequired?: boolean };
      if (!response.ok) throw new Error(body.error ?? "Unable to continue");
      if (body.verificationRequired) {
        window.location.replace(body.returnTo ?? `/login?reason=check-email&returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }
      window.location.replace(body.returnTo ?? "/");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to continue"); setBusy(false); }
  };

  const resendVerification = async () => {
    const form = formRef.current;
    const email = form ? new FormData(form).get("email") : null;
    if (!email || busy) return setError("Enter your email address first");
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/auth/verification/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, returnTo }) });
      const body = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to resend verification");
      setNotice(body.message ?? "Check your email for a new verification link.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to resend verification"); }
    finally { setBusy(false); }
  };

  return <div className="account-auth">
    {signedOut ? <div className="signed-out-note" role="status">You’ve been signed out.</div> : null}
    {reason === "check-email" ? <div className="signed-out-note" role="status">Check your email and verify your address before signing in.</div> : null}
    {reason === "verified" ? <div className="signed-out-note" role="status">Email verified. You can sign in now.</div> : null}
    {reason === "password-reset" ? <div className="signed-out-note" role="status">Password changed. Sign in with your new password.</div> : null}
    {reason === "verification-invalid" ? <p className="auth-error" role="alert">That verification link is invalid or has expired.</p> : null}
    <div className="auth-tabs" role="tablist"><button type="button" role="tab" aria-selected={mode === "login"} onClick={() => { setMode("login"); setError(""); }}>Sign in</button><button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => { setMode("signup"); setError(""); }}>Create account</button></div>
    <form ref={formRef} onSubmit={submit}>
      {mode === "signup" ? <>
        <div className="role-choice"><button type="button" className={role === "customer" ? "selected" : ""} onClick={() => setRole("customer")}>I’m shopping</button><button type="button" className={role === "seller" ? "selected" : ""} onClick={() => setRole("seller")}>I’m selling</button></div>
        <input type="hidden" name="role" value={role}/><input type="hidden" name="returnTo" value={returnTo}/>
        <label>Full name<input name="name" autoComplete="name" required minLength={2}/></label>
        <label className="photo-field">Profile photo<input ref={fileRef} name="avatar" type="file" accept="image/jpeg,image/png,image/webp" required onChange={event => setPhotoName(event.target.files?.[0]?.name ?? "")}/><button type="button" onClick={() => fileRef.current?.click()}>{photoName || "Choose your photo"}</button><small>Required · JPG, PNG or WebP · up to 5 MB</small></label>
      </> : null}
      <label>Email address<input name="email" type="email" inputMode="email" autoComplete="email" required/></label>
      <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 10 : 1}/>{mode === "signup" ? <small>At least 10 characters with a letter and number.</small> : null}</label>
      {mode === "login" ? <a href={`/forgot-password?returnTo=${encodeURIComponent(returnTo)}`}>Forgot password?</a> : null}
      {notice ? <p className="signed-out-note" role="status">{notice}</p> : null}
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="entry-primary" type="submit" disabled={busy}>{busy ? (mode === "login" ? "Signing in…" : "Creating your account…") : (mode === "login" ? "Sign in" : "Create my StylishMe")}</button>
    </form>
    {mode === "login" ? <button className="auth-link-button" type="button" disabled={busy} onClick={() => void resendVerification()}>Resend verification email</button> : null}
    <div className="provider-divider"><i/><span>More sign-in options</span><i/></div>
    <div className="provider-buttons"><button type="button" disabled title="Available after the Google connection is configured"><b>G</b>Continue with Google<small>Coming soon</small></button><button type="button" disabled title="Available after the Apple connection is configured"><b>●</b>Continue with Apple<small>Coming soon</small></button></div>
    <p className="auth-privacy">Your account belongs to StylishMe. Your profile photo is private and is not used in public outfit stories.</p>
  </div>;
}