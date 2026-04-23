"use client";

import { useMemo, useState } from "react";
import type { AdminUserRow } from "@/lib/db";

interface Props {
  initial: AdminUserRow[];
  meId: string;
}

type RoleFilter = "all" | "admin" | "user";
type ProfileFilter = "all" | "with_candidate" | "no_candidate";

export function AdminUsersClient({ initial, meId }: Props) {
  const [users, setUsers] = useState<AdminUserRow[]>(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [profile, setProfile] = useState<ProfileFilter>("all");

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return users.filter((u) => {
      if (role === "admin" && !u.is_admin) return false;
      if (role === "user" && u.is_admin) return false;
      if (profile === "with_candidate" && !u.candidate_id) return false;
      if (profile === "no_candidate" && u.candidate_id) return false;
      if (qLower) {
        const blob = `${u.email} ${u.candidate_display_name ?? ""} ${u.candidate_headline ?? ""}`.toLowerCase();
        if (!blob.includes(qLower)) return false;
      }
      return true;
    });
  }, [users, q, role, profile]);

  async function refresh() {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const data = await res.json();
    setUsers(data.users ?? []);
    setSelected(new Set());
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }
  function toggleAllFiltered() {
    if (filtered.every((u) => selected.has(u.id))) {
      const next = new Set(selected);
      filtered.forEach((u) => next.delete(u.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach((u) => next.add(u.id));
      setSelected(next);
    }
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    const ids = [...selected].filter((id) => id !== meId);
    if (ids.length === 0) {
      setErr("You can't delete your own account from admin.");
      return;
    }
    if (!confirm(`Delete ${ids.length} user(s) and their profile data? This cannot be undone.`)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteOne(id: string, label: string) {
    if (id === meId) {
      setErr("You can't delete your own account.");
      return;
    }
    if (!confirm(`Delete ${label}? This cascades to their candidate profile and history.`)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {err && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-900">
          {err}
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          placeholder="Search email / display name / headline…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="md:col-span-2 border border-neutral-300 rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as RoleFilter)}
          className="border border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="all">All roles</option>
          <option value="admin">Admins only</option>
          <option value="user">Users only</option>
        </select>
        <select
          value={profile}
          onChange={(e) => setProfile(e.target.value as ProfileFilter)}
          className="border border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="all">All profiles</option>
          <option value="with_candidate">Has candidate profile</option>
          <option value="no_candidate">No profile yet</option>
        </select>
        <div className="md:col-span-5 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-neutral-500">
            Showing {filtered.length} / {users.length}
          </span>
          <button
            onClick={handleDeleteSelected}
            disabled={busy || selected.size === 0}
            className="ml-auto rounded-lg bg-rose-600 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            Delete selected ({selected.size})
          </button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left w-8">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every((u) => selected.has(u.id))}
                  onChange={toggleAllFiltered}
                />
              </th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Display name</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Joined</th>
              <th className="px-3 py-2 text-left">Last sign-in</th>
              <th className="px-3 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-neutral-100">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggle(u.id)}
                    disabled={u.id === meId}
                  />
                </td>
                <td className="px-3 py-2">
                  {u.email}
                  {u.id === meId && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-accent">you</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {u.candidate_display_name || <span className="text-neutral-400">—</span>}
                  {u.candidate_headline && (
                    <div className="text-[11px] text-neutral-500 truncate max-w-xs">
                      {u.candidate_headline}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {u.is_admin ? (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">admin</span>
                  ) : (
                    <span className="text-neutral-500">user</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-neutral-600">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 text-xs text-neutral-600">
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => handleDeleteOne(u.id, u.email)}
                    disabled={busy || u.id === meId}
                    className="text-rose-700 text-xs font-medium hover:underline disabled:opacity-40"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-neutral-500 text-sm">
                  No users match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
