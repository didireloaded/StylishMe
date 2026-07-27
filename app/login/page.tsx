import Link from "next/link";
import { chatGPTSignInPath } from "../chatgpt-auth";
import { safeInternalReturnTo } from "../session-reset";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : "";
  const returnTo = safeInternalReturnTo(typeof params.returnTo === "string" ? params.returnTo : "/");
  const protectedPath = /^\/(profile|orders|addresses|notifications|seller|admin)(\/|$)/.test(returnTo);
  const guestPath = protectedPath ? "/" : returnTo;
  return <main className="entry-stage auth-page"><section className="entry-shell">
    <header><strong>STYLISHME</strong><span>Namibian fashion, personally yours.</span></header>
    <div className="role-copy"><small>WELCOME</small><h1>{reason === "logged-out" ? "You’ve been signed out." : "Sign in to your StylishMe."}</h1><p>{reason === "expired" ? "Your session has expired. Sign in again to continue." : "Keep your orders, wardrobe and private previews connected across devices."}</p></div>
    <div className="auth-card">
      <a className="entry-primary" href={chatGPTSignInPath(returnTo)}>Sign in securely</a>
      <span><i />or<i /></span>
      <Link className="auth-guest" href={guestPath}>Continue shopping as guest</Link>
      <small>You can browse Home, Shop, products, designers and looks without an account.</small>
    </div>
  </section></main>;
}
