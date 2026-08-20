import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STAFF_ROLES, type StaffRole } from "@/lib/auth/roles";
import { adminCreateUser } from "@/lib/auth/admin-accounts";

export function CreateUserPanel({
  customers,
  onCreated,
}: {
  customers: Array<{ code: string; name: string }>;
  onCreated?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("Operator");
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(true);

  function toggle(code: string) {
    setCodes((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]));
  }

  async function create() {
    if (!email.trim() || !password) {
      setOk(false);
      setMsg("Email and password are required.");
      return;
    }
    if (staffRole !== "PlatformAdmin" && codes.length === 0) {
      setOk(false);
      setMsg("Pick at least one tenant, or set the role to Platform Admin.");
      return;
    }
    setBusy(true);
    const r = await adminCreateUser({
      data: {
        email,
        displayName: displayName || email,
        staffRole,
        password,
        isActive: true,
        customerCodes: staffRole === "PlatformAdmin" ? [] : codes,
      },
    });
    setOk(r.ok);
    setMsg(r.message);
    if (r.ok) {
      setEmail("");
      setDisplayName("");
      setPassword("");
      setCodes([]);
      onCreated?.();
    }
    setBusy(false);
  }

  return (
    <section className="rpma-panel overflow-hidden p-0">
      <div className="flex items-end justify-between px-4 py-3">
        <div>
          <h2 className="text-[16px] font-extrabold text-fg">Create user</h2>
          <p className="text-[12px] text-muted">
            Assign the account to specific customer tenants. Platform Admin sees every tenant.
          </p>
        </div>
        <Button type="button" size="sm" disabled={busy} onClick={() => void create()}>
          <Plus className="size-3.5" />
          Create
        </Button>
      </div>
      {msg ? <p className={`px-4 pb-2 text-[12px] ${ok ? "text-rag-green" : "text-rag-red"}`}>{msg}</p> : null}
      <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
        <label className="text-[12px] font-semibold text-muted">
          Email
          <input className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-[13px] text-fg" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="text-[12px] font-semibold text-muted">
          Display name
          <input className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-[13px] text-fg" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="text-[12px] font-semibold text-muted">
          Temporary password
          <input className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-[13px] text-fg" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="text-[12px] font-semibold text-muted">
          Role
          <select className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-[13px] text-fg" value={staffRole} onChange={(e) => setStaffRole(e.target.value as StaffRole)}>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="border-t border-border px-4 py-3">
        <p className="mb-2 text-[12px] font-extrabold text-fg">Tenant access</p>
        {staffRole === "PlatformAdmin" ? (
          <p className="text-[12px] text-muted">Platform Admin is not scoped — they can open every customer.</p>
        ) : customers.length === 0 ? (
          <p className="text-[12px] text-muted">No tenants loaded. Open Customer Eco-System once, then return here.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {customers.map((c) => (
              <label key={c.code} className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-2 py-1 text-[12px] text-fg">
                <input type="checkbox" checked={codes.includes(c.code)} onChange={() => toggle(c.code)} />
                {c.name}
                <span className="font-mono text-[10px] text-muted">{c.code}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
