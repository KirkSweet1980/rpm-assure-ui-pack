import type { AssistantContext, AssistantLink, AssistantReply } from "./types";

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 +/#.-]+/g, " ").replace(/\s+/g, " ").trim();
}

function customerBase(ctx: AssistantContext) {
  return ctx.customerCode ? `/customers/${encodeURIComponent(ctx.customerCode)}` : null;
}

function linksForPage(ctx: AssistantContext): AssistantLink[] {
  const base = customerBase(ctx);
  if (!base) {
    return [
      { label: "Assure Eco-System", href: "/" },
      { label: "Reporting", href: "/reports" },
      { label: "Configuration", href: "/settings" },
    ];
  }
  return [
    { label: "Tenant Overview", href: base },
    { label: "Customer Assurance", href: `${base}/ams` },
    { label: "SYSPRO", href: `${base}/syspro` },
    { label: "RPM Remote Management", href: `${base}/rmm` },
    { label: "RPM Cloud Backup", href: `${base}/cove` },
    { label: "Microsoft 365 CSP", href: `${base}/csp` },
  ];
}

function pageHelp(path: string): string | null {
  if (path === "/" || path === "") {
    return "You are on Assure Eco-System. This is the executive view of all tenants: RAG, SLA, incidents and freshness. Open a customer from the tenant switcher or the left list.";
  }
  if (path.startsWith("/reports")) {
    return "Reporting builds board packs. Pick a Service (Customer Assurance Packs, FinSight Packs, RMM Reports, Assure Eco-System Packs) then a Service Module, choose a tenant if required, then Preview or Print.";
  }
  if (path.startsWith("/settings")) {
    return "Configuration is Platform Admin only. Landing page is Assure Infrastructure Status (connections and agents). Services: Platform (SQL, Certificates, Integrations), Appearance, Assurance Rules, People, Tools.";
  }
  if (/\/customers\/[^/]+\/syspro\/dtr/.test(path)) {
    return "FinSight is control-account reconciliation (sub-ledger vs GL). Tall bars are out-of-balance modules. Drill L1 → L2 → L3, then record status with finance.";
  }
  if (/\/customers\/[^/]+\/ams/.test(path)) {
    return "Customer Assurance is the managed-service pack: Incidents, Risks, SLA clocks, and Day End. Overview is visual; modules hold the registers.";
  }
  if (/\/customers\/[^/]+\/rmm/.test(path)) {
    return "RPM Remote Management is Pulseway. Overview is fleet health. Servers and workstations are separate. Patch Compliance and Alerts are the ops modules.";
  }
  if (/\/customers\/[^/]+\/cove/.test(path)) {
    return "RPM Cloud Backup is Cove. Healthy / Stale / Failed are the three states. Recovery is boot-test evidence. Retention is policy.";
  }
  if (/\/customers\/[^/]+\/epp/.test(path)) {
    return "RPM Endpoint Security is Bitdefender. Endpoints, Policies, Security Incidents and Quarantine. No Cover means the tenant is not mapped.";
  }
  if (/\/customers\/[^/]+\/csp/.test(path)) {
    return "Microsoft 365 CSP: Secure Score, Global Admins, MFA, Users, Licences. Scores are posture, not SYSPRO SLA.";
  }
  if (/\/customers\/[^/]+$/.test(path) || /\/customers\/[^/]+\/$/.test(path)) {
    return "Tenant Overview (Ecosystem) is the visual board for this customer. Green = Cover, pewter = No Cover. Open Customer Assurance or an RPM Service from the rail.";
  }
  return null;
}

export function answerLocally(question: string, ctx: AssistantContext): AssistantReply {
  const q = norm(question);
  const base = customerBase(ctx);
  const links = linksForPage(ctx);

  if (!q || q === "help" || q === "?" || q.includes("what can you") || q.includes("how do i use")) {
    return {
      source: "local",
      text:
        "Hi Avenger, how can I help?\n\nI can explain Cover, RAG, SLA and FinSight; tell you where you are; jump to a Service Module; and read the tenant snapshot on screen.\n\nTry: Why is this tenant Amber? · What is Cover? · Open FinSight · How do I print the Monthly Pack?",
      links,
    };
  }

  if (q.includes("where am i") || q.includes("what page") || q.includes("this page") || q.includes("what is this")) {
    return {
      source: "local",
      text: [pageHelp(ctx.pathname), ctx.pageTitle ? `Page title: ${ctx.pageTitle}.` : null]
        .filter(Boolean)
        .join(" "),
      links,
    };
  }

  if (q.includes("cover") && (q.includes("what") || q.includes("mean") || q.includes("no cover"))) {
    return {
      source: "local",
      text:
        "Cover means the tenant is in scope for that RPM Service and we collect data. No Cover (pewter) means it is not scored, not billed as that service, and does not move estate RAG. Green = Cover. Indigo = the selected item. Map Pulseway / Cove / Bitdefender / CSP in Configuration → Integrations, then run collect.",
      links: [{ label: "Assure Infrastructure Status", href: "/settings/infrastructure" }],
    };
  }

  if (q.includes("rag") || q.includes("red amber") || q.includes("why") && (q.includes("amber") || q.includes("red") || q.includes("green"))) {
    const bits = [
      ctx.customerName ? `${ctx.customerName} is ${ctx.healthRag ?? "unscored"}.` : "Assure Eco-System RAG is Green / Amber / Red from covered services only.",
      ctx.jobErrors ? `SYSPRO job errors: ${ctx.jobErrors}.` : null,
      ctx.finsightOob ? `FinSight out-of-balance lines: ${ctx.finsightOob}.` : null,
      ctx.rmmOffline ? `RMM servers offline: ${ctx.rmmOffline}.` : null,
      "Amber is watch. Red is breach or open critical. No Cover services do not change RAG.",
    ]
      .filter(Boolean)
      .join(" ");
    return { source: "local", text: bits, links };
  }

  if (q.includes("sla")) {
    return {
      source: "local",
      text:
        "SLA in Assure is scored per covered pillar: SYSPRO (collect freshness, job errors, FinSight), Remote Management (server online %, critical alerts — workstations excluded), Cloud Backup (healthy vs failed/stale), Endpoint Security (managed estate). Microsoft 365 CSP is posture, not this SLA. Open Customer Assurance → SLA for clocks.",
      links: base
        ? [{ label: "SLA", href: `${base}/ams/sla` }]
        : [{ label: "Assure Eco-System", href: "/" }],
    };
  }

  if (q.includes("finsight") || q.includes("out of balance") || q.includes("oob") || q.includes("dtr")) {
    return {
      source: "local",
      text:
        "FinSight is financial control integrity: sub-ledger vs GL (inventory, AR, AP, WIP, cashbook). Zero out-of-balance is good. Work the tallest module first. Day End packs surface exceptions daily; Period End is close readiness.",
      links: base
        ? [
            { label: "FinSight", href: `${base}/syspro/dtr` },
            { label: "Day End Pack", href: "/reports?format=day-end" },
          ]
        : [{ label: "FinSight Packs", href: "/reports?format=day-end" }],
    };
  }

  if (q.includes("print") || q.includes("report") || q.includes("pack") || q.includes("monthly")) {
    return {
      source: "local",
      text:
        "Reporting → Customer Assurance Packs → Monthly Pack. Select the tenant, Preview, then Print / PDF. Email schedules are off in this release. Day End and Period End live under FinSight Packs.",
      links: [
        { label: "Monthly Pack", href: "/reports?format=ams-monthly" },
        { label: "Day End Pack", href: "/reports?format=day-end" },
      ],
    };
  }

  if (q.includes("onboard") || q.includes("new customer") || q.includes("collect")) {
    return {
      source: "local",
      text:
        "Onboard on the customer SQL server with the one-shot script (Windows or SQL admin). It creates the read account, grants db_datareader, registers the tenant on central, then collect writes back. After SQL, map Pulseway / Cove / Bitdefender / CSP so Cover lights green. Configuration → Collect Inventory shows last import age.",
      links: [
        { label: "Collect Inventory", href: "/settings/collect" },
        { label: "Assure Infrastructure Status", href: "/settings/infrastructure" },
      ],
    };
  }

  const go: [RegExp, string, (b: string) => string][] = [
    [/fins ?ight|dtr/, "FinSight", (b) => `${b}/syspro/dtr`],
    [/day end|day-end/, "Day End", (b) => `${b}/syspro/day-end`],
    [/job/, "Job Logging", (b) => `${b}/syspro/jobs`],
    [/operator/, "Operators", (b) => `${b}/syspro/operators`],
    [/hotfix/, "Hotfixes", (b) => `${b}/syspro/hotfixes`],
    [/licence|license/, "Licence", (b) => `${b}/syspro/license`],
    [/server/, "Servers", (b) => `${b}/rmm/devices`],
    [/workstation/, "Workstations", (b) => `${b}/rmm/workstations`],
    [/patch/, "Patch Compliance", (b) => `${b}/rmm/patch`],
    [/alert/, "Alerts", (b) => `${b}/rmm/alerts`],
    [/backup|cove/, "RPM Cloud Backup", (b) => `${b}/cove`],
    [/endpoint|bitdefender|epp/, "RPM Endpoint Security", (b) => `${b}/epp`],
    [/secure score/, "Secure Score", (b) => `${b}/csp/secure-score`],
    [/mfa/, "MFA", (b) => `${b}/csp/mfa`],
    [/incident/, "Incidents", (b) => `${b}/ams/incidents`],
    [/risk/, "Risks", (b) => `${b}/ams/risks`],
    [/sla/, "SLA", (b) => `${b}/ams/sla`],
    [/assurance/, "Customer Assurance", (b) => `${b}/ams`],
    [/syspro/, "SYSPRO", (b) => `${b}/syspro`],
  ];

  if (q.startsWith("open ") || q.startsWith("go ") || q.startsWith("take me") || q.startsWith("show ") || q.includes("navigate")) {
    if (!base) {
      return {
        source: "local",
        text: "Select a tenant first (Customer Tenant in the top bar), then ask me to open a Service Module.",
        links: [{ label: "Assure Eco-System", href: "/" }],
      };
    }
    for (const [re, label, href] of go) {
      if (re.test(q)) {
        return {
          source: "local",
          text: `Opening ${label}.`,
          links: [{ label, href: href(base) }],
        };
      }
    }
  }

  if (q.includes("sql") && (q.includes("setting") || q.includes("connect") || q.includes("config"))) {
    return {
      source: "local",
      text: "Configuration → Platform → SQL Server holds the central Live SQL connection. Customer collect uses the read account created at onboard, not this admin login.",
      links: [{ label: "SQL Server", href: "/settings/sql" }],
    };
  }

  const snapshot = ctx.customerName
    ? [
        `${ctx.customerName} (${ctx.customerCode}) · ${ctx.healthRag ?? "—"}`,
        ctx.cover
          ? `Cover: SYSPRO ${ctx.cover.syspro ? "Yes" : "No"}, Remote Management ${ctx.cover.rmm ? "Yes" : "No"}, Cloud Backup ${ctx.cover.cove ? "Yes" : "No"}, Endpoint Security ${ctx.cover.epp ? "Yes" : "No"}, Microsoft 365 CSP ${ctx.cover.csp ? "Yes" : "No"}.`
          : null,
        pageHelp(ctx.pathname),
      ]
        .filter(Boolean)
        .join(" ")
    : pageHelp(ctx.pathname) ??
      "Ask about Cover, RAG, SLA, FinSight, onboard, or say Open FinSight after selecting a tenant.";

  return { source: "local", text: snapshot, links };
}
