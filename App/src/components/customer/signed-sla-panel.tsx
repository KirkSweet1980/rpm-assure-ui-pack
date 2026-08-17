import { useEffect, useRef, useState } from "react";
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

function scanSlaText(name: string, text: string) {
  const signedBy =
    text.match(/(?:signed\s+by|signatory|for\s+and\s+on\s+behalf)\s*[:\-–]?\s*([A-Z][A-Za-z .'-]{2,60})/i)?.[1]?.trim() ??
    "";
  const notes: string[] = [];
  const pct = [...text.matchAll(/(\d{2,3})\s*%/g)].map((m) => Number(m[1])).filter((n) => n >= 80 && n <= 100);
  if (pct.length) notes.push(`Scanned targets: ${[...new Set(pct)].slice(0, 6).join("%, ")}%.`);
  const clocks = text.match(/acknowledge|restore|business hours|p1|priority/i);
  if (clocks) notes.push("Document mentions ticket clocks / priorities.");
  const clip = text.replace(/\s+/g, " ").trim().slice(0, 280);
  if (clip) notes.push(clip);
  return {
    documentName: name.replace(/[\\/]/g, "").slice(0, 260),
    signedBy: signedBy.slice(0, 120),
    notes: notes.join(" ").slice(0, 500),
  };
}

async function readFileText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127)) out += String.fromCharCode(c);
    else out += " ";
  }
  return out.replace(/[^\x20-\x7E\n\r\t]+/g, " ").replace(/\s{3,}/g, " ");
}

export function SignedSlaPanel({ code }: { code: string }) {
  const [row, setRow] = useState<CustomerSlaContract>(() => emptySlaContract(code));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  async function scanFile(f: File) {
    setBusy(true);
    setScanNote(null);
    const text = await readFileText(f);
    const got = scanSlaText(f.name, text);
    setRow((cur) => ({
      ...cur,
      documentName: got.documentName || cur.documentName,
      signedBy: got.signedBy || cur.signedBy,
      notes: got.notes || cur.notes,
    }));
    setScanNote(
      got.signedBy
        ? `Scanned ${f.name} (${Math.round(f.size / 1024)} KB). Signatory candidate: ${got.signedBy}. Review before you confirm.`
        : `Scanned ${f.name} (${Math.round(f.size / 1024)} KB). Review extracted notes, then confirm the signature.`,
    );
    setBusy(false);
    setPicker(false);
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
            Browse for the signed PDF or Word file, scan it, then confirm the signature. Tenant KPI targets only apply after Confirm signed SLA.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rpma-sla-btn is-sign" onClick={() => setPicker(true)}>
              Browse for document…
            </button>
            {row.documentName ? <span className="self-center text-muted">{row.documentName}</span> : null}
          </div>
          {scanNote ? <p className="text-muted">{scanNote}</p> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-semibold">Document name</span>
              <input
                className="rpma-sla-input"
                value={row.documentName ?? ""}
                onChange={(e) => setRow({ ...row, documentName: e.target.value })}
                placeholder="Filled from the scanned file"
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
              placeholder="Extracted from scan — edit as needed"
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

      {picker ? (
        <div className="rpma-sla-modal" role="dialog" aria-modal="true" aria-label="Import signed SLA">
          <div className="rpma-sla-modal-card">
            <h3>Import signed SLA</h3>
            <p>Choose the customer’s signed contract. Vision will scan it for a signatory and targets.</p>
            <button type="button" className="rpma-sla-btn is-sign" onClick={() => inputRef.current?.click()}>
              Browse…
            </button>
            <input
              ref={inputRef}
              type="file"
              hidden
              accept=".pdf,.doc,.docx,.txt,.rtf,application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <p className="rpma-sla-file">
                {file.name} · {Math.round(file.size / 1024)} KB
              </p>
            ) : (
              <p className="text-muted">No file selected.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rpma-sla-btn" onClick={() => setPicker(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="rpma-sla-btn is-sign"
                disabled={!file || busy}
                onClick={() => file && void scanFile(file)}
              >
                Scan document
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
