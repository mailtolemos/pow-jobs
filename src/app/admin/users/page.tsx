import { listUsersAdmin } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { AdminUsersClient } from "./AdminUsersClient";

export const dynamic = "force-dynamic";

// Owner allow-list comes from ADMIN_EMAILS env, falling back to the project
// owner's email so the UI can correctly badge & protect the owner row even
// on a fresh deploy where the env var hasn't been set.
function ownerEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "mailtolemos@gmail.com";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export default async function AdminUsersPage() {
  const me = await getSessionUser();
  const users = await listUsersAdmin();
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ink">Users</h1>
        <p className="text-muted mt-1 text-sm">
          Everyone who has signed in. Promote or demote admins, switch account type, or delete.
          Deletion cascades to candidate profiles, matches, interactions, and alert history.
        </p>
      </div>
      <AdminUsersClient initial={users} meId={me?.id ?? ""} ownerEmails={ownerEmails()} />
    </div>
  );
}
