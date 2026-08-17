import { useEffect, useState } from "react";
import { Clock, Database } from "lucide-react";
import { cn, formatSastDateTime } from "@/lib/utils";
import { HelpTip } from "@/components/ui/help-tip";
import { RpmRevCounter } from "@/components/brand/rpm-rev-counter";

const TZ = "Africa/Johannesburg";

function partsOf(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    weekday: get("weekday"),
    day: get("day"),
    month: get("month"),
    year: get("year"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function HudCell({
  icon: Icon,
  label,
  value,
  tone,
  tip,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  tone?: "live" | "demo";
  tip?: string;
}) {
  return (
    <div className="rpma-hud-cell">
      <Icon className="rpma-hud-ico" aria-hidden />
      <div>
        <p className="rpma-hud-k">
          {label}
          {tip ? <HelpTip text={tip} side="bottom" /> : null}
        </p>
        <p
          className={cn(
            "rpma-hud-v",
            tone === "live" && "is-live",
            tone === "demo" && "is-demo",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function useClock() {
  const [now, setNow] = useState(() => partsOf(new Date()));
  useEffect(() => {
    const tick = () => setNow(partsOf(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function digitalOf(d: Date | string | null | undefined) {
  const date = d ? new Date(d) : null;
  if (!date || Number.isNaN(date.getTime())) return "--:--:--";
  const p = partsOf(date);
  return `${p.hour}:${p.minute}:${p.second}`;
}

export function HeadsUpDisplay({
  liveSql,
  generatedAt,
  variant = "clock",
}: {
  liveSql: boolean;
  generatedAt?: string | Date | null;
  variant?: "clock" | "sql";
}) {
  const now = useClock();
  const dateStr = `${now.weekday} ${now.day} ${now.month} ${now.year}`;
  const timeStr = `${now.hour}:${now.minute}:${now.second}`;
  const sqlWhen = formatSastDateTime(generatedAt);
  const sqlDigits = digitalOf(generatedAt);

  if (variant === "sql") {
    return (
      <div
        className={cn("rpma-sql-digital", liveSql ? "is-live" : "is-demo")}
        title={liveSql ? `Last live SQL read ${sqlWhen}` : `Demo data ${sqlWhen}`}
        aria-label={liveSql ? `Live SQL ${sqlWhen}` : `Demo data ${sqlWhen}`}
      >
        <span className="rpma-sql-live-ico" aria-hidden>
          <Database size={15} strokeWidth={2.2} />
        </span>
        <span className="rpma-sql-meta">
          <em>SQL Refresh</em>
          <span className="rpma-sql-digits">
            {sqlDigits.slice(0, 2)}
            <i>:</i>
            {sqlDigits.slice(3, 5)}
            <i>:</i>
            {sqlDigits.slice(6, 8)}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className="rpma-hud-mid" aria-label="System clock">
      <HudCell icon={Clock} label="System Date" value={dateStr} tip="Today in South Africa Standard Time. All Assure dates use SAST." />
      <div className="rpma-hud-rev">
        <RpmRevCounter className="rpma-hud-rev-svg" />
      </div>
      <HudCell icon={Clock} label="System Time" value={`${timeStr} SAST`} tip="Live clock in SAST. Collect age and SLA windows are measured against this." />
    </div>
  );
}
