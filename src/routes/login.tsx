import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { IdleLogoutBanner } from "@/lib/auth/idle-logout";
import { normalizeLoginIdentifier } from "@/lib/auth/root-admin";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const LOGIN_BUILD = "bg-fade-20260818";
const AISLE = "/brand/login-white-hall.jpg";

function CubeMark() {
  return (
    <svg className="rpma-aisle-cube" viewBox="0 0 80 80" aria-hidden>
      <defs>
        <linearGradient id="rpmaCube" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0aa0c8" />
          <stop offset="55%" stopColor="#1bb8a6" />
          <stop offset="100%" stopColor="#8fce4a" />
        </linearGradient>
      </defs>
      <path
        fill="none"
        stroke="url(#rpmaCube)"
        strokeWidth="2.2"
        strokeLinejoin="round"
        d="M40 8 70 24v32L40 72 10 56V24Z"
      />
      <path fill="none" stroke="url(#rpmaCube)" strokeWidth="1.6" d="M40 8v64M10 24l30 16 30-16" />
      <circle cx="40" cy="24" r="2.1" fill="#8fce4a" />
      <circle cx="22" cy="34" r="1.7" fill="#1bb8a6" />
      <circle cx="58" cy="34" r="1.7" fill="#1bb8a6" />
      <circle cx="40" cy="40" r="2.1" fill="#0aa0c8" />
    </svg>
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
    <div className="rpma-aisle" data-login-build={LOGIN_BUILD}>
      <style>{CSS}</style>
      <img className="rpma-aisle-bg" src={AISLE} alt="" />
      <div className="rpma-aisle-wash" aria-hidden="true" />

      <main className="rpma-aisle-stage">
        <section className="rpma-aisle-card">
          <div className="rpma-aisle-mark">
            <CubeMark />
            <span className="rpma-aisle-word">
              <strong>RPM</strong>
              <em>ASSURE</em>
            </span>
          </div>

          <IdleLogoutBanner />

          {!authEnabled ? (
            <p className="rpma-aisle-error">Auth is disabled.</p>
          ) : (
            <form onSubmit={onSubmit}>
              <label>
                <span>Username</span>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
              <label>
                <span>Password</span>
                <span className="rpma-aisle-pw">
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
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </label>
              {error ? <p className="rpma-aisle-error">{error}</p> : null}
              <button type="submit" className="rpma-aisle-go" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

const CSS = `
.rpma-aisle {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  background: #071018;
  font-family: "Segoe UI Variable Text", "Segoe UI", Tahoma, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  color: #12202c;
}
.rpma-aisle-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
  opacity: 0.42;
  filter: saturate(0.7);
}
.rpma-aisle-wash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 55% 60% at 50% 48%, rgba(255,255,255,0.55) 0%, rgba(244,247,250,0.28) 48%, rgba(236,241,245,0.55) 100%);
}
.rpma-aisle-stage {
  position: relative;
  z-index: 2;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
}
.rpma-aisle-card {
  width: min(100%, 28.5rem);
  padding: 0.4rem 0.2rem;
  background: transparent;
  border: 0;
  box-shadow: none;
}
.rpma-aisle-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin: 0 0 1.4rem;
}
.rpma-aisle-cube { width: 52px; height: 52px; flex: 0 0 auto; }
.rpma-aisle-word {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  line-height: 1;
}
.rpma-aisle-mark strong {
  display: inline;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  background: linear-gradient(90deg, #1287c8 0%, #1bb8a6 48%, #8fce4a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.rpma-aisle-mark em {
  display: inline;
  font-style: normal;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #1a6bb5;
}
.rpma-aisle-card form { display: grid; gap: 0.95rem; }
.rpma-aisle-card label { display: grid; gap: 0.32rem; }
.rpma-aisle-card label > span {
  font-size: 0.92rem;
  font-weight: 700;
  color: #1a2730;
}
.rpma-aisle-card input {
  width: 100%;
  box-sizing: border-box;
  min-height: 42px;
  padding: 0.55rem 0.7rem;
  border: 1px solid #c5ced6;
  background: #fff;
  color: #12202c;
  font-size: 0.95rem;
  outline: none;
}
.rpma-aisle-card input:focus { border-color: #1bb8a6; }
.rpma-aisle-pw { position: relative; display: block; }
.rpma-aisle-pw input { padding-right: 2.4rem; }
.rpma-aisle-pw button {
  position: absolute;
  right: 0.15rem;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: #667684;
  cursor: pointer;
  min-width: 34px;
  min-height: 34px;
}
.rpma-aisle-go {
  margin-top: 0.35rem;
  min-height: 44px;
  border: 1px solid rgba(18, 40, 56, 0.45);
  background: transparent;
  color: #12202c;
  font-size: 0.98rem;
  font-weight: 700;
  cursor: pointer;
}
.rpma-aisle-go:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.28);
  border-color: #0f7f86;
  color: #0b3a42;
}
.rpma-aisle-go:disabled { opacity: 0.6; cursor: wait; }
.rpma-aisle-error {
  margin: 0;
  padding: 0.5rem 0.6rem;
  background: rgba(155, 44, 44, 0.1);
  color: #9b2c2c;
  font-size: 0.82rem;
}
`;
