"use client";

import { useEffect, useMemo, useState } from "react";

import SellerApp from "./SellerApp";
import StorefrontView from "./StorefrontView";
import StylishMeApp from "./StylishMeApp";
import type { AccountRole } from "./unified-domain";

type User = { name: string; email: string } | null;
type EntryStage = "welcome" | "highlights" | "auth" | "role";

export default function AppEntry({ user }: { user: User }) {
  const [stage, setStage] = useState<EntryStage>("welcome");
  const [role, setRole] = useState<AccountRole | null>(null);
  const [storeSlug, setStoreSlug] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("store") ?? "");
  const [checkingRole, setCheckingRole] = useState(true);
  const roleKey = useMemo(() => `stylishme-account-role:${user?.email ?? "guest"}`, [user?.email]);
  const joinIntent = useMemo<AccountRole | null>(() => {
    if (typeof window === "undefined") return null;
    const value = new URLSearchParams(window.location.search).get("join");
    return value === "customer" || value === "seller" ? value : null;
  }, []);

  const track = (event: string, targetType?: string, targetId?: string) => {
    const sessionKey = "stylishme-session-id";
    let sessionId = sessionStorage.getItem(sessionKey);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(sessionKey, sessionId);
    }
    const params = new URLSearchParams(window.location.search);
    const context = {
      source: params.get("utm_source") ?? "direct",
      medium: params.get("utm_medium") ?? "none",
      campaign: params.get("utm_campaign") ?? "none",
      referrerHost: document.referrer ? new URL(document.referrer).hostname : "direct",
      path: window.location.pathname,
    };
    void fetch("/api/activity", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, targetType, targetId, context, sessionId }),
      keepalive: true,
    }).catch(() => undefined);
  };

  useEffect(() => {
    track("page_viewed", "page", window.location.pathname === "/demo" ? "demo" : "home");
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(roleKey);
    fetch("/api/account")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(async (account) => {
        if (user && joinIntent) {
          const response = await fetch("/api/account", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ role: joinIntent }),
          });
          if (response.ok) {
            localStorage.setItem(roleKey, joinIntent);
            setRole(joinIntent);
            window.history.replaceState({}, "", window.location.pathname);
            return;
          }
        }
        const persisted = account?.role;
        if (persisted === "customer" || persisted === "seller") {
          localStorage.setItem(roleKey, persisted);
          setRole(persisted);
        } else if (saved === "customer" || (saved === "seller" && user)) {
          setRole(saved);
        }
      })
      .catch(() => {
        if (saved === "customer" || (saved === "seller" && user)) setRole(saved);
      })
      .finally(() => setCheckingRole(false));
  }, [joinIntent, roleKey, user]);

  const chooseRole = async (next: AccountRole) => {
    track("role_selected", "role", next);
    if (next === "seller" && !user) {
      track("signup_started", "flow", "seller");
      setStage("auth");
      return;
    }
    const response = await fetch("/api/account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    if (!response.ok && next === "seller") {
      setStage("auth");
      return;
    }
    localStorage.setItem(roleKey, next);
    setRole(next);
  };

  if (storeSlug) {
    return <StorefrontView storeSlug={storeSlug} onExit={() => {
      window.history.pushState({}, "", window.location.pathname);
      setStoreSlug("");
    }} />;
  }

  if (checkingRole) return <main className="entry-stage"><section className="entry-shell entry-loading"><header><strong>STYLISHME</strong><span>Namibian fashion, personally yours.</span></header><div><small>WELCOME BACK</small><h1>Preparing your StylishMe.</h1></div></section></main>;

  if (role === "seller" && user) return <SellerApp user={user} />;
  if (role === "customer") return <StylishMeApp user={user} />;

  return <main className="entry-stage">
    <section className="entry-shell">
      <header><strong>STYLISHME</strong><span>Namibian fashion, personally yours.</span></header>
      {stage === "welcome" && <>
        <div className="entry-art" aria-hidden="true"><span>FIND</span><span>THE</span><span>LOOK.</span></div>
        <div className="entry-copy">
          <small>WELCOME TO STYLISHME</small>
          <h1>Your personal guide to Namibian fashion.</h1>
          <p>Discover local designers, shop complete looks and see how pieces could work for you.</p>
          <button onClick={() => setStage("highlights")}>Begin</button>
        </div>
      </>}
      {stage === "highlights" && <>
        <div className="role-copy">
          <small>MADE FOR YOUR STYLE</small>
          <h1>One place to discover, style and shop.</h1>
          <p>Everything supports a simple journey from inspiration to a confident order.</p>
        </div>
        <div className="onboarding-highlights">
          <article><span>01</span><div><strong>Discover what is new</strong><small>Outfits of the day, local designers and fresh collections.</small></div></article>
          <article><span>02</span><div><strong>Build the complete look</strong><small>Style Me creates shoppable outfits for your occasion and budget.</small></div></article>
          <article><span>03</span><div><strong>Shop with confidence</strong><small>Save your fit, preview looks and choose delivery or collection.</small></div></article>
        </div>
        <button className="entry-primary" onClick={() => setStage(user ? "role" : "auth")}>Continue</button>
        <button className="entry-back" onClick={() => setStage("welcome")}>Back</button>
      </>}
      {stage === "auth" && <>
        <div className="role-copy">
          <small>YOUR STYLISHME</small>
          <h1>Save your style across devices.</h1>
          <p>Sign in to keep orders, your wardrobe, private previews and seller tools connected to you.</p>
        </div>
        <div className="auth-card">
          <a className="entry-primary" href="/signin-with-chatgpt?return_to=/" onClick={() => track("signup_started", "flow", "account")}>Sign in securely</a>
          <span><i />or<i /></span>
          <button className="auth-guest" onClick={() => void chooseRole("customer")}>Continue as guest</button>
          <small>Guests can browse and shop in this preview. Sign-in is required for seller tools and private try-on.</small>
        </div>
        <button className="entry-back" onClick={() => setStage("highlights")}>Back</button>
      </>}
      {stage === "role" && <>
        <div className="role-copy">
          <small>MAKE IT YOURS</small>
          <h1>How will you use StylishMe?</h1>
          <p>Your choice opens a dedicated experience. Customer and seller tools stay separate.</p>
        </div>
        <div className="role-cards">
          <button onClick={() => void chooseRole("customer")}>
            <span>01</span><strong>Shop fashion</strong>
            <small>Discover looks, stores and designers. Save, style and order.</small><b>Continue as customer →</b>
          </button>
          <button onClick={() => void chooseRole("seller")}>
            <span>02</span><strong>Sell on StylishMe</strong>
            <small>Create your store, publish collections and manage customer orders.</small><b>Continue as seller →</b>
          </button>
        </div>
        <button className="entry-back" onClick={() => setStage("highlights")}>Back</button>
      </>}
    </section>
  </main>;
}
