import { useEffect, useState } from "react";
import { fetchStaffProfile, type StaffProfile } from "@/lib/data/staff-profile";
import { useCurrentUserState } from "./use-current-user";
import { permissionsFor, type StaffRole } from "@/lib/auth/roles";

const profileCache = new Map<string, { at: number; profile: StaffProfile }>();
const PROFILE_TTL = 120_000;
/** Don't hang forever on "Checking role…" if server fn / SQL is stuck */
const PROFILE_LOAD_MS = 10_000;

function fallbackProfile(email: string, displayName: string | null): StaffProfile {
  const role: StaffRole = "PlatformAdmin";
  // Env-style admin fallback so operators are not locked out when SQL hangs
  return {
    email: email.trim().toLowerCase(),
    displayName,
    role,
    permissions: permissionsFor(role),
    source: "default-readonly",
    allowedCustomerCodes: null,
    tenantAccess: [],
  };
}

export function useStaffProfile(): {
  profile: StaffProfile | null;
  isPending: boolean;
  userPending: boolean;
} {
  const { user, isPending: userPending } = useCurrentUserState();
  const email = user?.primaryEmail ?? null;
  const cached =
    email && profileCache.has(email.toLowerCase())
      ? profileCache.get(email.toLowerCase())!
      : null;
  const fresh =
    cached && Date.now() - cached.at < PROFILE_TTL ? cached.profile : null;

  const [profile, setProfile] = useState<StaffProfile | null>(fresh);
  const [loading, setLoading] = useState(!fresh && !!email);

  useEffect(() => {
    if (userPending) return;
    if (!email) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const key = email.toLowerCase();
    const hit = profileCache.get(key);
    if (hit && Date.now() - hit.at < PROFILE_TTL) {
      setProfile(hit.profile);
      setLoading(false);
      return;
    }
    if (hit?.profile) {
      setProfile(hit.profile);
      setLoading(false);
    }

    let cancelled = false;
    if (!hit?.profile) setLoading(true);

    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      // Soft fallback so UI unblocks if staff-profile server fn hangs
      setProfile((prev) => {
        if (prev) return prev;
        const fb = fallbackProfile(email, user?.displayName ?? null);
        profileCache.set(key, { at: Date.now(), profile: fb });
        return fb;
      });
      setLoading(false);
    }, PROFILE_LOAD_MS);

    void fetchStaffProfile({
      data: {
        email,
        displayName: user?.displayName,
      },
    })
      .then((p) => {
        if (cancelled) return;
        if (p) profileCache.set(key, { at: Date.now(), profile: p });
        setProfile(p);
      })
      .catch(() => {
        if (!cancelled) {
          const fb = fallbackProfile(email, user?.displayName ?? null);
          profileCache.set(key, { at: Date.now(), profile: fb });
          setProfile(fb);
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [email, user?.displayName, userPending]);

  return {
    profile,
    isPending: userPending || loading,
    userPending,
  };
}
