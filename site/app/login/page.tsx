import { redirect } from "next/navigation";
import AuthForm from "../AuthForm";
import { oauthAvailability } from "../oauth";
import { getStylishMeUser, safeRelativeReturnPath } from "../stylishme-auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : "";
  const returnTo = safeRelativeReturnPath(typeof params.returnTo === "string" ? params.returnTo : "/");
  if (await getStylishMeUser()) redirect(returnTo);
  return <main className="entry-stage auth-page"><section className="entry-shell auth-shell">
    <header><strong>STYLISHME</strong><span>Namibian fashion, personally yours.</span></header>
    <div className="auth-intro"><small>WELCOME TO YOUR STYLE</small><h1>{reason === "expired" ? "Sign in again to continue." : reason === "check-email" ? "Verify your email to continue." : "Find the look. Make it yours."}</h1><p>Discover Namibian fashion, save your wardrobe and keep every order connected to you.</p></div>
    <AuthForm returnTo={returnTo} signedOut={reason === "logged-out"} reason={reason} oauthProviders={oauthAvailability()}/>
  </section></main>;
}
