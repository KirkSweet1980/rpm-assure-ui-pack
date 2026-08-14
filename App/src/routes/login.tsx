import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { IdleLogoutBanner } from "@/lib/auth/idle-logout";
import { normalizeLoginIdentifier } from "@/lib/auth/root-admin";
import { RpmAssureMark } from "@/components/brand/rpm-assure-mark";
import { ThemeToggle } from "@/components/portfolio/theme-toggle";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const LOGIN_BUILD = "cinema-glass-D-20260814";

const SQL_LINES: { t: string; k?: "kw" | "cm" | "st" | "ok" }[] = [
  { t: "-- RPM Assure  |  live collect  |  central RPMAssure_App", k: "cm" },
  { t: "SET NOCOUNT ON;" },
  { t: "DECLARE @Snap date = CONVERT(date, SYSUTCDATETIME());", k: "kw" },
  { t: "" },
  { t: "SELECT c.CustomerCode, c.DisplayName, c.Active", k: "kw" },
  { t: "FROM dbo.Dim_Customer AS c WITH (NOLOCK)" },
  { t: "WHERE c.Active = 1" },
  { t: "ORDER BY c.DisplayName;" },
  { t: "" },
  { t: "SELECT SnapshotDate, OrganizationName, DeviceId, IsOnline", k: "kw" },
  { t: "FROM dbo.Pulseway_Devices WITH (NOLOCK)" },
  { t: "WHERE SnapshotDate = @Snap" },
  { t: "  AND CustomerCode = N'SIRF';", k: "st" },
  { t: "" },
  { t: "-- 28 servers online  ·  0 offline", k: "ok" },
  { t: "" },
  { t: "SELECT TenantId, SecureScore, MfaRegisteredPct", k: "kw" },
  { t: "FROM dbo.Csp_TenantPosture WITH (NOLOCK)" },
  { t: "WHERE SnapshotDate = @Snap;" },
  { t: "" },
  { t: "MERGE dbo.Agent_Registry AS t", k: "kw" },
  { t: "USING (SELECT N'SIRF' CustomerCode) AS s" },
  { t: "ON t.CustomerCode = s.CustomerCode" },
  { t: "WHEN MATCHED THEN UPDATE SET LastHeartbeatUtc = SYSUTCDATETIME();" },
  { t: "" },
  { t: "SELECT LastStatus, LastHeartbeatUtc", k: "kw" },
  { t: "FROM dbo.Agent_Registry WITH (NOLOCK)" },
  { t: "WHERE CustomerCode = N'SIRF';", k: "st" },
  { t: "-- ONLINE  2026-08-14 08:44:15Z", k: "ok" },
  { t: "" },
  { t: "SELECT CompanyDb, JobName, ErrorCount", k: "kw" },
  { t: "FROM dbo.Fact_SysproJob WITH (NOLOCK)" },
  { t: "WHERE SnapshotDate = @Snap AND ErrorCount > 0;" },
  { t: "" },
  { t: "GO", k: "kw" },
];

function SqlColumn({ className }: { className?: string }) {
  const block = [...SQL_LINES, { t: "" }, ...SQL_LINES, { t: "" }, ...SQL_LINES];
  return (
    <div className={className} aria-hidden="true">
      <div className="rpma-cin-track">
        {block.map((ln, i) => (
          <div key={i} className={`rpma-cin-line${ln.k ? ` is-${ln.k}` : ""}`}>
            <span className="rpma-cin-gutter">{String((i % SQL_LINES.length) + 1).padStart(3, " ")}</span>
            <span className="rpma-cin-text">{ln.t || " "}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    <div className="rpma-cin" data-login-build={LOGIN_BUILD}>
      <style>{CINEMA_CSS}</style>

      <div className="rpma-cin-wall" aria-hidden="true">
        <SqlColumn className="rpma-cin-col rpma-cin-col--a" />
        <SqlColumn className="rpma-cin-col rpma-cin-col--b" />
        <SqlColumn className="rpma-cin-col rpma-cin-col--c" />
      </div>
      <div className="rpma-cin-vignette" aria-hidden="true" />

      <div className="rpma-cin-shell">
        <aside className="rpma-cin-left" aria-hidden="true">
          <div className="rpma-cin-editor">
            <div className="rpma-cin-editor-bar">
              <span className="rpma-cin-dots">
                <i />
                <i />
                <i />
              </span>
              <span>collect.sql — RPMAssure_App</span>
            </div>
            <SqlColumn className="rpma-cin-col rpma-cin-col--focus" />
          </div>
        </aside>

        <div className="rpma-cin-divider" aria-hidden="true" />

        <section className="rpma-cin-right">
          <div className="rpma-cin-tools">
            <ThemeToggle />
          </div>

          <div className="rpma-cin-card">
            <div className="rpma-cin-mark">
              <RpmAssureMark size={84} showWordmark={false} staticMark />
            </div>
            <h1 className="rpma-cin-title">
              <span className="rpma-cin-rpm">RPM </span>
              <span className="rpma-cin-assure">Assure</span>
            </h1>
            <p className="rpma-cin-tag">* - Assurance Delivered -</p>

            <IdleLogoutBanner />

            {!authEnabled ? (
              <p className="rpma-cin-error">Auth is disabled.</p>
            ) : (
              <form className="rpma-cin-form" onSubmit={onSubmit}>
                <label className="rpma-cin-field">
                  <span>Username</span>
                  <span className="rpma-cin-wrap">
                    <User size={16} aria-hidden />
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </span>
                </label>
                <label className="rpma-cin-field">
                  <span>Password</span>
                  <span className="rpma-cin-wrap">
                    <Lock size={16} aria-hidden />
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="current-password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="rpma-cin-eye"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </label>
                {error ? <p className="rpma-cin-error">{error}</p> : null}
                <button type="submit" className="rpma-cin-submit" disabled={busy}>
                  {busy ? "Signing in..." : "Sign in"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>

      <p className="rpma-cin-foot">Powered by RPM Resources</p>
    </div>
  );
}

const CINEMA_CSS = `
.rpma-cin {
  position: relative; isolation: isolate; min-height: 100dvh; width: 100%;
  overflow: hidden; display: flex; flex-direction: column;
  background: #061018; color: #e8f4ff;
  font-family: ui-sans-serif, system-ui, "Segoe UI", sans-serif;
}
.rpma-cin .rpma-login-sql-bg,
.rpma-cin .rpma-login-page-words,
.rpma-cin .rpma-login-brand-words,
.rpma-cin .rpma-login-fwin,
.rpma-cin .rpma-login-ps-stage,
.rpma-cin .rpma-login-hero-center { display: none !important; }

.rpma-cin-wall {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  display: grid; grid-template-columns: 1fr 1fr 1fr;
  opacity: 0.28;
}
.rpma-cin-vignette {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    radial-gradient(ellipse 70% 80% at 78% 48%, rgba(6,16,24,0.15) 0%, transparent 55%),
    linear-gradient(90deg, rgba(6,16,24,0.15) 0%, rgba(6,16,24,0.55) 52%, rgba(10,24,40,0.82) 100%);
}
.rpma-cin-col { overflow: hidden; }
.rpma-cin-track {
  padding: 1rem 0.75rem 2rem;
  animation: rpmaCinSql 42s linear infinite;
  will-change: transform;
}
.rpma-cin-col--b .rpma-cin-track { animation-duration: 56s; animation-direction: reverse; }
.rpma-cin-col--c .rpma-cin-track { animation-duration: 48s; }
.rpma-cin-col--focus .rpma-cin-track { animation-duration: 36s; padding: 0.85rem 1rem 1.5rem; }
@keyframes rpmaCinSql { 0% { transform: translateY(0); } 100% { transform: translateY(-33.333%); } }
@media (prefers-reduced-motion: reduce) {
  .rpma-cin-track { animation: none; }
}
.rpma-cin-line {
  display: flex; gap: 0.65rem; font-family: ui-monospace, Consolas, "Cascadia Code", monospace;
  font-size: 11.5px; line-height: 1.55; white-space: pre;
}
.rpma-cin-gutter { flex: 0 0 1.7rem; text-align: right; color: rgba(120,150,170,0.38); }
.rpma-cin-text { color: rgba(180,214,232,0.78); }
.rpma-cin-line.is-kw .rpma-cin-text { color: #3ecfbf; font-weight: 650; }
.rpma-cin-line.is-cm .rpma-cin-text { color: #8fce4a; font-style: italic; }
.rpma-cin-line.is-st .rpma-cin-text { color: #9ec8ee; }
.rpma-cin-line.is-ok .rpma-cin-text { color: #8fce4a; }

.rpma-cin-shell {
  position: relative; z-index: 3; flex: 1;
  display: grid; grid-template-columns: minmax(0,1.05fr) 1px minmax(22rem, 0.95fr);
  min-height: 100dvh;
}
.rpma-cin-left {
  display: flex; align-items: center; justify-content: center;
  padding: clamp(1.25rem, 4vh, 2.5rem) clamp(1rem, 3.5vw, 2.75rem);
}
.rpma-cin-editor {
  width: min(100%, 40rem); height: min(78dvh, 40rem);
  display: flex; flex-direction: column; overflow: hidden;
  border-radius: 12px;
  border: 1px solid rgba(62,207,191,0.28);
  background: linear-gradient(165deg, rgba(8,28,46,0.72) 0%, rgba(6,16,28,0.82) 100%);
  box-shadow: 0 24px 64px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
.rpma-cin-editor-bar {
  display: flex; align-items: center; gap: 0.55rem;
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid rgba(27,184,166,0.18);
  background: rgba(10,40,64,0.55);
  font-family: ui-monospace, Consolas, monospace;
  font-size: 11px; color: rgba(200,230,255,0.7);
}
.rpma-cin-dots { display: flex; gap: 5px; }
.rpma-cin-dots i { width: 8px; height: 8px; border-radius: 50%; display: block; background: #ff5f57; }
.rpma-cin-dots i:nth-child(2) { background: #febc2e; }
.rpma-cin-dots i:nth-child(3) { background: #28c840; }
.rpma-cin-col--focus { flex: 1; min-height: 0; }
.rpma-cin-col--focus .rpma-cin-line { font-size: 12.5px; line-height: 1.62; }

.rpma-cin-divider {
  width: 1px; align-self: stretch;
  background: linear-gradient(180deg, transparent, rgba(143,206,74,0.55), rgba(27,184,166,0.55), transparent);
  box-shadow: 0 0 18px rgba(27,184,166,0.35);
}

.rpma-cin-right {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: clamp(1.5rem, 5vh, 3rem) clamp(1.25rem, 4vw, 3rem) 3.4rem;
}
.rpma-cin-tools { position: absolute; top: 1rem; right: 1.1rem; }
.rpma-cin-card {
  width: min(100%, 26rem);
  padding: 1.85rem 1.7rem 1.65rem;
  border-radius: 18px;
  text-align: center;
  background: linear-gradient(165deg, rgba(16,40,64,0.55) 0%, rgba(8,20,34,0.72) 100%);
  border: 1px solid rgba(143,206,74,0.38);
  box-shadow:
    0 28px 70px rgba(0,0,0,0.5),
    0 0 0 1px rgba(27,184,166,0.18),
    inset 0 1px 0 rgba(255,255,255,0.12);
  backdrop-filter: blur(22px) saturate(1.3);
  -webkit-backdrop-filter: blur(22px) saturate(1.3);
}
.rpma-cin-mark {
  display: flex; justify-content: center;
  filter: drop-shadow(0 0 28px rgba(27,184,166,0.45));
}
.rpma-cin-title {
  margin: 0.85rem 0 0;
  font-size: clamp(2.15rem, 4vw, 2.75rem);
  font-weight: 800; letter-spacing: -0.03em; line-height: 1.05;
}
.rpma-cin-rpm { color: #ffffff; }
.rpma-cin-assure { color: #1bb8a6; }
.rpma-cin-tag {
  margin: 0.55rem 0 1.25rem;
  font-size: 0.72rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: #8fce4a;
}
.rpma-cin-form { display: flex; flex-direction: column; gap: 0.85rem; text-align: left; }
.rpma-cin-field span { display: block; margin-bottom: 0.3rem; font-size: 12px; font-weight: 600; color: rgba(210,230,245,0.85); }
.rpma-cin-wrap {
  position: relative; display: flex; align-items: center;
}
.rpma-cin-wrap > svg { position: absolute; left: 0.75rem; color: rgba(140,180,200,0.75); pointer-events: none; }
.rpma-cin-wrap input {
  width: 100%; box-sizing: border-box;
  padding: 0.72rem 2.5rem 0.72rem 2.3rem;
  border-radius: 0.65rem;
  border: 1px solid rgba(100,160,200,0.28);
  background: rgba(6,16,28,0.62);
  color: #f0f7ff; font-size: 14px; outline: none;
}
.rpma-cin-wrap input:focus {
  border-color: rgba(27,184,166,0.7);
  box-shadow: 0 0 0 3px rgba(27,184,166,0.18);
}
.rpma-cin-eye {
  position: absolute; right: 0.5rem; border: 0; background: transparent;
  color: rgba(160,190,210,0.8); cursor: pointer; padding: 0.35rem; display: inline-flex;
}
.rpma-cin-error {
  margin: 0; padding: 0.55rem 0.7rem; border-radius: 0.5rem;
  border: 1px solid rgba(220,80,80,0.4); background: rgba(80,20,20,0.35);
  color: #ffb4b4; font-size: 13px;
}
.rpma-cin-submit {
  margin-top: 0.2rem; width: 100%; padding: 0.78rem 1rem; border: 0; border-radius: 0.65rem;
  background: linear-gradient(180deg, #22c9b6 0%, #1bb8a6 55%, #159e8f 100%);
  color: #041016; font-size: 15px; font-weight: 700; cursor: pointer;
  box-shadow: 0 8px 24px rgba(27,184,166,0.35);
  transition: filter 150ms ease-out, transform 150ms ease-out;
}
.rpma-cin-submit:hover:not(:disabled) { filter: brightness(1.06); }
.rpma-cin-submit:active:not(:disabled) { transform: scale(0.96); }
.rpma-cin-submit:disabled { opacity: 0.65; cursor: wait; }
.rpma-cin-foot {
  position: absolute; bottom: 0.85rem; left: 0; right: 0; z-index: 6;
  margin: 0; text-align: center; font-size: 0.75rem;
  color: rgba(180,210,230,0.5); pointer-events: none;
}

@media (max-width: 900px) {
  .rpma-cin-shell { grid-template-columns: 1fr; }
  .rpma-cin-left, .rpma-cin-divider { display: none; }
  .rpma-cin-vignette {
    background: radial-gradient(ellipse 90% 70% at 50% 40%, rgba(6,16,24,0.35) 0%, rgba(6,16,24,0.78) 100%);
  }
  .rpma-cin-right { min-height: 100dvh; padding-bottom: 3.2rem; }
}
`;
