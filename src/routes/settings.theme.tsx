import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Palette } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { ConfigPageHead } from "@/components/settings/config-page";
import { ThemeChromePreview } from "@/components/theme/theme-chrome-preview";
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

function ThemeTokensPage() {
  const { theme } = useTheme();
  const [palette, setPalette] = useState<PaletteId>("slate");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setPalette(readPalette());
  }, []);

  useEffect(() => {
    persistPalette(palette, theme);
    setTick((n) => n + 1);
  }, [palette, theme]);

  const computed = useMemo(() => {
    const map: Record<string, string> = {};
    THEME_TOKENS.forEach((t) => {
      map[t.css] = readComputedToken(t.css);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, theme, palette]);

  return (
    <div className="space-y-6">
      <ConfigPageHead title="Theme Tokens" icon={Palette} />

      <section className="rpma-panel overflow-hidden p-0">
        <div className="px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">Palette</h2>
        </div>
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-3">
          {(Object.keys(PALETTES) as PaletteId[]).map((id) => {
            const p = PALETTES[id];
            const on = palette === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPalette(id)}
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
