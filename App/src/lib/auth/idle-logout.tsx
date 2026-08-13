import { useEffect, useRef } from "react";
import { authClient, authEnabled, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

/** Default idle timeout: 5 minutes */
export const IDLE_LOGOUT_MS = 5 * 60 * 1000;

/** Coalesce activity (mousemove etc.) — was firing on every pixel and resetting timers constantly */
const ACTIVITY_THROTTLE_MS = 2_000;

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousedown",
  "keydown",
  "touchstart",
  "pointerdown",
  "scroll",
];

/**
 * Signs the user out after `timeoutMs` of no activity.
 * Mount once inside authenticated layout (AppShell).
 */
export function useIdleLogout(timeoutMs: number = IDLE_LOGOUT_MS) {
  const { user, isPending } = useCurrentUserState();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armed = useRef(false);
  const lastActivity = useRef(0);

  useEffect(() => {
    if (!authEnabled || isPending || !user) {
      if (timer.current) clearTimeout(timer.current);
      armed.current = false;
      return;
    }

    armed.current = true;

    const logout = () => {
      if (!armed.current) return;
      armed.current = false;
      void (async () => {
        try {
          await signOut();
        } catch {
          try {
            await authClient.signOut();
          } catch {
            /* ignore */
          }
        }
        if (typeof window !== "undefined") {
          window.location.href = "/login?reason=idle";
        }
      })();
    };

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(logout, timeoutMs);
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivity.current < ACTIVITY_THROTTLE_MS) return;
      lastActivity.current = now;
      reset();
    };

    reset();
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true, capture: true });
    }
    // mousemove / wheel only via passive throttle (less frequent)
    window.addEventListener("mousemove", onActivity, { passive: true });
    window.addEventListener("wheel", onActivity, { passive: true });

    return () => {
      armed.current = false;
      if (timer.current) clearTimeout(timer.current);
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity, true);
      }
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("wheel", onActivity);
    };
  }, [user, isPending, timeoutMs]);
}


/** Shown on login when redirected after idle timeout */
export function IdleLogoutBanner() {
  if (typeof window === "undefined") return null;
  const reason = new URLSearchParams(window.location.search).get("reason");
  if (reason !== "idle") return null;
  return (
    <div
      role="status"
      className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-sm text-fg"
    >
      You were signed out after 5 minutes of inactivity.
    </div>
  );
}
