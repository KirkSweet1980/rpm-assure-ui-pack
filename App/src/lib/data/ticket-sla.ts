/**
 * Layer A ticket SLA — RPM contract clocks in SAST business hours (08:00–17:00 weekdays).
 * Scores every ticket that has enough timestamps. Open clocks stay null (not a miss).
 */
import type { FactIncidentRow } from "./types";
import { RPM_CONTRACT_CLOCKS, type RpmPriority } from "./sla-metrics";

function bucketOf(i: FactIncidentRow): "open" | "resolved" | "closed" {
  const s = String(i.status ?? "").toLowerCase();
  if (/closed|cancelled|canceled/.test(s)) return "closed";
  if (/resolved/.test(s)) return "resolved";
  return "open";
}

const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;
const BH_START = 8;
const BH_END = 17;

export type TicketSlaClock = {
  response: boolean | null;
  resolve: boolean | null;
  priority: RpmPriority;
  respondMins: number;
  resolveMins: number | null;
};

export type TicketSlaPack = {
  total: number;
  last30d: number;
  open: number;
  responsePct: number | null;
  resolvePct: number | null;
  responseScored: number;
  resolveScored: number;
  responseMet: number;
  resolveMet: number;
  responseBreach: number;
  resolveBreach: number;
  breaches: number;
  overallPct: number | null;
  byPriority: Array<{
    priority: RpmPriority;
    n: number;
    responsePct: number | null;
    resolvePct: number | null;
  }>;
};

function toSast(d: Date): Date {
  return new Date(d.getTime() + SAST_OFFSET_MS);
}

export function businessMinutesBetween(fromIso: string | null | undefined, toIso: string | null | undefined): number | null {
  if (!fromIso || !toIso) return null;
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || to <= from) return 0;
  const fromS = toSast(from);
  const toS = toSast(to);
  let mins = 0;
  const day = new Date(fromS);
  day.setUTCHours(0, 0, 0, 0);
  const last = new Date(toS);
  last.setUTCHours(0, 0, 0, 0);
  while (day <= last) {
    const dow = day.getUTCDay();
    if (dow >= 1 && dow <= 5) {
      const winStart = new Date(day);
      winStart.setUTCHours(BH_START, 0, 0, 0);
      const winEnd = new Date(day);
      winEnd.setUTCHours(BH_END, 0, 0, 0);
      const a = fromS > winStart ? fromS : winStart;
      const b = toS < winEnd ? toS : winEnd;
      if (b > a) mins += (b.getTime() - a.getTime()) / 60000;
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return mins;
}

export function mapTicketPriority(row: FactIncidentRow): RpmPriority {
  const raw = `${row.priority ?? ""} ${row.severity ?? ""}`.toLowerCase();
  if (/p1|critical|urgent/.test(raw)) return "P1";
  if (/p2|high/.test(raw)) return "P2";
  if (/p4|low/.test(raw)) return "P4";
  return "P3";
}

function clockFor(p: RpmPriority) {
  return RPM_CONTRACT_CLOCKS.find((c) => c.priority === p) ?? RPM_CONTRACT_CLOCKS[2];
}

export function scoreTicket(row: FactIncidentRow, now = new Date()): TicketSlaClock {
  const priority = mapTicketPriority(row);
  const clock = clockFor(priority);
  const bucket = bucketOf(row);
  const done = bucket !== "open";
  const opened = row.openedAt;
  const first = row.firstResponseAt;
  const resolved = row.resolvedAt;

  let response: boolean | null = row.responseSlaMet ?? null;
  if (response == null && opened) {
    if (first) {
      const elapsed = businessMinutesBetween(opened, first);
      response = elapsed != null ? elapsed <= clock.acknowledgeMins : null;
    } else if (!done) {
      const elapsed = businessMinutesBetween(opened, now.toISOString());
      response = elapsed != null && elapsed > clock.acknowledgeMins ? false : null;
    }
  }

  let resolve: boolean | null = row.resolveSlaMet ?? null;
  if (resolve == null && opened && clock.restoreMins != null) {
    if (resolved || done) {
      const until = resolved || now.toISOString();
      const elapsed = businessMinutesBetween(opened, until);
      resolve = elapsed != null ? elapsed <= clock.restoreMins : null;
    } else {
      const elapsed = businessMinutesBetween(opened, now.toISOString());
      resolve = elapsed != null && elapsed > clock.restoreMins ? false : null;
    }
  }
  if (clock.restoreMins == null) resolve = row.resolveSlaMet ?? null;

  return {
    response,
    resolve,
    priority,
    respondMins: clock.acknowledgeMins,
    resolveMins: clock.restoreMins,
  };
}

function pct(met: number, scored: number): number | null {
  if (scored <= 0) return null;
  return Math.round((met / scored) * 1000) / 10;
}

export function scoreTicketSet(rows: FactIncidentRow[] | null | undefined): TicketSlaPack {
  const list = rows ?? [];
  const now = new Date();
  const cut = now.getTime() - 30 * 24 * 3600_000;
  const last30 = list.filter((r) => {
    const t = r.openedAt ? new Date(r.openedAt).getTime() : 0;
    return t >= cut;
  });
  const scoredOn = last30.length ? last30 : list;
  const clocks = scoredOn.map((r) => scoreTicket(r, now));
  const responseScored = clocks.filter((c) => c.response != null).length;
  const resolveScored = clocks.filter((c) => c.resolve != null).length;
  const responseMet = clocks.filter((c) => c.response === true).length;
  const resolveMet = clocks.filter((c) => c.resolve === true).length;
  const responseBreach = clocks.filter((c) => c.response === false).length;
  const resolveBreach = clocks.filter((c) => c.resolve === false).length;
  const responsePct = pct(responseMet, responseScored);
  const resolvePct = pct(resolveMet, resolveScored);
  const parts = [responsePct, resolvePct].filter((n): n is number => n != null);
  const overallPct =
    parts.length === 0 ? null : Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10;
  const byPriority = (["P1", "P2", "P3", "P4"] as RpmPriority[]).map((priority) => {
    const subset = clocks.filter((c) => c.priority === priority);
    const rS = subset.filter((c) => c.response != null);
    const zS = subset.filter((c) => c.resolve != null);
    return {
      priority,
      n: subset.length,
      responsePct: pct(rS.filter((c) => c.response === true).length, rS.length),
      resolvePct: pct(zS.filter((c) => c.resolve === true).length, zS.length),
    };
  });
  return {
    total: list.length,
    last30d: last30.length,
    open: list.filter((r) => bucketOf(r) === "open").length,
    responsePct,
    resolvePct,
    responseScored,
    resolveScored,
    responseMet,
    resolveMet,
    responseBreach,
    resolveBreach,
    breaches: clocks.filter((c) => c.response === false || c.resolve === false).length,
    overallPct,
    byPriority,
  };
}
