/**
 * Site information architecture (sketch-aligned).
 *
 * Tree shape:
 *   Assure App (Exco Insight / portfolio)
 *   Reports
 *   Configuration (settings)
 *   Customers (per customer)
 *     ├─ Brief
 *     ├─ SYSPRO → FinSight, License, Hotfixes, …
 *     ├─ RMM → device stats, patch, …
 *     ├─ Backup → device stats, recovery, …
 *     ├─ EPP → incidents, quarantine, …
 *     ├─ CSP → tenant health, licenses, …
 *     └─ RPM Assure pack → incidents, SLA
 */

import {
  TWO_FACTOR_ENABLED,
  USER_ACCOUNTS_ENABLED,
  USER_PROFILE_ENABLED,
} from "@/lib/auth/features";

export type NavAudience = "exco" | "ops" | "tech" | "admin";

export type NavNode = {
  id: string;
  label: string;
  /** Short ExCo-friendly blurb */
  blurb?: string;
  href?: string;
  /** Path match: exact or prefix */
  match?: "exact" | "prefix";
  audience?: NavAudience;
  /** Show badge key from customer metrics */
  badge?: "rag" | "jobs" | "dtr" | "stale";
  children?: NavNode[];
};

/** Build customer subtree for a given customer code */
export function customerTree(code: string, displayName: string): NavNode {
  const base = `/customers/${encodeURIComponent(code)}`;
  return {
    id: `cust-${code}`,
    label: displayName,
    href: base,
    match: "prefix",
    audience: "exco",
    badge: "rag",
    children: [
      {
        id: `${code}-exec`,
        label: "Customer Ecosystem",
        blurb: "Health, risks, decisions — board level",
        href: base,
        match: "exact",
        audience: "exco",
      },
      {
        id: `${code}-syspro`,
        label: "SYSPRO Deployment",
        blurb: "ERP technical health",
        href: `${base}/syspro`,
        match: "prefix",
        audience: "ops",
        children: [
          {
            id: `${code}-syspro-health`,
            label: "Health",
            blurb: "RAG, health log, assurance score",
            href: `${base}/syspro/health`,
            match: "exact",
            audience: "tech",
          },
          {
            id: `${code}-syspro-operators`,
            label: "Operators",
            blurb: "Users, logins, activity",
            href: `${base}/syspro/operators`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-syspro-jobs`,
            label: "Jobs",
            blurb: "Job logging & program errors",
            href: `${base}/syspro/jobs`,
            match: "exact",
            audience: "tech",
            badge: "jobs",
          },
          {
            id: `${code}-syspro-dtr`,
            label: "FinSight",
            blurb: "Control account recons — sub-ledger vs GL (INV, AP, AR, WIP)",
            href: `${base}/syspro/dtr`,
            match: "exact",
            audience: "tech",
            badge: "dtr",
          },
          {
            id: `${code}-syspro-security`,
            label: "Security",
            blurb: "Groups, amends, audit, diag",
            href: `${base}/syspro/security`,
            match: "exact",
            audience: "tech",
          },
          {
            id: `${code}-syspro-license`,
            label: "License",
            blurb: "Product, seats, expiry",
            href: `${base}/syspro/license`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-syspro-hotfixes`,
            label: "Patches",
            blurb: "Installed KBs & gap analysis",
            href: `${base}/syspro/hotfixes`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-syspro-sql`,
            label: "SQL",
            blurb: "Backups, SQL health checks",
            href: `${base}/syspro/sql`,
            match: "exact",
            audience: "tech",
          },
          {
            id: `${code}-syspro-sla`,
            label: "Service SLA",
            blurb: "SYSPRO + AMS contract clocks",
            href: `${base}/syspro/sla`,
            match: "exact",
            audience: "ops",
          },
        ],
      },
      {
        id: `${code}-rmm`,
        label: "RPM Remote Management",
        blurb: "Devices, alerts, estate health",
        href: `${base}/rmm/devices`,
        match: "prefix",
        audience: "ops",
        children: [
          {
            id: `${code}-rmm-devices`,
            label: "Servers",
            blurb: "Servers under management",
            href: `${base}/rmm/devices`,
            match: "exact",
            audience: "tech",
          },
          {
            id: `${code}-rmm-workstations`,
            label: "Workstations",
            blurb: "Desktops, laptops, notebooks",
            href: `${base}/rmm/workstations`,
            match: "exact",
            audience: "tech",
          },
          {
            id: `${code}-rmm-patch`,
            label: "Server Patch Management",
            blurb: "Outstanding patches — servers and workstations",

            href: `${base}/rmm/patch`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-rmm-alerts`,
            label: "Server Alerts",
            blurb: "Critical & elevated server notifications",
            href: `${base}/rmm/alerts`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-rmm-iops`,
            label: "Disk IOPS",
            blurb: "PowerShell disk performance counters via the Assure agent",
            href: `${base}/rmm/iops`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-rmm-events`,
            label: "Event Logs",
            blurb: "Windows Critical / Error — click to read",
            href: `${base}/rmm/events`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-rmm-sla`,
            label: "Service SLA",
            blurb: "Uptime 99.9% · agent coverage · MTTR clocks",
            href: `${base}/rmm/sla`,
            match: "exact",
            audience: "ops",
          },
        ],
      },
      {
        id: `${code}-cove`,
        label: "RPM Cloud Backup",
        blurb: "Cove devices, status, recovery",
        href: `${base}/cove`,
        match: "prefix",
        audience: "ops",
        children: [
          {
            id: `${code}-cove-devices`,
            label: "Devices on Cloud Backup",
            blurb: "OK / stale / overdue · backup size",
            href: `${base}/cove/devices`,
            match: "exact",
            audience: "tech",
          },
          {
            id: `${code}-cove-recovery`,
            label: "Backup Recovery Testing",
            blurb: "Restore / recovery test results",
            href: `${base}/cove/recovery`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-cove-retention`,
            label: "Retention policies",
            blurb: "Policy name, profile, retention periods",
            href: `${base}/cove/retention`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-cove-sla`,
            label: "Service SLA",
            blurb: "Backup success · 24h RPO · restore tests",
            href: `${base}/cove/sla`,
            match: "exact",
            audience: "ops",
          },
        ],
      },

      {
        id: `${code}-epp`,
        label: "RPM EPP",
        blurb: "RPM EPP — devices, incidents, quarantine",
        href: `${base}/epp`,
        match: "prefix",
        audience: "ops",
        children: [
          {
            id: `${code}-epp-overview`,
            label: "Overview",
            blurb: "Protected estate overview",
            href: `${base}/epp`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-epp-endpoints`,
            label: "Endpoints",
            blurb: "Managed devices and policies",
            href: `${base}/epp/endpoints`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-epp-modules`,
            label: "Policies",
            blurb: "Security policy assignment",
            href: `${base}/epp/modules`,
            match: "exact",
            audience: "tech",
          },
          {
            id: `${code}-epp-incidents`,
            label: "Incidents",
            blurb: "RPM EPP security incidents",
            href: `${base}/epp/incidents`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-epp-quarantine`,
            label: "Quarantine",
            blurb: "Quarantined files and threats",
            href: `${base}/epp/quarantine`,
            match: "exact",
            audience: "tech",
          },
          {
            id: `${code}-epp-sla`,
            label: "Service SLA",
            blurb: "Coverage 98% · updates · threat clocks",
            href: `${base}/epp/sla`,
            match: "exact",
            audience: "ops",
          },
        ],
      },
      {
        id: `${code}-csp`,
        label: "Microsoft 365 Tenant",
        blurb: "Tenant health, seats, licensed users",
        href: `${base}/csp`,
        match: "prefix",
        audience: "ops",
        children: [
          {
            id: `${code}-csp-overview`,
            label: "Tenant health",
            blurb: "Domain, health score, module overview",
            href: `${base}/csp`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-csp-secure-score`,
            label: "Secure Score",
            blurb: "Microsoft Secure Score current vs max",
            href: `${base}/csp/secure-score`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-csp-global-admins`,
            label: "Global Admins",
            blurb: "Named Global Administrator accounts",
            href: `${base}/csp/global-admins`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-csp-mfa`,
            label: "MFA registration",
            blurb: "MFA registered vs capable users",
            href: `${base}/csp/mfa`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-csp-users`,
            label: "Licensed users",
            blurb: "Directory users and assigned SKUs",
            href: `${base}/csp/users`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-csp-licenses`,
            label: "License stats",
            blurb: "Purchased vs assigned by product",
            href: `${base}/csp/licenses`,
            match: "exact",
            audience: "ops",
          },
        ],
      },
      {
        id: `${code}-tickets`,
        label: "Customer Tickets",
        blurb: "Freshdesk open, resolved and closed tickets",
        href: `${base}/tickets`,
        match: "prefix",
        audience: "ops",
        children: [
          {
            id: `${code}-tickets-open`,
            label: "Open Tickets",
            blurb: "New and in-progress Freshdesk tickets",
            href: `${base}/tickets/open`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-tickets-resolved`,
            label: "Resolved Tickets",
            blurb: "Resolved, awaiting close",
            href: `${base}/tickets/resolved`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-tickets-closed`,
            label: "Closed Tickets",
            blurb: "Closed Freshdesk tickets",
            href: `${base}/tickets/closed`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-tickets-sla`,
            label: "Service SLA",
            blurb: "Ticket response and restore clocks",
            href: `${base}/tickets/sla`,
            match: "exact",
            audience: "ops",
          },
        ],
      },
      {
        id: `${code}-ams`,
        label: "Customer Assurance",
        blurb: "Incidents, SLA, CSAT",
        href: `${base}/ams`,
        match: "prefix",
        audience: "exco",
        children: [
          {
            id: `${code}-ams-incidents`,
            label: "Incidents & problems",
            href: `${base}/ams/incidents`,
            match: "exact",
            audience: "ops",
          },
          {
            id: `${code}-ams-risks`,
            label: "Risks & issues",
            href: `${base}/ams/risks`,
            match: "exact",
            audience: "exco",
          },
          {
            id: `${code}-ams-sla`,
            label: "SLA & availability",
            href: `${base}/ams/sla`,
            match: "exact",
            audience: "ops",
          },
        ],
      },
    ],
  };
}

/** Settings tree — same depth style as customer SYSPRO / RPM Assure groups */
export function settingsTree(): NavNode {
  const accountChildren: NavNode[] = [];
  if (USER_PROFILE_ENABLED) {
    accountChildren.push({
      id: "set-profile",
      label: "My profile",
      blurb: "Name, password, role",
      href: "/settings/profile",
      match: "exact",
      audience: "ops",
    });
  }
  if (TWO_FACTOR_ENABLED) {
    accountChildren.push({
      id: "set-security",
      label: "Security & 2FA",
      blurb: "Authenticator app setup",
      href: "/settings/security",
      match: "exact",
      audience: "ops",
    });
  }

  const platformChildren: NavNode[] = [
    {
      id: "set-infra",
      label: "Assure Infrastructure Status",
      blurb: "Connections, APIs, and SQL-host agents",
      href: "/settings/infrastructure",
      match: "exact",
      audience: "admin",
    },
    {
      id: "set-sql",
      label: "SQL Server",
      blurb: "Central database connections",
      href: "/settings/sql",
      match: "exact",
      audience: "admin",
    },
    {
      id: "set-ssl",
      label: "SSL / HTTPS",
      blurb: "Let's Encrypt or own certificate",
      href: "/settings/ssl",
      match: "exact",
      audience: "admin",
    },
  ];
  if (USER_ACCOUNTS_ENABLED) {
    platformChildren.push({
      id: "set-users",
      label: "Users",
      blurb: "Staff accounts, roles, scope, 2FA status",
      href: "/settings/users",
      match: "exact",
      audience: "admin",
    });
  }

  const children: NavNode[] = [];
  if (accountChildren.length > 0) {
    children.push({
      id: "set-account",
      label: "My account",
      blurb: "Profile and two-factor authentication",
      href: accountChildren[0]!.href,
      match: "prefix",
      audience: "ops",
      children: accountChildren,
    });
  }

  children.push(
    {
      id: "set-platform",
      label: "Platform",
      blurb: "Connectivity and staff access",
      href: "/settings/sql",
      match: "prefix",
      audience: "admin",
      children: platformChildren,
    },
    {
      id: "set-assurance",
      label: "Assurance",
      blurb: "KPI surface, RAG, alerts, collect",
      href: "/settings/dashboard",
      match: "prefix",
      audience: "admin",
      children: [
        {
          id: "set-dashboard",
          label: "Dashboard Configuration",
          blurb: "Which panels show on Exco / customer",
          href: "/settings/dashboard",
          match: "exact",
          audience: "admin",
        },
        {
          id: "set-chrome",
          label: "Menu style",
          blurb: "Choose selected-tab and nav highlight",
          href: "/settings/chrome",
          match: "exact",
          audience: "admin",
        },
        {
          id: "set-theme",
          label: "Theme tokens",
          blurb: "CSS variables, light/dark, palettes",
          href: "/settings/theme",
          match: "exact",
          audience: "admin",
        },
        {
          id: "set-pack",
          label: "Download install pack",
          blurb: "ZIP and one-shot for the APP server",
          href: "/pack",
          match: "exact",
          audience: "admin",
        },
        {
          id: "set-uilab",
          label: "Choose new UI",
          blurb: "Six full-app visual directions",
          href: "/ui-lab",
          match: "exact",
          audience: "admin",
        },
        {
          id: "set-labels",
          label: "UI Labels",
          blurb: "Rename modules and cover chips",
          href: "/settings/labels",
          match: "exact",
          audience: "admin",
        },
        {
          id: "set-rag",
          label: "RAG thresholds",
          blurb: "Red / Amber / Green rules",
          href: "/settings/rag",
          match: "exact",
          audience: "admin",
        },
        {
          id: "set-alerts",
          label: "Alerts",
          blurb: "In-app rules for health & stale collect",
          href: "/settings/alerts",
          match: "exact",
          audience: "admin",
        },
        {
          id: "set-collect",
          label: "Collect inventory",
          blurb: "Last import per customer / instance",
          href: "/settings/collect",
          match: "exact",
          audience: "admin",
        },
        {
          id: "set-reports-sched",
          label: "Report schedules",
          blurb: "On-screen weekly & monthly packs",
          href: "/settings/reports",
          match: "exact",
          audience: "admin",
        },
      ],
    },
    {
      id: "set-tools",
      label: "Tools",
      blurb: "Diagnostics and change history",
      href: "/settings/query",
      match: "prefix",
      audience: "admin",
      children: [
        {
          id: "set-query",
          label: "SQL Query",
          blurb: "Read-only explorer",
          href: "/settings/query",
          match: "exact",
          audience: "admin",
        },
        {
          id: "set-audit",
          label: "Audit log",
          blurb: "Who changed platform settings",
          href: "/settings/audit",
          match: "exact",
          audience: "admin",
        },
      ],
    },
    {
      id: "set-about",
      label: "About",
      blurb: "Product notes and roadmap",
      href: "/settings/about",
      match: "exact",
      audience: "admin",
    },
  );

  return {
    id: "settings-root",
    label: "Configuration",
    href: "/settings/infrastructure",
    match: "prefix",
    audience: "admin",
    children,
  };
}

/** Flat list of leaf settings links (for simple menus if needed) */
export function settingsLeafLinks(): NavNode[] {
  const root = settingsTree();
  const out: NavNode[] = [];
  function walk(nodes: NavNode[]) {
    for (const n of nodes) {
      if (n.children?.length) walk(n.children);
      else if (n.href) out.push(n);
    }
  }
  walk(root.children ?? []);
  return out;
}

export function isNavActive(pathname: string, node: NavNode): boolean {
  if (!node.href) return false;
  if (node.match === "exact") {
    return pathname === node.href || pathname === node.href + "/";
  }
  if (node.match === "prefix") {
    if (pathname === node.href || pathname === node.href + "/") return true;
    // avoid /customers/AHIC matching /customers/AHIC2
    return pathname.startsWith(node.href + "/");
  }
  return pathname === node.href;
}

export function findActiveTrail(
  pathname: string,
  nodes: NavNode[],
  trail: NavNode[] = [],
): NavNode[] | null {
  for (const n of nodes) {
    const next = [...trail, n];
    if (n.children?.length) {
      const hit = findActiveTrail(pathname, n.children, next);
      if (hit) return hit;
    }
    if (isNavActive(pathname, n)) return next;
  }
  return null;
}
