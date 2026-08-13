import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  FileSpreadsheet,
  Loader2,
  Printer,
  RefreshCw,
  Send,
  Shield,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/portfolio/require-auth";
import { AppShell } from "@/components/portfolio/app-shell";
import { CorpPathTrail, CorpWorkspaceRail, type CorpService } from "@/components/nav/corp-workspace-rail";
import { RagBadge } from "@/components/portfolio/rag-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { fetchPortfolio } from "@/lib/data/portfolio";
import {
  REPORT_FIELD_GROUPS,
  REPORT_FIELDS,
  defaultCustomFieldIds,
} from "@/lib/data/report-fields";
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
  | "services-cover";

const PACKS: {
  id: ReportFormat;
  title: string;
  when: string;
  blurb: string;
  needsCustomer: boolean;
  icon: "day" | "ams" | "estate" | "rmm";
}[] = [
  {
    id: "ams-monthly",
    title: "Monthly AMS pack",
    when: "Monthly",
    blurb: "Signed SLA evidence: health, day-end, jobs, FinSight, operators, hotfixes, RPM clocks. No 99.5%. No Cove/EPP.",
    needsCustomer: true,
    icon: "ams",
  },
  {
    id: "day-end",
    title: "Day end · FinSight",
    when: "Daily",
    blurb: "Daily close: collect OK, FinSight control matrix, exception register, SQL backups.",
    needsCustomer: true,
    icon: "day",
  },
  {
    id: "period-end",
    title: "Period end · FinSight",
    when: "Month-end",
    blurb: "Close readiness: modules in balance, material OOB, ops gates, actions.",
    needsCustomer: true,
    icon: "day",
  },
  {
    id: "ams-weekly",
    title: "Weekly RPM Assure digest",
    when: "Weekly",
    blurb: "Ops + FinSight: health, jobs, OOB lines, backups, licence, risks.",
    needsCustomer: true,
    icon: "ams",
  },
  {
    id: "ams-full",
    title: "Applications RPM Assure Report",
    when: "On demand",
    blurb: "Full RPM Assure pack anytime — board structure.",
    needsCustomer: true,
    icon: "ams",
  },
  {
    id: "rmm-service",
    title: "RMM service pack",
    when: "On demand",
    blurb: "Remote Management: fleet, patches (servers + WS), alerts, offline devices.",
    needsCustomer: true,
    icon: "rmm",
  },
  {
    id: "services-cover",
    title: "Services on cover",
    when: "On demand",
    blurb: "Cross-pillar snapshot: cover strip + RMM / Backup / EPP / M365 / FinSight highlights.",
    needsCustomer: true,
    icon: "rmm",
  },
  {
    id: "estate",
    title: "Estate overview",
    when: "Anytime",
    blurb: "All customers — health, attention list, FinSight OOB roll-up.",
    needsCustomer: false,
    icon: "estate",
  },
  {
    id: "custom-pack",
    title: "Custom report",
    when: "On demand",
    blurb: "Pick fields from the catalog — build your own pack, then print.",
    needsCustomer: true,
    icon: "ams",
  },
];

const REPORT_SERVICES: CorpService[] = [
  {
    id: "ams",
    title: "Customer Assurance Packs",
    overview: "/reports?format=ams-monthly",
    modules: [
      { label: "Monthly Pack", path: "/reports?format=ams-monthly" },
      { label: "Weekly Digest", path: "/reports?format=ams-weekly" },
      { label: "Full Pack", path: "/reports?format=ams-full" },
    ],
  },
  {
    id: "finsight",
    title: "FinSight Packs",
    overview: "/reports?format=day-end",
    modules: [
      { label: "Day End", path: "/reports?format=day-end" },
      { label: "Period End", path: "/reports?format=period-end" },
    ],
  },
  {
    id: "fleet",
    title: "Fleet Packs",
    overview: "/reports?format=rmm-service",
    modules: [
      { label: "Remote Management Pack", path: "/reports?format=rmm-service" },
      { label: "Services On Cover", path: "/reports?format=services-cover" },
    ],
  },
  {
    id: "estate",
    title: "Estate Packs",
    overview: "/reports?format=estate",
    modules: [
      { label: "Estate Overview", path: "/reports?format=estate" },
      { label: "Custom Pack", path: "/reports?format=custom-pack" },
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
    (search.format as ReportFormat) || "ams-monthly",
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

  const pack = PACKS.find((p) => p.id === format) ?? PACKS[0];
  const needsCustomer = pack.needsCustomer;

  useEffect(() => {
    const ok = PACKS.some((p) => p.id === search.format);
    if (ok && search.format) setFormat(search.format as ReportFormat);
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
      return `Monthly AMS pack · ${now.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })} · SYSPRO + AMS only`;
    }
    if (format === "ams-full") {
      return `Monthly board pack · ${now.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}`;
    }
    if (format === "day-end") {
      return `Day end · ${now.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}`;
    }
    if (format === "period-end") return "Period end · FinSight readiness";
    if (format === "estate") return "Estate overview · all active customers";
    if (format === "rmm-service") return "RMM service pack · latest Pulseway snapshot";
    if (format === "services-cover") return "Services on cover · multi-pillar snapshot";
    if (format === "custom-pack") return `Custom · ${selectedCount} field(s) selected`;
    return "On-demand pack";
  }, [format, selectedCount]);

  const attention = rows.filter((r) => r.healthRag === "Red" || r.healthRag === "Amber");

  const reportPath = `/reports?format=${format}`;
  const reportSvc = REPORT_SERVICES.find((s) =>
    s.modules.some((m) => m.path === reportPath),
  );
  const reportMod = reportSvc?.modules.find((m) => m.path === reportPath);

  return (
    <RequireAuth>
      <AppShell
        title="Reports"
        subtitle="Board packs, FinSight, RMM, multi-pillar — preview and print (email off)"
      >
        <div className="rpma-d3-workspace is-tool">
          <CorpWorkspaceRail
            heading="Reporting"
            homeHref="/reports"
            services={REPORT_SERVICES}
            pathname={reportPath}
          />
          <div className="rpma-d3-detail min-w-0">
            <div className="rpma-modnav">
              <CorpPathTrail
                rootLabel="Reporting"
                rootHref="/reports"
                service={reportSvc?.title}
                moduleLabel={reportMod?.label}
              />
            </div>
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-bold text-fg">1. Choose pack</h2>
          <p className="mb-3 text-xs text-muted">
            Preview and print in the browser. Outbound email schedules are disabled in this
            release — use Print / PDF for board packs.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PACKS.map((p) => {
              const active = format === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectFormat(p.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition",
                    active
                      ? "border-accent bg-accent-soft ring-2 ring-accent/30"
                      : "border-border bg-surface hover:border-accent/40",
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {p.icon === "day" ? (
                      <FileSpreadsheet className="h-5 w-5 text-accent" />
                    ) : p.icon === "estate" ? (
                      <Building2 className="h-5 w-5 text-accent" />
                    ) : p.icon === "rmm" ? (
                      <Shield className="h-5 w-5 text-accent" />
                    ) : (
                      <Send className="h-5 w-5 text-accent" />
                    )}
                    <span className="text-sm font-bold text-fg">{p.title}</span>
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {p.when}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-snug text-muted">{p.blurb}</p>
                </button>
              );
            })}
          </div>
        </section>

        <div className="mb-5 rounded-xl border border-accent/25 bg-accent-soft/50 px-4 py-3 text-sm">
          <p className="font-semibold text-fg">
            Reporting period · <span className="font-normal text-muted">{periodBanner}</span>
          </p>
        </div>

        {format === "custom-pack" ? (
          <section className="mb-5">
            <h2 className="mb-2 text-sm font-bold text-fg">1b. Custom report fields</h2>
            <p className="mb-3 text-xs text-muted">
              Select the data blocks to include. Selection is remembered in this browser.
              Fields with no cover for the customer show as No cover in the pack.
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setCustomFields(defaultCustomFieldIds())}
              >
                Defaults
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setCustomFields(REPORT_FIELDS.map((f) => f.id))}
              >
                Select all
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setCustomFields([])}
              >
                Clear
              </Button>
              <span className="self-center text-xs text-muted">
                {selectedCount} selected
              </span>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {REPORT_FIELD_GROUPS.map((g) => {
                const fields = REPORT_FIELDS.filter((f) => f.group === g.id);
                const allOn = fields.every((f) => customFields.includes(f.id));
                return (
                  <Card key={g.id}>
                    <CardHead>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>{g.label}</span>
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-accent hover:underline"
                          onClick={() => selectGroup(g.id, !allOn)}
                        >
                          {allOn ? "Clear group" : "All in group"}
                        </button>
                      </div>
                      <p className="mt-0.5 text-[11px] font-normal normal-case text-muted">
                        {g.blurb}
                      </p>
                    </CardHead>
                    <CardContent className="space-y-1.5 pt-2">
                      {fields.map((f) => {
                        const on = customFields.includes(f.id);
                        return (
                          <label
                            key={f.id}
                            className={cn(
                              "flex cursor-pointer gap-2 rounded-lg border px-2.5 py-2 text-sm transition",
                              on
                                ? "border-accent/40 bg-accent-soft/40"
                                : "border-border bg-surface hover:border-accent/25",
                            )}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={on}
                              onChange={() => toggleField(f.id)}
                            />
                            <span>
                              <span className="font-semibold text-fg">{f.label}</span>
                              <span className="mt-0.5 block text-[11px] text-muted">
                                {f.blurb}
                              </span>
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

        <section className="mb-5">
          <h2 className="mb-2 text-sm font-bold text-fg">2. Customer & actions</h2>
          <Card>
            <CardContent className="space-y-3 pt-4">
              <div className="flex flex-wrap items-end gap-3">
                {needsCustomer ? (
                  <label className="min-w-[14rem] flex-1">
                    <span className="mb-1 block text-xs font-bold text-fg">Customer</span>
                    <select
                      className="field w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-fg"
                      value={customerCode}
                      onChange={(e) => {
                        setCustomerCode(e.target.value);
                        void navigate({
                          search: { format, customer: e.target.value },
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
                  <p className="flex-1 text-sm text-muted">
                    Estate pack covers all customers — no single customer needed.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={busy} onClick={() => void loadPreview()}>
                  {busy ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                  )}
                  Refresh preview
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busy || !previewHtml}
                  onClick={openPrint}
                >
                  <Printer className="mr-1.5 h-4 w-4" />
                  Print / PDF
                </Button>
              </div>

              {msg ? (
                <p className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg">
                  {msg}
                </p>
              ) : null}

              {previewSubject ? (
                <p className="text-xs text-muted">
                  <span className="font-bold text-fg">Subject: </span>
                  {previewSubject}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="mb-5">
          <h2 className="mb-2 text-sm font-bold text-fg">3. Preview</h2>
          <Card className="overflow-hidden">
            <CardHead>
              {pack.title}
              {busy ? (
                <span className="ml-2 text-xs font-normal normal-case text-muted">
                  Generating…
                </span>
              ) : null}
            </CardHead>
            <CardContent className="p-0">
              {previewUrl ? (
                <iframe
                  title="Report preview"
                  className="min-h-[min(75vh,720px)] w-full border-0 bg-white"
                  src={previewUrl}
                  sandbox="allow-same-origin allow-modals allow-popups allow-scripts"
                />
              ) : (
                <p className="p-6 text-sm text-muted">
                  {busy
                    ? "Generating preview…"
                    : msg
                      ? "Preview could not be generated — see message above."
                      : "Preview will appear here. Print from the browser when ready."}
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {attention.length > 0 ? (
          <section>
            <h2 className="mb-2 text-sm font-bold text-fg">Customers needing attention</h2>
            <ul className="space-y-1.5">
              {attention.slice(0, 8).map((r) => (
                <li
                  key={r.customerCode}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                >
                  <RagBadge rag={r.healthRag} />
                  <span className="font-bold text-fg">{r.displayName}</span>
                  <span className="text-xs text-muted">{r.healthSummary}</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="ml-auto"
                    onClick={() => {
                      setCustomerCode(r.customerCode);
                      selectFormat("ams-full");
                      void navigate({
                        search: { format: "ams-full", customer: r.customerCode },
                      });
                    }}
                  >
                    RPM Assure pack
                  </Button>
                  <Link
                    to="/customers/$code"
                    params={{ code: r.customerCode }}
                    className="text-xs font-semibold text-accent underline-offset-2 hover:underline"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
