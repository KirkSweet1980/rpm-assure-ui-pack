import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Save, Trash2, UserCheck, Users, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigPageHead } from "@/components/settings/config-page";
import { STAFF_ROLES, permissionsFor, type StaffRole } from "@/lib/auth/roles";
import {
  TENANT_ROLES,
  TENANT_SERVICES,
  tenantRoleFromStaff,
  type TenantGrant,
  type TenantRole,
} from "@/lib/auth/tenant-access";
import {
  adminCreateUser,
  adminDeleteAuthUser,
  adminSetUserCustomers,
  adminUpdateUser,
  listManagedUsers,
  type ManagedUser,
} from "@/lib/auth/admin-accounts";
import { USER_ACCOUNTS_ENABLED } from "@/lib/auth/features";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/users")({
  component: UsersPage,
});

type Draft = {
  email: string;
  displayName: string;
  staffRole: StaffRole;
  isActive: boolean;
  password: string;
  tenantAccess: TenantGrant[];
  emailWelcome: boolean;
};

const emptyDraft = (): Draft => ({
  email: "",
  displayName: "",
  staffRole: "Operator",
  isActive: true,
  password: "",
  tenantAccess: [],
  emailWelcome: true,
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
  const [filter, setFilter] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<string | "new" | null>("new");
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const load = useCallback(async () => {
    setBusy(true);
    const r = await listManagedUsers();
    setOk(r.ok);
    setMessage(r.message);
    setUsers(r.users);
    setCustomers(r.customers);
    setBusy(false);
    return r.users;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = users.find((u) => u.email === selectedEmail) ?? null;
  const isNew = selectedEmail === "new" || !selected;

  function openUser(u: ManagedUser) {
    setSelectedEmail(u.email);
    setDraft({
      email: u.email,
      displayName: u.displayName,
      staffRole: u.staffRole,
      isActive: u.isActive,
      password: "",
      tenantAccess: u.tenantAccess?.length
        ? u.tenantAccess.map((g) => ({ ...g, services: [...g.services] }))
        : u.customerCodes.map((code) => ({
            code,
            role: tenantRoleFromStaff(u.staffRole),
            services: [],
          })),
      emailWelcome: false,
    });
  }

  function openNew() {
    setSelectedEmail("new");
    setDraft(emptyDraft());
  }

  function toggleCode(code: string) {
    setDraft((d) => {
      const has = d.tenantAccess.some((g) => g.code === code);
      if (has) return { ...d, tenantAccess: d.tenantAccess.filter((g) => g.code !== code) };
      return {
        ...d,
        tenantAccess: [
          ...d.tenantAccess,
          { code, role: tenantRoleFromStaff(d.staffRole), services: [] },
        ],
      };
    });
  }

  function setGrantRole(code: string, role: TenantRole) {
    setDraft((d) => ({
      ...d,
      tenantAccess: d.tenantAccess.map((g) => (g.code === code ? { ...g, role } : g)),
    }));
  }

  function toggleService(code: string, serviceId: string) {
    setDraft((d) => ({
      ...d,
      tenantAccess: d.tenantAccess.map((g) => {
        if (g.code !== code) return g;
        const allOn = g.services.length === 0;
        const cur = allOn ? TENANT_SERVICES.map((s) => s.id) : [...g.services];
        const next = cur.includes(serviceId) ? cur.filter((s) => s !== serviceId) : [...cur, serviceId];
        return { ...g, services: next.length >= TENANT_SERVICES.length ? [] : next };
      }),
    }));
  }

  const q = filter.trim().toLowerCase();
  const shownUsers = q
    ? users.filter(
        (u) =>
          u.email.includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          u.customerCodes.some((c) => c.toLowerCase().includes(q)),
      )
    : users;
  const shownCustomers = q
    ? customers.filter(
        (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
      )
    : customers;

  const perms = permissionsFor(draft.staffRole);
  const adminAll = draft.staffRole === "PlatformAdmin";

  async function create() {
    if (!draft.email.trim() || !draft.password) {
      setOk(false);
      setMessage("Email and a temporary password (min 8) are required.");
      return;
    }
    if (!adminAll && draft.tenantAccess.length === 0) {
      setOk(false);
      setMessage("Pick at least one tenant, or set the role to Platform Admin.");
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
        customerCodes: adminAll ? [] : draft.tenantAccess.map((g) => g.code),
        tenantAccess: adminAll ? [] : draft.tenantAccess,
        emailWelcome: draft.emailWelcome,
      },
    });
    setMessage(r.message);
    setOk(r.ok);
    if (r.ok) {
      const list = await load();
      const created = list.find((u) => u.email === draft.email.trim().toLowerCase());
      if (created) openUser(created);
      else openNew();
    }
    setBusy(false);
  }

  async function save() {
    if (!selected) return;
    setBusy(true);
    const r = await adminUpdateUser({
      data: {
        email: selected.email,
        displayName: draft.displayName,
        staffRole: draft.staffRole,
        isActive: draft.isActive,
        password: draft.password || undefined,
        customerCodes: adminAll ? [] : draft.tenantAccess.map((g) => g.code),
        tenantAccess: adminAll ? [] : draft.tenantAccess,
      },
    });
    setMessage(r.message);
    setOk(r.ok);
    if (r.ok) {
      setDraft((d) => ({ ...d, password: "" }));
      await load();
    }
    setBusy(false);
  }

  async function saveScopeOnly() {
    if (!selected) return;
    setBusy(true);
    const r = await adminSetUserCustomers({
      data: { email: selected.email, tenantAccess: adminAll ? [] : draft.tenantAccess },
    });
    setMessage(r.message);
    setOk(r.ok);
    await load();
    setBusy(false);
  }

  async function toggleActive() {
    if (!selected) return;
    setBusy(true);
    const r = await adminUpdateUser({
      data: {
        email: selected.email,
        displayName: draft.displayName,
        staffRole: draft.staffRole,
        isActive: !draft.isActive,
      },
    });
    setMessage(r.message);
    setOk(r.ok);
    if (r.ok) setDraft((d) => ({ ...d, isActive: !d.isActive }));
    await load();
    setBusy(false);
  }

  async function removeUser() {
    if (!selected) return;
    if (!confirm(`Remove sign-in for ${selected.email}?`)) return;
    setBusy(true);
    const r = await adminDeleteAuthUser({ data: { email: selected.email, removeAppUser: false } });
    setMessage(r.message);
    setOk(r.ok);
    openNew();
    await load();
    setBusy(false);
  }

  return (
    <div className="rpma-user-admin">
      <ConfigPageHead
        kicker="Access"
        title="Users & tenant access"
        icon={Users}
        actions={
          <p className="text-[12px] text-muted">
            {users.length} account{users.length === 1 ? "" : "s"} · {customers.length} tenant
            {customers.length === 1 ? "" : "s"}
          </p>
        }
      />
      {message ? (
        <p className={cn("px-1 text-[12px]", ok ? "text-rag-green" : "text-rag-red")}>{message}</p>
      ) : null}

      <div className="rpma-user-split">
        <nav className="rpma-user-list" aria-label="Users">
          <p className="rpma-agent-kicker">Users</p>
          <button type="button" className={cn("rpma-agent-cust-btn", isNew && "is-on")} onClick={openNew}>
            <Plus className="size-3.5 shrink-0" />
            <span className="rpma-agent-cust-name">New user</span>
          </button>
          <input
            className="rpma-user-filter"
            placeholder="Filter users or tenants…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {shownUsers.map((u) => (
            <button
              key={u.email}
              type="button"
              className={cn("rpma-agent-cust-btn", selectedEmail === u.email && "is-on")}
              onClick={() => openUser(u)}
            >
              <span className="rpma-agent-cust-name">{u.displayName || u.email}</span>
              <span className="rpma-agent-cust-meta">
                {u.isActive ? u.staffRole : "Disabled"}
              </span>
            </button>
          ))}
        </nav>

        <nav className="rpma-user-tenants" aria-label="Tenant access">
          <p className="rpma-agent-kicker">Tenant access</p>
          {adminAll ? (
            <p className="px-2 text-[12px] text-[color:inherit] opacity-80">
              Platform Admin opens every tenant. Scope is not limited.
            </p>
          ) : customers.length === 0 ? (
            <p className="px-2 text-[12px] opacity-80">
              No customers returned from SQL. Check Dim_Customer (or Agent_Registry) and app SQL login rights.
            </p>
          ) : (
            <>
              <div className="mb-2 flex gap-1 px-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px]"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      tenantAccess: customers.map((c) => ({
                        code: c.code,
                        role: tenantRoleFromStaff(d.staffRole),
                        services: [],
                      })),
                    }))
                  }
                >
                  All
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => setDraft((d) => ({ ...d, tenantAccess: [] }))}
                >
                  None
                </Button>
                {!isNew ? (
                  <Button
                    type="button"
                    size="sm"
                    className="ml-auto h-6 px-2 text-[10px]"
                    disabled={busy}
                    onClick={() => void saveScopeOnly()}
                  >
                    Save scope
                  </Button>
                ) : null}
              </div>
              {shownCustomers.map((c) => {
                const grant = draft.tenantAccess.find((g) => g.code === c.code);
                const on = Boolean(grant);
                return (
                  <div key={c.code} className={cn("rpma-user-tenant", on && "is-on")}>
                    <label className="rpma-user-tenant-h">
                      <input type="checkbox" checked={on} onChange={() => toggleCode(c.code)} />
                      <span>
                        <strong>{c.name}</strong>
                        <em>{c.code}</em>
                      </span>
                    </label>
                    {grant ? (
                      <div className="rpma-user-grant">
                        <select
                          value={grant.role}
                          onChange={(e) => setGrantRole(c.code, e.target.value as TenantRole)}
                        >
                          {TENANT_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r === "TechnicalReadOnly" ? "Technical (read-only)" : r}
                            </option>
                          ))}
                        </select>
                        <div className="rpma-user-svcs">
                          {TENANT_SERVICES.map((s) => {
                            const checked =
                              grant.services.length === 0 || grant.services.includes(s.id);
                            return (
                              <label key={s.id}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleService(c.code, s.id)}
                                />
                                {s.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </>
          )}
        </nav>

        <div className="rpma-user-detail">
          <div className="rpma-agent-detail-head">
            <strong>{isNew ? "Create user" : draft.displayName || draft.email}</strong>
            <span className="text-[12px] text-muted">
              {isNew
                ? "Account + tenant access + sign-in in one step."
                : selected?.email}
            </span>
          </div>

          <div className="rpma-user-fields">
            <label>
              Email
              <input
                type="email"
                value={draft.email}
                disabled={!isNew}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              />
            </label>
            <label>
              Display name
              <input
                value={draft.displayName}
                onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
              />
            </label>
            <label>
              Role
              <select
                value={draft.staffRole}
                onChange={(e) => setDraft((d) => ({ ...d, staffRole: e.target.value as StaffRole }))}
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {permissionsFor(r).label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {isNew ? "Temporary password" : "Reset password"}
              <input
                type="password"
                value={draft.password}
                placeholder={isNew ? "Min 8 characters" : "Leave blank to keep"}
                onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
              />
            </label>
          </div>

          <ul className="rpma-user-perms">
            <li>{perms.canViewPortfolio ? "Can" : "Cannot"} see Customer Eco-System</li>
            <li>{perms.canViewCustomer ? "Can" : "Cannot"} open assigned tenants</li>
            <li>{perms.canViewTechnicalDetail ? "Can" : "Cannot"} see technical panels</li>
            <li>{perms.canEdit ? "Can" : "Cannot"} edit facts</li>
            <li>{perms.canAccessPlatformSettings ? "Can" : "Cannot"} open Configuration</li>
            {!isNew && selected ? (
              <li>
                Sign-in {selected.hasPassword ? "ready" : "needs a password"}
                {selected.twoFactorEnabled ? " · 2FA on" : " · 2FA off (user enables in Profile)"}
              </li>
            ) : null}
          </ul>

          {isNew ? (
            <label className="rpma-user-mail">
              <input
                type="checkbox"
                checked={draft.emailWelcome}
                onChange={(e) => setDraft((d) => ({ ...d, emailWelcome: e.target.checked }))}
              />
              Email sign-in details (uses Configuration → SMTP)
            </label>
          ) : null}

          <div className="rpma-agent-actions">
            {isNew ? (
              <Button type="button" size="sm" disabled={busy} onClick={() => void create()}>
                <Plus className="size-3.5" />
                Create and grant access
              </Button>
            ) : (
              <>
                <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>
                  <Save className="size-3.5" />
                  Save account
                </Button>
                <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void toggleActive()}>
                  {draft.isActive ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
                  {draft.isActive ? "Disable" : "Enable"}
                </Button>
                {draft.password ? (
                  <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void save()}>
                    <KeyRound className="size-3.5" />
                    Set password
                  </Button>
                ) : null}
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void removeUser()}>
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}