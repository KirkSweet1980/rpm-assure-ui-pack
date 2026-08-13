import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { TWO_FACTOR_ENABLED } from "@/lib/auth/features";

export const Route = createFileRoute("/two-factor")({
  component: TwoFactorVerifyPage,
});

/**
 * Second factor after password sign-in.
 * better-auth holds a short-lived 2FA cookie until TOTP/backup succeeds.
 */
function TwoFactorVerifyPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"totp" | "backup">("totp");

  if (!TWO_FACTOR_ENABLED) {
    return <Navigate to="/" />;
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const trimmed = code.replace(/\s+/g, "");
      if (mode === "totp") {
        const res = await authClient.twoFactor.verifyTotp({
          code: trimmed,
          trustDevice,
        });
        if (res.error) throw new Error(res.error.message || "Invalid code");
      } else {
        const res = await authClient.twoFactor.verifyBackupCode({
          code: trimmed,
          trustDevice,
        });
        if (res.error) throw new Error(res.error.message || "Invalid backup code");
      }
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!authEnabled) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-6 text-sm text-muted">
        Auth is disabled.
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg p-6">
      <form
        onSubmit={(e) => void verify(e)}
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-semibold text-fg">Two-factor verification</h1>
        </div>
        <p className="text-sm text-muted">
          Enter the code from your authenticator app, or a one-time backup code.
        </p>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            className={mode === "totp" ? "font-semibold text-accent" : "text-muted"}
            onClick={() => setMode("totp")}
          >
            Authenticator
          </button>
          <button
            type="button"
            className={mode === "backup" ? "font-semibold text-accent" : "text-muted"}
            onClick={() => setMode("backup")}
          >
            Backup code
          </button>
        </div>
        <input
          className="field font-mono tracking-widest"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={mode === "totp" ? "000000" : "Backup code"}
          autoComplete="one-time-code"
          inputMode={mode === "totp" ? "numeric" : "text"}
        />
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={trustDevice}
            onChange={(e) => setTrustDevice(e.target.checked)}
          />
          Trust this device for 30 days
        </label>
        {error ? (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-200">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Verifying…" : "Verify and continue"}
        </button>
      </form>
    </div>
  );
}
