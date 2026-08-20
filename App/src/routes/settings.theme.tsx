import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Palette } from "lucide-react";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { useDensity, type Density } from "@/lib/density";
import { Button } from "@/components/ui/button";
import { ConfigPageHead } from "@/components/settings/config-page";
import { ThemeChromePreview } from "@/components/theme/theme-chrome-preview";
import {
  PALETTES,
  THEME_TOKENS,
  TOKEN_GROUPS,
  UI_TEMPLATES,
  applyPalette,
  persistPalette,
  readComputedToken,
  readPalette,
  type PaletteId,
} from "@/lib/theme-tokens";
import { FONT_PACKS, persistFontPack, readFontPack, type FontPackId } from "@/lib/font-pack";

export const Route = createFileRoute("/settings/theme")({
  component: ThemeTokensPage,
});

type Draft = {
  palette: PaletteId;
  theme: ThemeMode;
  density: Density;
};

function ThemeTokensPage() {
  const { theme, setTheme } = useTheme();
  const { density, setDensity } = useDensity();
  const [saved, setSaved] = useState<Draft>({ palette: "slate", theme: "dark", density: "compact" });
  const [draft, setDraft] = useState<Draft>(saved);
  const [tick, setTick] = useState(0);
  const [font, setFont] = useState<FontPackId>("source");

  useEffect(() => {
    const next: Draft = { palette: readPalette(), theme, density };
    setSaved(next);
    setDraft(next);
    setFont(readFontPack());
    // mount only — live header toggle should not reset an unsaved draft
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyPalette(draft.palette, draft.theme);
    setTick((n) => n + 1);
  }, [draft.palette, draft.theme]);

  const dirty =
    draft.palette !== saved.palette ||
    draft.theme !== saved.theme ||
    draft.density !== saved.density;

  function apply() {
    persistPalette(draft.palette, draft.theme);
    setTheme(draft.theme);
    setDensity(draft.density);
    setSaved(draft);
    setMsg("Theme applied.");
  }

  function cancel() {
    setDraft(saved);
    persistPalette(saved.palette, saved.theme);
    setTheme(saved.theme);
    setDensity(saved.density);
    setMsg(null);
  }

  const computed = useMemo(() => {
    const map: Record<string, string> = {};
    THEME_TOKENS.forEach((t) => {
      map[t.css] = readComputedToken(t.css);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, draft.palette, draft.theme]);

  return (
    <div className="space-y-6">
      <ConfigPageHead title="UI templates & colour palettes" icon={Palette} />

      <div className="rpma-theme-apply">
        <p className="text-[12px] text-muted">
          Choose a template or palette to preview. Click <strong>Apply</strong> to keep it.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={!dirty} onClick={apply}>
            Apply
          </Button>
          <Button size="sm" variant="secondary" disabled={!dirty} onClick={cancel}>
            Cancel
          </Button>
          {msg && !dirty ? <span className="text-[12px] text-muted">{msg}</span> : null}
          {dirty ? <span className="text-[12px] font-semibold text-fg">Unsaved preview</span> : null}
        </div>
      </div>

      <section className="rpma-panel overflow-hidden p-0">
        <div className="px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">Typeface</h2>
          <p className="text-[12px] text-muted">Site default is Source Sans Pro. Applies immediately.</p>
        </div>
        <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-5">
          {FONT_PACKS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setFont(p.id);
                persistFontPack(p.id);
              }}
              className={cn(
                "rounded-md border p-3 text-left",
                font === p.id ? "border-[var(--color-nav)] bg-[var(--color-surface-2)]" : "border-border bg-surface",
              )}
            >
              <span className="text-[13px] font-extrabold text-fg">{p.name}</span>
              <p className="mt-1 text-[11px] text-muted">{p.blurb}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rpma-panel overflow-hidden p-0">
        <div className="px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">Templates</h2>
          <p className="text-[12px] text-muted">Palette + light/dark + density. Header toggle still works after Apply.</p>
        </div>
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-4">
          {UI_TEMPLATES.map((tpl) => {
            const on = draft.palette === tpl.id;
            const mode = tpl.theme === "light" || tpl.theme === "dark" ? tpl.theme : draft.theme;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() =>
                  setDraft({
                    palette: tpl.id,
                    theme: mode,
                    density: tpl.density,
                  })
                }
                className={cn(
                  "rounded-md border p-3 text-left",
                  on ? "border-[var(--color-nav)] bg-[var(--color-surface-2)]" : "border-border bg-surface",
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[13px] font-extrabold text-fg">{tpl.name}</span>
                  {on ? <Check className="h-4 w-4 text-fg" /> : null}
                </div>
                <p className="mb-2 text-[11px] text-muted">{tpl.blurb}</p>
                <ThemeChromePreview palette={tpl.id} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="rpma-panel overflow-hidden p-0">
        <div className="px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">Colour palettes</h2>
        </div>
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-3">
          {(Object.keys(PALETTES) as PaletteId[]).map((id) => {
            const p = PALETTES[id];
            const on = draft.palette === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, palette: id }))}
                className={cn(
                  "rounded-md border p-3 text-left",
                  on
                    ? "border-[var(--color-nav)] bg-[var(--color-surface-2)]"
                    : "border-border bg-surface",
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[13px] font-extrabold text-fg">{p.name}</span>
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
        <section key={g.id} className="rpma-panel overflow-hidden p-0">
          <div className="px-4 py-3">
            <h2 className="text-[16px] font-extrabold text-fg">{g.title}</h2>
            <p className="text-[12px] text-muted">{g.blurb}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="rpma-xls">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Value</th>
                  <th>Used By</th>
                </tr>
              </thead>
              <tbody>
                {THEME_TOKENS.filter((t) => t.group === g.id).map((t) => {
                  const value = computed[t.css] ?? "";
                  return (
                    <tr key={t.css}>
                      <td className="font-mono">{t.css}</td>
                      <td>
                        <span className="inline-flex items-center gap-2">
                          {t.kind === "color" ? (
                            <span
                              className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-border"
                              style={{ background: value || "transparent" }}
                            />
                          ) : null}
                          <span className="font-mono">{value || "—"}</span>
                        </span>
                      </td>
                      <td>{t.used}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
