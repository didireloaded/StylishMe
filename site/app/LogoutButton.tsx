"use client";

import { useState } from "react";
import { clearPrivateAccountState } from "./session-reset";

export default function LogoutButton({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    clearPrivateAccountState(window.localStorage, email);
    window.sessionStorage.removeItem("stylishme-session-id");
    if ("caches" in window) {
      const names = await caches.keys().catch(() => []);
      await Promise.all(names.filter(name => name.startsWith("stylishme-private-")).map(name => caches.delete(name)));
    }
    const returnTo = "/login?reason=logged-out";
    window.location.replace(`/signout-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`);
  };

  return <button className="profile-logout" type="button" disabled={busy} aria-busy={busy} onClick={() => void logout()}>
    {busy ? "Signing out…" : "Log out"}
  </button>;
}
