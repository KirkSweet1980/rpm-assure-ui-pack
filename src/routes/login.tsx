import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, ShieldCheck, User, Download } from "lucide-react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { IdleLogoutBanner } from "@/lib/auth/idle-logout";
import { normalizeLoginIdentifier } from "@/lib/auth/root-admin";
import { RpmAssureMark } from "@/components/brand/rpm-assure-mark";
import { ThemeToggle } from "@/components/portfolio/theme-toggle";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

/** A — split: left CLI stack | right brand + login */
const LOGIN_BUILD = "cmd-centre-A-v3-split-20260812";

type FWinLine = { text: string; kind?: "prompt" | "ok" | "comment" | "kw" };

function FloatWin({
  variant,
  title,
  lines,
}: {
  variant: "ps" | "linux";
  title: string;
  lines: FWinLine[];
}) {
  return (
    <div
      className={`rpma-cmd-fwin rpma-cmd-fwin--${variant}`}
      aria-hidden="true"
    >
      <div className="rpma-cmd-fwin-bar">
        <span className="rpma-cmd-fwin-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="rpma-cmd-fwin-title">{title}</span>
      </div>
      <div className="rpma-cmd-fwin-body">
        {lines.map((ln, i) => (
          <div
            key={i}
            className={
              ln.kind === "prompt"
                ? "is-prompt"
                : ln.kind === "ok"
                  ? "is-ok"
                  : ln.kind === "comment"
                    ? "is-comment"
                    : ln.kind === "kw"
                      ? "is-kw"
                      : undefined
            }
          >
            {ln.text}
          </div>
        ))}
      </div>
    </div>
  );
}

const PS_LINES: FWinLine[] = [
  { text: "PS C:\\Scripts> Get-Service | ? Status -eq Running", kind: "prompt" },
  { text: "Status  Name       DisplayName", kind: "ok" },
  { text: "Running WinRM      Windows Remote Management" },
  { text: "Running EventLog   Windows Event Log" },
  { text: "PS C:\\Scripts> .\\Invoke-HealthCheck.ps1", kind: "prompt" },
  { text: ">> Result: Healthy", kind: "ok" },
  { text: "PS C:\\Scripts> _", kind: "prompt" },
];

const LINUX_LINES: FWinLine[] = [
  { text: "admin@srv01:~$ uptime", kind: "prompt" },
  { text: " 12:04:11 up 42 days,  3:18,  2 users", kind: "ok" },
  { text: "admin@srv01:~$ df -h /", kind: "prompt" },
  { text: "Filesystem  Size  Used  Avail  Use%", kind: "ok" },
  { text: "/dev/sda1    100G   42G    53G   44%", kind: "ok" },
  { text: "admin@srv01:~$ _", kind: "prompt" },
];

function LoginPage() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (!isPending && user) {
      void navigate({ to: "/" });
    }
  }, [isPending, user, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const u = username.trim();
      if (!u) throw new Error("Enter your username.");
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }
      const email = u.includes("@")
        ? u.toLowerCase()
        : normalizeLoginIdentifier(u);
      if (!email) throw new Error("Enter username or email.");
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        const raw = res.error.message || res.error.statusText || "Sign-in failed";
        if (/invalid|credential|password|user/i.test(raw)) {
          throw new Error("Invalid username or password.");
        }
        throw new Error(raw);
      }
      await navigate({ to: "/" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/fetch|network|Failed to fetch/i.test(message)) {
        setError(message + " — check the app is running.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rpma-cmd" data-login-build={LOGIN_BUILD}>
      <style>{`
.rpma-cmd {
  position: relative !important;
  isolation: isolate !important;
  min-height: 100dvh !important;
  width: 100% !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  color: #e8f4ff !important;
  background: #050d18 !important;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif !important;
}
.rpma-cmd-bg {
  position: absolute !important;
  inset: 0 !important;
  z-index: 0 !important;
  pointer-events: none !important;
  background:
    radial-gradient(ellipse 90% 80% at 18% 40%, rgba(27, 184, 166, 0.16) 0%, transparent 52%),
    radial-gradient(ellipse 70% 60% at 82% 50%, rgba(43, 111, 174, 0.32) 0%, transparent 55%),
    radial-gradient(ellipse 55% 45% at 50% 0%, rgba(20, 80, 120, 0.4) 0%, transparent 55%),
    linear-gradient(155deg, #061018 0%, #0a1a2e 40%, #071525 75%, #040a12 100%) !important;
}
.rpma-cmd-grid {
  position: absolute !important;
  inset: 0 !important;
  z-index: 0 !important;
  pointer-events: none !important;
  background-image:
    linear-gradient(rgba(27, 184, 166, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(43, 111, 174, 0.11) 1px, transparent 1px) !important;
  background-size: 44px 44px !important;
  mask-image: radial-gradient(ellipse 95% 90% at 50% 50%, #000 12%, transparent 90%) !important;
  -webkit-mask-image: radial-gradient(ellipse 95% 90% at 50% 50%, #000 12%, transparent 90%) !important;
}
/* Hide legacy global login layers */
.rpma-cmd .rpma-login-sql-bg,
.rpma-cmd .rpma-login-page-words,
.rpma-cmd .rpma-login-brand-words,
.rpma-cmd .rpma-login-fwin,
.rpma-cmd .rpma-login-ps-stage,
.rpma-cmd .rpma-login-hero-center {
  display: none !important;
}

/* ===== SPLIT SHELL ===== */
.rpma-cmd-shell {
  position: relative !important;
  z-index: 3 !important;
  flex: 1 1 auto !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
  min-height: 100dvh !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

/* LEFT: CLI windows */
.rpma-cmd-left {
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 1.35rem !important;
  padding: clamp(1.25rem, 4vh, 2.5rem) clamp(1rem, 3.5vw, 2.5rem) !important;
  box-sizing: border-box !important;
  border-right: 1px solid rgba(27, 184, 166, 0.18) !important;
  background:
    linear-gradient(90deg, rgba(4, 12, 22, 0.35) 0%, transparent 100%) !important;
}
.rpma-cmd-left-label {
  align-self: flex-start !important;
  margin: 0 0 0.25rem 0.15rem !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: 0.2em !important;
  text-transform: uppercase !important;
  color: rgba(27, 184, 166, 0.75) !important;
}
.rpma-cmd-fwin {
  position: relative !important;
  top: auto !important;
  left: auto !important;
  right: auto !important;
  bottom: auto !important;
  width: min(100%, 420px) !important;
  max-width: 100% !important;
  border-radius: 10px !important;
  border: 1px solid rgba(62, 207, 191, 0.35) !important;
  background: linear-gradient(160deg, rgba(8, 28, 48, 0.96) 0%, rgba(6, 18, 32, 0.94) 100%) !important;
  box-shadow:
    0 16px 48px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(27, 184, 166, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.07) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  overflow: hidden !important;
  opacity: 0.95 !important;
  display: block !important;
  transform: none !important;
}
.rpma-cmd-fwin--ps {
  transform: rotate(-1.2deg) !important;
}
.rpma-cmd-fwin--linux {
  transform: rotate(1deg) !important;
}
.rpma-cmd-fwin-bar {
  display: flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
  padding: 0.4rem 0.65rem !important;
  background: rgba(10, 40, 64, 0.92) !important;
  border-bottom: 1px solid rgba(27, 184, 166, 0.22) !important;
  font-size: 10px !important;
  color: rgba(200, 230, 255, 0.75) !important;
}
.rpma-cmd-fwin-dots {
  display: flex !important;
  gap: 4px !important;
}
.rpma-cmd-fwin-dots i {
  display: block !important;
  width: 7px !important;
  height: 7px !important;
  border-radius: 50% !important;
  background: #ff5f57 !important;
}
.rpma-cmd-fwin-dots i:nth-child(2) { background: #febc2e !important; }
.rpma-cmd-fwin-dots i:nth-child(3) { background: #28c840 !important; }
.rpma-cmd-fwin-title {
  font-family: ui-monospace, Consolas, monospace !important;
  font-size: 10px !important;
  opacity: 0.85 !important;
}
.rpma-cmd-fwin-body {
  padding: 0.55rem 0.7rem 0.75rem !important;
  font-family: ui-monospace, Consolas, "Cascadia Code", monospace !important;
  font-size: 11.5px !important;
  line-height: 1.5 !important;
  color: rgba(180, 220, 255, 0.85) !important;
}
.rpma-cmd-fwin--ps .is-prompt { color: #3ecfbf !important; }
.rpma-cmd-fwin--ps .is-ok { color: #8fce4a !important; }
.rpma-cmd-fwin--linux .rpma-cmd-fwin-body { color: #7dce7d !important; }
.rpma-cmd-fwin--linux .is-prompt { color: #55ff99 !important; font-weight: 600 !important; }
.rpma-cmd-fwin--linux .is-ok { color: #b8f0b8 !important; }
.rpma-cmd-fwin--linux .rpma-cmd-fwin-dots i:nth-child(1) { background: #e95420 !important; }
.rpma-cmd-fwin--linux .rpma-cmd-fwin-dots i:nth-child(2) { background: #77216f !important; }
.rpma-cmd-fwin--linux .rpma-cmd-fwin-dots i:nth-child(3) { background: #5e2750 !important; }

/* RIGHT: brand + login */
.rpma-cmd-right {
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 1.35rem !important;
  padding: clamp(1.5rem, 5vh, 3rem) clamp(1.25rem, 4vw, 3rem) 3.5rem !important;
  box-sizing: border-box !important;
  background:
    radial-gradient(ellipse 80% 70% at 50% 40%, rgba(27, 184, 166, 0.08) 0%, transparent 65%),
    linear-gradient(270deg, rgba(4, 12, 22, 0.2) 0%, transparent 55%) !important;
}
.rpma-cmd-brand {
  text-align: center !important;
  max-width: 22rem !important;
}
.rpma-cmd-brand-mark {
  display: flex !important;
  justify-content: center !important;
  filter: drop-shadow(0 0 32px rgba(27, 184, 166, 0.5)) !important;
}
.rpma-cmd-title {
  margin: 0.85rem 0 0 !important;
  font-size: clamp(2.4rem, 4.5vw, 3.35rem) !important;
  font-weight: 800 !important;
  letter-spacing: -0.03em !important;
  line-height: 1.05 !important;
}
.rpma-cmd-rpm {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}
.rpma-cmd-assure {
  color: #1bb8a6 !important;
  -webkit-text-fill-color: #1bb8a6 !important;
}
.rpma-cmd-tag {
  margin: 0.6rem 0 0 !important;
  font-size: 0.72rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.22em !important;
  text-transform: uppercase !important;
  color: rgba(27, 184, 166, 0.95) !important;
}
.rpma-cmd-glass {
  width: 100% !important;
  max-width: 24rem !important;
  box-sizing: border-box !important;
  padding: 1.65rem 1.5rem 1.5rem !important;
  border-radius: 1.15rem !important;
  text-align: left !important;
  background: linear-gradient(
    165deg,
    rgba(18, 42, 68, 0.82) 0%,
    rgba(10, 24, 40, 0.9) 100%
  ) !important;
  border: 1px solid rgba(100, 180, 220, 0.28) !important;
  box-shadow:
    0 28px 70px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(27, 184, 166, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(20px) saturate(1.25) !important;
  -webkit-backdrop-filter: blur(20px) saturate(1.25) !important;
}
.rpma-cmd-glass-head {
  display: flex !important;
  align-items: flex-start !important;
  gap: 0.65rem !important;
  margin-bottom: 1rem !important;
}
.rpma-cmd-glass-head svg {
  flex-shrink: 0 !important;
  margin-top: 0.2rem !important;
  color: #1bb8a6 !important;
}
.rpma-cmd-glass-title {
  margin: 0 !important;
  font-size: 1.35rem !important;
  font-weight: 700 !important;
  color: #fff !important;
}
.rpma-cmd-glass-sub {
  margin: 0.3rem 0 0 !important;
  font-size: 13px !important;
  color: rgba(200, 220, 240, 0.72) !important;
}
.rpma-cmd-form {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.9rem !important;
}
.rpma-cmd-field { display: block !important; }
.rpma-cmd-field-label {
  display: block !important;
  margin-bottom: 0.35rem !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  color: rgba(210, 230, 245, 0.85) !important;
}
.rpma-cmd-field-wrap {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
}
.rpma-cmd-field-icon {
  position: absolute !important;
  left: 0.75rem !important;
  color: rgba(140, 180, 200, 0.75) !important;
  pointer-events: none !important;
}
.rpma-cmd-field-wrap input {
  width: 100% !important;
  box-sizing: border-box !important;
  padding: 0.7rem 2.5rem 0.7rem 2.35rem !important;
  border-radius: 0.65rem !important;
  border: 1px solid rgba(100, 160, 200, 0.28) !important;
  background: rgba(6, 16, 28, 0.65) !important;
  color: #f0f7ff !important;
  font-size: 14px !important;
  outline: none !important;
}
.rpma-cmd-field-wrap input::placeholder {
  color: rgba(150, 180, 200, 0.45) !important;
}
.rpma-cmd-field-wrap input:focus {
  border-color: rgba(27, 184, 166, 0.65) !important;
  box-shadow: 0 0 0 3px rgba(27, 184, 166, 0.18) !important;
}
.rpma-cmd-field-eye {
  position: absolute !important;
  right: 0.55rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0.35rem !important;
  border: 0 !important;
  background: transparent !important;
  color: rgba(160, 190, 210, 0.8) !important;
  cursor: pointer !important;
}
.rpma-cmd-error {
  margin: 0 !important;
  padding: 0.55rem 0.7rem !important;
  border-radius: 0.5rem !important;
  border: 1px solid rgba(220, 80, 80, 0.4) !important;
  background: rgba(80, 20, 20, 0.35) !important;
  color: #ffb4b4 !important;
  font-size: 13px !important;
}
.rpma-cmd-submit {
  margin-top: 0.15rem !important;
  width: 100% !important;
  padding: 0.75rem 1rem !important;
  border: 0 !important;
  border-radius: 0.65rem !important;
  background: linear-gradient(180deg, #22c9b6 0%, #1bb8a6 55%, #159e8f 100%) !important;
  color: #041016 !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  box-shadow: 0 8px 24px rgba(27, 184, 166, 0.35) !important;
}
.rpma-cmd-submit:hover:not(:disabled) { filter: brightness(1.06) !important; }
.rpma-cmd-submit:disabled { opacity: 0.65 !important; cursor: wait !important; }
.rpma-cmd-footer {
  position: absolute !important;
  bottom: 0.9rem !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 6 !important;
  margin: 0 !important;
  text-align: center !important;
  font-size: 0.78rem !important;
  color: rgba(180, 210, 230, 0.55) !important;
  pointer-events: none !important;
}

@media (max-width: 900px) {
  .rpma-cmd-shell {
    grid-template-columns: 1fr !important;
    min-height: auto !important;
  }
  .rpma-cmd-left {
    border-right: 0 !important;
    border-bottom: 1px solid rgba(27, 184, 166, 0.15) !important;
    padding-top: 1.25rem !important;
    padding-bottom: 1rem !important;
    min-height: auto !important;
  }
  .rpma-cmd-fwin--linux { display: none !important; }
  .rpma-cmd-fwin--ps { transform: none !important; opacity: 0.75 !important; }
  .rpma-cmd-right {
    min-height: 70dvh !important;
    padding-bottom: 3.25rem !important;
  }
}
`}</style>

      <div className="rpma-cmd-bg" aria-hidden="true" />
      <div className="rpma-cmd-grid" aria-hidden="true" />

      <div className="rpma-cmd-shell">
        {/* LEFT — CLI only */}
        <aside className="rpma-cmd-left" aria-hidden="true">
          <p className="rpma-cmd-left-label">Operations</p>
          <FloatWin
            variant="ps"
            title="Windows PowerShell"
            lines={PS_LINES}
          />
          <FloatWin
            variant="linux"
            title="bash — admin@srv01"
            lines={LINUX_LINES}
          />
        </aside>

        {/* RIGHT — brand + login */}
        <section className="rpma-cmd-right">
          <div className="mb-3 flex justify-end">
            <ThemeToggle />
          </div>
          <div className="rpma-cmd-brand">
            <div className="rpma-cmd-brand-mark">
              <RpmAssureMark size={88} showWordmark={false} staticMark />
            </div>
            <h1 className="rpma-cmd-title">
              <span className="rpma-cmd-rpm">RPM </span>
              <span className="rpma-cmd-assure">Assure</span>
            </h1>
            <p className="rpma-cmd-tag">Assurance Delivered</p>
          </div>

          <div className="rpma-cmd-glass">
            <div className="rpma-cmd-glass-head">
              <ShieldCheck size={20} aria-hidden />
              <div>
                <h2 className="rpma-cmd-glass-title">Welcome to RPM Assure</h2>
                <p className="rpma-cmd-glass-sub">Secure login for staff</p>
              </div>
            </div>

            <IdleLogoutBanner />

            {!authEnabled ? (
              <p className="rpma-cmd-error">Auth is disabled.</p>
            ) : (
              <form className="rpma-cmd-form" onSubmit={onSubmit}>
                <label className="rpma-cmd-field">
                  <span className="rpma-cmd-field-label">Username</span>
                  <span className="rpma-cmd-field-wrap">
                    <User size={16} className="rpma-cmd-field-icon" aria-hidden />
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </span>
                </label>

                <label className="rpma-cmd-field">
                  <span className="rpma-cmd-field-label">Password</span>
                  <span className="rpma-cmd-field-wrap">
                    <Lock size={16} className="rpma-cmd-field-icon" aria-hidden />
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="rpma-cmd-field-eye"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </label>

                {error ? <p className="rpma-cmd-error">{error}</p> : null}

                <button type="submit" className="rpma-cmd-submit" disabled={busy}>
                  {busy ? "Signing in..." : "Sign in"}
                </button>
                <a
                  href="/downloads/RPMAssure-Exco-SoftBoard.zip"
                  download="RPMAssure-Exco-SoftBoard.zip"
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 text-sm font-semibold text-white hover:bg-white/20"
                >
                  <Download size={16} />
                  Download install ZIP
                </a>
              </form>
            )}
          </div>
        </section>
      </div>

      <p className="rpma-cmd-footer">Powered by RPM Resources</p>
    </div>
  );
}
