import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { RequireAuth } from "@/components/portfolio/require-auth";
import { AppShell } from "@/components/portfolio/app-shell";
import { RagBadge } from "@/components/portfolio/rag-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomerWorkspaceNav } from "@/components/nav/customer-workspace-nav";
import { CustomerMasterRail } from "@/components/nav/customer-master-rail";
import { useStaffProfile } from "@/lib/auth/use-staff-profile";
import { fetchCustomerDetail } from "@/lib/data/portfolio";
import type { CustomerDetailPayload, HealthRag } from "@/lib/data/types";
import { useCustomerList } from "@/lib/nav/customer-list-context";
import { useRouterState } from "@tanstack/react-router";

function decodeCode(raw: string): string {
  let s = String(raw ?? "").trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep */
  }
  return s.trim();
}

/** Keep left rail RAG in lockstep with the customer header (all customers). */
function SyncRailHealth({
  code,
  healthRag,
  name,
}: {
  code: string;
  healthRag: HealthRag;
  name: string;
}) {
  const { customers, setCustomers } = useCustomerList();
  useEffect(() => {
    const u = code.toUpperCase();
    const row = customers.find((c) => c.code.toUpperCase() === u);
    if (!row || row.healthRag === healthRag) return;
    setCustomers(
      customers.map((c) =>
        c.code.toUpperCase() === u ? { ...c, healthRag, name: name || c.name } : c,
      ),
    );
  }, [code, healthRag, name, customers, setCustomers]);
  return null;
}

export const Route = createFileRoute("/customers/$code")({
  // Keep parent loader warm so pillar/module clicks do not re-hit SQL every time
  staleTime: 180_000,
  preloadStaleTime: 180_000,
  // Prefer cached parent when only the child segment changes
  shouldReload: false,
  loader: async ({ params }) => {
    const code = decodeCode(params.code);
    const detail = await fetchCustomerDetail({ data: { code, legs: ["shell"] } });
    // Soft-fail: never throw notFound — that nests a second AppShell under RMM/Cove tabs
    if (!detail) {
      const soft: CustomerDetailPayload & { _missing: true; code: string } = {
        _missing: true as const,
        code,
        dataMode: "demo" as const,
        customer: {
          customerCode: code,
          displayName: code,
          active: true,
          sqlInstanceName: null,
          asOfDate: null,
          healthRag: "Amber" as const,
          healthSummary: "Customer code not resolved in SQL or demo portfolio.",
          activeUserCount: 0,
          operatorCount: 0,
          sysproJobErrorCount: 0,
          sysproDtrVarianceLines: 0,
          lastImportAt: null,
          reportingPeriod: null,
        },
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
        sqlBackups: [],
        sqlBackupFailures: [],
        sysproVersion: null,
        sysproHotfixes: [],
        hotfixGap: [],
        hotfixGapSummary: null,
        operationalAssurance: {
          collectAgeHours: null,
          collectFresh: false,
          jobErrorCount: 0,
          activeUserRatioPct: null,
          dtrOutOfBalance: 0,
          scorePct: 0,
          summary: "Customer not resolved.",
        },
        extraSummary: {
          auditCount: 0,
          diagCount: 0,
          sqlHealthCount: 0,
          sqlHealthFailCount: 0,
          lastAuditImport: null,
        },
        cover: { syspro: false, rmm: false, cove: false, epp: false, csp: false },
        rmm: {
          enabled: false,
          pillarOn: false,
          pulsewayOrgName: null,
          summary: null,
          devices: [],
          alerts: [],
          mapping: [],
          message:
            "Could not load this customer from central SQL. Check Dim_Customer.CustomerCode matches the URL (e.g. AHIC not display name), then refresh.",
        },
        cove: {
          enabled: false,
          summary: null,
          devices: [],
          mapping: [],
          unmapped: [],
          message: null,
        },
        epp: {
          enabled: false,
          summary: null,
          devices: [],
          message: null,
          license: null,
        },
      };
      return soft;
    }
    return detail;
  },
  component: CustomerLayout,
});

function CustomerLayout() {
  const data = Route.useLoaderData() as Awaited<
    ReturnType<typeof fetchCustomerDetail>
  > & { _missing?: boolean; code?: string };
  const customer = data?.customer;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile } = useStaffProfile();

  if (!customer) {
    return (
      <RequireAuth>
        <AppShell title="Customer">
          <p className="text-sm text-muted">
            Customer data is not available. Try refresh.
          </p>
          <Button asChild className="mt-4" variant="secondary">
            <Link to="/">Back to Exco Insight</Link>
          </Button>
        </AppShell>
      </RequireAuth>
    );
  }

  const codes = profile?.allowedCustomerCodes;
  if (codes && codes.length > 0) {
    const ok = codes.some(
      (c) => c.toUpperCase() === customer.customerCode.toUpperCase(),
    );
    if (!ok) {
      return (
        <RequireAuth>
          <AppShell title="Not permitted">
            <p className="text-sm text-muted">
              Your role does not include customer {customer.customerCode}.
            </p>
            <Button asChild className="mt-4" variant="secondary">
              <Link to="/">Back to Exco Insight</Link>
            </Button>
          </AppShell>
        </RequireAuth>
      );
    }
  }

  const pathBits = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  let pageTitle = "Customer Ecosystem";
  if (pathBits.length === 2) {
    pageTitle = "Customer Ecosystem";
  } else if (pathBits[2] === "syspro" && pathBits.length === 3) {
    pageTitle = "SYSPRO Deployment";
  } else if (pathBits[2] === "syspro" && pathBits[3]) {
    const map: Record<string, string> = {
      health: "Health",
      operators: "Operators",
      jobs: "Jobs",
      "day-end": "Day end",
      dtr: "FinSight · control recons",
      security: "Security",
      license: "License",
      hotfixes: "Hotfixes",
      sql: "SQL platform",
    };
    pageTitle = `SYSPRO Deployment · ${map[pathBits[3]] || pathBits[3]}`;
  } else if (pathBits[2] === "rmm" && pathBits.length === 3) {
    pageTitle = "RPM Remote Management";
  } else if (pathBits[2] === "rmm" && pathBits[3]) {
    const map: Record<string, string> = {
      devices: "Servers",
      workstations: "Workstations",
      patch: "Server Patch Management",
      alerts: "Server Alerts",
    };
    pageTitle = `RPM Remote Management · ${map[pathBits[3]] || pathBits[3]}`;
  } else if (pathBits[2] === "cove" && pathBits.length === 3) {
    pageTitle = "RPM Cloud Backup";
  } else if (pathBits[2] === "cove" && pathBits[3]) {
    const map: Record<string, string> = {
      overview: "Devices on Cloud Backup",
      devices: "Devices on Cloud Backup",
      recovery: "Backup Recovery Testing",
      retention: "Retention policies",
    };
    pageTitle = `RPM Cloud Backup · ${map[pathBits[3]] || pathBits[3]}`;
  } else if (pathBits[2] === "epp") {
    const map: Record<string, string> = {
      endpoints: "Endpoints",
      incidents: "Incidents",
      modules: "Policies",
      quarantine: "Quarantine",
    };
    pageTitle =
      pathBits.length === 3
        ? "RPM End Point Protection · Overview"
        : `RPM End Point Protection · ${map[pathBits[3]] || pathBits[3]}`;
  } else if (pathBits[2] === "csp") {
    const map: Record<string, string> = {
      users: "Licensed users",
      licenses: "License stats",
      "secure-score": "Secure Score",
      "global-admins": "Global Admins",
      mfa: "MFA registration",
    };
    pageTitle =
      pathBits.length === 3
        ? "Microsoft 365 Tenant · Tenant health"
        : `Microsoft 365 Tenant · ${map[pathBits[3]] || pathBits[3]}`;
  } else if (pathBits[2] === "ams" && pathBits.length === 3) {
    pageTitle = "RPM Assure pack";
  } else if (pathBits[2] === "ams" && pathBits[3]) {
    const map: Record<string, string> = {
      incidents: "Incidents & problems",
      risks: "Risks & issues",
      sla: "SLA",
    };
    pageTitle = `RPM Assure · ${map[pathBits[3]] || pathBits[3]}`;
  }

  const missing = Boolean((data as { _missing?: boolean })?._missing);

  return (
    <RequireAuth>
      <AppShell title={customer.displayName} subtitle={pageTitle}>
        {/* D3 master–detail: left customer rail · right inspector */}
        <div className="rpma-d3-workspace">
          <SyncRailHealth
            code={customer.customerCode}
            healthRag={customer.healthRag}
            name={customer.displayName}
          />
          <CustomerMasterRail currentCode={customer.customerCode} />

          <div className="rpma-d3-detail min-w-0">
            <div className="rpma-d3-detail-head mb-2 flex flex-wrap items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[12px]">
                <Link to="/">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Exco
                </Link>
              </Button>
              <h2 className="text-[15px] font-bold tracking-tight text-fg sm:text-base">
                {customer.displayName}
              </h2>
              <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted">
                {customer.customerCode}
              </span>
              <RagBadge rag={customer.healthRag} title={customer.healthSummary} />
              <Badge
                variant={
                  data.dataMode === "demo" || missing ? "amber" : "green"
                }
              >
                {missing
                  ? "Unresolved"
                  : data.dataMode === "demo"
                    ? "Demo data"
                    : "Live SQL"}
              </Badge>
              {customer.lastImportAt ? (
                <span className="text-[11px] text-muted">
                  Last collect{" "}
                  {new Date(customer.lastImportAt).toLocaleString("en-ZA", {
                    hour12: false,
                  })}
                </span>
              ) : null}
            </div>

            {missing ? (
              <div className="mb-3 rounded-lg border border-rag-amber/40 bg-rag-amber-bg/40 px-3 py-2.5 text-[13px] text-fg">
                <p className="font-semibold">Customer code not resolved</p>
                <p className="mt-1 text-muted">
                  URL code{" "}
                  <span className="font-mono">{customer.customerCode}</span> was
                  not found in Dim_Customer / portfolio. Use the customer{" "}
                  <strong>code</strong> (e.g.{" "}
                  <span className="font-mono">AHIC</span>), not the display name.
                </p>
              </div>
            ) : null}

            <div className="rpma-customer-workspace space-y-3">
              <CustomerWorkspaceNav
                code={customer.customerCode}
                cover={data.cover ?? customer.cover}
                modulesOnly
                flags={{
                  ...(customer.sysproDtrVarianceLines > 0
                    ? { dtr: { tone: "amber" as const, count: customer.sysproDtrVarianceLines } }
                    : {}),
                  ...(customer.sysproJobErrorCount > 0
                    ? { jobs: { tone: "red" as const, count: customer.sysproJobErrorCount } }
                    : {}),
                  ...(data.dayEnd &&
                  (data.dayEnd.status === "failed" || data.dayEnd.status === "skipped")
                    ? { "day-end": { tone: "red" as const } }
                    : {}),
                  ...(customer.healthRag === "Red"
                    ? { health: { tone: "red" as const } }
                    : customer.healthRag === "Amber"
                      ? { health: { tone: "amber" as const } }
                      : {}),
                  ...((customer.pulsewayCriticalAlerts ?? 0) > 0
                    ? { alerts: { tone: "red" as const, count: customer.pulsewayCriticalAlerts } }
                    : {}),
                  ...((customer.pulsewayOfflineCount ?? 0) > 0
                    ? { devices: { tone: "amber" as const, count: customer.pulsewayOfflineCount } }
                    : {}),
                  ...((customer.coveFailedDeviceCount ?? 0) > 0
                    ? { devices: { tone: "red" as const, count: customer.coveFailedDeviceCount } }
                    : {}),
                  ...((data.risks?.filter((r) => r.status !== "closed").length ?? 0) > 0
                    ? {
                        risks: {
                          tone: "amber" as const,
                          count: data.risks.filter((r) => r.status !== "closed").length,
                        },
                      }
                    : {}),
                  ...((data.extraSummary?.sqlHealthFailCount ?? 0) > 0
                    ? { sql: { tone: "red" as const, count: data.extraSummary.sqlHealthFailCount } }
                    : {}),
                }}
              />
              <div className="rpma-saas-customer-body rpma-d3-detail-body min-w-0">
                <Outlet />
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
