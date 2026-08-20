/**
 * Classify Pulseway devices as server vs workstation for UI modules and SLA.
 * Pulseway often tags file/SQL boxes as "Workstation" — OS and role names win.
 */

export type RmmDeviceClass = "server" | "workstation" | "other";

function compactName(name?: string | null): string {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[-_\s]/g, "");
}

function looksLikeServerName(name?: string | null): boolean {
  const n = (name || "").toLowerCase();
  const compact = compactName(name);
  if (!n && !compact) return false;
  if (
    /rpm[-_\s]?unify|unifyosserver/.test(n) ||
    /rpm-?ai1\b/.test(n) ||
    /rpm-?pet\b/.test(n) ||
    /rpmwhm|rpm[-_\s]?whm/.test(n) ||
    /\bserver\b/.test(n)
  ) {
    return true;
  }
  // Role boxes: SQL / SYSPRO / file / app / DC / Hyper-V (with or without hyphens)
  if (
    /ssql|syspro|fsdb|fsapp|fsprd|prodev|sqlsrv|hvhost|hyperv|vcenter|esxi|file.?serv/.test(compact)
  ) {
    return true;
  }
  if (/ahicfs|ahifs|rssdc|sql01|app01|adc01/.test(compact)) return true;
  if (
    /(^|[-_])(sql|app|web|dc|fs|prd|prod|srv|rds|ts|adc)(\d+)?($|[-_])/.test(n)
  ) {
    return true;
  }
  if (/\b(sql|syspro|file|app|web|dc|prod|srv|prd|hyper-v|esxi)\b/.test(n)) {
    return true;
  }
  return false;
}

function looksLikeServerOs(os?: string | null): boolean {
  const o = (os || "").toLowerCase();
  return (
    o.includes("windows server") ||
    o.includes("server 201") ||
    o.includes("server 202") ||
    o.includes("domain controller") ||
    /\b(hyper-v|esxi|vcenter)\b/.test(o)
  );
}

export function classifyRmmDevice(d: {
  deviceType?: string | null;
  osName?: string | null;
  name?: string | null;
}): RmmDeviceClass {
  const type = (d.deviceType || "").toLowerCase();
  const os = (d.osName || "").toLowerCase();
  const name = (d.name || "").toLowerCase();
  const blob = `${type} ${os} ${name}`;

  if (looksLikeServerName(d.name) || looksLikeServerOs(d.osName)) {
    return "server";
  }

  if (type === "server" || type.includes("server") || type.includes("domain controller")) {
    return "server";
  }

  if (
    type === "workstation" ||
    type.includes("workstation") ||
    type.includes("desktop") ||
    type.includes("laptop") ||
    type.includes("notebook")
  ) {
    return "workstation";
  }

  if (/\b(hyper-v|esxi|vcenter|sql|dc\d*|prod|srv)\b/.test(blob)) {
    return "server";
  }

  if (
    blob.includes("windows 11") ||
    blob.includes("windows 10") ||
    blob.includes("windows 8") ||
    blob.includes("windows 7") ||
    blob.includes("macos") ||
    blob.includes("mac os") ||
    blob.includes("laptop") ||
    blob.includes("notebook") ||
    blob.includes("surface") ||
    blob.includes("desktop") ||
    blob.includes("pro (") ||
    blob.includes("home (") ||
    blob.includes("business (")
  ) {
    return "workstation";
  }

  if (type === "windows" || type === "pc" || type.includes("computer")) {
    if (!blob.includes("server")) return "workstation";
  }

  return "other";
}

export function isRmmServer(d: {
  deviceType?: string | null;
  osName?: string | null;
  name?: string | null;
}): boolean {
  return classifyRmmDevice(d) !== "workstation";
}

export function isRmmWorkstation(d: {
  deviceType?: string | null;
  osName?: string | null;
  name?: string | null;
}): boolean {
  return classifyRmmDevice(d) === "workstation";
}

export type ServerHardwareKind = "virtual" | "physical" | "unknown";

function blobOf(d: {
  name?: string | null;
  osName?: string | null;
  deviceType?: string | null;
  disks?: { mediaType?: string | null }[] | null;
}): { name: string; os: string; type: string; media: string; disks: { mediaType?: string | null }[] } {
  const disks = d.disks ?? [];
  return {
    name: (d.name || "").toLowerCase(),
    os: (d.osName || "").toLowerCase(),
    type: (d.deviceType || "").toLowerCase(),
    media: disks.map((x) => x.mediaType || "").join(" ").toLowerCase(),
    disks,
  };
}

export function classifyServerHardware(d: {
  name?: string | null;
  osName?: string | null;
  deviceType?: string | null;
  disks?: { mediaType?: string | null }[] | null;
}): ServerHardwareKind {
  const { name, os, type, media, disks } = blobOf(d);
  const compact = name.replace(/[-_\s]/g, "");
  const blob = `${name} ${os} ${type} ${media}`;

  if (
    /hvhost|hyperv|esxi|vcenter|proxmox|xenhost|bare[- ]?metal/.test(`${compact} ${blob}`)
  ) {
    return "physical";
  }

  if (
    /msft virtual|microsoft virtual|virtual disk|virtual hd|vmware virtual|pvscsi|vmdk|vhdx|\bvhd\b|hyper-v virtual|\bvirtual\b/.test(
      media,
    )
  ) {
    return "virtual";
  }
  if (disks.length > 0 && disks.some((x) => /virtual/i.test(x.mediaType || ""))) {
    return "virtual";
  }

  if (
    /vmware virtual platform|virtual machine|hyper-v guest|\bkvm\b|\bqemu\b|\bxen\b|virtualbox|hyper-v/.test(
      blob,
    )
  ) {
    return "virtual";
  }

  if (
    /proliant|poweredge|thinksystem|supermicro|optiplex|precision|idrac|\bilo\b|\bperc\b|\braid\b/.test(
      blob,
    )
  ) {
    return "physical";
  }

  if (/^(ironman|thor|hulk|vision|rpmunify|unifyosserver)$/.test(compact)) {
    return "physical";
  }

  if (
    disks.some((x) => /ssd|nvme|sas|sata|hdd|solid state/i.test(x.mediaType || "")) &&
    !/virtual/i.test(media)
  ) {
    return "physical";
  }

  if (
    /ssql|syspro|fsapp|fsdb|prodev|sqlsrv|-sql|[-_]app|[-_]web|[-_]dc|adc01|rds|ts01|prod-0/.test(
      compact,
    )
  ) {
    return "virtual";
  }
  if (/\b(sql|syspro|file|app|web|dc)\b/.test(name) && /server/.test(os)) {
    return "virtual";
  }

  if (/windows server/.test(os) && !/hyper-v|esxi/.test(compact)) {
    return "virtual";
  }

  return "unknown";
}
