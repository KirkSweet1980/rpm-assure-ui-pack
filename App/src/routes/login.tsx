import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  BookMarked,
  BookOpen,
  Brain,
  Cloud,
  Eye,
  EyeOff,
  FileStack,
  LayoutDashboard,
  Lock,
  Network,
  Presentation,
  ShieldCheck,
  User,
} from "lucide-react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { IdleLogoutBanner } from "@/lib/auth/idle-logout";
import { normalizeLoginIdentifier } from "@/lib/auth/root-admin";
import { RpmAssureMark } from "@/components/brand/rpm-assure-mark";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const LOGIN_BUILD = "ssot-arc-20260814";

const NODES = [
  { deg: 188, Icon: BookMarked, label: "SYSPRO" },
  { deg: 156, Icon: Network, label: "Estate" },
  { deg: 124, Icon: Brain, label: "Intelligence" },
  { deg: 90, Icon: Presentation, label: "Exco" },
  { deg: 56, Icon: BookOpen, label: "Reporting" },
  { deg: 24, Icon: LayoutDashboard, label: "SLA" },
  { deg: -8, Icon: FileStack, label: "Records" },
] as const;

const EXTRA = [
  { deg: 210, Icon: Cloud, label: "Cloud" },
  { deg: -30, Icon: ShieldCheck, label: "Security" },
] as const;

function nodeStyle(deg: number) {
  const rad = (deg * Math.PI) / 180;
  const x = Math.cos(rad);
  const y = Math.sin(rad);
  return {
    left: `calc(50% + ${x * 42}vw)`,
    top: `calc(46% - ${y * 34}vh)`,
  } as const;
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
    <div className="rpma-ssot" data-login-build={LOGIN_BUILD}>
      <style>{SSOT_CSS}</style>

      <div className="rpma-ssot-stage" aria-hidden="true">
        <svg className="rpma-ssot-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="ssotGold" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#c9a227" />
              <stop offset="50%" stopColor="#f0d36a" />
              <stop offset="100%" stopColor="#c9a227" />
            </linearGradient>
            <radialGradient id="ssotBowl" cx="50%" cy="70%" r="70%">
              <stop offset="0%" stopColor="#1436a8" />
              <stop offset="70%" stopColor="#0b2278" />
              <stop offset="100%" stopColor="#06144e" />
            </radialGradient>
          </defs>
          <rect width="1600" height="900" fill="url(#ssotBowl)" />
          <path
            className="rpma-ssot-arc-thin"
            d="M 80 620 A 720 520 0 0 1 1520 620"
            fill="none"
            stroke="url(#ssotGold)"
            strokeWidth="2.5"
            opacity="0.55"
          />
          <path
            className="rpma-ssot-arc-gold"
            d="M 160 680 A 640 430 0 0 1 1440 680"
            fill="none"
            stroke="url(#ssotGold)"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </svg>

        {[...NODES, ...EXTRA].map((n) => (
          <div key={n.label} className="rpma-ssot-node" style={nodeStyle(n.deg)}>
            <span className="rpma-ssot-arrow" />
            <span className="rpma-ssot-disc">
              <n.Icon size={22} strokeWidth={1.7} />
            </span>
            <span className="rpma-ssot-nlabel">{n.label}</span>
          </div>
        ))}
      </div>

      <div className="rpma-ssot-center">
        <p className="rpma-ssot-kicker">RPM Assure</p>
        <h1 className="rpma-ssot-title">
          <span className="is-gold">Single Source</span>
          <span className="is-white">of Truth</span>
        </h1>

        <div className="rpma-ssot-card">
          <div className="rpma-ssot-mark">
            <RpmAssureMark size={72} showWordmark={false} staticMark />
          </div>
          <p className="rpma-ssot-tag">- Assurance Delivered -</p>

          <IdleLogoutBanner />

          {!authEnabled ? (
            <p className="rpma-ssot-error">Auth is disabled.</p>
          ) : (
            <form className="rpma-ssot-form" onSubmit={onSubmit}>
              <label className="rpma-ssot-field">
                <span>Username</span>
                <span className="rpma-ssot-wrap">
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
              <label className="rpma-ssot-field">
                <span>Password</span>
                <span className="rpma-ssot-wrap">
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
                    className="rpma-ssot-eye"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </label>
              {error ? <p className="rpma-ssot-error">{error}</p> : null}
              <button type="submit" className="rpma-ssot-submit" disabled={busy}>
                {busy ? "Signing in..." : "Sign in"}
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="rpma-ssot-foot">Powered by RPM Resources</p>
    </div>
  );
}

const SSOT_CSS = `
.rpma-ssot {
  --ssot-navy: #0a1f72;
  --ssot-deep: #06144e;
  --ssot-gold: #e8c547;
  --ssot-gold-deep: #c9a227;
  --ssot-ink: #0b1a3a;
  --ssot-muted: #4a5d86;
  position: relative; isolation: isolate;
  min-height: 100dvh; width: 100%;
  overflow: hidden;
  background: radial-gradient(ellipse 90% 80% at 50% 70%, #1436a8 0%, #0b2278 55%, #06144e 100%);
  color: #fff;
  font-family: Inter, system-ui, sans-serif;
}
.rpma-ssot-stage { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.rpma-ssot-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.rpma-ssot-arc-gold {
  stroke-dasharray: 1800;
  stroke-dashoffset: 1800;
  animation: ssotDraw 1.6s ease-out forwards;
}
.rpma-ssot-arc-thin {
  stroke-dasharray: 2000;
  stroke-dashoffset: 2000;
  animation: ssotDraw 2s 0.2s ease-out forwards;
}
@keyframes ssotDraw { to { stroke-dashoffset: 0; } }

.rpma-ssot-node {
  position: absolute;
  width: 4.6rem;
  transform: translate(-50%, -50%);
  display: flex; flex-direction: column; align-items: center; gap: 0.28rem;
  animation: ssotPop 0.55s ease-out both;
}
.rpma-ssot-node:nth-child(3) { animation-delay: .08s; }
.rpma-ssot-node:nth-child(4) { animation-delay: .14s; }
.rpma-ssot-node:nth-child(5) { animation-delay: .2s; }
.rpma-ssot-node:nth-child(6) { animation-delay: .26s; }
.rpma-ssot-node:nth-child(7) { animation-delay: .32s; }
.rpma-ssot-node:nth-child(8) { animation-delay: .38s; }
.rpma-ssot-node:nth-child(9) { animation-delay: .44s; }
.rpma-ssot-node:nth-child(10) { animation-delay: .5s; }
@keyframes ssotPop {
  from { opacity: 0; transform: translate(-50%, -40%) scale(0.7); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
.rpma-ssot-disc {
  width: 3.15rem; height: 3.15rem;
  border-radius: 50%;
  display: grid; place-items: center;
  color: #fff;
  background: radial-gradient(circle at 35% 30%, #2a58d4 0%, #12308f 70%);
  border: 2px solid rgba(240, 211, 106, 0.85);
  box-shadow: 0 0 0 4px rgba(10, 31, 114, 0.55), 0 8px 18px rgba(0,0,0,0.28);
}
.rpma-ssot-nlabel {
  font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: rgba(255,255,255,0.78);
  text-shadow: 0 1px 6px rgba(0,0,0,0.4);
}
.rpma-ssot-arrow {
  position: absolute; left: 50%; top: calc(100% + 2px);
  width: 1px; height: 18px;
  background: linear-gradient(180deg, rgba(240,211,106,0.9), transparent);
  transform: translateX(-50%);
}
.rpma-ssot-arrow::after {
  content: "";
  position: absolute; left: 50%; bottom: -3px;
  width: 6px; height: 6px;
  border-right: 1.5px solid #f0d36a;
  border-bottom: 1.5px solid #f0d36a;
  transform: translateX(-50%) rotate(45deg);
}

.rpma-ssot-center {
  position: relative; z-index: 2;
  min-height: 100dvh;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 5.5rem 1.25rem 3.2rem;
}
.rpma-ssot-kicker {
  margin: 0 0 0.35rem;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.28em; text-transform: uppercase;
  color: rgba(240, 211, 106, 0.9);
}
.rpma-ssot-title {
  margin: 0 0 1.15rem;
  text-align: center; line-height: 0.95;
  font-weight: 800; letter-spacing: -0.03em;
}
.rpma-ssot-title .is-gold {
  display: block;
  font-size: clamp(2.1rem, 5.2vw, 3.6rem);
  color: #f0d36a;
  text-shadow: 0 4px 24px rgba(0,0,0,0.28);
}
.rpma-ssot-title .is-white {
  display: block;
  margin-top: 0.12rem;
  font-size: clamp(1.85rem, 4.6vw, 3.15rem);
  color: #fff;
}

.rpma-ssot-card {
  width: min(100%, 24rem);
  padding: 1.35rem 1.4rem 1.25rem;
  border-radius: 1.15rem;
  background: #fff;
  color: var(--ssot-ink);
  box-shadow: 0 28px 64px rgba(0,0,0,0.32);
  border: 1px solid rgba(240, 211, 106, 0.35);
}
.rpma-ssot-mark { display: flex; justify-content: center; }
.rpma-ssot-tag {
  margin: 0.4rem 0 0.95rem;
  text-align: center;
  font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: #5a8a28;
}
.rpma-ssot-form { display: flex; flex-direction: column; gap: 0.7rem; }
.rpma-ssot-field span { display: block; margin-bottom: 0.26rem; font-size: 12px; font-weight: 600; color: var(--ssot-muted); }
.rpma-ssot-wrap { position: relative; display: flex; align-items: center; }
.rpma-ssot-wrap > svg { position: absolute; left: 0.75rem; color: #7b93a6; pointer-events: none; }
.rpma-ssot-wrap input {
  width: 100%; box-sizing: border-box;
  padding: 0.68rem 2.5rem 0.68rem 2.3rem;
  border-radius: 0.6rem;
  border: 1px solid #c9d3e2;
  background: #fff;
  color: var(--ssot-ink); font-size: 14px; outline: none;
}
.rpma-ssot-wrap input:focus {
  border-color: #1a4db8;
  box-shadow: 0 0 0 3px rgba(20, 54, 168, 0.16);
}
.rpma-ssot-eye {
  position: absolute; right: 0.5rem; border: 0; background: transparent;
  color: #6b8496; cursor: pointer; padding: 0.35rem; display: inline-flex;
}
.rpma-ssot-error {
  margin: 0; padding: 0.5rem 0.65rem; border-radius: 0.5rem;
  border: 1px solid rgba(209,75,75,0.35); background: #fff4f4;
  color: #9b2c2c; font-size: 13px;
}
.rpma-ssot-submit {
  margin-top: 0.1rem; width: 100%; padding: 0.74rem 1rem; border: 0; border-radius: 0.6rem;
  background: linear-gradient(180deg, #2a58d4 0%, #1436a8 100%);
  color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
  box-shadow: 0 8px 18px rgba(10, 31, 114, 0.28);
  transition: filter 150ms ease-out, transform 150ms ease-out;
}
.rpma-ssot-submit:hover:not(:disabled) { filter: brightness(1.06); }
.rpma-ssot-submit:active:not(:disabled) { transform: scale(0.97); }
.rpma-ssot-submit:disabled { opacity: 0.65; cursor: wait; }
.rpma-ssot-foot {
  position: absolute; bottom: 0.75rem; left: 0; right: 0; z-index: 3;
  margin: 0; text-align: center; font-size: 0.72rem;
  color: rgba(255,255,255,0.55);
}

@media (max-width: 860px) {
  .rpma-ssot-node { display: none; }
  .rpma-ssot-center { padding-top: 2.4rem; }
  .rpma-ssot-title .is-gold { font-size: 1.85rem; }
  .rpma-ssot-title .is-white { font-size: 1.65rem; }
}
@media (prefers-reduced-motion: reduce) {
  .rpma-ssot-arc-gold, .rpma-ssot-arc-thin, .rpma-ssot-node { animation: none; }
  .rpma-ssot-arc-gold, .rpma-ssot-arc-thin { stroke-dashoffset: 0; }
}
`;
