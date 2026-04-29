import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getCandidateByUserId, listCandidates, getCandidateExtras } from "@/lib/db";
import { FeedClient } from "./FeedClient";
import { SiteFooter } from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const user = await getSessionUser();
  // Company accounts have no candidate profile and the feed is meaningless to
  // them — funnel them to the post-job page they actually use.
  if (user?.account_type === "company") {
    redirect("/post-job");
  }
  const myCandidate = user ? await getCandidateByUserId(user.id) : null;
  const myExtras = myCandidate ? await getCandidateExtras(myCandidate.id) : null;
  // Only surface demo personas to signed-out visitors. Signed-in users should
  // only ever see their own feed.
  const demo = user ? [] : await listCandidates({ demoOnly: true });

  return (
    <>
      <FeedClient
        signedInAs={user?.email ?? null}
        myCandidate={myCandidate}
        profileIncomplete={myCandidate ? !(myExtras?.profile_complete ?? false) : false}
        demoPersonas={demo}
      />
      <SiteFooter contactSubject="ProWo · /feed" />
    </>
  );
}
