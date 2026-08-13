import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STAFF_ROLES, type StaffRole } from "@/lib/auth/roles";
import {
  adminCreateUser,
  adminDeleteAuthUser,
  adminSetUserCustomers,
  adminUpdateUser,
  listManagedUsers,
  type ManagedUser,
} from "@/lib/auth/admin-accounts";
import { USER_ACCOUNTS_ENABLED } from "@/lib/auth/features";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/users")({
  component: UsersPage,
});

const emptyDraft = {
  email: "",
  displayName: "",
  staffRole: "Operator" as StaffRole,
  password: "",
  isActive: true,
  customerCodes: [] as string[],
};

function UsersPage() {
  if (!USER_ACCOUNTS_ENABLED) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        <p className="font-medium text-fg">User accounts temporarily disabled</p>
        <p className="mt-2">
          Staff user management will return later. Existing logins still work.
        </p>
        <Link to="/settings" className="mt-3 inline-block text-accent hover:underline">
          Back to Configuration
        </Link>
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
  const [draft, setDraft] = useState(emptyDraft);
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

  async function createUser() {
    if (!draft.email.trim() || !draft.password) {
      setOk(false);
      setMessage("Email and password are required for new accounts.");
      return;
    }
    setBusy(true);
    const r = await adminCreateUser({
      data: {
        email: draft.email,
        displayName: draft.displayName || draft.email,
        staffRole: draft.staffRole,
        password: draft.password,
        isActive: draft.isActive,
        customerCodes: draft.customerCodes,
      },
    });
    setMessage(r.message);
    setOk(r.ok);
    if (r.ok) setDraft(emptyDraft);
    await load();
    setBusy(false);
  }

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
      setMessage("Enter a new password (min 8) in the Reset password field.");
      return;
    }
    setBusy(true);
    const r = await adminUpdateUser({
      data: { email, password: pw },
    });
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
    if (
      !confirm(
        `Remove sign-in for ${u.email}? They will no longer be able to log in.`,
      )
    ) {
      return;
    }
    setBusy(true);
    const r = await adminDeleteAuthUser({
      data: { email: u.email, removeAppUser: false },
    });
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

  function toggleDraftCode(code: string) {
    setDraft((d) => {
      const cur = new Set(d.customerCodes);
      if (cur.has(code)) cur.delete(code);
      else cur.add(code);
      return { ...d, customerCodes: [...cur] };
    });
  }

  return (
    <div className="space-y-3">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="space-y-1 p-4 text-[13px] text-muted">
          <p className="font-semibold text-fg">Access lockdown</p>
          <ul className="list-inside list-disc space-y-0.5">
            <li>Public self-registration is <strong className="text-fg">off</strong> — only Platform Admins create accounts here.</li>
            <li>Inactive users cannot use the app (Portfolio access denied).</li>
            <li>Every user must enroll <strong className="text-fg">2FA</strong> at <span className="font-mono">/security</span> after first sign-in.</li>
            <li>Scope customers per user unless Platform Admin (all customers).</li>
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHead className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            User account control (Platform Admin only)
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void load()}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Refresh
          </Button>
        </CardHead>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted">
            Platform admins create sign-in accounts (email + password), assign roles, activate
            or disable access, reset passwords, and optionally scope staff to customers.
            Self-registration on the login page is off.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="accent">{users.length} total</Badge>
            <Badge variant="green">{activeCount} active</Badge>
            <Badge variant="outline">
              {users.filter((u) => u.hasPassword).length} with password
            </Badge>
            <Badge variant="outline">
              {users.filter((u) => u.twoFactorEnabled).length} with 2FA
            </Badge>
          </div>
          {message ? (
            <p className={`text-xs ${ok ? "text-rag-green" : "text-rag-red"}`}>{message}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHead>Create staff account</CardHead>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs">
            <span className="mb-1 block text-muted">Email *</span>
            <input
              className="field"
              type="email"
              autoComplete="off"
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted">Display name</span>
            <input
              className="field"
              value={draft.displayName}
              onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted">Temporary password *</span>
            <input
              className="field"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={draft.password}
              onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
              placeholder="Min 8 characters"
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-muted">Role</span>
            <select
              className="field"
              value={draft.staffRole}
              onChange={(e) =>
                setDraft((d) => ({ ...d, staffRole: e.target.value as StaffRole }))
              }
            >
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
            />
            Active (can sign in and use portfolio)
          </label>

          {draft.staffRole !== "PlatformAdmin" && customers.length > 0 ? (
            <div className="sm:col-span-2">
              <p className="mb-1 text-xs text-muted">
                Customer scope (optional — leave empty for all customers)
              </p>
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-lg border border-border/50 p-2">
                {customers.map((c) => (
                  <label
                    key={c.code}
                    className="flex cursor-pointer items-center gap-1 rounded-full border border-border/40 px-2 py-0.5 text-[11px]"
                  >
                    <input
                      type="checkbox"
                      checked={draft.customerCodes.includes(c.code)}
                      onChange={() => toggleDraftCode(c.code)}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <Button type="button" onClick={() => void createUser()} disabled={busy}>
              <Plus className="mr-1 h-4 w-4" />
              Create account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHead>Accounts</CardHead>
        <CardContent className="space-y-3">
          {users.length === 0 ? (
            <p className="text-xs text-muted">
              No users yet — create the first account above (as Platform Admin).
            </p>
          ) : (
            users.map((u) => (
              <div
                key={u.email}
                className="space-y-3 rounded-xl border border-border/60 bg-surface/40 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-fg">{u.displayName || u.email}</div>
                    <div className="font-mono text-xs text-muted">{u.email}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant={u.isActive ? "green" : "red"}>
                        {u.isActive ? "Active" : "Disabled"}
                      </Badge>
                      <Badge variant="outline">{u.staffRole}</Badge>
                      {u.hasPassword ? (
                        <Badge variant="accent">Password set</Badge>
                      ) : (
                        <Badge variant="amber">No password</Badge>
                      )}
                      {u.sources.map((s) => (
                        <Badge key={s} variant="muted">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void toggleActive(u)}
                    >
                      {u.isActive ? (
                        <>
                          <UserX className="mr-1 h-3.5 w-3.5" /> Disable
                        </>
                      ) : (
                        <>
                          <UserCheck className="mr-1 h-3.5 w-3.5" /> Enable
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void removeUser(u)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Remove sign-in
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs">
                    <span className="mb-1 block text-muted">Display name</span>
                    <input
                      className="field"
                      value={u.displayName}
                      onChange={(e) =>
                        setUsers((list) =>
                          list.map((x) =>
                            x.email === u.email ? { ...x, displayName: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block text-muted">Role</span>
                    <select
                      className="field"
                      value={u.staffRole}
                      onChange={(e) =>
                        setUsers((list) =>
                          list.map((x) =>
                            x.email === u.email
                              ? { ...x, staffRole: e.target.value as StaffRole }
                              : x,
                          ),
                        )
                      }
                    >
                      {STAFF_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs sm:col-span-2">
                    <span className="mb-1 block text-muted">Reset password (leave blank to keep)</span>
                    <div className="flex gap-2">
                      <input
                        className="field flex-1"
                        type="password"
                        autoComplete="new-password"
                        value={pwDraft[u.email] ?? ""}
                        onChange={(e) =>
                          setPwDraft((p) => ({ ...p, [u.email]: e.target.value }))
                        }
                        placeholder="New temporary password"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void resetPasswordOnly(u.email)}
                      >
                        <KeyRound className="mr-1 h-3.5 w-3.5" />
                        Set
                      </Button>
                    </div>
                  </label>
                </div>

                {u.staffRole !== "PlatformAdmin" && customers.length > 0 ? (
                  <div>
                    <p className="mb-1 text-xs text-muted">
                      Customer scope — empty = all customers
                    </p>
                    <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto rounded-lg border border-border/50 p-2">
                      {customers.map((c) => (
                        <label
                          key={c.code}
                          className="flex cursor-pointer items-center gap-1 rounded-full border border-border/40 px-2 py-0.5 text-[11px]"
                        >
                          <input
                            type="checkbox"
                            checked={(scopeDraft[u.email] ?? []).includes(c.code)}
                            onChange={() => toggleCode(u.email, c.code)}
                          />
                          {c.name}
                        </label>
                      ))}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      disabled={busy}
                      onClick={() => void saveScope(u.email)}
                    >
                      Save customer scope
                    </Button>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted">
                    PlatformAdmin always sees the full portfolio.
                  </p>
                )}

                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void saveUser(u)}
                >
                  <Save className="mr-1 h-3.5 w-3.5" />
                  Save profile
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
