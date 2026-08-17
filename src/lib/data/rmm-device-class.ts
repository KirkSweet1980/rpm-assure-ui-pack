/**
 * Classify Pulseway devices as server vs workstation for UI modules and SLA.
 */

export type RmmDeviceClass = "server" | "workstation" | "other";

export function classifyRmmDevice(d: {
  deviceType?: string | null;
  osName?: string | null;
  name?: string | null;
}): RmmDeviceClass {
  const type = (d.deviceType || "").toLowerCase();
  const os = (d.osName || "").toLowerCase();
  const name = (d.name || "").toLowerCase();
  const blob = `${type} ${os} ${name}`;

  // Named boxes we run as servers even when Pulseway tags them Workstation
  if (
    /rpm[-_\s]?unify|unify os server/.test(name) ||
    /rpm-?ai1\b/.test(name) ||
    /rpm-?pet\b/.test(name) ||
    /rpmwhm|rpm[-_\s]?whm/.test(name) ||
    /\bserver\b/.test(name)
  ) {
    return "server";
  }

  // Explicit Pulseway types win after the name override
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

  // OS / name heuristics
  if (
    blob.includes("windows server") ||
    blob.includes("server 201") ||
    blob.includes("server 202") ||
    blob.includes("domain controller") ||
    /\b(hyper-v|esxi|vcenter|sql|dc\d*|prod|srv)\b/.test(blob)
  ) {
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

  // Generic "Windows" type without Server usually means client
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
  return classifyRmmDevice(d) === "server";
}

export function isRmmWorkstation(d: {
  deviceType?: string | null;
  osName?: string | null;
  name?: string | null;
}): boolean {
  // Unclassified devices still belong on the workstation list so nothing disappears
  return classifyRmmDevice(d) !== "server";
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

  // Hypervisor / host boxes are physical machines
  if (
    /hvhost|hyperv|esxi|vcenter|proxmox|xenhost|bare[- ]?metal/.test(`${compact} ${blob}`)
  ) {
    return "physical";
  }

  // Disk media from IOPS / Pulseway is the strongest guest signal
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

  // Lab / named bare metal (RPMINT)
  if (/^(ironman|thor|hulk|vision|rpmunify|unifyosserver)$/.test(compact)) {
    return "physical";
  }

  if (
    disks.some((x) => /ssd|nvme|sas|sata|hdd|solid state/i.test(x.mediaType || "")) &&
    !/virtual/i.test(media)
  ) {
    return "physical";
  }

  // Role names in this estate are Hyper-V guests (SQL / SYSPRO / file / DC / app)
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

  // Windows Server without a hypervisor/host name is a guest in this fleet
  if (/windows server/.test(os) && !/hyper-v|esxi/.test(compact)) {
    return "virtual";
  }

  return "unknown";
}
