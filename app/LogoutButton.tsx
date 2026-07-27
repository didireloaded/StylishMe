"use client";

import { useState } from "react";
import { clearPrivateAccountState } from "./session-reset";

export default function LogoutButton({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    clearPrivateAccountState(window.localStorage, email);
    window.sessionStorage.removeItem("stylishme-session-id");
    if ("caches" in window) {
      const names = await caches.keys().catch(() => []);
      await Promise.all(names.filter(name => name.startsWith("stylishme-private-")).map(name => caches.delete(name)));
    }
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", headers: { "content-type": "application/json" } });
      if (!response.ok) throw new Error();
      window.location.replace("/login?reason=logged-out");
    } catch {
      setBusy(false);
      setError("Couldn’t sign out. Check your connection and try again.");
    }
  };

  return <div className="logout-control"><button className="profile-logout" type="button" disabled={busy} aria-busy={busy} onClick={() => void logout()}>
    {busy ? "Signing out…" : "Log out"}
  </button>{error ? <small role="alert">{error}</small> : null}</div>;
}
