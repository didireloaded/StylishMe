"use client";

import { FormEvent, useRef, useState } from "react";
import { profilePhotoError, readAuthResponse } from "./auth-upload";

export default function AuthForm({ returnTo, signedOut = false, reason = "", oauthProviders }: { returnTo: string; signedOut?: boolean; reason?: string; oauthProviders: { google: boolean; apple: boolean } }) {
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
      const formData = new FormData(form);
      if (mode === "signup") {
        const avatar = formData.get("avatar");
        const photoError = profilePhotoError(avatar instanceof File ? avatar : null);
        if (photoError) throw new Error(photoError);
      }
      const response = mode === "signup"
        ? await fetch("/api/auth/signup", { method: "POST", body: formData })
        : await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: formData.get("email"), password: formData.get("password"), returnTo }) });
      const body = await readAuthResponse<{ error?: string; returnTo?: string; verificationRequired?: boolean }>(response, "Unable to continue");
      if (!response.ok || body.error) throw new Error(body.error ?? "Unable to continue");
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
      const body = await readAuthResponse<{ error?: string; message?: string }>(response, "Unable to resend verification");
      if (!response.ok || body.error) throw new Error(body.error ?? "Unable to resend verification");
      setNotice(body.message ?? "Check your email for a new verification link.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to resend verification"); }
    finally { setBusy(false); }
  };

  const providerSignIn = (provider: "google" | "apple") => {
    const query = new URLSearchParams({ role, returnTo });
    window.location.assign("/api/auth/oauth/" + provider + "/start?" + query.toString());
  };

  return <div className="account-auth">
    {signedOut ? <div className="signed-out-note" role="status">You’ve been signed out.</div> : null}
    {reason === "check-email" ? <div className="signed-out-note" role="status">Check your email and verify your address before signing in.</div> : null}
    {reason === "verified" ? <div className="signed-out-note" role="status">Email verified. You can sign in now.</div> : null}
    {reason === "password-reset" ? <div className="signed-out-note" role="status">Password changed. Sign in with your new password.</div> : null}
    {reason === "verification-invalid" ? <p className="auth-error" role="alert">That verification link is invalid or has expired.</p> : null}
    {reason === "oauth-cancelled" ? <p className="auth-error" role="alert">Sign-in was cancelled. You can try again.</p> : null}
    {reason === "oauth-error" ? <p className="auth-error" role="alert">That sign-in could not be verified. Please try again.</p> : null}
    {reason === "account-link-required" ? <p className="auth-error" role="alert">This email already has a StylishMe account. Sign in with email, then connect your provider in Security settings.</p> : null}
    <div className="auth-tabs" role="tablist"><button type="button" role="tab" aria-selected={mode === "login"} onClick={() => { setMode("login"); setError(""); }}>Sign in</button><button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => { setMode("signup"); setError(""); }}>Create account</button></div>
    <form ref={formRef} onSubmit={submit}>
      {mode === "signup" ? <>
        <div className="role-choice"><button type="button" className={role === "customer" ? "selected" : ""} onClick={() => setRole("customer")}>I’m shopping</button><button type="button" className={role === "seller" ? "selected" : ""} onClick={() => setRole("seller")}>I’m selling</button></div>
        <input type="hidden" name="role" value={role}/><input type="hidden" name="returnTo" value={returnTo}/>
        <label>Full name<input name="name" autoComplete="name" required minLength={2}/></label>
        <label className="photo-field">Profile photo<input ref={fileRef} name="avatar" type="file" accept="image/jpeg,image/png,image/webp" required onChange={event => { const file = event.target.files?.[0] ?? null; const photoError = file ? profilePhotoError(file) : ""; if (photoError) { event.currentTarget.value = ""; setPhotoName(""); setError(photoError); return; } setError(""); setPhotoName(file?.name ?? ""); }}/><button type="button" onClick={() => fileRef.current?.click()}>{photoName || "Choose your photo"}</button><small>Required · JPG, PNG or WebP · up to 5 MB</small></label>
      </> : null}
      <label>Email address<input name="email" type="email" inputMode="email" autoComplete="email" required/></label>
      <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 10 : 1}/>{mode === "signup" ? <small>At least 10 characters with a letter and number.</small> : null}</label>
      {mode === "login" ? <a href={`/forgot-password?returnTo=${encodeURIComponent(returnTo)}`}>Forgot password?</a> : null}
      {notice ? <p className="signed-out-note" role="status">{notice}</p> : null}
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="entry-primary" type="submit" disabled={busy}>{busy ? (mode === "login" ? "Signing in…" : "Creating your account…") : (mode === "login" ? "Sign in" : "Create my StylishMe")}</button>
    </form>
    {mode === "login" ? <button className="auth-link-button" type="button" disabled={busy} onClick={() => void resendVerification()}>Resend verification email</button> : null}
    {oauthProviders.google || oauthProviders.apple ? <><div className="provider-divider"><i/><span>Or continue securely</span><i/></div><div className="provider-buttons">
      {oauthProviders.google ? <button type="button" onClick={() => providerSignIn("google")}><b>G</b><span>Continue with Google</span></button> : null}
      {oauthProviders.apple ? <button type="button" onClick={() => providerSignIn("apple")}><b>●</b><span>Continue with Apple</span></button> : null}
    </div></> : null}
    <p className="auth-privacy">Your account belongs to StylishMe. Your profile photo is private and is not used in public outfit stories.</p>
  </div>;
}
