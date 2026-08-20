import { Link } from "@tanstack/react-router";
import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

export function HelpButton({ pathname }: { pathname?: string }) {
  const on = (pathname ?? "").startsWith("/help");
  return (
    <Link
      to="/help/$topic"
      params={{ topic: "overview" }}
      className={cn("dk-help-btn", on && "is-active")}
      title="Help"
      aria-label="Open application help"
    >
      <CircleHelp className="h-4 w-4" />
      <span>Help</span>
    </Link>
  );
}
