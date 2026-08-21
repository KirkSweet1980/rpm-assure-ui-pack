import { Link } from "@tanstack/react-router";
import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";
import { helpTopicIdForPath } from "@/lib/help/route-map";

export function HelpButton({ pathname }: { pathname?: string }) {
  const path = pathname ?? "";
  const on = path.startsWith("/help");
  const topic = helpTopicIdForPath(path);
  return (
    <Link
      to="/help/$topic"
      params={{ topic }}
      className={cn("dk-help-btn", on && "is-active")}
      title="Help"
      aria-label="Open application help"
    >
      <CircleHelp className="h-4 w-4" />
      <span>Help</span>
    </Link>
  );
}