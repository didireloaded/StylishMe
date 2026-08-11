"use client";

import { FormEvent, useRef, useState } from "react";
import { profilePhotoError, readAuthResponse } from "./auth-upload";

export default function OAuthProfileForm() {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [photoName, setPhotoName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try {
      const formData = new FormData(event.currentTarget);
      const avatar = formData.get("avatar");
      const photoError = profilePhotoError(avatar instanceof File ? avatar : null);
      if (photoError) throw new Error(photoError);
      const response = await fetch("/api/auth/oauth/complete", { method: "POST", body: formData });
      const body = await readAuthResponse<{ error?: string; returnTo?: string }>(response, "Unable to complete your profile");
      if (!response.ok || body.error) throw new Error(body.error ?? "Unable to complete your profile");
      window.location.replace(body.returnTo ?? "/");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to complete your profile"); setBusy(false); }
  };
  return <form className="account-auth" onSubmit={submit}>
    <label>Full name<input name="name" autoComplete="name" required minLength={2}/></label>
    <label className="photo-field">Profile photo<input ref={fileRef} name="avatar" type="file" accept="image/jpeg,image/png,image/webp" required onChange={event => { const file = event.target.files?.[0] ?? null; const photoError = file ? profilePhotoError(file) : ""; if (photoError) { event.currentTarget.value = ""; setPhotoName(""); setError(photoError); return; } setError(""); setPhotoName(file?.name ?? ""); }}/><button type="button" onClick={() => fileRef.current?.click()}>{photoName || "Choose your photo"}</button><small>Required · JPG, PNG or WebP · up to 5 MB</small></label>
    {error ? <p className="auth-error" role="alert">{error}</p> : null}
    <button className="entry-primary" disabled={busy}>{busy ? "Finishing your profile…" : "Finish and enter StylishMe"}</button>
  </form>;
}
