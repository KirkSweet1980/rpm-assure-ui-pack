import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { KeyRound, Shield, ShieldCheck, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useStaffProfile } from "@/lib/auth/use-staff-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import { updateMyProfile } from "@/lib/auth/self-profile";

/** My profile — name, email, change password (any signed-in staff). */
export function MyProfilePanel({ compact = false }: { compact?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  const { profile } = useStaffProfile();
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName || profile?.displayName || user?.primaryEmail || "");
  }, [user, profile]);

  async function saveName() {
    setBusy(true);
    setMsg(null);
    try {
      const name = displayName.trim();
      if (!name) throw new Error("Display name is required.");
      const res = await authClient.updateUser({ name });
      if (res.error) throw new Error(res.error.message || "Could not update profile");
      const sql = await updateMyProfile({ data: { displayName: name } });
      setOk(true);
      setMsg(sql.message || "Profile updated.");
      try {
        await authClient.getSession();
      } catch {
        /* */
      }
    } catch (e) {
      setOk(false);
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setBusy(true);
    setMsg(null);
    try {
      if (currentPassword.length < 8) throw new Error("Enter your current password.");
      if (newPassword.length < 8) throw new Error("New password must be at least 8 characters.");
      if (newPassword !== confirmPassword) throw new Error("New password and confirmation do not match.");
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (res.error) throw new Error(res.error.message || "Could not change password");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOk(true);
      setMsg("Password updated. Other sessions were signed out.");
    } catch (e) {
      setOk(false);
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (isPending) {
    return <p className="text-sm text-muted">Loading profile…</p>;
  }

  return (
    <Card>
      <CardHead className="flex items-center gap-2">
        <UserRound className="h-4 w-4 text-accent" />
        My profile
      </CardHead>
      <CardContent className={`space-y-3 ${compact ? "p-3" : "p-4"} text-sm`}>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs sm:col-span-2">
            <span className="mb-1 block text-muted">Email (sign-in)</span>
            <input
              className="field opacity-80"
              readOnly
              value={user?.primaryEmail ?? profile?.email ?? ""}
            />
          </label>
          <label className="text-xs sm:col-span-2">
            <span className="mb-1 block text-muted">Display name</span>
            <input
              className="field"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={120}
            />
          </label>
          <div className="text-xs text-muted sm:col-span-2">
            Role:{" "}
            <strong className="text-fg">{profile?.permissions.label ?? profile?.role ?? "—"}</strong>
          </div>
        </div>
        <Button type="button" size="sm" disabled={busy} onClick={() => void saveName()}>
          Save display name
        </Button>

        <div className="border-t border-border/60 pt-3">
          <p className="mb-2 font-medium text-fg">Change password</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs sm:col-span-2">
              <span className="mb-1 block text-muted">Current password</span>
              <input
                className="field"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-muted">New password</span>
              <input
                className="field"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-muted">Confirm new password</span>
              <input
                className="field"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
          </div>
          <Button
            type="button"
            size="sm"
            className="mt-2"
            variant="secondary"
            disabled={busy}
            onClick={() => void changePassword()}
          >
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            Update password
          </Button>
        </div>

        {msg ? (
          <p
            className={
              ok
                ? "rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200"
                : "rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-200"
            }
          >
            {msg}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function secretFromTotpUri(uri: string): string | null {
  try {
    const q = uri.includes("?") ? uri.split("?")[1] : "";
    const params = new URLSearchParams(q);
    const s = params.get("secret");
    return s && s.length > 0 ? s : null;
  } catch {
    return null;
  }
}

/** TOTP 2FA enrollment / status (any signed-in staff). */
export function TwoFactorSetupPanel({ compact = false }: { compact?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  const [password, setPassword] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    const u = user as { twoFactorEnabled?: boolean } | null;
    setEnabled(Boolean(u?.twoFactorEnabled));
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    setQrDataUrl(null);
    if (!totpUri) return;
    void (async () => {
      try {
        const url = await QRCode.toDataURL(totpUri, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 220,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        if (!cancelled) setQrDataUrl(url);
      } catch (e) {
        if (!cancelled) {
          setQrDataUrl(null);
          setMsg(e instanceof Error ? e.message : "Could not render QR code");
          setOk(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [totpUri]);

  async function startEnable() {
    setBusy(true);
    setMsg(null);
    setQrDataUrl(null);
    try {
      if (password.length < 8) throw new Error("Enter your current password (min 8 characters).");
      const res = await authClient.twoFactor.enable({
        password,
        issuer: "RPM Assure",
      });
      if (res.error) throw new Error(res.error.message || "Could not enable 2FA");
      setTotpUri(res.data?.totpURI ?? null);
      setBackupCodes(res.data?.backupCodes ?? null);
      setMsg("Scan the QR code in your authenticator, save backup codes, then enter a 6-digit code.");
      setOk(true);
    } catch (e) {
      setOk(false);
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function confirmTotp() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await authClient.twoFactor.verifyTotp({
        code: verifyCode.replace(/\s+/g, ""),
      });
      if (res.error) throw new Error(res.error.message || "Invalid code");
      setEnabled(true);
      setTotpUri(null);
      setQrDataUrl(null);
      setMsg("Two-factor authentication is active.");
      setOk(true);
      setPassword("");
      setVerifyCode("");
      try {
        await authClient.getSession();
      } catch {
        /* */
      }
    } catch (e) {
      setOk(false);
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function disable2fa() {
    if (!confirm("Disable two-factor authentication? This reduces account security.")) return;
    setBusy(true);
    setMsg(null);
    try {
      if (password.length < 8) throw new Error("Enter your current password to disable 2FA.");
      const res = await authClient.twoFactor.disable({ password });
      if (res.error) throw new Error(res.error.message || "Could not disable 2FA");
      setEnabled(false);
      setBackupCodes(null);
      setTotpUri(null);
      setQrDataUrl(null);
      setMsg("Two-factor authentication has been disabled.");
      setOk(true);
      setPassword("");
    } catch (e) {
      setOk(false);
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (isPending) {
    return <p className="text-sm text-muted">Loading security…</p>;
  }

  const manualSecret = totpUri ? secretFromTotpUri(totpUri) : null;

  return (
    <Card>
      <CardHead className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-accent" />
        Two-factor authentication
      </CardHead>
      <CardContent className={`space-y-3 ${compact ? "p-3" : "p-4"} text-sm`}>
        <p className="text-muted">
          Required for all staff. Use Microsoft Authenticator, Google Authenticator, Authy, or similar.
          Scan the QR code when enrolling.
        </p>
        <div className="flex items-center gap-2">
          <span className="font-medium text-fg">Status:</span>
          {enabled ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" /> Enabled
            </span>
          ) : (
            <span className="font-semibold text-amber-700 dark:text-amber-300">
              Not enrolled — required
            </span>
          )}
        </div>

        <label className="block text-xs font-medium text-fg">
          Current password
          <input
            type="password"
            autoComplete="current-password"
            className="field mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Required to enable or disable 2FA"
          />
        </label>

        {!enabled && !totpUri ? (
          <Button type="button" size="sm" disabled={busy} onClick={() => void startEnable()}>
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            Set up authenticator
          </Button>
        ) : null}

        {totpUri ? (
          <div className="space-y-3 rounded-lg border border-border bg-bg/50 p-3">
            <div>
              <p className="font-medium text-fg">1. Scan this QR code</p>
              <p className="mt-0.5 text-[12px] text-muted">
                Open your authenticator app → Add account → Scan QR code.
              </p>
              <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <div className="rounded-xl border border-border bg-surface p-3 shadow-sm">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="2FA QR code for RPM Assure authenticator setup"
                      width={220}
                      height={220}
                      className="h-[220px] w-[220px]"
                    />
                  ) : (
                    <div className="flex h-[220px] w-[220px] items-center justify-center text-xs text-muted">
                      Generating QR…
                    </div>
                  )}
                </div>
                <div className="max-w-xs space-y-1 text-[12px] text-muted">
                  <p>
                    Issuer: <strong className="text-fg">RPM Assure</strong>
                  </p>
                  <p>Works with Microsoft Authenticator, Google Authenticator, Authy, 1Password, etc.</p>
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                className="text-xs font-medium text-accent hover:underline"
                onClick={() => setShowManual((v) => !v)}
              >
                {showManual ? "Hide manual entry" : "Can’t scan? Enter key manually"}
              </button>
              {showManual ? (
                <div className="mt-2 space-y-1 rounded-md border border-border/70 bg-surface/60 p-2">
                  {manualSecret ? (
                    <>
                      <p className="text-[11px] text-muted">Secret key (type into authenticator)</p>
                      <p className="break-all font-mono text-sm font-semibold tracking-wide text-fg">
                        {manualSecret}
                      </p>
                    </>
                  ) : null}
                  <p className="text-[11px] text-muted">Full setup URI</p>
                  <p className="break-all font-mono text-[10px] text-muted">{totpUri}</p>
                </div>
              ) : null}
            </div>

            {backupCodes && backupCodes.length > 0 ? (
              <div>
                <p className="font-medium text-fg">2. Save backup codes</p>
                <p className="text-[11px] text-muted">
                  Store these somewhere safe. Each code works once if you lose your phone.
                </p>
                <ul className="mt-1 grid grid-cols-2 gap-1 font-mono text-xs">
                  {backupCodes.map((c) => (
                    <li key={c} className="rounded bg-surface px-2 py-1">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <label className="block font-medium text-fg">
              3. Enter a 6-digit code to confirm
              <input
                className="field mt-1 font-mono tracking-widest"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </label>
            <Button type="button" size="sm" disabled={busy} onClick={() => void confirmTotp()}>
              Confirm and activate 2FA
            </Button>
          </div>
        ) : null}

        {enabled ? (
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void disable2fa()}>
            Disable 2FA
          </Button>
        ) : null}

        {msg ? (
          <p
            className={
              ok
                ? "rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200"
                : "rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-200"
            }
          >
            {msg}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
