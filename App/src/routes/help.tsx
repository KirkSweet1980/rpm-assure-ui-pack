import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { CircleHelp } from "lucide-react";
import { RequireAuth } from "@/components/portfolio/require-auth";
import { AppShell } from "@/components/portfolio/app-shell";
import { SpaLink } from "@/components/nav/spa-link";
import { HELP_GROUPS, HELP_TOPICS } from "@/lib/help/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/help")({
  component: HelpLayout,
});

function HelpLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <RequireAuth>
      <AppShell>
        <div className="rpma-help is-page">
          <aside className="rpma-help-nav" aria-label="Help topics">
            <p className="rpma-help-kicker">
              <CircleHelp className="h-3.5 w-3.5" /> Application help
            </p>
            <SpaLink href="/help" className={cn("rpma-help-link", (pathname === "/help" || pathname === "/help/") && "is-on")}>
              Help catalogue
            </SpaLink>
            {HELP_GROUPS.map((g) => (
              <div key={g} className="rpma-help-group">
                <h3>{g}</h3>
                {HELP_TOPICS.filter((t) => t.group === g).map((t) => {
                  const href = `/help/${t.id}`;
                  return (
                    <SpaLink
                      key={t.id}
                      href={href}
                      className={cn("rpma-help-link", pathname === href && "is-on")}
                    >
                      {t.title}
                    </SpaLink>
                  );
                })}
              </div>
            ))}
          </aside>
          <div className="rpma-help-body">
            <Outlet />
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
}