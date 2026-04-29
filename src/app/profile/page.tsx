import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getCandidateByUserId, getCandidateExtras } from "@/lib/db";
import { ProfileEditor } from "./ProfileEditor";
import { CONTACT_EMAIL, contactMailto } from "@/lib/contact";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/profile");
  // Company accounts only see /post-job — no candidate profile to edit.
  if (user.account_type === "company") redirect("/post-job");

  const candidate = await getCandidateByUserId(user.id);
  if (!candidate) redirect("/signin?error=missing");

  const extras = (await getCandidateExtras(candidate.id)) ?? {
    alert_email_enabled: true,
    alert_telegram_enabled: false,
    alert_frequency: "daily" as const,
    telegram_chat_id: null,
    telegram_link_token: null,
    profile_complete: false,
  };

  const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "";

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink">Your profile</h1>
        <p className="text-muted mt-1 text-sm">
          This is what the matching engine reads to decide what lands in your feed and inbox.
          Be specific. The more you tell it, the quieter and sharper the signal.
        </p>
      </div>
      <ProfileEditor
        userEmail={user.email}
        candidate={candidate}
        extras={extras}
        telegramBotUsername={telegramBotUsername}
      />
      <div className="mt-8 text-xs text-muted text-center">
        Need help, want to delete your account, or have feedback?{" "}
        <a
          href={contactMailto("ProWo profile help", `Hi ProWo team,\n\n(My account: ${user.email})\n\n`)}
          className="underline hover:text-ink"
        >
          Email {CONTACT_EMAIL}
        </a>
      </div>
    </div>
  );
}
