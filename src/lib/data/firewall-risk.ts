import type { HostFirewallPort, HostFirewallSnapshot } from "./types";

/** 1 expected · 5 remote-admin / unauthenticated */
const PORT_RISK: Record<string, { label: string; risk: number }> = {
  "21": { label: "FTP", risk: 4 },
  "23": { label: "Telnet", risk: 5 },
  "22": { label: "SSH", risk: 3 },
  "25": { label: "SMTP", risk: 3 },
  "53": { label: "DNS", risk: 2 },
  "80": { label: "HTTP", risk: 2 },
  "88": { label: "Kerberos", risk: 1 },
  "110": { label: "POP3", risk: 3 },
  "111": { label: "RPCbind", risk: 4 },
  "135": { label: "RPC", risk: 4 },
  "139": { label: "NetBIOS", risk: 4 },
  "143": { label: "IMAP", risk: 3 },
  "161": { label: "SNMP", risk: 3 },
  "389": { label: "LDAP", risk: 2 },
  "443": { label: "HTTPS", risk: 1 },
  "445": { label: "SMB", risk: 5 },
  "500": { label: "IKE", risk: 2 },
  "587": { label: "SMTP", risk: 2 },
  "636": { label: "LDAPS", risk: 1 },
  "993": { label: "IMAPS", risk: 1 },
  "995": { label: "POP3S", risk: 1 },
  "1433": { label: "SQL", risk: 5 },
  "1434": { label: "SQL Browser", risk: 4 },
  "1521": { label: "Oracle", risk: 4 },
  "1723": { label: "PPTP", risk: 4 },
  "2049": { label: "NFS", risk: 4 },
  "3306": { label: "MySQL", risk: 4 },
  "3389": { label: "RDP", risk: 5 },
  "5432": { label: "Postgres", risk: 4 },
  "5900": { label: "VNC", risk: 4 },
  "5901": { label: "VNC", risk: 4 },
  "5985": { label: "WinRM", risk: 4 },
  "5986": { label: "WinRM TLS", risk: 3 },
  "8080": { label: "HTTP-alt", risk: 3 },
  "8443": { label: "HTTPS-alt", risk: 2 },
  "27017": { label: "Mongo", risk: 4 },
};

/** Public = internet · Private = LAN · Domain = AD */
const PROFILE_EXPOSURE: Record<string, number> = {
  Public: 4,
  Private: 2,
  Domain: 1,
};

export type FirewallFinding = {
  key: string;
  label: string;
  port: string;
  proto: string;
  profile: string;
  risk: number;
  exposure: number;
  score: number;
};

export type FirewallRiskLevel = "none" | "low" | "medium" | "high" | "critical";

export type FirewallRiskSummary = {
  have: boolean;
  activeProfile: string | null;
  firewallOn: boolean | null;
  risk: number;
  exposure: number;
  score: number;
  level: FirewallRiskLevel;
  findings: FirewallFinding[];
  sampledUtc: string | null;
  source: string | null;
};

function portMeta(port: HostFirewallPort): { label: string; risk: number } {
  const n = String(port.port ?? "").split("-")[0]?.trim() ?? "";
  const hit = PORT_RISK[n];
  if (hit) return hit;
  const name = (port.name || "").toLowerCase();
  if (/\brdp|remote desktop/.test(name)) return { label: "RDP", risk: 5 };
  if (/\bsmb|file.?share|cifs/.test(name)) return { label: "SMB", risk: 5 };
  if (/\bwinrm|ws-?man/.test(name)) return { label: "WinRM", risk: 4 };
  if (/\bsql|tds/.test(name)) return { label: "SQL", risk: 5 };
  if (/\bvnc/.test(name)) return { label: "VNC", risk: 4 };
  if (/\btelnet/.test(name)) return { label: "Telnet", risk: 5 };
  if (name) return { label: port.name.slice(0, 18), risk: 2 };
  return { label: `Port ${port.port}`, risk: 2 };
}

function levelFromScore(score: number): FirewallRiskLevel {
  if (score >= 20) return "critical";
  if (score >= 12) return "high";
  if (score >= 6) return "medium";
  if (score > 0) return "low";
  return "low";
}

export function summarizeFirewall(
  snapshot: HostFirewallSnapshot | null | undefined,
): FirewallRiskSummary {
  if (!snapshot) {
    return {
      have: false,
      activeProfile: null,
      firewallOn: null,
      risk: 0,
      exposure: 0,
      score: 0,
      level: "none",
      findings: [],
      sampledUtc: null,
      source: null,
    };
  }

  const profiles = snapshot.profiles ?? [];
  const active = profiles.find((p) => p.active) ?? null;
  const findings: FirewallFinding[] = [];

  if (active && !active.enabled) {
    findings.push({
      key: "fw-off",
      label: `${active.name} firewall off`,
      port: "—",
      proto: "",
      profile: active.name,
      risk: 5,
      exposure: 5,
      score: 25,
    });
  }

  const publicProf = profiles.find((p) => p.name === "Public");
  if (publicProf && !publicProf.enabled && (!active || active.name !== "Public")) {
    findings.push({
      key: "public-off",
      label: "Public firewall off",
      port: "—",
      proto: "",
      profile: "Public",
      risk: 4,
      exposure: 4,
      score: 16,
    });
  }

  const byPort = new Map<string, FirewallFinding>();
  for (const p of profiles) {
    if (!p.enabled) continue;
    const expo = PROFILE_EXPOSURE[p.name] ?? 2;
    for (const port of p.ports ?? []) {
      const meta = portMeta(port);
      const key = `${port.proto}:${port.port}`;
      const score = meta.risk * expo;
      const prev = byPort.get(key);
      if (prev && prev.score >= score) continue;
      byPort.set(key, {
        key,
        label: meta.label,
        port: port.port,
        proto: port.proto || "TCP",
        profile: p.name,
        risk: meta.risk,
        exposure: expo,
        score,
      });
    }
  }

  for (const f of byPort.values()) {
    if (f.score >= 8 || f.risk >= 4) findings.push(f);
  }

  findings.sort((a, b) => b.score - a.score || b.risk - a.risk);
  const top = findings.slice(0, 4);
  const worst = top[0];

  return {
    have: true,
    activeProfile: active?.name ?? null,
    firewallOn: active ? active.enabled : null,
    risk: worst?.risk ?? 1,
    exposure: worst?.exposure ?? (active ? PROFILE_EXPOSURE[active.name] ?? 1 : 1),
    score: worst?.score ?? 1,
    level: worst ? levelFromScore(worst.score) : "low",
    findings: top,
    sampledUtc: snapshot.snapshotUtc,
    source: snapshot.source,
  };
}

export function firewallLevelTone(
  level: FirewallRiskLevel,
): "red" | "amber" | "green" | "muted" {
  if (level === "critical" || level === "high") return "red";
  if (level === "medium") return "amber";
  if (level === "low") return "green";
  return "muted";
}

export function firewallLevelLabel(level: FirewallRiskLevel): string {
  if (level === "critical") return "Critical";
  if (level === "high") return "High";
  if (level === "medium") return "Medium";
  if (level === "low") return "Low";
  return "No collect";
}

export function exposureLabel(n: number, profile: string | null): string {
  if (n >= 5) return "Open";
  if (n >= 4) return profile === "Public" ? "Public" : "Internet";
  if (n >= 2) return profile === "Private" ? "LAN" : profile ?? "LAN";
  return profile === "Domain" ? "Domain" : profile ?? "Managed";
}
