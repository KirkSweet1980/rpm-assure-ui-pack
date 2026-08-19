import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DensityToggle } from "@/components/portfolio/density-toggle";
import { ThemeToggle } from "@/components/portfolio/theme-toggle";
import { DkSidebarNav } from "@/components/nav/dk-sidebar-nav";
import { UserButton } from "@/lib/auth/gates";
import { fetchPortfolio } from "@/lib/data/portfolio";
import { VisionAssistant } from "@/components/vision/vision-assistant";
import { PageRevWait } from "@/components/nav/page-rev-wait";
import {
  readClientPortfolioCache,
  writeClientPortfolioCache,
} from "@/lib/data/client-portfolio-cache";
import { useIdleLogout } from "@/lib/auth/idle-logout";
import { useStaffProfile } from "@/lib/auth/use-staff-profile";
import {
  rememberRecentCustomer,
  type SwitcherCustomer,
} from "@/components/nav/customer-switcher";
import { scrollChromeToTop } from "@/lib/nav/scroll-chrome";
import {
  CustomerListProvider,
  sortMasterCustomers,
  type MasterCustomer,
} from "@/lib/nav/customer-list-context";
import { inferCustomerCover } from "@/lib/data/cover";
import { cn } from "@/lib/utils";

/**
 * App shell — D3 top navigation (navy chrome) + shared customer list for master–detail.
 */
export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const [masterCustomers, setMasterCustomers] = useState<MasterCustomer[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile } = useStaffProfile();
  useIdleLogout();

  const currentCustomerCode = useMemo(() => {
    const m = pathname.match(/^\/customers\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }, [pathname]);

  useEffect(() => {
    if (currentCustomerCode) rememberRecentCustomer(currentCustomerCode);
  }, [currentCustomerCode]);

  useEffect(() => {
    requestAnimationFrame(scrollChromeToTop);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    function mapRows(
      p: Awaited<ReturnType<typeof fetchPortfolio>> | null | undefined,
    ): MasterCustomer[] {
      if (!p) return [];
      const boards = p.exco?.boards ?? [];
      const boardBy = new Map(
        boards.map((b) => [b.customerCode.toUpperCase(), b] as const),
      );
      let rows = p.customers ?? p.rows ?? [];
      const allowed = profile?.allowedCustomerCodes;
      if (allowed && allowed.length > 0) {
        const set = new Set(allowed.map((c) => c.toUpperCase()));
        rows = rows.filter((r) => set.has(r.customerCode.toUpperCase()));
      }
      const mapped = rows
        .filter(
          (r) =>
            Boolean(r.sqlInstanceName && String(r.sqlInstanceName).trim()) ||
            (r.operatorCount ?? 0) > 0 ||
            (r.pulsewayDeviceCount ?? 0) > 0 ||
            (r.pulsewayOfflineCount ?? 0) > 0 ||
            Boolean(r.pulsewayOrgName && String(r.pulsewayOrgName).trim()) ||
            (r.coveDeviceCount ?? 0) > 0 ||
            (r.eppDeviceCount ?? 0) > 0 ||
            (r.cspUserCount ?? 0) > 0 ||
            r.cover?.syspro ||
            r.cover?.rmm ||
            r.cover?.cove ||
            r.cover?.epp ||
            r.cover?.csp,
        )
        .map((r) => {
          const b = boardBy.get(r.customerCode.toUpperCase());
          const cover = inferCustomerCover({
              pillarSyspro: r.pillarSyspro,
              pillarPulseway: r.pillarPulseway,
              pillarCove: r.pillarCove,
              pillarEpp: r.pillarEpp,
              pillarCsp: r.pillarCsp,
              sqlInstanceName: r.sqlInstanceName,
              operatorCount: r.operatorCount,
              activeUserCount: r.activeUserCount,
              sysproLastImportAt: r.lastImportAt,
              sysproJobErrorCount: r.sysproJobErrorCount,
              sysproDtrVarianceLines: r.sysproDtrVarianceLines,
              pulsewayOrgName: r.pulsewayOrgName,
              pulsewayDeviceCount: r.pulsewayDeviceCount,
              coveDeviceCount: r.coveDeviceCount,
              eppDeviceCount: r.eppDeviceCount,
              cspUserCount: r.cspUserCount,
              cspLicenseCount: r.cspLicenseSkuCount,
            });
          return {
            code: r.customerCode,
            name: (r.displayName || r.customerCode).trim(),
            healthRag: (() => {
              if (r.healthRag === "Off") return "Off";
              const sla = b?.slaOverallPct;
              const slaRag =
                sla == null
                  ? null
                  : sla < 55
                    ? "Red"
                    : sla < 80
                      ? "Amber"
                      : "Green";
              if (slaRag === "Red" || r.healthRag === "Red") return "Red";
              if (slaRag === "Amber" || r.healthRag === "Amber") return "Amber";
              return r.healthRag;
            })(),
            needsAttention:
              r.healthRag !== "Off" &&
              ((b?.attentionReasons?.length ?? 0) > 0 || r.healthRag !== "Green"),
            collectFresh: b?.collectFresh ?? !!r.lastImportAt,
            cover,
            jobErrorCount: r.sysproJobErrorCount,
            dtrVarianceLines: r.sysproDtrVarianceLines,
            pulsewayOfflineCount: r.pulsewayOfflineCount,
          } satisfies MasterCustomer;
        });
      return sortMasterCustomers(mapped);
    }

    const cached = readClientPortfolioCache();
    if (cached) {
      setMasterCustomers(mapRows(cached));
      setListLoading(false);
    }

    void fetchPortfolio()
      .then((p) => {
        if (cancelled) return;
        writeClientPortfolioCache(p);
        setMasterCustomers(mapRows(p));
        setListLoading(false);
      })
      .catch(() => {
        if (!cancelled) setListLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.allowedCustomerCodes]);

  const switcherCustomers: SwitcherCustomer[] = useMemo(
    () =>
      masterCustomers.map((c) => ({
        code: c.code,
        name: c.name,
        healthRag: c.healthRag,
        needsAttention: c.needsAttention,
        collectFresh: c.collectFresh,
      })),
    [masterCustomers],
  );

  const listValue = useMemo(
    () => ({
      customers: masterCustomers,
      setCustomers: setMasterCustomers,
      loading: listLoading,
    }),
    [masterCustomers, listLoading],
  );

  const [menuOpen, setMenuOpen] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setMenuOpen(false);
    }
  }, [pathname]);

  return (
    <CustomerListProvider value={listValue}>
      <div className={cn("dk-shell rpma-d3-shell is-topnav", menuOpen && "is-menu-open")}>
        <header className="dk-header dk-header-one">
          <div className="dk-header-row">
            <div className="dk-header-left">
              <button
                type="button"
                className={cn("dk-burger", menuOpen && "is-open")}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls="rpma-top-menu"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <span />
                <span />
                <span />
              </button>
              <Link to="/" className="dk-brand" aria-label="RPM Assure home">
                <span className="dk-brand-text">
                  <strong>RPM Assure</strong>
                </span>
              </Link>
            </div>
            <div className="dk-header-right">
              <ThemeToggle />
              <DensityToggle />
              <UserButton />
            </div>
          </div>
          <div
            id="rpma-top-menu"
            className={cn("dk-header-navrow", !menuOpen && "is-collapsed")}
          >
            <DkSidebarNav
              pathname={pathname}
              customers={switcherCustomers}
              currentCode={currentCustomerCode}
              layout="top"
            />
          </div>
        </header>
        <div className="dk-main">
          <main className="dk-content rpma-topnav-main">
            {title ? (
              <div className="dk-pagehead">
                <h1>{title}</h1>
                {subtitle ? <p>{subtitle}</p> : null}
              </div>
            ) : subtitle ? (
              <p className="dk-page-sub">{subtitle}</p>
            ) : null}
            <div className="dk-canvas rpma-topnav-canvas">{children}</div>
          </main>
        </div>
        <VisionAssistant />
        <PageRevWait />
      </div>
    </CustomerListProvider>
  );
}
