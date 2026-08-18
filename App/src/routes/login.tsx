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

const LOGIN_BUILD = "corporate-20260818";

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
    <div className="rpma-co" data-login-build={LOGIN_BUILD}>
      <style>{CSS}</style>

      <aside className="rpma-co-brand" aria-hidden="true">
        <div className="rpma-co-brand-inner">
          <p className="rpma-co-kicker">RPM Resources</p>
          <h1>RPM Assure</h1>
          <p className="rpma-co-line">Assurance Delivered</p>
          <ul>
            <li>Single source of truth</li>
            <li>Live estate, backup and protection</li>
            <li>Executive-ready SLA evidence</li>
          </ul>
        </div>
      </aside>

      <main className="rpma-co-main">
        <section className="rpma-co-card">
          <h2>Sign in</h2>
          <p className="rpma-co-sub">Use your RPM Assure account.</p>
          <IdleLogoutBanner />

          {!authEnabled ? (
            <p className="rpma-co-error">Auth is disabled.</p>
          ) : (
            <form className="rpma-co-form" onSubmit={onSubmit}>
              <label>
                <span>Username</span>
                <span className="rpma-co-wrap">
                  <User size={16} aria-hidden />
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="Username or email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </span>
              </label>
              <label>
                <span>Password</span>
                <span className="rpma-co-wrap">
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
                    className="rpma-co-eye"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </label>
              {error ? <p className="rpma-co-error">{error}</p> : null}
              <button type="submit" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}
        </section>
        <p className="rpma-co-foot">© RPM Resources · Confidential</p>
      </main>
    </div>
  );
}

const CSS = `
.rpma-co {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(280px, 42%) minmax(0, 1fr);
  background: #f4f6f8;
  color: #12202c;
  font-family: "Segoe UI Variable Text", "Segoe UI", Tahoma, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.rpma-co-brand {
  position: relative;
  background:
    linear-gradient(165deg, rgba(7, 24, 42, 0.88) 0%, rgba(11, 42, 56, 0.82) 55%, rgba(15, 70, 78, 0.78) 100%),
    url("/brand/login-picks/boardroom-tv.jpg?v=corp") center / cover no-repeat;
  color: #f3f7fb;
  display: flex;
  align-items: flex-end;
  padding: 3rem 2.6rem;
}
.rpma-co-brand-inner { max-width: 28rem; }
.rpma-co-kicker {
  margin: 0 0 0.55rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(243, 247, 251, 0.62);
}
.rpma-co-brand h1 {
  margin: 0;
  font-size: clamp(2rem, 3.4vw, 2.8rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.05;
  color: #fff;
}
.rpma-co-line {
  margin: 0.7rem 0 1.6rem;
  font-size: 0.95rem;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8fce4a;
}
.rpma-co-brand ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.45rem;
  font-size: 0.92rem;
  color: rgba(243, 247, 251, 0.82);
}
.rpma-co-brand li {
  padding-left: 0.9rem;
  position: relative;
}
.rpma-co-brand li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #1bb8a6;
}
.rpma-co-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.5rem;
}
.rpma-co-card {
  width: min(100%, 26rem);
  background: #fff;
  border: 1px solid #e4e9ee;
  border-radius: 12px;
  padding: 1.85rem 1.7rem 1.6rem;
  box-shadow: 0 10px 30px rgba(16, 36, 52, 0.06);
}
.rpma-co-card h2 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #0f2433;
}
.rpma-co-sub {
  margin: 0.3rem 0 1.25rem;
  font-size: 0.88rem;
  color: #5b6b78;
}
.rpma-co-form { display: grid; gap: 0.85rem; }
.rpma-co-form label { display: grid; gap: 0.28rem; }
.rpma-co-form label > span:first-child {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #3d5160;
}
.rpma-co-wrap { position: relative; display: flex; align-items: center; }
.rpma-co-wrap > svg {
  position: absolute;
  left: 0.75rem;
  color: #7a8b98;
  pointer-events: none;
}
.rpma-co-form input {
  width: 100%;
  box-sizing: border-box;
  min-height: 44px;
  padding: 0.65rem 2.4rem 0.65rem 2.3rem;
  border: 1px solid #cfd8df;
  border-radius: 8px;
  background: #fff;
  color: #12202c;
  font-size: 0.95rem;
  outline: none;
}
.rpma-co-form input:focus { border-color: #1bb8a6; box-shadow: 0 0 0 3px rgba(27, 184, 166, 0.16); }
.rpma-co-eye {
  position: absolute;
  right: 0.25rem;
  border: 0;
  background: transparent;
  color: #6b7c89;
  cursor: pointer;
  min-width: 36px;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.rpma-co-form button[type="submit"] {
  margin-top: 0.25rem;
  min-height: 46px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(90deg, #0f4c5c 0%, #0f7f86 48%, #1bb8a6 100%);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
}
.rpma-co-form button[type="submit"]:hover:not(:disabled) { filter: brightness(1.05); }
.rpma-co-form button[type="submit"]:disabled { opacity: 0.65; cursor: wait; }
.rpma-co-error {
  margin: 0;
  padding: 0.55rem 0.7rem;
  border-radius: 8px;
  background: #fdecec;
  color: #9b2c2c;
  font-size: 0.82rem;
}
.rpma-co-foot {
  margin: 1.2rem 0 0;
  font-size: 0.72rem;
  color: #8a97a3;
}
@media (max-width: 840px) {
  .rpma-co { grid-template-columns: 1fr; }
  .rpma-co-brand { min-height: 220px; padding: 1.6rem 1.4rem; }
}
`;
