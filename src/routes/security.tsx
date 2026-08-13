import { createFileRoute, Navigate } from "@tanstack/react-router";
import { TWO_FACTOR_ENABLED } from "@/lib/auth/features";

export const Route = createFileRoute("/security")({
  component: () =>
    TWO_FACTOR_ENABLED ? (
      <Navigate to="/settings/security" />
    ) : (
      <Navigate to="/" />
    ),
});
