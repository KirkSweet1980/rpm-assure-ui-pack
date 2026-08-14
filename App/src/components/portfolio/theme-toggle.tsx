import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { theme, setPreference } = useTheme();
  const dark = theme === "dark";

  return (
    <label
      className={cn("rpma-theme-switch", className)}
      title={dark ? "Dark Mode On" : "Dark Mode Off"}
    >
      <span className="rpma-theme-switch-label">{dark ? "Dark Mode On" : "Dark Mode Off"}</span>
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        className={cn("rpma-theme-track", dark && "is-on")}
        onClick={() => setPreference(dark ? "light" : "dark")}
      >
        <span className="rpma-theme-thumb" />
      </button>
    </label>
  );
}
