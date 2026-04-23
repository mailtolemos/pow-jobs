import { listUsersAdmin } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { AdminUsersClient } from "./AdminUsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await getSessionUser();
  const users = await listUsersAdmin();
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ink">Users</h1>
        <p className="text-muted mt-1 text-sm">
          Everyone who has signed in. Deleting cascades to their candidate profile,
          matches, interactions, and alert history.
        </p>
      </div>
      <AdminUsersClient initial={users} meId={me?.id ?? ""} />
    </div>
  );
}
