import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { listManagedUsers, type ManagedUser } from "@/lib/auth/admin-accounts";
import { SpaLink } from "@/components/nav/spa-link";
import { USER_ACCOUNTS_ENABLED } from "@/lib/auth/features";

export function TenantAccessCard({ customerCode }: { customerCode: string }) {
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!USER_ACCOUNTS_ENABLED) return;
    let cancel = false;
    void listManagedUsers().then((r) => {
      if (cancel) return;
      if (!r.ok) {
        setUsers([]);
        return;
      }
      const code = customerCode.toUpperCase();
      setUsers(
        r.users.filter(
          (u) =>
            u.isActive &&
            (u.allCustomers || u.isPlatformAdmin || u.customerCodes.map((c) => c.toUpperCase()).includes(code)),
        ),
      );
    });
    return () => {
      cancel = true;
    };
  }, [customerCode]);

  if (!USER_ACCOUNTS_ENABLED) return null;

  return (
    <section className="rpma-tenant-access" aria-label="Tenant access">
      <button type="button" className="rpma-tenant-access-h" onClick={() => setOpen((v) => !v)}>
        <Users className="h-3.5 w-3.5" />
        <span>Tenant access</span>
        <em>{users == null ? "…" : `${users.length} user${users.length === 1 ? "" : "s"}`}</em>
      </button>
      {open ? (
        <div className="rpma-tenant-access-b">
          {users == null ? (
            <p>Loading…</p>
          ) : users.length === 0 ? (
            <p>
              No named users are scoped to this customer. Platform admins still see every tenant.{" "}
              <SpaLink href="/settings/users">Manage users</SpaLink>
            </p>
          ) : (
            <ul>
              {users.map((u) => (
                <li key={u.email}>
                  <strong>{u.displayName || u.email}</strong>
                  <span>
                    {u.staffRole}
                    {u.allCustomers || u.isPlatformAdmin ? " · all tenants" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <SpaLink href="/settings/users" className="rpma-tenant-access-a">
            User administration
          </SpaLink>
        </div>
      ) : null}
    </section>
  );
}
