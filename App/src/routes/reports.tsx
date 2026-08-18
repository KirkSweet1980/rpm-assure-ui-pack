import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarCheck, ClipboardList, Cloud, FileStack, Gauge, HardDrive, Layers, Loader2, Printer, RefreshCw, Server, Shield, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/portfolio/require-auth";
import { AppShell } from "@/components/portfolio/app-shell";
import { EmpWindow, type EmpGroup } from "@/components/chrome/emp-window";
import type { CorpService } from "@/components/nav/corp-workspace-rail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { fetchPortfolio } from "@/lib/data/portfolio";
import {
  REPORT_FIELD_GROUPS,
  REPORT_FIELDS,
  defaultCustomFieldIds,
} from "@/lib/data/report-fields";
import { TenantTree } from "@/components/customer/tenant-tree";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  validateSearch: (search: Record<string, unknown>) => ({
    format:
      typeof search.format === "string" ? search.format : undefined,
    customer:
      typeof search.customer === "string" ? search.customer : undefined,
  }),
  loader: async () => fetchPortfolio(),
  component: ReportsPage,
});

type ReportFormat =
  | "day-end"
  | "period-end"
  | "ams-full"
  | "ams-weekly"
  | "ams-monthly"
  | "estate"
  | "custom-pack"
  | "rmm-service"
  | "rmm-availability"
  | "rmm-patch"
  | "rmm-capacity"
  | "cove-service"
  | "cove-recovery"
  | "epp-service"
  | "epp-incidents"
  | "services-cover";

const PACKS: {
  id: ReportFormat;
  title: string;
  when: string;
  blurb: string;
  needsCustomer: boolean;
  service: "ams" | "finsight" | "fleet" | "cove" | "epp" | "estate";
}[] = [
  {
    id: "ams-monthly",
    title: "Monthly AMS Pack",
    when: "Monthly",
    blurb: "Signed SLA evidence — health, jobs, FinSight, operators, RPM clocks.",
    needsCustomer: true,
    service: "ams",
  },
  {
    id: "ams-weekly",
    title: "Weekly Digest",
    when: "Weekly",
    blurb: "Ops snapshot — health, jobs, OOB, licence, and risks.",
    needsCustomer: true,
    service: "ams",
  },
  {
    id: "ams-full",
    title: "Full Assurance Pack",
    when: "On demand",
    blurb: "Board pack — SYSPRO plus every service on cover (RMM, Backup, EPP, M365).",
    needsCustomer: true,
    service: "ams",
  },
  {
    id: "day-end",
    title: "Day End",
    when: "Daily",
    blurb: "Collect OK, control matrix, exception register, SQL backups.",
    needsCustomer: true,
    service: "finsight",
  },
  {
    id: "period-end",
    title: "Period End",
    when: "Month-end",
    blurb: "Close readiness — modules in balance, material OOB, actions.",
    needsCustomer: true,
    service: "finsight",
  },
  {
    id: "rmm-service",
    title: "Remote Management Pack",
    when: "On demand",
    blurb: "Fleet, alerts, patches, and offline. Servers feed SLA.",
    needsCustomer: true,
    service: "fleet",
  },
  {
    id: "rmm-availability",
    title: "Server Availability",
    when: "On demand",
    blurb: "Uptime %, offline hours, last seen. Workstations not in SLA.",
    needsCustomer: true,
    service: "fleet",
  },
  {
    id: "rmm-patch",
    title: "Patch Compliance",
    when: "On demand",
    blurb: "Server compliance % and missing / pending backlog.",
    needsCustomer: true,
    service: "fleet",
  },
  {
    id: "rmm-capacity",
    title: "Capacity & Performance",
    when: "On demand",
    blurb: "Disk ≥85%, CPU, memory, peak IOPS. Servers first.",
    needsCustomer: true,
    service: "fleet",
  },
  {
    id: "cove-service",
    title: "Cloud Backup Executive Summary",
    when: "On demand",
    blurb: "Safeguards, success rate, RPO, restore, assets, retention — ESR layout.",
    needsCustomer: true,
    service: "cove",
  },
  {
    id: "cove-recovery",
    title: "Recovery Testing",
    when: "On demand",
    blurb: "Plans, test success / fail, last recovery test.",
    needsCustomer: true,
    service: "cove",
  },
  {
    id: "epp-service",
    title: "RPM EndPoint Protection Pack",
    when: "On demand",
    blurb: "Managed endpoints, MSP licence, policy sample.",
    needsCustomer: true,
    service: "epp",
  },
  {
    id: "epp-incidents",
    title: "Incidents & Quarantine",
    when: "On demand",
    blurb: "Incidents and quarantine from the latest collect.",
    needsCustomer: true,
    service: "epp",
  },
  {
    id: "estate",
    title: "Eco-System Overview",
    when: "Anytime",
    blurb: "All customers — health, attention, FinSight roll-up.",
    needsCustomer: false,
    service: "estate",
  },
  {
    id: "services-cover",
    title: "Services On Cover",
    when: "On demand",
    blurb: "Cover strip plus RMM, Backup, EPP, M365, FinSight.",
    needsCustomer: true,
    service: "estate",
  },
  {
    id: "custom-pack",
    title: "Custom Pack",
    when: "On demand",
    blurb: "Pick fields from the catalog, then preview and print.",
    needsCustomer: true,
    service: "estate",
  },
];

const PACK_ICON: Record<ReportFormat, typeof Shield> = {
  "ams-monthly": ShieldCheck,
  "ams-weekly": ClipboardList,
  "ams-full": FileStack,
  "day-end": CalendarCheck,
  "period-end": Layers,
  "rmm-service": Server,
  "rmm-availability": Gauge,
  "rmm-patch": Shield,
  "rmm-capacity": HardDrive,
  "cove-service": HardDrive,
  "cove-recovery": ShieldCheck,
  "epp-service": Shield,
  "epp-incidents": ShieldCheck,
  estate: Layers,
  "services-cover": ShieldCheck,
  "custom-pack": FileStack,
};

const REPORT_SERVICES: CorpService[] = [
  {
    id: "ams",
    title: "Customer Assurance Packs",
    overview: "/reports?format=ams-monthly",
    icon: ShieldCheck,
    color: "#0d9488",
    modules: [
      { label: "Monthly Pack", path: "/reports?format=ams-monthly", icon: ShieldCheck, color: "#0d9488" },
      { label: "Weekly Digest", path: "/reports?format=ams-weekly", icon: ClipboardList, color: "#2563eb" },
      { label: "Full Pack", path: "/reports?format=ams-full", icon: FileStack, color: "#7c3aed" },
    ],
  },
  {
    id: "finsight",
    title: "FinSight Packs",
    overview: "/reports?format=day-end",
    icon: Layers,
    color: "#d97706",
    modules: [
      { label: "Day End", path: "/reports?format=day-end", icon: CalendarCheck, color: "#d97706" },
      { label: "Period End", path: "/reports?format=period-end", icon: Layers, color: "#ea580c" },
    ],
  },
  {
    id: "fleet",
    title: "RMM Reports",
    overview: "/reports?format=rmm-service",
    icon: Server,
    color: "#2563eb",
    modules: [
      { label: "Remote Management Pack", path: "/reports?format=rmm-service", icon: Server, color: "#2563eb" },
      { label: "Server Availability", path: "/reports?format=rmm-availability", icon: Gauge, color: "#0d9488" },
      { label: "Patch Compliance", path: "/reports?format=rmm-patch", icon: Shield, color: "#7c3aed" },
      { label: "Capacity & Performance", path: "/reports?format=rmm-capacity", icon: HardDrive, color: "#0891b2" },
    ],
  },
  {
    id: "cove",
    title: "Cloud Backup Reports",
    overview: "/reports?format=cove-service",
    icon: Cloud,
    color: "#0891b2",
    modules: [
      { label: "Cloud Backup Pack", path: "/reports?format=cove-service", icon: HardDrive, color: "#0891b2" },
      { label: "Recovery Testing", path: "/reports?format=cove-recovery", icon: ShieldCheck, color: "#0d9488" },
    ],
  },
  {
    id: "epp",
    title: "RPM EndPoint Protection Reports",
    overview: "/reports?format=epp-service",
    icon: Shield,
    color: "#dc2626",
    modules: [
      { label: "RPM EndPoint Protection Pack", path: "/reports?format=epp-service", icon: Shield, color: "#dc2626" },
      { label: "Incidents & Quarantine", path: "/reports?format=epp-incidents", icon: ShieldCheck, color: "#d97706" },
    ],
  },
  {
    id: "estate",
    title: "Assure Eco-System Packs",
    overview: "/reports?format=estate",
    icon: Layers,
    color: "#7c3aed",
    modules: [
      { label: "Assure Eco-System Overview", path: "/reports?format=estate", icon: Layers, color: "#7c3aed" },
      { label: "Services On Cover", path: "/reports?format=services-cover", icon: ShieldCheck, color: "#0d9488" },
      { label: "ExCo one-pager", path: "/downloads/RPM-Exco-Brief.html", icon: Printer, color: "#0b1a3a" },
    ],
  },
];

const STORAGE_KEY = "rpm-assure-custom-report-fields";

function loadSavedFields(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultCustomFieldIds();
    const parsed = JSON.parse(raw) as string[];
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    /* ignore */
  }
  return defaultCustomFieldIds();
}

function ReportsPage() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/reports" });
  const rows = data?.rows ?? [];

  const [format, setFormat] = useState<ReportFormat>(
    PACKS.some((p) => p.id === search.format) ? (search.format as ReportFormat) : "ams-monthly",
  );
  const [customerCode, setCustomerCode] = useState(
    search.customer || rows[0]?.customerCode || "",
  );
  const [customFields, setCustomFields] = useState<string[]>(() =>
    typeof window !== "undefined" ? loadSavedFields() : defaultCustomFieldIds(),
  );
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const pack = PACKS.find((p) => p.id === format) ?? null;
  const needsCustomer = pack?.needsCustomer ?? false;

  useEffect(() => {
    const raw = (search.format || "").toLowerCase().trim();
    const aliased =
      raw === "epp" || raw === "endpoint" || raw === "bitdefender"
        ? "epp-service"
        : raw === "rmm" || raw === "pulseway"
          ? "rmm-service"
          : raw;
    const ok = PACKS.some((p) => p.id === aliased);
    if (ok) setFormat(aliased as ReportFormat);
    if (search.customer) setCustomerCode(search.customer);
  }, [search.format, search.customer]);

  useEffect(() => {
    if (!customerCode && rows[0]?.customerCode) setCustomerCode(rows[0].customerCode);
  }, [rows, customerCode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customFields));
    } catch {
      /* */
    }
  }, [customFields]);

  const loadPreview = useCallback(async () => {
    if (!format) {
      setPreviewHtml(null);
      setPreviewSubject("");
      setMsg(null);
      return;
    }
    if (needsCustomer && !customerCode) {
      setPreviewHtml(null);
      setPreviewSubject("");
      setMsg("Select a customer to preview this pack.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const qs = new URLSearchParams({ format });
      if (needsCustomer && customerCode) qs.set("customer", customerCode);
      if (format === "custom-pack") {
        qs.set("fields", customFields.join(","));
      }
      const res = await fetch(`/api/report-preview?${qs.toString()}`, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const text = await res.text();
      let r: {
        ok?: boolean;
        error?: string;
        html?: string;
        subject?: string;
        source?: string;
        warning?: string | null;
      } | null = null;
      try {
        r = text ? JSON.parse(text) : null;
      } catch {
        setPreviewHtml(null);
        setPreviewSubject("");
        setMsg(
          `Preview failed — server returned non-JSON (HTTP ${res.status}): ` +
            text.slice(0, 180).replace(/\s+/g, " "),
        );
        return;
      }
      if (r && r.ok && r.html) {
        setPreviewHtml(String(r.html));
        setPreviewSubject(String(r.subject ?? ""));
        if (r.warning) setMsg(`Preview ready (${r.source || "ok"}). Note: ${r.warning}`);
        else if (r.source === "demo" || r.source === "portfolio") {
          setMsg(`Preview ready from ${r.source} data — check SQL if you expected live collect.`);
        } else {
          setMsg(null);
        }
      } else {
        setPreviewHtml(null);
        setPreviewSubject("");
        setMsg(r?.error || `Preview failed — empty response (HTTP ${res.status}).`);
      }
    } catch (e) {
      setPreviewHtml(null);
      setPreviewSubject("");
      const m = e instanceof Error ? e.message : String(e);
      setMsg(
        m.includes("Failed to fetch") || m.includes("NetworkError")
          ? "Preview request failed (network / server restart). Wait a few seconds and click Refresh preview."
          : m,
      );
    } finally {
      setBusy(false);
    }
  }, [format, customerCode, needsCustomer, customFields]);

  useEffect(() => {
    const t = window.setTimeout(() => void loadPreview(), 350);
    return () => window.clearTimeout(t);
  }, [loadPreview]);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!previewHtml) {
      setPreviewUrl(null);
      return;
    }
    const blob = new Blob([previewHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewHtml]);

  function selectFormat(id: ReportFormat) {
    setFormat(id);
    void navigate({
      search: { format: id, customer: customerCode || undefined },
    });
  }

  function openPrint() {
    if (!previewHtml) return;
    const w = window.open("", "_blank");
    if (!w) {
      setMsg("Allow pop-ups to print.");
      return;
    }
    w.document.open();
    w.document.write(previewHtml);
    w.document.close();
    w.focus();
    setTimeout(() => {
      try {
        w.print();
      } catch {
        /* */
      }
    }, 350);
  }

  function toggleField(id: string) {
    setCustomFields((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectGroup(groupId: string, on: boolean) {
    const ids = REPORT_FIELDS.filter((f) => f.group === groupId).map((f) => f.id);
    setCustomFields((prev) => {
      if (on) return Array.from(new Set([...prev, ...ids]));
      return prev.filter((id) => !ids.includes(id));
    });
  }

  const selectedCount = customFields.length;
  const periodBanner = useMemo(() => {
    const now = new Date();
    if (format === "ams-weekly") return "Weekly digest (current SAST week)";
    if (format === "ams-monthly") {
      return `Monthly AMS pack · ${now.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })} · all services on cover`;
    }
    if (format === "ams-full") {
      return `Full assurance pack · ${now.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })} · SYSPRO + RMM + Backup + EPP + M365`;
    }
    if (format === "day-end") {
      return `Day end · ${now.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}`;
    }
    if (format === "period-end") return "Period end · FinSight readiness";
    if (format === "estate") return "Assure Eco-System overview · all active customers";
    if (format === "rmm-service") return "Remote Management Pack · latest RMM snapshot";
    if (format === "rmm-availability") return "Server Availability · servers only for SLA";
    if (format === "rmm-patch") return "Patch Compliance · servers first";
    if (format === "rmm-capacity") return "Capacity & Performance · disk / CPU / memory / IOPS";
    if (format === "cove-service") return "Cloud Backup Executive Summary · safeguards, RPO, restore, retention";
    if (format === "cove-recovery") return "Recovery Testing · plans and last test";
    if (format === "epp-service") return "RPM EndPoint Protection · endpoints only for cover";
    if (format === "epp-incidents") return "Incidents & Quarantine · latest collect";
    if (format === "services-cover") return "Services on cover · multi-pillar snapshot";
    if (format === "custom-pack") return `Custom · ${selectedCount} field(s) selected`;
    return "On-demand pack";
  }, [format, selectedCount]);

  return (
    <RequireAuth>
      <AppShell>
        <EmpWindow
          title="Reporting · Assurance Packs"
          menu={[
            { label: "Customer Ecosystem Home", href: "/" },
            { label: "Reporting", href: "/reports", on: true },
            { label: "Report schedule", href: "/settings/reports" },
          ]}
          groups={REPORT_SERVICES.map((s): EmpGroup => ({
            id: s.id,
            title: s.title,
            on: pack?.service === s.id,
            color: s.color,
            icon: s.icon,
            items: s.modules.map((m) => {
              const fmt = (m.path.match(/format=([^&]+)/) || [])[1];
              return {
                label: m.label,
                href: m.path,
                icon: m.icon,
                rag: format && fmt === format ? "Green" : "Off",
                active: Boolean(format && fmt === format),
              };
            }),
          }))}
        >
          <TenantTree
            title="Assurance Packs"
            items={PACKS.map((p) => ({
              id: p.id,
              label: p.title,
              meta: p.when,
              tone: format === p.id ? "green" : "off",
            }))}
            selected={format}
            onSelect={(id) => selectFormat(id as ReportFormat)}
          >
            {pack ? (
              <div className="rpma-folio">
                <header className="rpma-folio-head">
                  <div>
                    <p className="rpma-folio-kicker">{pack.when} · {pack.service.toUpperCase()}</p>
                    <h2>{pack.title}</h2>
                    <p>{pack.blurb}</p>
                  </div>
                  <div className="rpma-folio-actions">
                    <Button type="button" size="sm" disabled={busy} onClick={() => void loadPreview()}>
                      {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
                      Refresh
                    </Button>
                    <Button type="button" variant="secondary" size="sm" disabled={busy || !previewHtml} onClick={openPrint}>
                      <Printer className="mr-1.5 h-4 w-4" />
                      Print / PDF
                    </Button>
                  </div>
                </header>

                <div className="rpma-folio-kpis">
                  <div>
                    <em>Cadence</em>
                    <strong>{pack.when}</strong>
                  </div>
                  <div>
                    <em>Tenant</em>
                    <strong>{needsCustomer ? (rows.find((r) => r.customerCode === customerCode)?.displayName ?? "—") : "All customers"}</strong>
                  </div>
                  <div>
                    <em>Preview</em>
                    <strong>{busy ? "Building…" : previewHtml ? "Ready" : "Waiting"}</strong>
                  </div>
                  <div>
                    <em>Scope</em>
                    <strong>{periodBanner}</strong>
                  </div>
                </div>

                <div className="rpma-rpt-toolbar">
                  {needsCustomer ? (
                    <label>
                      <span>Customer Tenant</span>
                      <select
                        value={customerCode}
                        onChange={(e) => {
                          setCustomerCode(e.target.value);
                          void navigate({
                            search: { format: pack.id, customer: e.target.value },
                          });
                        }}
                      >
                        {rows.map((r) => (
                          <option key={r.customerCode} value={r.customerCode}>
                            {r.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <p className="text-sm text-muted">Estate pack covers every active customer.</p>
                  )}
                </div>

                {format === "custom-pack" ? (
                  <section className="rpma-folio-fields">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => setCustomFields(defaultCustomFieldIds())}>Defaults</Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setCustomFields(REPORT_FIELDS.map((f) => f.id))}>Select all</Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setCustomFields([])}>Clear</Button>
                      <span className="self-center text-xs text-muted">{selectedCount} selected</span>
                    </div>
                    <div className="grid gap-2 lg:grid-cols-2">
                      {REPORT_FIELD_GROUPS.map((g) => {
                        const fields = REPORT_FIELDS.filter((f) => f.group === g.id);
                        const allOn = fields.every((f) => customFields.includes(f.id));
                        return (
                          <Card key={g.id}>
                            <CardHead>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span>{g.label}</span>
                                <button type="button" className="text-[11px] font-semibold text-accent hover:underline" onClick={() => selectGroup(g.id, !allOn)}>
                                  {allOn ? "Clear group" : "All in group"}
                                </button>
                              </div>
                            </CardHead>
                            <CardContent className="space-y-1.5 pt-2">
                              {fields.map((f) => {
                                const on = customFields.includes(f.id);
                                return (
                                  <label key={f.id} className={cn("flex cursor-pointer gap-2 rounded-lg border px-2.5 py-2 text-sm", on ? "border-accent/40 bg-accent-soft/40" : "border-border")}>
                                    <input type="checkbox" className="mt-0.5" checked={on} onChange={() => toggleField(f.id)} />
                                    <span>
                                      <span className="font-semibold">{f.label}</span>
                                      <span className="mt-0.5 block text-[11px] text-muted">{f.blurb}</span>
                                    </span>
                                  </label>
                                );
                              })}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {msg ? <p className="rpma-folio-msg">{msg}</p> : null}
                {previewSubject ? <p className="rpma-folio-subj"><em>Subject</em> {previewSubject}</p> : null}

                <div className="rpma-folio-paper">
                  <div className="rpma-folio-paper-bar">
                    <span />
                    <span />
                    <span />
                    <em>{pack.title}</em>
                  </div>
                  {previewUrl ? (
                    <iframe title="Report preview" src={previewUrl} />
                  ) : (
                    <div className="rpma-folio-empty">
                      {busy ? "Generating preview…" : "Select a tenant and refresh to preview this pack."}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </TenantTree>
        </EmpWindow>
      </AppShell>
    </RequireAuth>
  );
}

