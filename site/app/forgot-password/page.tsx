import ForgotPasswordForm from "../ForgotPasswordForm";
import { safeRelativeReturnPath } from "../stylishme-auth";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const returnTo = safeRelativeReturnPath(typeof params.returnTo === "string" ? params.returnTo : "/");
  return <main className="entry-stage auth-page"><section className="entry-shell auth-shell">
    <header><strong>STYLISHME</strong><span>Namibian fashion, personally yours.</span></header>
    <div className="auth-intro"><small>ACCOUNT RECOVERY</small><h1>Reset your password.</h1><p>We will email a short-lived link if the address belongs to a verified StylishMe account.</p></div>
    <ForgotPasswordForm returnTo={returnTo} />
  </section></main>;
}
