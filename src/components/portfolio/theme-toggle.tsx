import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { theme, setPreference } = useTheme();

  return (
    <div className={cn("dn-theme", className)} role="group" aria-label="Snow or Carbon">
      <button
        type="button"
        className={cn("dn-theme-btn", theme === "light" && "is-active")}
        onClick={() => setPreference("light")}
        title="Snow Edition"
        aria-pressed={theme === "light"}
      >
        <Sun className="h-[18px] w-[18px]" />
      </button>
      <button
        type="button"
        className={cn("dn-theme-btn", theme === "dark" && "is-active")}
        onClick={() => setPreference("dark")}
        title="Carbon Edition"
        aria-pressed={theme === "dark"}
      >
        <Moon className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}
