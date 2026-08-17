import { useEffect, useState } from "react";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import {
  defaultSlaKpis,
  emptySlaContract,
  fetchCustomerSlaContract,
  saveCustomerSlaContract,
  type CustomerSlaContract,
} from "@/lib/data/customer-sla-contract";
import { INDUSTRY_MEASURES, type IndustryPillarKey } from "@/lib/data/sla-metrics";
import { cn } from "@/lib/utils";

const PILLARS: IndustryPillarKey[] = ["syspro", "rmm", "cove", "epp", "tickets", "csp"];

export function SignedSlaPanel({ code }: { code: string }) {
  const [row, setRow] = useState<CustomerSlaContract>(() => emptySlaContract(code));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchCustomerSlaContract({ data: { code } }).then((r) => {
      if (live) setRow({ ...emptySlaContract(code), ...r, kpis: { ...defaultSlaKpis(), ...r.kpis } });
    });
    return () => {
      live = false;
    };
  }, [code]);

  async function persist(sign: boolean) {
    setBusy(true);
    setMsg(null);
    const res = await saveCustomerSlaContract({
      data: {
        code,
        documentName: row.documentName ?? "",
        signedBy: row.signedBy ?? "",
        confirmedSignature: row.confirmedSignature,
        notes: row.notes ?? "",
        kpis: row.kpis,
        sign,
      },
    });
    setBusy(false);
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    const next = await fetchCustomerSlaContract({ data: { code } });
    setRow({ ...emptySlaContract(code), ...next, kpis: { ...defaultSlaKpis(), ...next.kpis } });
    setMsg(res.status === "signed" ? "Signed SLA recorded. Tenant KPIs are now in force." : "Draft saved (still provisional).");
  }

  const signed = row.status === "signed";

  return (
    <div className="space-y-3">
      <div className={cn("rpma-sla-banner", signed ? "is-signed" : "is-prov")}>
        {signed ? (
          <>
            <strong>Signed SLA</strong>
            <span>
              {row.documentName ?? "Contract"} · {row.signedBy ?? "—"}
              {row.signedAtUtc ? ` · ${new Date(row.signedAtUtc).toLocaleDateString()}` : ""}
            </span>
          </>
        ) : (
          <>
            <strong>Provisional Cover</strong>
            <span>subject to Signed SLA</span>
          </>
        )}
      </div>

      <Card>
        <CardHead>Import Signed SLA</CardHead>
        <CardContent className="space-y-3 text-[12px]">
          <p className="text-muted">
            Platform default clocks apply to every tenant until a signed contract is imported here.
            Confirm the signature, then save tenant KPI targets if they differ from the standard.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-semibold">Document name</span>
              <input
                className="rpma-sla-input"
                value={row.documentName ?? ""}
                onChange={(e) => setRow({ ...row, documentName: e.target.value })}
                placeholder="e.g. AHIC SYSPRO+AMS Rev 5.0.pdf"
              />
            </label>
            <label className="grid gap-1">
              <span className="font-semibold">Signed by</span>
              <input
                className="rpma-sla-input"
                value={row.signedBy ?? ""}
                onChange={(e) => setRow({ ...row, signedBy: e.target.value })}
                placeholder="Customer signatory"
              />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="font-semibold">Notes</span>
            <textarea
              className="rpma-sla-input min-h-16"
              value={row.notes ?? ""}
              onChange={(e) => setRow({ ...row, notes: e.target.value })}
              placeholder="Schedule 3 jurisdiction, exceptions, go-live date"
            />
          </label>
          <label className="flex items-center gap-2 font-semibold">
            <input
              type="checkbox"
              checked={row.confirmedSignature}
              onChange={(e) => setRow({ ...row, confirmedSignature: e.target.checked })}
            />
            I confirm a wet-ink or digital signature is on file
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rpma-sla-btn" disabled={busy} onClick={() => persist(false)}>
              Save draft
            </button>
            <button type="button" className="rpma-sla-btn is-sign" disabled={busy} onClick={() => persist(true)}>
              Confirm signed SLA
            </button>
          </div>
          {msg ? <p className="text-muted">{msg}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHead>Tenant KPI targets</CardHead>
        <CardContent>
          <p className="mb-2 text-[12px] text-muted">
            Defaults are the platform standard. Change a target only when this customer’s signed schedule differs.
          </p>
          <table className="w-full text-left text-[12px]">
            <thead className="rpma-table-head">
              <tr>
                <th className="px-2 py-1.5">Service</th>
                <th className="px-2 py-1.5">Metric</th>
                <th className="px-2 py-1.5">Standard</th>
                <th className="px-2 py-1.5">This tenant %</th>
              </tr>
            </thead>
            <tbody>
              {PILLARS.map((p) => {
                const m = INDUSTRY_MEASURES[p];
                return (
                  <tr key={p} className="border-t border-border">
                    <td className="px-2 py-1.5 font-semibold">{m.label}</td>
                    <td className="px-2 py-1.5 text-muted">{m.metric}</td>
                    <td className="px-2 py-1.5">{m.targetPct}%</td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        step={0.1}
                        className="rpma-sla-input w-24"
                        value={row.kpis[p] ?? m.targetPct}
                        onChange={(e) =>
                          setRow({
                            ...row,
                            kpis: { ...row.kpis, [p]: Number(e.target.value) },
                          })
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
