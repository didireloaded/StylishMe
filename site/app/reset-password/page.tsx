import ResetPasswordForm from "../ResetPasswordForm";
import { safeRelativeReturnPath } from "../stylishme-auth";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const returnTo = safeRelativeReturnPath(typeof params.returnTo === "string" ? params.returnTo : "/");
  return <main className="entry-stage auth-page"><section className="entry-shell auth-shell">
    <header><strong>STYLISHME</strong><span>Namibian fashion, personally yours.</span></header>
    <div className="auth-intro"><small>SECURE RESET</small><h1>Choose a new password.</h1><p>The link works once and expires after 30 minutes.</p></div>
    {token ? <ResetPasswordForm token={token} returnTo={returnTo} /> : <p className="auth-error" role="alert">This reset link is incomplete.</p>}
  </section></main>;
}
