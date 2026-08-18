import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { IdleLogoutBanner } from "@/lib/auth/idle-logout";
import { normalizeLoginIdentifier } from "@/lib/auth/root-admin";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const LOGIN_BUILD = "top-right-20260818";
const HALL = "/brand/login-picks/boardroom-tv.jpg?v=20260816rc";

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
    <div className="rpma-gl" data-login-build={LOGIN_BUILD}>
      <style>{GLASS_CSS}</style>

      <div className="rpma-gl-scene" aria-hidden="true">
        <img className="rpma-gl-still" src={HALL} alt="" />
        <div className="rpma-gl-wash" />
      </div>

      <main className="rpma-gl-stage">
        <section className="rpma-gl-card">
          <h1 className="rpma-gl-word">RPM Assure</h1>

          <IdleLogoutBanner />

          {!authEnabled ? (
            <p className="rpma-gl-error">Auth is disabled.</p>
          ) : (
            <form className="rpma-gl-form" onSubmit={onSubmit}>
              <label className="rpma-gl-field">
                <span>Username</span>
                <span className="rpma-gl-wrap">
                  <User size={14} aria-hidden />
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
              <label className="rpma-gl-field">
                <span>Password</span>
                <span className="rpma-gl-wrap">
                  <Lock size={14} aria-hidden />
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
                    className="rpma-gl-eye"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </span>
              </label>
              <button type="submit" className="rpma-gl-submit" disabled={busy}>
                {busy ? "Signing in..." : "Sign in"}
              </button>
              {error ? <p className="rpma-gl-error">{error}</p> : null}
            </form>
          )}

          <p className="rpma-gl-tag">Assurance Delivered</p>
        </section>
      </main>
    </div>
  );
}

const GLASS_CSS = `
.rpma-gl {
  --teal: var(--color-brand-teal);
  --lime: var(--color-brand-lime);
  --slate: var(--color-brand-slate);
  --fg: #f3f7fb;
  --muted: rgba(243, 247, 251, 0.72);
  position: relative;
  isolation: isolate;
  min-height: 100dvh;
  width: 100%;
  overflow: hidden;
  background: #0b1a3a;
  color: var(--fg);
  font-family: "Segoe UI Variable Text", "Segoe UI Variable", "Segoe UI", Tahoma, Arial, sans-serif;
  font-optical-sizing: auto;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #0b1a3a;
}
.rpma-gl-scene {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: #0b1a3a;
}
.rpma-gl-still {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  background: #0b1a3a;
  display: block;
}
.rpma-gl-wash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: rgba(7, 14, 20, 0.28);
}
.rpma-gl-stage {
  position: relative;
  z-index: 2;
  min-height: 100dvh;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 1.1rem 1.4rem 1.5rem;
}
.rpma-gl-card {
  position: relative;
  width: min(100%, 34rem);
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  overflow: visible;
  text-align: center;
}
.rpma-gl-word {
  margin: 0 0 0.55rem;
  text-align: right;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1;
  color: #8fce4a;
}
.rpma-gl-tag {
  margin: 0.45rem 0 0;
  text-align: right;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8fce4a;
}
.rpma-gl-form {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.7rem;
  align-items: end;
}
.rpma-gl-field { text-align: left; margin: 0; }
.rpma-gl-field span {
  display: block;
  margin-bottom: 0.2rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(243, 247, 251, 0.78);
}
.rpma-gl-wrap { position: relative; display: flex; align-items: center; }
.rpma-gl-wrap > svg {
  position: absolute;
  left: 0.7rem;
  color: rgba(243, 247, 251, 0.7);
  pointer-events: none;
}
.rpma-gl-wrap input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.62rem 2.2rem 0.62rem 2.1rem;
  border: 0;
  border-radius: 0.7rem;
  background: rgba(255, 255, 255, 0.12);
  color: var(--fg);
  font-size: 0.92rem;
  outline: none;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.28) inset;
  backdrop-filter: blur(8px);
}
.rpma-gl-wrap input::placeholder { color: rgba(243, 247, 251, 0.5); }
.rpma-gl-error { grid-column: 1 / -1; }
.rpma-gl-submit {
  margin: 0;
  min-height: 42px;
  padding: 0.55rem 1.1rem;
  border: 0;
  border-radius: 0.7rem;
  background: linear-gradient(90deg, var(--slate) 0%, var(--teal) 48%, var(--lime) 100%);
  color: #fff;
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
@media (max-width: 720px) {
  .rpma-gl-form { grid-template-columns: 1fr; }
  .rpma-gl-word { font-size: 1.7rem; }
}
.rpma-gl-wrap input:focus {
  background: rgba(255, 255, 255, 0.18);
  box-shadow: 0 0 0 1px #8fce4a inset;
}
.rpma-gl-eye {
  position: absolute;
  right: 0.2rem;
  border: 0;
  background: transparent;
  color: rgba(243, 247, 251, 0.7);
  cursor: pointer;
  padding: 0.28rem;
  display: inline-flex;
  min-width: 34px;
  min-height: 34px;
  align-items: center;
  justify-content: center;
}
.rpma-gl-error {
  margin: 0.4rem 0 0;
  padding: 0.4rem 0.55rem;
  border-radius: 0.55rem;
  background: rgba(155, 44, 44, 0.28);
  color: #ffd4d4;
  font-size: 0.72rem;
}
.rpma-gl-submit:hover:not(:disabled) { filter: brightness(1.06); }
.rpma-gl-submit:disabled { opacity: 0.65; cursor: wait; }
`;
