import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useStaffProfile } from "@/lib/auth/use-staff-profile";
import { Button } from "@/components/ui/button";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isPending: userPending } = useCurrentUserState();
  const { profile, isPending: rolePending } = useStaffProfile();

  if (userPending && !user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg p-6 text-center">
        <p className="text-sm text-muted">Checking session…</p>
        <p className="max-w-sm text-[12px] text-subtle">
          If this stays more than a few seconds, your session cookie may not be
          reaching the app. Try sign-in again or a private window.
        </p>
        <Button asChild variant="secondary" size="sm">
          <Link to="/login">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  if (!user && !userPending) {
    return <RedirectToSignIn />;
  }

  if (user && rolePending && !profile) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg p-6 text-center">
        <p className="text-sm text-muted">Checking role…</p>
        <p className="max-w-sm text-[12px] text-subtle">
          Loading staff permissions. If this hangs, live SQL may be unreachable —
          env admins still work in demo mode.
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    );
  }

  if (user && !rolePending && !profile) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg p-6 text-center">
        <h1 className="text-lg font-semibold text-fg">Could not load role</h1>
        <p className="max-w-md text-sm text-muted">
          Signed in as {user.primaryEmail ?? user.id}, but staff profile could not be resolved. Check
          Live SQL / App_User, or try again.
        </p>
        <Button type="button" variant="secondary" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    );
  }

  if (profile && !profile.permissions.canViewPortfolio) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg p-6 text-center">
        <h1 className="text-lg font-semibold text-fg">Access denied</h1>
        <p className="max-w-md text-sm text-muted">
          Your account ({profile.email}) is inactive or has no Portfolio access. Ask a Platform Admin
          to enable you in <span className="font-mono">App_User</span>.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => void signOut()}>
            Sign out
          </Button>
          <Button asChild variant="ghost">
            <Link to="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
