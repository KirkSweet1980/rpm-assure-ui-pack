import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Paintbrush } from "lucide-react";
import { ConfigPageHead } from "@/components/settings/config-page";
import {
  MENU_STYLES,
  MENU_STYLE_META,
  applyMenuStyle,
  persistMenuStyle,
  readMenuStyle,
  type MenuStyle,
} from "@/lib/nav/menu-style";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/chrome")({
  component: ChromeChooserPage,
});

function MiniNav({ style }: { style: MenuStyle }) {
  return (
    <div
      className={cn(
        "rounded-md px-2 py-2",
        style === "navy" ? "bg-[#12365a]" : "bg-[#0a1628]",
      )}
      data-menu-style={style}
    >
      <div className="flex flex-wrap gap-1">
        {["Exco Insight", "Reports", "Configuration"].map((label, i) => {
          const on = i === 0;
          return (
            <span
              key={label}
              className={cn(
                "inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold",
                !on && "border-2 border-transparent text-white/75",
                on && style === "teal" && "border-2 border-[#8fce4a] bg-[#1bb8a6] text-[#04201c]",
                on && style === "underline" && "border-2 border-transparent text-white shadow-[inset_0_-3px_0_#1bb8a6]",
                on && style === "navy" && "border-2 border-[#8fce4a] bg-[#0a1628] text-white",
                on && style === "rail" && "border-2 border-transparent bg-white/10 text-white shadow-[inset_4px_0_0_#1bb8a6]",
                on && style === "lime" && "border-2 border-[#d4f0a8] bg-[#8fce4a] text-[#14300a]",
                on && style === "cyan" && "border-2 border-[#b8f4ee] bg-[#3ecfbf] text-[#04201c]",
                on && style === "punch" && "border-2 border-[#8fce4a] bg-[#1bb8a6] text-[#04201c] shadow-[inset_0_-3px_0_#8fce4a]",
                on && style === "spectrum" && "border-2 border-[#8fce4a] bg-[#1bb8a6] text-[#04201c]",
                on && style === "ocean" && "border-2 border-[#8ec5f0] bg-[#2b6fae] text-white",
                on && style === "amber" && "border-2 border-[#f3dd8a] bg-[#d4a017] text-[#2a1e00]",
                on && style === "sunset" && "border-2 border-[#d4a017] bg-[#1bb8a6] text-[#04201c] shadow-[inset_0_-3px_0_#d4a017]",
                on && style === "pills" && "border-2 border-[#8fce4a] bg-[#1bb8a6] text-[#04201c]",
                on && style === "candy" && "border-2 border-[#8fce4a] bg-[#1bb8a6] text-[#04201c]",
                on && style === "flag" && "border-2 border-[#8fce4a] bg-[#12365a] text-white shadow-[inset_0_-3px_0_#1bb8a6,inset_0_-6px_0_#8fce4a,inset_0_-9px_0_#2b6fae]",
                on && style === "coral" && "border-2 border-[#f3c4b6] bg-[#e07a5f] text-[#2a1008]",
                on && style === "mosaic" && "border-2 border-[#8fce4a] bg-[#1bb8a6] text-[#04201c]",
              )}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MiniTabs({ style }: { style: MenuStyle }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1 rounded-md border-2 border-[var(--color-border-strong)] bg-[var(--color-surface-2)] p-1">
      {["Ecosystem", "SYSPRO", "RMM", "Backup"].map((label, i) => {
        const on = i === 1;
        if (style === "spectrum") {
          const spec =
            label === "SYSPRO"
              ? "border-2 border-[#0d6e64] bg-[#1bb8a6] text-[#04201c]"
              : label === "RMM"
                ? "border-2 border-[#163f68] bg-[#2b6fae] text-white"
                : label === "Backup"
                  ? "border-2 border-[#178f84] bg-[#3ecfbf] text-[#04201c]"
                  : "border-2 border-[#1a4d7a] bg-[#2b6fae] text-white";
          return (
            <span
              key={label}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-semibold",
                spec,
                !on && "opacity-45",
              )}
            >
              {label}
            </span>
          );
        }
        return (
          <span
            key={label}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-semibold",
              !on && "text-[var(--color-muted)]",
              on && style === "teal" && "border-2 border-[#1bb8a6] bg-[#d8f4ef] text-[#0d3d36]",
              on && style === "underline" && "border-2 border-transparent text-[var(--color-fg)] shadow-[inset_0_-3px_0_#1bb8a6]",
              on && style === "navy" && "border-2 border-[#12365a] bg-[#1a4d7a] text-white",
              on && style === "rail" && "border-2 border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-fg)] shadow-[inset_4px_0_0_#1bb8a6]",
              on && style === "lime" && "border-2 border-[#5ea01e] bg-[#8fce4a] text-[#14300a]",
              on && style === "cyan" && "border-2 border-[#1a8f84] bg-[#3ecfbf] text-[#04201c]",
              on && style === "punch" && "border-2 border-[#8fce4a] bg-[#1bb8a6] text-[#04201c] shadow-[inset_0_-3px_0_#8fce4a]",
              on && style === "ocean" && "border-2 border-[#1a4d7a] bg-[#2b6fae] text-white",
              on && style === "amber" && "border-2 border-[#a37a0c] bg-[#d4a017] text-[#2a1e00]",
              on && style === "sunset" && "border-2 border-[#d4a017] bg-[#1bb8a6] text-[#04201c] shadow-[inset_0_-3px_0_#d4a017]",
              on && style === "pills" && "border-2 border-[#0d6e64] bg-[#1bb8a6] text-[#04201c]",
              on && style === "candy" && "border-2 border-[#0d6e64] bg-[#1bb8a6] text-[#04201c]",
              on && style === "flag" && "border-2 border-[#2b6fae] bg-white text-[#12293c] shadow-[inset_0_-3px_0_#1bb8a6,inset_0_-6px_0_#8fce4a,inset_0_-9px_0_#2b6fae]",
              on && style === "coral" && "border-2 border-[#b84f36] bg-[#e07a5f] text-[#2a1008]",
              on && style === "mosaic" && "border-2 border-[#04201c] bg-[#1bb8a6] text-[#04201c]",
            )}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

function MiniMenu({ style }: { style: MenuStyle }) {
  return (
    <div className="mt-2 rounded-md border-2 border-[var(--color-border-strong)] bg-[var(--color-surface)] p-1">
      {["Open Settings", "SQL Server", "Dashboard", "Users"].map((label, i) => {
        const on = i === 2;
        return (
          <div
            key={label}
            className={cn(
              "rounded-sm px-2 py-1 text-[11px]",
              !on && "text-[var(--color-fg)]",
              on && style === "navy" && "bg-[#1a4d7a] font-bold text-white",
              on && style === "lime" && "bg-[#eaf7d4] font-bold text-[#14300a] shadow-[inset_3px_0_0_#8fce4a]",
              on && style === "cyan" && "bg-[#d7f6f2] font-bold text-[#04201c] shadow-[inset_3px_0_0_#3ecfbf]",
              on && style === "ocean" && "bg-[#dceaf6] font-bold text-[#12365a] shadow-[inset_3px_0_0_#2b6fae]",
              on && style === "amber" && "bg-[#fff4cc] font-bold text-[#2a1e00] shadow-[inset_3px_0_0_#d4a017]",
              on &&
                style !== "navy" &&
                style !== "lime" &&
                style !== "cyan" &&
                style !== "ocean" &&
                style !== "amber" &&
                "bg-[#d8f4ef] font-bold text-[#0d3d36] shadow-[inset_3px_0_0_#1bb8a6]",
            )}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}

function ChromeChooserPage() {
  const [current, setCurrent] = useState<MenuStyle>("ocean");

  useEffect(() => {
    setCurrent(readMenuStyle());
  }, []);

  function pick(style: MenuStyle) {
    persistMenuStyle(style);
    applyMenuStyle(style);
    setCurrent(style);
  }

  return (
    <div className="space-y-6">
      <ConfigPageHead title="Menu Style" icon={Paintbrush} />
      <section className="rpma-panel overflow-hidden p-0">
        <div className="px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">
            Active: {MENU_STYLE_META[current].name}
          </h2>
        </div>
        <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
        {MENU_STYLES.map((style) => {
          const meta = MENU_STYLE_META[style];
          const on = current === style;
          return (
            <button
              key={style}
              type="button"
              onClick={() => pick(style)}
              className={cn(
                "rounded-lg border-2 p-3 text-left transition",
                on
                  ? "border-[var(--ui-tab-active-border)] bg-[var(--ui-tab-active-bg)]"
                  : "border-[var(--color-border-strong)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]",
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-fg">{meta.name}</span>
                {on ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--ui-tab-active-fg)]">
                    <Check className="h-3.5 w-3.5" />
                    Selected
                  </span>
                ) : null}
              </div>
              <p className="mb-2 text-[12px] text-muted">{meta.blurb}</p>
              <MiniNav style={style} />
              <MiniTabs style={style} />
              <MiniMenu style={style} />
            </button>
          );
        })}
        </div>
      </section>
    </div>
  );
}
