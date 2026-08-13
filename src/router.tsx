import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    // Intent preload (Link + our SpaLink warm path)
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    // Parent customer loader stays warm across pillar/module clicks
    defaultPreloadStaleTime: 120_000,
    defaultStaleTime: 60_000,
    // Avoid white pending flash on quick tab switches
    defaultPendingMs: 1000,
    defaultPendingMinMs: 0,
  });
  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
