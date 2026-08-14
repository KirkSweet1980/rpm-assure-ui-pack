import { useEffect, useState } from "react";
import { Activity, Clock, Database } from "lucide-react";
import { cn, formatSastDateTime } from "@/lib/utils";

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
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  tone?: "live" | "demo";
}) {
  return (
    <div className="rpma-hud-cell">
      <Icon className="rpma-hud-ico" aria-hidden />
      <div className="min-w-0">
        <p className="rpma-hud-k">{label}</p>
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

export function HeadsUpDisplay({
  liveSql,
  generatedAt,
}: {
  liveSql: boolean;
  generatedAt?: string | Date | null;
}) {
  const [now, setNow] = useState(() => partsOf(new Date()));

  useEffect(() => {
    const tick = () => setNow(partsOf(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const dateStr = `${now.weekday} ${now.day} ${now.month} ${now.year}`;
  const timeStr = `${now.hour}:${now.minute}:${now.second}`;
  const sqlLabel = liveSql ? "Live SQL" : "Demo data";
  const sqlWhen = formatSastDateTime(generatedAt);

  return (
    <section className="rpma-hud" aria-label="Heads-up display">
      <div className="rpma-hud-head">
        <Activity className="h-3.5 w-3.5" aria-hidden />
        <h2>Heads-up Display</h2>
      </div>
      <div className="rpma-hud-grid">
        <HudCell icon={Clock} label="System Date" value={dateStr} />
        <HudCell icon={Clock} label="System Time" value={`${timeStr} SAST`} />
        <HudCell
          icon={Database}
          label={sqlLabel}
          value={sqlWhen}
          tone={liveSql ? "live" : "demo"}
        />
      </div>
    </section>
  );
}
