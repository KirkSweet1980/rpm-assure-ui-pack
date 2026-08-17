import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { Route as PillarRoute } from "./customers.$code.epp";
import { NoCoverPanel } from "@/components/ui/no-cover";
import { cn } from "@/lib/utils";

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

    const moduleRollup = new Map<string, { label: string; policies: number; devices: number }>();
    for (const p of policies) {
      for (const m of p.modules ?? []) {
        if (!m.enabled) continue;
        const cur = moduleRollup.get(m.label) ?? { label: m.label, policies: 0, devices: 0 };
        cur.policies += 1;
        cur.devices += p.deviceCount;
        moduleRollup.set(m.label, cur);
      }
    }
    const installed = [...moduleRollup.values()].sort((a, b) => b.devices - a.devices || a.label.localeCompare(b.label));
    const policyCards = policies.length
      ? policies
      : [...byPolicy.entries()].map(([name, n]) => ({
          policyId: name,
          policyName: name,
          deviceCount: n,
          modules: [] as { id: string; label: string; enabled: boolean }[],
        }));

    return (
      <div className="space-y-3">
        <div>
          <h2 className="text-[15px] font-bold text-fg">Installed EPP modules</h2>
          <p className="text-[12px] text-muted">
            Modules turned on in policies assigned to this customer (latest collect).
          </p>
        </div>
        {installed.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-[12px] text-muted">
              No module flags on last collect. Re-run EPP collect to pull policy details from GravityZone.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {installed.map((m) => (
              <div key={m.label} className="rpma-stat-card rpma-glass px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{m.label}</p>
                <p className="text-[18px] font-extrabold text-rag-green">On</p>
                <p className="text-[11px] text-subtle">
                  {m.policies} policy · {m.devices} device(s)
                </p>
              </div>
            ))}
          </div>
        )}

        <Card>
          <CardHead>Policies</CardHead>
          <CardContent className="space-y-2 p-3">
            {policyCards.length === 0 ? (
              <p className="text-[12px] text-muted">No policy rows for this customer on latest snapshot.</p>
            ) : (
              policyCards.map((p) => {
                const on = (p.modules ?? []).filter((m) => m.enabled);
                const off = (p.modules ?? []).filter((m) => !m.enabled);
                return (
                  <div key={p.policyId} className="rounded-md border border-border px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-fg">{p.policyName || p.policyId}</p>
                      <span className="tabular-nums text-[12px] text-muted">{p.deviceCount} device(s)</span>
                    </div>
                    {on.length || off.length ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {on.map((m) => (
                          <span
                            key={m.id}
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                              "bg-rag-green-bg text-rag-green",
                            )}
                          >
                            {m.label}
                          </span>
                        ))}
                        {off.map((m) => (
                          <span
                            key={m.id}
                            className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted"
                          >
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
