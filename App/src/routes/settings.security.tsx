import { createFileRoute, Link } from "@tanstack/react-router";
import { TWO_FACTOR_ENABLED, USER_PROFILE_ENABLED } from "@/lib/auth/features";
import { MyProfilePanel, TwoFactorSetupPanel } from "@/components/auth/profile-security-panels";

export const Route = createFileRoute("/settings/security")({
  component: SettingsSecurityPage,
});

function SettingsSecurityPage() {
  if (!TWO_FACTOR_ENABLED) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        <p className="font-medium text-fg">2FA temporarily disabled</p>
        <p className="mt-2">
          Two-factor authentication setup is turned off for now. Sign-in is password only.
        </p>
        <Link to="/settings" className="mt-3 inline-block text-accent hover:underline">
          Back to Configuration
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <TwoFactorSetupPanel />
      {USER_PROFILE_ENABLED ? <MyProfilePanel compact /> : null}
    </div>
  );
}
