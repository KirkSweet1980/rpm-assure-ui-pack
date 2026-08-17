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

function docKey(code: string) {
  return `rpma-sla-file-${code.toUpperCase()}`;
}

type StoredDoc = { name: string; mime: string; dataUrl: string };

function loadDoc(code: string): StoredDoc | null {
  try {
    const raw = localStorage.getItem(docKey(code));
    if (!raw) return null;
    const j = JSON.parse(raw) as StoredDoc;
    if (!j?.dataUrl) return null;
    return j;
  } catch {
    return null;
  }
}

function saveDoc(code: string, doc: StoredDoc | null) {
  if (!doc) {
    localStorage.removeItem(docKey(code));
    return;
  }
  localStorage.setItem(docKey(code), JSON.stringify(doc));
}

async function fileToStored(file: File): Promise<StoredDoc> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
  return {
    name: file.name.replace(/[\\/]/g, "").slice(0, 260),
    mime: file.type || "application/octet-stream",
    dataUrl,
  };
}

export function SignedSlaPanel({ code }: { code: string }) {
  const [row, setRow] = useState<CustomerSlaContract>(() => emptySlaContract(code));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [doc, setDoc] = useState<StoredDoc | null>(null);
  const [customName, setCustomName] = useState("Custom SLA");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    setDoc(loadDoc(code));
    fetchCustomerSlaContract({ data: { code } }).then((r) => {
      if (!live) return;
      setRow({ ...emptySlaContract(code), ...r, kpis: { ...defaultSlaKpis(), ...r.kpis } });
      const n = (r.notes ?? "").match(/^CUSTOM:([^\n]*)/)?.[1]?.trim();
      if (n) setCustomName(n);
    });
    return () => {
      live = false;
    };
  }, [code]);

  async function persist(kind: "draft" | "sign" | "custom") {
    setBusy(true);
    setMsg(null);
    const notes =
      kind === "custom" || customName
        ? `CUSTOM:${customName}\n${(row.notes ?? "").replace(/^CUSTOM:[^\n]*\n?/, "")}`
        : row.notes ?? "";
    const res = await saveCustomerSlaContract({
      data: {
        code,
        documentName: doc?.name ?? row.documentName ?? "",
        signedBy: row.signedBy ?? "",
        confirmedSignature: kind === "sign" ? true : row.confirmedSignature,
        notes,
        kpis: row.kpis,
        sign: kind === "sign",
      },
    });
    setBusy(false);
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    const next = await fetchCustomerSlaContract({ data: { code } });
    setRow({ ...emptySlaContract(code), ...next, kpis: { ...defaultSlaKpis(), ...next.kpis } });
    setMsg(
      kind === "sign"
        ? "Signed SLA on file. Custom targets are the ones you set below."
        : kind === "custom"
          ? "Custom SLA saved for this customer."
          : "Draft saved.",
    );
  }

  async function importFile(f: File) {
    setBusy(true);
    const stored = await fileToStored(f);
    saveDoc(code, stored);
    setDoc(stored);
    setRow((cur) => ({ ...cur, documentName: stored.name }));
    setBusy(false);
    setPicker(false);
    setMsg(`Imported ${stored.name}. Open View to read it.`);
  }

  const signed = row.status === "signed";
  const pdf = Boolean(doc?.mime.includes("pdf") || doc?.name.toLowerCase().endsWith(".pdf"));

  return (
    <div className="space-y-3">
      <div className={cn("rpma-sla-banner", signed ? "is-signed" : "is-prov")}>
        {signed ? (
          <>
            <strong>Signed SLA</strong>
            <span>
              {doc?.name ?? row.documentName ?? "On file"}
              {row.signedBy ? ` · ${row.signedBy}` : ""}
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
        <CardHead>Import signed SLA</CardHead>
        <CardContent className="space-y-3 text-[12px]">
          <p className="text-muted">
            Store the signed PDF or Word file on this tenant. Assure does not scan it for KPIs — set Custom SLA
            targets below.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rpma-sla-btn is-sign" onClick={() => setPicker(true)}>
              Browse for document…
            </button>
            <button type="button" className="rpma-sla-btn" disabled={!doc} onClick={() => setViewer(true)}>
              View document
            </button>
            {doc ? <span className="self-center text-muted">{doc.name}</span> : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-semibold">Signed by</span>
              <input
                className="rpma-sla-input"
                value={row.signedBy ?? ""}
                onChange={(e) => setRow({ ...row, signedBy: e.target.value })}
                placeholder="Customer signatory"
              />
            </label>
            <label className="flex items-end gap-2 font-semibold pb-1">
              <input
                type="checkbox"
                checked={row.confirmedSignature}
                onChange={(e) => setRow({ ...row, confirmedSignature: e.target.checked })}
              />
              Signature is on the document
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rpma-sla-btn" disabled={busy} onClick={() => persist("draft")}>
              Save draft
            </button>
            <button type="button" className="rpma-sla-btn is-sign" disabled={busy || !doc} onClick={() => persist("sign")}>
              Confirm signed SLA
            </button>
          </div>
          {msg ? <p className="text-muted">{msg}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHead>Custom SLA</CardHead>
        <CardContent className="space-y-3">
          <p className="text-[12px] text-muted">
            Create this customer’s own targets. Platform defaults stay until you change a cell and save.
          </p>
          <label className="grid max-w-md gap-1 text-[12px]">
            <span className="font-semibold">Custom SLA name</span>
            <input
              className="rpma-sla-input"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. UVSS 2026 schedule"
            />
          </label>
          <table className="w-full text-left text-[12px]">
            <thead className="rpma-table-head">
              <tr>
                <th className="px-2 py-1.5">Service</th>
                <th className="px-2 py-1.5">Metric</th>
                <th className="px-2 py-1.5">Platform %</th>
                <th className="px-2 py-1.5">This customer %</th>
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
          <button type="button" className="rpma-sla-btn is-sign" disabled={busy} onClick={() => persist("custom")}>
            Save Custom SLA
          </button>
        </CardContent>
      </Card>

      {picker ? (
        <div className="rpma-sla-modal" role="dialog" aria-modal="true" aria-label="Import signed SLA">
          <div className="rpma-sla-modal-card">
            <h3>Import signed SLA</h3>
            <p>Choose the signed PDF or Word file. It is stored for viewing — not scanned.</p>
            <button type="button" className="rpma-sla-btn is-sign" onClick={() => inputRef.current?.click()}>
              Browse…
            </button>
            <input
              ref={inputRef}
              type="file"
              hidden
              accept=".pdf,.doc,.docx,application/pdf,image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importFile(f);
              }}
            />
            <button type="button" className="rpma-sla-btn" onClick={() => setPicker(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {viewer && doc ? (
        <div className="rpma-sla-modal" role="dialog" aria-modal="true" aria-label="View signed SLA">
          <div className="rpma-sla-viewer">
            <header>
              <strong>{doc.name}</strong>
              <div className="flex gap-2">
                <a className="rpma-sla-btn" href={doc.dataUrl} download={doc.name}>
                  Download
                </a>
                <button type="button" className="rpma-sla-btn" onClick={() => setViewer(false)}>
                  Close
                </button>
              </div>
            </header>
            {pdf || doc.mime.startsWith("image/") ? (
              <iframe title={doc.name} src={doc.dataUrl} />
            ) : (
              <p>
                Word files open in the desktop app. Use Download, then open locally.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
