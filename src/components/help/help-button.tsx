import { CircleHelp } from "lucide-react";
import { SpaLink } from "@/components/nav/spa-link";
import { cn } from "@/lib/utils";

export function HelpButton({ pathname }: { pathname?: string }) {
  const on = (pathname ?? "").startsWith("/help");
  return (
    <SpaLink
      href="/help"
      className={cn("dk-help-btn", on && "is-active")}
      title="Help"
      aria-label="Open application help"
    >
      <CircleHelp className="h-4 w-4" />
      <span>Help</span>
    </SpaLink>
  );
}
