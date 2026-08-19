import { createFileRoute } from "@tanstack/react-router";
import { useId } from "react";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { Route as PillarRoute } from "./customers.$code.epp";
import { NoCoverPanel } from "@/components/ui/no-cover";
import { cn } from "@/lib/utils";

function EppLamp({ on, small }: { on: boolean; small?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const gid = `epp-${uid}`;
  const size = small ? 10 : 14;
  return (
    <svg
      className={on ? "rpma-epp-lamp is-on" : "rpma-epp-lamp is-off"}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden
    >
      <defs>
        <radialGradient id={gid} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={on ? "#d1fae5" : "#fecaca"} />
          <stop offset="45%" stopColor={on ? "#22c55e" : "#ef4444"} />
          <stop offset="100%" stopColor={on ? "#14532d" : "#7f1d1d"} />
        </radialGradient>
      </defs>
      <circle cx="8" cy="8" r="6.2" fill={`url(#${gid})`} />
      <ellipse cx="6.2" cy="5.6" rx="2.2" ry="1.4" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}

export const Route = createFileRoute("/customers/$code/epp/modules")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) {
      return <p className="text-sm text-muted">Loading customer workspace…</p>;
    }
    const epp = data.epp;
    const devices = epp?.devices ?? [];
    const policies = epp?.policies ?? [];
    const covered = devices.length > 0 || (data.customer?.eppDeviceCount ?? 0) > 0;
    if (!covered) {
      return (
        <NoCoverPanel
          service="RPM EndPoint Protection · Policies"
          hint={
            epp?.message ||
            "No cover — enable RPM EndPoint Protection for this customer to collect this module."
          }
        />
      );
    }

    const byPolicy = new Map<string, number>();
    for (const d of devices) {
      const k = d.policyName?.trim() || "(no policy name)";
      byPolicy.set(k, (byPolicy.get(k) ?? 0) + 1);
    }

    const moduleRollup = new Map<
      string,
      { label: string; onPolicies: number; offPolicies: number; devicesOn: number; devicesOff: number }
    >();
    for (const p of policies) {
      for (const m of p.modules ?? []) {
        const cur = moduleRollup.get(m.label) ?? {
          label: m.label,
          onPolicies: 0,
          offPolicies: 0,
          devicesOn: 0,
          devicesOff: 0,
        };
        if (m.enabled) {
          cur.onPolicies += 1;
          cur.devicesOn += p.deviceCount;
        } else {
          cur.offPolicies += 1;
          cur.devicesOff += p.deviceCount;
        }
        moduleRollup.set(m.label, cur);
      }
    }
    const installed = [...moduleRollup.values()].sort((a, b) => {
      const aOn = a.onPolicies > 0 ? 0 : 1;
      const bOn = b.onPolicies > 0 ? 0 : 1;
      return aOn - bOn || b.devicesOn - a.devicesOn || a.label.localeCompare(b.label);
    });
    const assignedName = [...byPolicy.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const policyCards = (policies.length
      ? policies
      : [...byPolicy.entries()].map(([name, n]) => ({
          policyId: name,
          policyName: name,
          deviceCount: n,
          modules: [] as { id: string; label: string; enabled: boolean }[],
        }))
    ).slice().sort((a, b) => {
      const aOn = String(a.policyName ?? "") === assignedName ? 0 : 1;
      const bOn = String(b.policyName ?? "") === assignedName ? 0 : 1;
      return aOn - bOn || b.deviceCount - a.deviceCount;
    });
    const armed = installed.filter((m) => m.onPolicies > 0).length;

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-bold">Installed EPP modules</h2>
            <p className="text-[12px] text-muted">
              Policy modules for this tenant. Green lamp = on. Red lamp = off.
            </p>
          </div>
          {installed.length ? (
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
              {armed}/{installed.length} armed
            </p>
          ) : null}
        </div>
        {installed.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-[12px] text-muted">
              No module flags on last collect. Re-run EPP collect to pull policy details.
            </CardContent>
          </Card>
        ) : (
          <div className="rpma-epp-mod-grid">
            {installed.map((m) => {
              const on = m.onPolicies > 0;
              return (
                <article key={m.label} className={cn("rpma-epp-mod", on ? "is-on" : "is-off")}>
                  <EppLamp on={on} />
                  <h3>{m.label}</h3>
                  <p className="rpma-epp-state">{on ? "On" : "Off"}</p>
                  <p className="rpma-epp-meta">
                    {on
                      ? `${m.onPolicies} policy · ${m.devicesOn} device(s)`
                      : `${m.offPolicies} policy · off`}
                  </p>
                </article>
              );
            })}
          </div>
        )}

        <Card>
          <CardHead>Policies</CardHead>
          <CardContent className="space-y-2 p-3">
            {policyCards.length === 0 ? (
              <p className="text-[12px] text-muted">No policy rows for this customer on latest snapshot.</p>
            ) : (
              policyCards.map((p) => {
                const mods = p.modules ?? [];
                const assigned = assignedName && (p.policyName === assignedName || p.policyId === assignedName);
                return (
                  <div
                    key={p.policyId}
                    className={cn("rounded-md border px-3 py-2", assigned ? "border-emerald-500/50 bg-emerald-500/8" : "border-border")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">
                        {p.policyName || p.policyId}
                        {assigned ? (
                          <span className="ml-2 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                            Assigned Policy
                          </span>
                        ) : null}
                      </p>
                      <span className="tabular-nums text-[12px] text-muted">{p.deviceCount} device(s)</span>
                    </div>
                    {mods.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {mods.map((m) => (
                          <span key={m.id} className={cn("rpma-epp-chip", m.enabled ? "is-on" : "is-off")}>
                          <EppLamp on={m.enabled} small />
                          {m.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-subtle">Module list after next EPP collect.</p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    );
  },
});
