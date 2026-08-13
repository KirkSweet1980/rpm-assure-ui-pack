import { createFileRoute, Link } from "@tanstack/react-router";
import { USER_PROFILE_ENABLED, TWO_FACTOR_ENABLED } from "@/lib/auth/features";
import { MyProfilePanel, TwoFactorSetupPanel } from "@/components/auth/profile-security-panels";

export const Route = createFileRoute("/settings/profile")({
  component: SettingsProfilePage,
});

function SettingsProfilePage() {
  if (!USER_PROFILE_ENABLED && !TWO_FACTOR_ENABLED) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        <p className="font-medium text-fg">Profiles temporarily disabled</p>
        <p className="mt-2">
          User profiles and 2FA will return in a later release. Continue using the app with your
          existing sign-in.
        </p>
        <Link to="/settings" className="mt-3 inline-block text-accent hover:underline">
          Back to Configuration
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {USER_PROFILE_ENABLED ? <MyProfilePanel /> : null}
      {TWO_FACTOR_ENABLED ? <TwoFactorSetupPanel /> : null}
    </div>
  );
}
