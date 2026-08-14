import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/integrations")({
  component: function IntegrationsRedirect() {
    return <Navigate to="/settings/infrastructure" />;
  },
});
