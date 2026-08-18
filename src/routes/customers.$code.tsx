import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { RequireAuth } from "@/components/portfolio/require-auth";
import { AppShell } from "@/components/portfolio/app-shell";
import { Button } from "@/components/ui/button";
import { ClassicTenantShell } from "@/components/customer/classic-tenant-nav";
import { useStaffProfile } from "@/lib/auth/use-staff-profile";
import { fetchCustomerDetail } from "@/lib/data/portfolio";
import { customerLiveStatus } from "@/lib/data/live-status";
import { noCoverForDevicesLabel } from "@/lib/data/device-cover";
import { coverFromDetail } from "@/lib/data/cover";
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
  staleTime: 60_000,
  preloadStaleTime: 30_000,
  shouldReload: true,
  loader: async ({ params }) => {
    const code = decodeCode(params.code);
    const detail = await fetchCustomerDetail({
      data: { code, legs: ["shell", "syspro", "ams", "rmm", "cove", "epp", "csp"] },
    });
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

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [pathname]);

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

  const missing = Boolean((data as { _missing?: boolean })?._missing);
  const pageCover = coverFromDetail(data);
  const live = customerLiveStatus(
    customer.customerCode,
    customer,
    pageCover,
    data,
  );
  const tenantRag: HealthRag =
    live.pillars.eco.rag === "Off" ? "Green" : live.pillars.eco.rag;
  const noDeviceCover = noCoverForDevicesLabel(pathname, customer, data);

  return (
    <RequireAuth>
      <AppShell>
        <div className="rpma-amx-workspace">
          <SyncRailHealth
            code={customer.customerCode}
            healthRag={tenantRag}
            name={customer.displayName}
          />
          <ClassicTenantShell
            code={customer.customerCode}
            cover={pageCover}
            live={live}
          >
            {missing ? (
              <div className="mb-3 rounded-lg border border-rag-amber/40 bg-rag-amber-bg/40 px-3 py-2.5 text-[13px] text-fg">
                <p className="font-semibold">Customer code not resolved</p>
                <p className="mt-1 text-muted">
                  URL code <span className="font-mono">{customer.customerCode}</span> was not found.
                </p>
              </div>
            ) : null}
            {noDeviceCover ? (
              <p className="rpma-pane-nocover mb-2">{noDeviceCover}</p>
            ) : null}
            <Outlet />
          </ClassicTenantShell>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
