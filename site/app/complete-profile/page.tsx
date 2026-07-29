import { redirect } from "next/navigation";

import OAuthProfileForm from "../OAuthProfileForm";
import { getStylishMeUser } from "../stylishme-auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function CompleteProfilePage() {
  if (await getStylishMeUser()) redirect("/");
  return <main className="entry-stage auth-page"><section className="entry-shell auth-shell">
    <header><strong>STYLISHME</strong><span>Namibian fashion, personally yours.</span></header>
    <div className="auth-intro"><small>ONE LAST STEP</small><h1>Make the account yours.</h1><p>Add the private profile photo used to recognise your StylishMe account.</p></div>
    <OAuthProfileForm/>
  </section></main>;
}
