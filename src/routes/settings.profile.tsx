import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { USER_PROFILE_ENABLED, TWO_FACTOR_ENABLED } from "@/lib/auth/features";
import { MyProfilePanel, TwoFactorSetupPanel } from "@/components/auth/profile-security-panels";
import { CreateUserPanel } from "@/components/settings/create-user-panel";
import { listManagedUsers } from "@/lib/auth/admin-accounts";
import { useStaffProfile } from "@/lib/auth/use-staff-profile";

export const Route = createFileRoute("/settings/profile")({
  component: SettingsProfilePage,
});

function SettingsProfilePage() {
  const { profile } = useStaffProfile();
  const isAdmin = profile?.permissions.canAccessPlatformSettings === true;
  const [customers, setCustomers] = useState<Array<{ code: string; name: string }>>([]);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    const r = await listManagedUsers();
    if (r.ok) setCustomers(r.customers);
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const mine = profile?.allowedCustomerCodes;

  return (
    <div className="space-y-3">
      {USER_PROFILE_ENABLED ? <MyProfilePanel /> : null}
      <section className="rpma-panel px-4 py-3">
        <h2 className="text-[16px] font-extrabold text-fg">Your tenant access</h2>
        <p className="mt-1 text-[12px] text-muted">
          {mine == null || mine.length === 0
            ? "You can open every customer (platform / unscoped)."
            : `You can open ${mine.length} tenant(s): ${mine.join(", ")}.`}
        </p>
        {isAdmin ? (
          <p className="mt-2 text-[12px] text-muted">
            Create operators and assign tenants below, or open{" "}
            <Link to="/settings/users" className="font-semibold text-accent hover:underline">
              Users
            </Link>
            .
          </p>
        ) : null}
      </section>
      {isAdmin ? <CreateUserPanel customers={customers} onCreated={() => void load()} /> : null}
      {TWO_FACTOR_ENABLED ? <TwoFactorSetupPanel /> : null}
    </div>
  );
}
