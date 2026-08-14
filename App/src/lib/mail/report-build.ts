/**
 * Server-side AMS report builders + data loaders.
 * Used by /api/report-preview and settings-api email senders.
 * Do not import this from client components.
 */
import type { CustomerDetailPayload, PortfolioPayload, PortfolioRow } from "@/lib/data/types";
import { getDataMode, hasSqlConfig } from "@/lib/data/sql-config";
import { fetchLiveCustomerDetail, fetchLivePortfolio } from "@/lib/data/live-portfolio";
import { getDemoCustomerDetail, getDemoPortfolio } from "@/lib/data/demo-portfolio";
import { fillCustomerPanels } from "@/lib/data/fill-customer-panels";
import {
  buildApplicationsAmsHtml,
  buildCustomPackHtml,
  buildDayEndFinSightHtml,
  buildMonthlyAmsPackHtml,
  buildPeriodEndFinSightHtml,
  buildPortfolioAmsHtml,
  buildRmmServiceHtml,
  buildRmmAvailabilityHtml,
  buildRmmPatchHtml,
  buildRmmCapacityHtml,
} from "@/lib/mail/ams-report-html";
import { resolveFieldIds } from "@/lib/data/report-fields";


export type ReportFormat =
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
  | "services-cover";

export type ReportPack = {
  subject: string;
  html: string;
  text: string;
};

export async function loadPortfolioForReport(): Promise<PortfolioPayload> {
  const mode = getDataMode();
  if (mode !== "demo" && hasSqlConfig()) {
    try {
      const live = await fetchLivePortfolio();
      if (live?.rows?.length) return live;
    } catch (e) {
      console.warn(
        "[rpm-assure] report portfolio live failed:",
        e instanceof Error ? e.message : e,
      );
    }
  }
  return getDemoPortfolio();
}

function emptyCustomerDetail(row: PortfolioRow): CustomerDetailPayload {
  return {
    customer: row,
    operators: [],
    recentLogins: [],
    jobErrors: [],
    dtrLevel1: [],
    dtrDetailLines: [],
    finsightReconCases: [],
    license: null,
    healthLogs: [],
    taskGroups: [],
    taskItems: [],
    incidents: [],
    problems: [],
    risks: [],
    issues: [],
    priorities: [],
    slaPolicies: [],
    availabilitySla: null,
    amsSlaSummary: null,
    changes: [],
    csat: null,
    operGroups: [],
    operAmends: [],
    securitySummary: {
      groupMemberships: 0,
      distinctOperatorsInGroups: 0,
      distinctGroups: 0,
      amendCount90d: 0,
    },
    execSummary: null,
    execNarratives: [],
    auditEvents: [],
    diagSummaries: [],
    sqlHealthRows: [],
    extraSummary: {
      auditCount: 0,
      diagCount: 0,
      sqlHealthCount: 0,
      sqlHealthFailCount: 0,
      lastAuditImport: null,
    },
    operationalAssurance: {
      collectAgeHours: null,
      collectFresh: false,
      jobErrorCount: row.sysproJobErrorCount,
      activeUserRatioPct: null,
      dtrOutOfBalance: row.sysproDtrVarianceLines,
      scorePct: row.healthRag === "Green" ? 80 : row.healthRag === "Amber" ? 55 : 30,
      summary: row.healthSummary || "Portfolio row only — detail collect incomplete.",
    },
    sqlBackups: [],
    sqlBackupFailures: [],
    sysproVersion: null,
    sysproHotfixes: [],
    hotfixGap: [],
    hotfixGapSummary: null,
    rmm: {
      enabled: false,
      pillarOn: false,
      pulsewayOrgName: null,
      summary: null,
      devices: [],
      alerts: [],
      mapping: [],
      message: null,
    },
    cove: {
      enabled: false,
      summary: null,
      devices: [],
      mapping: [],
      unmapped: [],
      message: null,
    },
    dataMode: "live",
  };
}

export async function loadCustomerForReport(code: string): Promise<{
  customer: CustomerDetailPayload | null;
  source: "live" | "demo" | "portfolio" | "none";
  warning: string | null;
}> {
  const mode = getDataMode();
  let lastErr: string | null = null;
  if (mode !== "demo" && hasSqlConfig()) {
    try {
      const live = await fetchLiveCustomerDetail(code);
      if (live) {
        try {
          return {
            customer: fillCustomerPanels(live),
            source: "live",
            warning: null,
          };
        } catch (e) {
          lastErr = e instanceof Error ? e.message : String(e);
          console.warn("[rpm-assure] fillCustomerPanels failed:", lastErr);
          return { customer: live, source: "live", warning: lastErr };
        }
      }
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      console.warn("[rpm-assure] report customer live failed:", lastErr);
    }
  }
  try {
    const demo = getDemoCustomerDetail(code);
    if (demo) {
      return {
        customer: fillCustomerPanels(demo),
        source: "demo",
        warning: lastErr ? `Live detail failed (${lastErr}); showing demo/fallback.` : null,
      };
    }
  } catch (e) {
    lastErr = e instanceof Error ? e.message : String(e);
  }
  try {
    const pf = await loadPortfolioForReport();
    const row = pf.rows.find(
      (r) => (r.customerCode || "").toUpperCase() === code.toUpperCase(),
    );
    if (row) {
      return {
        customer: fillCustomerPanels(emptyCustomerDetail(row)),
        source: "portfolio",
        warning: lastErr
          ? `Detail load failed (${lastErr}); preview built from portfolio metrics only.`
          : "Preview built from portfolio metrics only.",
      };
    }
  } catch (e) {
    lastErr = e instanceof Error ? e.message : String(e);
  }
  return { customer: null, source: "none", warning: lastErr };
}

function fallbackReportPack(
  format: string,
  customer: CustomerDetailPayload | null,
  err: string,
): ReportPack {
  const name =
    customer?.customer?.displayName || customer?.customer?.customerCode || "Customer";
  const code = customer?.customer?.customerCode || "—";
  const rag = customer?.customer?.healthRag || "—";
  const subject = `RPM Assure — ${format} — ${name} (partial)`;
  const text = `${subject}\n\nPreview builder error: ${err}\nHealth: ${rag}`;
  const html = `<!DOCTYPE html><html lang="en-ZA"><head><meta charset="utf-8"/><title>${subject.replace(/</g, "")}</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#1a1a1a}h1{color:#12365a}.err{background:#fff4f4;border:1px solid #e8b4b4;padding:12px;border-radius:8px;margin:16px 0}</style></head><body>
<h1>RPM Assure — ${format}</h1>
<p><strong>${name}</strong> (${code}) · Health ${rag}</p>
<div class="err"><strong>Full pack could not be built.</strong><br/>${String(err).replace(/</g, "<")}</div>
<ul>
<li>Job errors: ${customer?.customer?.sysproJobErrorCount ?? "—"}</li>
<li>FinSight Out of Balance lines: ${customer?.customer?.sysproDtrVarianceLines ?? "—"}</li>
<li>Active users: ${customer?.customer?.activeUserCount ?? "—"}</li>
<li>Last collect: ${customer?.customer?.lastImportAt ?? "—"}</li>
</ul>
</body></html>`;
  return { subject, html, text };
}

export function buildPack(
  format: ReportFormat,
  customer: CustomerDetailPayload | null,
  portfolio: PortfolioPayload,
  fieldIds?: string[],
): ReportPack {
  if (format === "estate") return buildPortfolioAmsHtml(portfolio);
  if (!customer) throw new Error("Customer required for this format");
  if (format === "day-end") return buildDayEndFinSightHtml({ customer, portfolio });
  if (format === "period-end") return buildPeriodEndFinSightHtml({ customer, portfolio });
  if (format === "ams-weekly") {
    return buildApplicationsAmsHtml({
      customer,
      portfolio,
      variant: "weekly",
    });
  }
  if (format === "ams-monthly") {
    return buildMonthlyAmsPackHtml({ customer, portfolio });
  }
  if (format === "rmm-service") {
    return buildRmmServiceHtml({ customer, portfolio });
  }
  if (format === "rmm-availability") {
    return buildRmmAvailabilityHtml({ customer, portfolio });
  }
  if (format === "rmm-patch") {
    return buildRmmPatchHtml({ customer, portfolio });
  }
  if (format === "rmm-capacity") {
    return buildRmmCapacityHtml({ customer, portfolio });
  }
  if (format === "services-cover") {
    return buildCustomPackHtml({
      customer,
      portfolio,
      fieldIds: [
        "health_rag",
        "collect_freshness",
        "cover_strip",
        "assurance_score",
        "rmm_fleet",
        "rmm_patches",
        "cove_summary",
        "cove_recovery",
        "epp_summary",
        "csp_summary",
        "finsight_exceptions",
        "syspro_jobs",
      ],
    });
  }
  if (format === "custom-pack") {
    return buildCustomPackHtml({
      customer,
      portfolio,
      fieldIds: resolveFieldIds(fieldIds),
    });
  }
  return buildApplicationsAmsHtml({ customer, portfolio, variant: "full" });
}

export async function buildReportPreview(opts: {
  format?: string;
  customerCode?: string;
  fields?: string[] | string;
}): Promise<{
  ok: boolean;
  error?: string;
  subject?: string;
  html?: string;
  source?: string;
  warning?: string | null;
}> {
  try {
    const raw = (opts.format || "ams-full").toLowerCase();
    const format: ReportFormat =
      raw === "day-end" ||
      raw === "period-end" ||
      raw === "estate" ||
      raw === "custom-pack" ||
      raw === "ams-full" ||
      raw === "ams-weekly" ||
      raw === "ams-monthly" ||
      raw === "rmm-service" ||
      raw === "rmm-availability" ||
      raw === "rmm-patch" ||
      raw === "rmm-capacity" ||
      raw === "services-cover"
        ? (raw as ReportFormat)
        : "ams-full";

    let portfolio: PortfolioPayload;
    try {
      portfolio = await loadPortfolioForReport();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: "Could not load portfolio: " + msg };
    }

    if (format === "estate") {
      try {
        const pack = buildPortfolioAmsHtml(portfolio);
        return {
          ok: true,
          subject: pack.subject,
          html: pack.html,
          source: portfolio.summary?.dataMode ?? "demo",
          warning: null,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const pack = fallbackReportPack("estate", null, msg);
        return {
          ok: true,
          subject: pack.subject,
          html: pack.html,
          source: "fallback",
          warning: msg,
        };
      }
    }

    const code = (opts.customerCode || "").trim();
    if (!code) {
      return { ok: false, error: "Select a customer (or wait for the list to load)." };
    }

    let loaded: Awaited<ReturnType<typeof loadCustomerForReport>>;
    try {
      loaded = await loadCustomerForReport(code);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: "Could not load customer " + code + ": " + msg };
    }

    if (!loaded.customer) {
      return {
        ok: false,
        error:
          "Customer not found: " +
          code +
          (loaded.warning ? " — " + loaded.warning : "") +
          ". Check Dim_Customer is Active and collect has run.",
      };
    }

    try {
      const fields = resolveFieldIds(opts.fields);
      const pack = buildPack(format, loaded.customer, portfolio, fields);
      if (!pack?.html) throw new Error("Report builder returned empty HTML");
      return {
        ok: true,
        subject: pack.subject,
        html: pack.html,
        source: loaded.source,
        warning: loaded.warning,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[rpm-assure] buildReportPreview buildPack failed:", msg);
      const pack = fallbackReportPack(format, loaded.customer, msg);
      return {
        ok: true,
        subject: pack.subject,
        html: pack.html,
        source: loaded.source,
        warning: "Builder error (fallback pack): " + msg,
      };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rpm-assure] buildReportPreview failed:", msg);
    return { ok: false, error: "Preview failed: " + msg };
  }
}
