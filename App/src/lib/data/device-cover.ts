import { isRmmServer, isRmmWorkstation } from "./rmm-device-class";
import type { CustomerDetailPayload, PortfolioRow } from "./types";

export function countRmmServers(
  row?: PortfolioRow | null,
  extra?: Partial<CustomerDetailPayload> | null,
): number {
  const devices = extra?.rmm?.devices;
  if (Array.isArray(devices) && devices.length > 0) {
    return devices.filter((d) => isRmmServer(d)).length;
  }
  const s = extra?.rmm?.summary;
  const fromSum =
    (s?.serverCount ?? 0) ||
    (s?.serverOnline ?? 0) + (s?.serverOffline ?? 0);
  if (fromSum > 0) return fromSum;
  return (row?.pulsewayServerOnline ?? 0) + (row?.pulsewayServerOffline ?? 0);
}

export function countRmmWorkstations(
  row?: PortfolioRow | null,
  extra?: Partial<CustomerDetailPayload> | null,
): number {
  const devices = extra?.rmm?.devices;
  if (Array.isArray(devices) && devices.length > 0) {
    return devices.filter((d) => isRmmWorkstation(d)).length;
  }
  const s = extra?.rmm?.summary;
  const fromSum =
    (s?.workstationCount ?? 0) ||
    (s?.workstationOnline ?? 0) + (s?.workstationOffline ?? 0);
  if (fromSum > 0) return fromSum;
  return (row?.pulsewayWorkstationOnline ?? 0) + (row?.pulsewayWorkstationOffline ?? 0);
}

export function countCoveDevices(
  row?: PortfolioRow | null,
  extra?: Partial<CustomerDetailPayload> | null,
): number {
  const n = extra?.cove?.devices?.length ?? extra?.cove?.summary?.deviceCount ?? 0;
  if (n > 0) return n;
  return row?.coveDeviceCount ?? 0;
}

export function countEppDevices(
  row?: PortfolioRow | null,
  extra?: Partial<CustomerDetailPayload> | null,
): number {
  const n = extra?.epp?.devices?.length ?? extra?.epp?.summary?.deviceCount ?? 0;
  if (n > 0) return n;
  return row?.eppDeviceCount ?? 0;
}

/** Right-pane banner when the open module has zero devices — not scored in SLA. */
export function noCoverForDevicesLabel(
  pathname: string,
  row?: PortfolioRow | null,
  extra?: Partial<CustomerDetailPayload> | null,
): string | null {
  const path = pathname.replace(/\/$/, "");
  if (path.endsWith("/rmm/devices") && countRmmServers(row, extra) <= 0) {
    return "No Cover for Devices";
  }
  if (path.endsWith("/rmm/workstations") && countRmmWorkstations(row, extra) <= 0) {
    return "No Cover for Devices";
  }
  if (
    (path.endsWith("/cove/devices") || path.endsWith("/cove")) &&
    countCoveDevices(row, extra) <= 0
  ) {
    return "No Cover for Devices";
  }
  if (
    (path.endsWith("/epp/endpoints") || path.endsWith("/epp")) &&
    countEppDevices(row, extra) <= 0
  ) {
    return "No Cover for Devices";
  }
  return null;
}
