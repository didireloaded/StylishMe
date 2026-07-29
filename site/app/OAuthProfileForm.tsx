"use client";

import { FormEvent, useRef, useState } from "react";

export default function OAuthProfileForm() {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [photoName, setPhotoName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/oauth/complete", { method: "POST", body: new FormData(event.currentTarget) });
      const body = await response.json() as { error?: string; returnTo?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to complete your profile");
      window.location.replace(body.returnTo ?? "/");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to complete your profile"); setBusy(false); }
  };
  return <form className="account-auth" onSubmit={submit}>
    <label>Full name<input name="name" autoComplete="name" required minLength={2}/></label>
    <label className="photo-field">Profile photo<input ref={fileRef} name="avatar" type="file" accept="image/jpeg,image/png,image/webp" required onChange={event => setPhotoName(event.target.files?.[0]?.name ?? "")}/><button type="button" onClick={() => fileRef.current?.click()}>{photoName || "Choose your photo"}</button><small>Required · JPG, PNG or WebP · up to 5 MB</small></label>
    {error ? <p className="auth-error" role="alert">{error}</p> : null}
    <button className="entry-primary" disabled={busy}>{busy ? "Finishing your profile…" : "Finish and enter StylishMe"}</button>
  </form>;
}
