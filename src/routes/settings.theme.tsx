import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { ThemeToggle } from "@/components/portfolio/theme-toggle";
import { FONT_PACKS, persistFontPack, readFontPack, type FontPackId } from "@/lib/font-pack";
import { DownloadPackButton } from "@/components/exco/download-pack-button";
import {
  ThemeChromePreview,
  PREVIEW_IMAGES,
} from "@/components/theme/theme-chrome-preview";
import {
  PALETTES,
  THEME_TOKENS,
  TOKEN_GROUPS,
  persistPalette,
  readComputedToken,
  readPalette,
  type PaletteId,
} from "@/lib/theme-tokens";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/theme")({
  component: ThemeTokensPage,
});

function Swatch({
  css,
  value,
  kind,
  used,
}: {
  css: string;
  value: string;
  kind: "color" | "size";
  used: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5">
      {kind === "color" ? (
        <span
          className="mt-0.5 h-7 w-7 shrink-0 rounded-sm border border-[var(--color-border)]"
          style={{ background: value || "transparent" }}
          title={value}
        />
      ) : (
        <span className="font-mono text-[11px] text-muted">{value || "—"}</span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-[12px] font-semibold text-fg">{css}</span>
        <span className="block truncate font-mono text-[10px] text-subtle">{value || "unset"}</span>
        <span className="block text-[11px] text-muted">{used}</span>
      </span>
    </div>
  );
}

function ThemeTokensPage() {
  const { theme } = useTheme();
  const [palette, setPalette] = useState<PaletteId>("slate");
  const [font, setFont] = useState<FontPackId>("inter");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setPalette(readPalette());
    setFont(readFontPack());
  }, []);

  useEffect(() => {
    persistPalette(palette, theme);
    setTick((n) => n + 1);
  }, [palette, theme]);

  useEffect(() => {
    persistFontPack(font);
  }, [font]);

  const computed = useMemo(() => {
    const map: Record<string, string> = {};
    THEME_TOKENS.forEach((t) => {
      map[t.css] = readComputedToken(t.css);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, theme, palette]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          Live CSS variables on this session. Values are read from the document
          root. Change Light/Dark in the header to see them recompute. RAG
          tokens are for health only — not chrome.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <DownloadPackButton />
          <ThemeToggle />
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-[13px] font-bold text-fg">Type</h2>
        <p className="mb-3 text-sm text-muted">
          DashboardKit ships Inter at 14px. Pick a pack — the whole workspace updates.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FONT_PACKS.map((p) => {
            const on = font === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setFont(p.id)}
                className={cn(
                  "rounded-lg border p-3 text-left",
                  on ? "border-[var(--bs-primary)] bg-[var(--dk-soft-primary)]" : "border-[var(--color-border)]",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold" style={{ fontFamily: p.display }}>
                    {p.name}
                  </span>
                  {on ? <Check className="h-4 w-4 text-[var(--bs-primary)]" /> : null}
                </span>
                <span className="mt-1 block text-[12px] text-muted" style={{ fontFamily: p.sans }}>
                  {p.blurb}
                </span>
                <span className="mt-2 block text-[13px]" style={{ fontFamily: p.display }}>
                  AHI Carriers · SYSPRO · 14px
                </span>
                <span className="block font-mono text-[11px] text-muted" style={{ fontFamily: p.mono }}>
                  SIRF  68  6
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-bold text-fg">Visual previews</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {PREVIEW_IMAGES.map((img) => {
            const on = palette === img.id;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setPalette(img.id)}
                className={cn(
                  "overflow-hidden rounded-lg border-2 text-left",
                  on
                    ? "border-[var(--ui-tab-active-border)]"
                    : "border-[var(--color-border-strong)]",
                )}
              >
                <div className="flex items-center justify-between bg-[var(--color-surface-2)] px-3 py-1.5">
                  <span className="text-[12px] font-bold text-fg">{img.label}</span>
                  {on ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-fg">
                      <Check className="h-3.5 w-3.5" />
                      On
                    </span>
                  ) : null}
                </div>
                <img
                  src={img.src}
                  alt={img.label}
                  className="block h-auto w-full"
                />
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-bold text-fg">Live chrome (same tokens)</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(Object.keys(PALETTES) as PaletteId[]).map((id) => {
            const p = PALETTES[id];
            const on = palette === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPalette(id)}
                className={cn(
                  "rounded-lg border-2 p-3 text-left",
                  on
                    ? "border-[var(--ui-tab-active-border)] bg-[var(--ui-tab-active-bg)]"
                    : "border-[var(--color-border-strong)] bg-[var(--color-surface)]",
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-fg">{p.name}</span>
                  {on ? <Check className="h-4 w-4 text-fg" /> : null}
                </div>
                <p className="mb-2 text-[11px] text-muted">{p.blurb}</p>
                <ThemeChromePreview palette={id} />
              </button>
            );
          })}
        </div>
      </section>

      {TOKEN_GROUPS.map((g) => (
        <section key={g.id}>
          <h2 className="text-[13px] font-bold text-fg">{g.title}</h2>
          <p className="mb-2 text-[11px] text-muted">{g.blurb}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {THEME_TOKENS.filter((t) => t.group === g.id).map((t) => (
              <Swatch
                key={t.css}
                css={t.css}
                kind={t.kind}
                value={computed[t.css] ?? ""}
                used={t.used}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
