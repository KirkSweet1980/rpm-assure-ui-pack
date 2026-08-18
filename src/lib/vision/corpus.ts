import type { VisionSourceId } from "@/lib/settings/types";

export type VisionChunk = {
  id: string;
  source: VisionSourceId;
  title: string;
  text: string;
  keys: string[];
};

export const VISION_CORPUS: VisionChunk[] = [
  {
    id: "sla-import",
    source: "sla",
    title: "Signed SLA import",
    keys: ["sla", "signed", "import", "contract", "provisional", "browse", "scan", "kpi"],
    text: "Cover is Provisional (orange) until a signed SLA is on file. Open Customer Eco System → SLA → Import Signed SLA. Browse for the PDF or Word file, then confirm. Custom SLA targets apply only to this customer’s covered services.",
  },
  {
    id: "sla-clocks",
    source: "sla",
    title: "Ticket clocks",
    keys: ["acknowledge", "restore", "p1", "p2", "clock", "business hours"],
    text: "Signed ticket clocks are Business Hours only: Acknowledge, Remote response, Target restoration by P1–P4. They are not uptime guarantees. Score them from Freshdesk after the contract is signed.",
  },
  {
    id: "tickets-feed",
    source: "tickets",
    title: "Service Desk feed",
    keys: ["ticket", "freshdesk", "service desk", "incident", "open", "closed"],
    text: "RPM Service Desk tickets come from Freshdesk. Map the company, then the scheduled collect (every 15 minutes) loads them. Open / Closed / Resolved sit under Customer Tickets. Every tenant has ticket Cover; an empty pane means no tickets yet, not No Cover.",
  },
  {
    id: "rmm-iops",
    source: "rmm",
    title: "IOPS collect",
    keys: ["iops", "disk", "pulseway", "counter", "queue"],
    text: "IOPS is not in the RMM REST API. Pulseway Automation must run Pulseway-Collect-DiskIops.ps1 and POST to /api/iops. The Assure agent can also collect IOPS. Recheck only refreshes devices.",
  },
  {
    id: "rmm-servers",
    source: "rmm",
    title: "RMM servers",
    keys: ["rmm", "server", "virtual", "physical", "patch", "event"],
    text: "RMM Management lists estate servers from Pulseway. Virtual vs physical icons come from the device type. Patches and event logs need their collect scripts; IOPS is a separate POST.",
  },
  {
    id: "epp-scan",
    source: "epp",
    title: "End Point Protection",
    keys: ["epp", "endpoint", "bitdefender", "scan", "policy", "module", "gravity"],
    text: "RPM End Point Protection is GravityZone. Collect pulls endpoints, last scan, policies and installed modules. Policies lists modules turned on for this customer. Last scan age is on the EPP overview.",
  },
  {
    id: "backup-cove",
    source: "backup",
    title: "Cloud Backup",
    keys: ["backup", "cove", "restore", "recovery", "bhf", "partner"],
    text: "RPM Cloud Backup devices come from the backup collect. Recovery test clocks score when a last-test time is stored. Partner maps must stamp the right CustomerCode (e.g. BHF not PCNS).",
  },
  {
    id: "syspro-agent",
    source: "syspro",
    title: "SYSPRO Landscape",
    keys: ["syspro", "finsight", "job", "company", "build", "licence"],
    text: "SYSPRO Landscape needs the Assure agent on the SYSPRO SQL host. It collects companies, build, FinSight, jobs and licence. If companies show 0, the collect did not land rows — check the agent job log on that host.",
  },
  {
    id: "cover-rag",
    source: "cover",
    title: "Cover vs RAG",
    keys: ["cover", "no cover", "rag", "red", "amber", "green", "health"],
    text: "Cover = live rows for that service. RAG is health of those rows (green / amber / red). Off + Cover still shows a green glow so the service is on. Ecosystem customise only lists covered items.",
  },
  {
    id: "agent-https",
    source: "agent",
    title: "Agent pack",
    keys: ["agent", "git", "download", "pack", "https", "deploy"],
    text: "Agents pull the pack from Assure over HTTPS — no Git on customer hosts. Publish the pack on the app server, then run Deploy-Assure-Agent.ps1 from https://assure.rpmresources.co.za/downloads/.",
  },
  {
    id: "csp-365",
    source: "csp",
    title: "Microsoft 365",
    keys: ["csp", "365", "microsoft", "tenant", "m365"],
    text: "Microsoft 365 is tenant posture only — it is never scored on the signed SYSPRO+AMS contract. Collect needs a Csp.Config.<CODE>.ps1 per tenant.",
  },
  {
    id: "howto-nav",
    source: "howto",
    title: "Where to click",
    keys: ["where", "menu", "how", "navigate", "find", "page"],
    text: "Top bar: Customer Eco-System, Customer Tenant, Reporting, Configuration. Inside a tenant the ribbon is Customer Eco System, SYSPRO Landscape, RMM Management, RPM Cloud Backup, RPM End Point Protection, RPM Service Desk. Vision is the teal button bottom-right.",
  },
];

export const SOURCE_LABEL: Record<VisionSourceId, string> = {
  sla: "SLA",
  tickets: "Service Desk",
  rmm: "RMM",
  epp: "End Point Protection",
  backup: "Cloud Backup",
  syspro: "SYSPRO",
  cover: "Cover / RAG",
  agent: "Agent",
  csp: "Microsoft 365",
  howto: "How to",
};
