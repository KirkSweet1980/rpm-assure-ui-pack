import { cn } from "@/lib/utils";
import type { PaletteId } from "@/lib/theme-tokens";
import { PALETTES } from "@/lib/theme-tokens";

function Mini({
  mode,
  palette,
}: {
  mode: "light" | "dark";
  palette: PaletteId;
}) {
  const t = PALETTES[palette][mode];
  const chipBg = t["--ui-nav-link-active-bg"] ?? "#2b6fae";
  const chipFg = t["--ui-nav-link-active-fg"] ?? "#fff";
  const chipBd = t["--ui-nav-link-active-border"] ?? "#8ec5f0";
  const tabBg = t["--ui-tab-active-bg"] ?? "#dceaf6";
  const tabFg = t["--ui-tab-active-fg"] ?? "#12365a";
  const tabBd = t["--ui-tab-active-border"] ?? "#2b6fae";
  const bar = t["--ui-tab-active-bar"] ?? tabBd;
  const dark = mode === "dark";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border-2",
        dark ? "border-[#54708a] bg-[#0b1220]" : "border-[#8aa6bc] bg-[#e8eef3]",
      )}
    >
      <p
        className={cn(
          "px-2 pt-1.5 text-[9px] font-bold uppercase tracking-wide",
          dark ? "text-[#7b8da3]" : "text-[#5f7588]",
        )}
      >
        {mode}
      </p>
      <div className="m-1.5 overflow-hidden rounded-md">
        <div className="flex gap-1 px-1.5 py-1.5" style={{ background: t["--color-nav"] ?? (dark ? "#0a1628" : "#12365a") }}>
          {["Exco", "Reports", "Config"].map((label, i) => (
            <span
              key={label}
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={
                i === 0
                  ? {
                      background: chipBg,
                      color: chipFg,
                      border: `2px solid ${chipBd}`,
                    }
                  : { color: "rgba(255,255,255,0.75)", border: "2px solid transparent" }
              }
            >
              {label}
            </span>
          ))}
        </div>
        <div
          className="flex gap-1 px-1.5 py-1.5"
          style={{ background: dark ? "#0f1729" : "#f0f6fa" }}
        >
          {["Eco", "SYSPRO", "RMM"].map((label, i) => (
            <span
              key={label}
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={
                i === 1
                  ? {
                      background: tabBg,
                      color: tabFg,
                      border: `2px solid ${tabBd}`,
                      boxShadow: `inset 0 -2px 0 ${bar}`,
                    }
                  : {
                      color: dark ? "#7b8da3" : "#5f7588",
                      border: "2px solid transparent",
                    }
              }
            >
              {label}
            </span>
          ))}
        </div>
        <div
          className="grid grid-cols-3 gap-1 px-1.5 pb-1.5"
          style={{ background: dark ? "#0f1729" : "#f0f6fa" }}
        >
          {["8", "96%", "3"].map((n) => (
            <span
              key={n}
              className="rounded border-2 px-1 py-1 font-mono text-[11px] font-bold"
              style={{
                background: dark ? "#121a2b" : "#fff",
                borderColor: dark ? "#54708a" : "#8aa6bc",
                color: dark ? "#e8eef6" : "#12293c",
              }}
            >
              {n}
            </span>
          ))}
        </div>
        <div
          className="mx-1.5 mb-1.5 overflow-hidden rounded border-2 text-[10px]"
          style={{
            borderColor: dark ? "#54708a" : "#8aa6bc",
            background: dark ? "#121a2b" : "#fff",
            color: dark ? "#e8eef6" : "#12293c",
          }}
        >
          <div className="px-2 py-1">SQL Server</div>
          <div
            className="px-2 py-1 font-bold"
            style={{
              background: tabBg,
              color: tabFg,
              boxShadow: `inset 3px 0 0 ${bar}`,
            }}
          >
            Theme tokens
          </div>
          <div className="px-2 py-1">Users</div>
        </div>
      </div>
    </div>
  );
}

export function ThemeChromePreview({ palette }: { palette: PaletteId }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <Mini mode="light" palette={palette} />
      <Mini mode="dark" palette={palette} />
    </div>
  );
}

export const PREVIEW_IMAGES: { id: PaletteId; src: string; label: string }[] = [
  { id: "ocean", src: "/theme-previews/ocean.png", label: "1 — Ocean" },
  { id: "teal", src: "/theme-previews/teal.png", label: "2 — Teal" },
  { id: "ink", src: "/theme-previews/ink.png", label: "3 — Ink" },
  { id: "contrast", src: "/theme-previews/contrast.png", label: "4 — High contrast" },
  { id: "lime", src: "/theme-previews/lime.png", label: "5 — Lime" },
  { id: "dusk", src: "/theme-previews/dusk.png", label: "6 — Dusk" },
];
