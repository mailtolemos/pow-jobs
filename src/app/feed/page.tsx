import { getSessionUser } from "@/lib/auth";
import { getCandidateByUserId, listCandidates, getCandidateExtras } from "@/lib/db";
import { FeedClient } from "./FeedClient";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const user = await getSessionUser();
  const myCandidate = user ? await getCandidateByUserId(user.id) : null;
  const myExtras = myCandidate ? await getCandidateExtras(myCandidate.id) : null;
  const demo = await listCandidates({ demoOnly: true });

  return (
    <FeedClient
      signedInAs={user?.email ?? null}
      myCandidate={myCandidate}
      profileIncomplete={myCandidate ? !(myExtras?.profile_complete ?? false) : false}
      demoPersonas={demo}
    />
  );
}
