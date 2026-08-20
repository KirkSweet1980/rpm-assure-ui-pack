/** In-app help. Keep topics aligned with live menus. */

export type HelpTopic = {
  id: string;
  title: string;
  group: string;
  summary: string;
  body: string[];
};

export const HELP_GROUPS = [
  "Getting started",
  "Customer workspace",
  "Services",
  "Agents",
  "SLA and tickets",
  "Configuration",
] as const;

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "overview",
    title: "What RPM Assure is",
    group: "Getting started",
    summary: "Live estate, cover, and RAG for every customer — not a ticketing console yet.",
    body: [
      "RPM Assure is the operations board for RPM-managed customers. Each tenant shows which services are on cover (SYSPRO, RMM, Cloud Backup, EPP, Microsoft 365) and the live health of those services.",
      "Grey / Off / No Cover means that service is not contracted. It stays on the menu so you can see the gap. It must not flash and it must not score SLA.",
      "Green, Amber, and Red are only painted when the service is on cover and live data (or a ticketed SLA clock) says so.",
    ],
  },
  {
    id: "navigation",
    title: "How to move around",
    group: "Getting started",
    summary: "Top bar: Eco-System, customer switcher, Reporting, Configuration, Help.",
    body: [
      "Customer Eco-System is the portfolio. Open a customer to work that tenant.",
      "Inside a customer, the ribbon is: Eco-System, SYSPRO Landscape, RMM, Cloud Backup, End Point Protection, Microsoft 365, Service Desk.",
      "Configuration (cog) is platform settings — themes, email, users, SQL, agents. Help (top right) is this guide.",
    ],
  },
  {
    id: "cover",
    title: "Cover vs No Cover",
    group: "Customer workspace",
    summary: "AmsConfig false is a hard off. Leftover warehouse rows are not cover.",
    body: [
      "SYSPRO cover needs a live Edge agent on a SYSPRO host, or an explicit PillarSyspro flag. Uninstalling the agent drops SYSPRO to No Cover even if old operators remain in SQL.",
      "RMM, Cove, and EPP cover come from a vendor map or live devices, unless the pillar is switched off.",
      "Microsoft 365 can show Cover for visibility. It is not on the signed SLA, so robots stay Green when covered.",
    ],
  },
  {
    id: "rag",
    title: "RAG lights and flashing",
    group: "Customer workspace",
    summary: "Only red robots flash. No Cover is static grey.",
    body: [
      "Red = SLA miss (when armed) or a live error/offline on a covered service. The robot flashes red.",
      "Amber and Green stay static. Module rows may be painted but they do not flash.",
      "If a menu has No Cover, there is no flashing robot — static grey only.",
    ],
  },
  {
    id: "eco",
    title: "Customer Eco-System",
    group: "Customer workspace",
    summary: "Tenant overview: devices, cover banners, who can see this customer.",
    body: [
      "The eco page is the tenant home. Device rows are the live estate (servers, backup agents, EPP).",
      "Tenant access lists staff who may open this customer. Platform admins see every tenant. Operators see only assigned codes.",
    ],
  },
  {
    id: "syspro",
    title: "SYSPRO Landscape",
    group: "Services",
    summary: "Jobs, FinSight DTR, operators, day-end, license — only when SYSPRO is on cover.",
    body: [
      "Job Logging is the SYSPRO job queue. Failures turn the jobs robot red.",
      "FinSight / DTR is out-of-balance lines. Operators, SQL, license, and hotfixes are inventory for the same landscape.",
    ],
  },
  {
    id: "rmm",
    title: "RMM Management",
    group: "Services",
    summary: "Pulseway servers, workstations, patch, disk, alerts, events.",
    body: [
      "Servers and workstations are classified from Pulseway. Offline servers are live status, not an SLA miss until helpdesk tickets are armed.",
      "Patch Compliance is outstanding updates on reporting servers. Disk Performance is IOPS from the Edge agent.",
    ],
  },
  {
    id: "cove",
    title: "RPM Cloud Backup",
    group: "Services",
    summary: "Cove devices, recovery testing, retention, 7-day history.",
    body: [
      "Backup Agents are Cove devices mapped to the customer. Recovery Testing uses DRaaS colour bars and last-completed sessions.",
      "Retention is the Cove policy on the device. Screenshots from a completed recovery test open when the API stored a path.",
    ],
  },
  {
    id: "epp",
    title: "End Point Protection",
    group: "Services",
    summary: "Bitdefender endpoints, modules, incidents, quarantine.",
    body: [
      "Endpoints list GravityZone computers for this customer. Infected or unmanaged devices raise RAG.",
      "Quarantine and incidents are the last GravityZone collect. Exclusion of C:\\RPM-Assure is a GravityZone policy, not this screen.",
    ],
  },
  {
    id: "m365",
    title: "Microsoft 365",
    group: "Services",
    summary: "Posture only until it is on a signed SLA.",
    body: [
      "Users, licenses, MFA, Secure Score, and global admins are visibility. Robots stay Green when the tenant is on cover.",
      "Do not treat Microsoft’s 99.9% platform SLA as RPM’s SLA.",
    ],
  },
  {
    id: "agents",
    title: "Edge agents",
    group: "Agents",
    summary: "Windows service RPMAssure-Edge. HTTPS only. Customer code is the only install input.",
    body: [
      "Install from https://assure.rpmresources.co.za/downloads with -CustomerCode (AHIC, BHF, …). GravityZone must exclude C:\\RPM-Assure.",
      "Heartbeat = last HTTPS ping (Online if under 45 minutes). Sync = last job (OK or Job fail). Job fail is not Disconnected.",
      "The agent pulls a new pack when /downloads/VERSION changes. It never talks to GitHub.",
    ],
  },
  {
    id: "sla",
    title: "SLA clocks",
    group: "SLA and tickets",
    summary: "Clocks start only when a matching ticket exists. Helpdesk auto-ticket is not armed yet.",
    body: [
      "Until HELPDESK_TICKET_SLA_ARMED is on, ticketed server availability and Service Desk RAG stay Off. Live device status still paints.",
      "When armed: Amber/Red live alert + matching Freshdesk ticket in Assure starts the clock at ticket OpenedAt.",
    ],
  },
  {
    id: "tickets",
    title: "Service Desk",
    group: "SLA and tickets",
    summary: "Freshdesk tickets mapped to the customer. Not scored until helpdesk is armed.",
    body: [
      "Open / resolved / closed lists are the Freshdesk feed. SMTP (Configuration → Email) is prepared so Assure can later mail or log a ticket when RAG turns Amber or Red.",
    ],
  },
  {
    id: "config",
    title: "Configuration menu",
    group: "Configuration",
    summary: "Platform: infrastructure, email, users, UI templates, SQL, agents.",
    body: [
      "UI Customize chooses a template and colour palette (light/dark still toggle from the header).",
      "Email / SMTP stores outbound mail for reports and, when enabled, future ticket alerts.",
      "Users assign role and which customer codes a person may open. Profile is the signed-in person’s own record.",
    ],
  },
  {
    id: "users",
    title: "Users and tenant access",
    group: "Configuration",
    summary: "Role + customer codes. Shown on each tenant’s eco page.",
    body: [
      "Platform Admin sees every customer. Operator / other roles see only assigned codes.",
      "On the customer eco page, Tenant access lists who can open that tenant. Assign codes under Configuration → Users.",
    ],
  },
  {
    id: "email",
    title: "Email (ticketing prep)",
    group: "Configuration",
    summary: "SMTP for reports now; ticket-on-RAG later.",
    body: [
      "Set host, port, from address, and Report To. Send test before enabling ticket alerts.",
      "Ticket alerts (Amber / Red) are stored but do not open Freshdesk until helpdesk is armed.",
    ],
  },
];

export function helpTopic(id: string): HelpTopic | undefined {
  return HELP_TOPICS.find((t) => t.id === id);
}
