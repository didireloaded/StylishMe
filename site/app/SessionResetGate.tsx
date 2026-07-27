"use client";

import { ReactNode, useEffect, useState } from "react";
import { ACCOUNT_RESET_MARKER, clearStylishMeSession } from "./session-reset";

export default function SessionResetGate({
  children,
  signedIn,
  returnTo,
}: {
  children: ReactNode;
  signedIn: boolean;
  returnTo: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const wasReset = clearStylishMeSession(window.localStorage);
    if (wasReset && signedIn) {
      window.location.replace(`/signout-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`);
      return;
    }
    const timer = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(timer);
  }, [returnTo, signedIn]);

  if (!ready) {
    return (
      <main className="entry-stage">
        <section className="entry-shell entry-loading">
          <header><strong>STYLISHME</strong><span>Namibian fashion, personally yours.</span></header>
          <div><small>ONE MOMENT</small><h1>Preparing a fresh StylishMe.</h1><p>Your previous app session is being cleared safely.</p></div>
        </section>
      </main>
    );
  }

  return <div data-session-reset={ACCOUNT_RESET_MARKER}>{children}</div>;
}
