import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Save, Trash2, UserCheck, Users, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigPageHead } from "@/components/settings/config-page";
import { STAFF_ROLES, type StaffRole } from "@/lib/auth/roles";
import {
  adminDeleteAuthUser,
  adminSetUserCustomers,
  adminUpdateUser,
  listManagedUsers,
  type ManagedUser,
} from "@/lib/auth/admin-accounts";
import { CreateUserPanel } from "@/components/settings/create-user-panel";
import { USER_ACCOUNTS_ENABLED } from "@/lib/auth/features";

export const Route = createFileRoute("/settings/users")({
  component: UsersPage,
});

function UsersPage() {
  if (!USER_ACCOUNTS_ENABLED) {
    return (
      <div className="space-y-6">
        <ConfigPageHead kicker="Settings" title="Users" icon={Users} />
        <section className="rpma-panel px-4 py-6 text-[12px] text-muted">
          User accounts temporarily disabled. Existing logins still work.
        </section>
      </div>
    );
  }
  return <UsersPageActive />;
}

function UsersPageActive() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [customers, setCustomers] = useState<Array<{ code: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pwDraft, setPwDraft] = useState<Record<string, string>>({});
  const [scopeDraft, setScopeDraft] = useState<Record<string, string[]>>({});

  const load = useCallback(async () => {
    setBusy(true);
    const r = await listManagedUsers();
    setOk(r.ok);
    setMessage(r.message);
    setUsers(r.users);
    setCustomers(r.customers);
    const scopes: Record<string, string[]> = {};
    for (const u of r.users) scopes[u.email] = [...u.customerCodes];
    setScopeDraft(scopes);
    setBusy(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeCount = useMemo(() => users.filter((u) => u.isActive).length, [users]);

  async function saveUser(u: ManagedUser) {
    setBusy(true);
    const r = await adminUpdateUser({
      data: {
        email: u.email,
        displayName: u.displayName,
        staffRole: u.staffRole,
        isActive: u.isActive,
        password: pwDraft[u.email] || undefined,
        customerCodes: scopeDraft[u.email] ?? u.customerCodes,
      },
    });
    setMessage(r.message);
    setOk(r.ok);
    if (r.ok) setPwDraft((p) => ({ ...p, [u.email]: "" }));
    await load();
    setBusy(false);
  }

  async function resetPasswordOnly(email: string) {
    const pw = pwDraft[email];
    if (!pw || pw.length < 8) {
      setOk(false);
      setMessage("Enter a new password (min 8).");
      return;
    }
    setBusy(true);
    const r = await adminUpdateUser({ data: { email, password: pw } });
    setMessage(r.message);
    setOk(r.ok);
    if (r.ok) setPwDraft((p) => ({ ...p, [email]: "" }));
    await load();
    setBusy(false);
  }

  async function toggleActive(u: ManagedUser) {
    setBusy(true);
    const r = await adminUpdateUser({
      data: {
        email: u.email,
        displayName: u.displayName,
        staffRole: u.staffRole,
        isActive: !u.isActive,
      },
    });
    setMessage(r.message);
    setOk(r.ok);
    await load();
    setBusy(false);
  }

  async function removeUser(u: ManagedUser) {
    if (!confirm(`Remove sign-in for ${u.email}?`)) return;
    setBusy(true);
    const r = await adminDeleteAuthUser({ data: { email: u.email, removeAppUser: false } });
    setMessage(r.message);
    setOk(r.ok);
    await load();
    setBusy(false);
  }

  async function saveScope(email: string) {
    setBusy(true);
    const r = await adminSetUserCustomers({
      data: { email, customerCodes: scopeDraft[email] ?? [] },
    });
    setMessage(r.message);
    setOk(r.ok);
    await load();
    setBusy(false);
  }

  function toggleCode(email: string, code: string) {
    setScopeDraft((prev) => {
      const cur = new Set(prev[email] ?? []);
      if (cur.has(code)) cur.delete(code);
      else cur.add(code);
      return { ...prev, [email]: [...cur] };
    });
  }

  return (
    <div className="space-y-6">
      <ConfigPageHead
        kicker="Settings"
        title="Users"
        icon={Users}
        actions={
          <p className="text-[12px] text-muted">
            {users.length} total · {activeCount} active
          </p>
        }
      />
      {message ? (
        <p className={`text-[12px] ${ok ? "text-rag-green" : "text-rag-red"}`}>{message}</p>
      ) : null}

      <CreateUserPanel customers={customers} onCreated={() => void load()} />

      <section className="rpma-panel overflow-hidden p-0">
        <div className="px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">Accounts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="rpma-xls">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Password</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6}>No users yet.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.email}>
                    <td>
                      <input
                        className="w-full border-0 bg-transparent text-[12px] outline-none"
                        value={u.displayName}
                        onChange={(e) =>
                          setUsers((list) =>
                            list.map((x) => (x.email === u.email ? { ...x, displayName: e.target.value } : x)),
                          )
                        }
                      />
                    </td>
                    <td className="font-mono">{u.email}</td>
                    <td>
                      <select
                        className="border-0 bg-transparent text-[12px] outline-none"
                        value={u.staffRole}
                        onChange={(e) =>
                          setUsers((list) =>
                            list.map((x) =>
                              x.email === u.email ? { ...x, staffRole: e.target.value as StaffRole } : x,
                            ),
                          )
                        }
                      >
                        {STAFF_ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td>{u.isActive ? "Active" : "Disabled"}</td>
                    <td>
                      <span className="inline-flex items-center gap-1">
                        <input
                          className="w-28 border-0 bg-transparent text-[12px] outline-none"
                          type="password"
                          value={pwDraft[u.email] ?? ""}
                          onChange={(e) => setPwDraft((p) => ({ ...p, [u.email]: e.target.value }))}
                          placeholder="Reset…"
                        />
                        <Button type="button" size="sm" variant="secondary" className="h-7 px-2 text-[11px]" disabled={busy} onClick={() => void resetPasswordOnly(u.email)}>
                          <KeyRound className="size-3" />
                        </Button>
                      </span>
                    </td>
                    <td>
                      <span className="inline-flex flex-wrap gap-1">
                        <Button type="button" size="sm" className="h-7 px-2 text-[11px]" disabled={busy} onClick={() => void saveUser(u)}>
                          <Save className="size-3" />
                          Save
                        </Button>
                        <Button type="button" size="sm" variant="secondary" className="h-7 px-2 text-[11px]" disabled={busy} onClick={() => void toggleActive(u)}>
                          {u.isActive ? <UserX className="size-3" /> : <UserCheck className="size-3" />}
                          {u.isActive ? "Disable" : "Enable"}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]" disabled={busy} onClick={() => void removeUser(u)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rpma-panel overflow-hidden p-0">
          <div className="px-4 py-3">
            <h2 className="text-[16px] font-extrabold text-fg">Tenant access</h2>
            <p className="text-[12px] text-muted">Tick the customers this operator may open. Save Scope per user.</p>
          </div>
          {customers.length === 0 ? (
            <p className="px-4 pb-4 text-[12px] text-muted">No tenants loaded yet.</p>
          ) : (
          <div className="overflow-x-auto">
            <table className="rpma-xls">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Customers</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users
                  .filter((u) => u.staffRole !== "PlatformAdmin")
                  .map((u) => (
                    <tr key={u.email}>
                      <td>{u.displayName || u.email}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {customers.map((c) => (
                            <label key={c.code} className="inline-flex items-center gap-1 text-[11px]">
                              <input
                                type="checkbox"
                                checked={(scopeDraft[u.email] ?? []).includes(c.code)}
                                onChange={() => toggleCode(u.email, c.code)}
                              />
                              {c.name}
                            </label>
                          ))}
                        </div>
                      </td>
                      <td>
                        <Button type="button" size="sm" className="h-7 px-2 text-[11px]" disabled={busy} onClick={() => void saveScope(u.email)}>
                          Save Scope
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          )}
        </section>
    </div>
  );
}
