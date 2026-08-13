import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const TZ = "Africa/Johannesburg";

/** Live system clock — DD/MM/YYYY HH:mm:ss (SAST) */
function formatSystemNow(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const day = get("day");
  const month = get("month");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");
  const second = get("second");
  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
}

export function SystemClock({ className }: { className?: string }) {
  const [now, setNow] = useState(() => formatSystemNow(new Date()));

  useEffect(() => {
    const tick = () => setNow(formatSystemNow(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        "rpma-system-clock flex flex-col items-start justify-center leading-tight",
        className,
      )}
      title="System time (Africa/Johannesburg)"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/55">
        System time
      </span>
      <time
        dateTime={new Date().toISOString()}
        className="font-mono text-[12px] font-semibold tabular-nums tracking-tight text-white/95 sm:text-[13px]"
      >
        {now}
      </time>
    </div>
  );
}
