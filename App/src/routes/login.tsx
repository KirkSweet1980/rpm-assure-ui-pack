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

const LOGIN_BUILD = "center-row-20260818";
const AISLE = "/downloads/login-white-hall.jpg";
const MARK = "/downloads/rpm-assure-wordmark.png";

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
      <img className="rpma-aisle-logo" src={MARK} alt="RPM Assure" />

      <main className="rpma-aisle-stage">
        <section className="rpma-aisle-card">
          <IdleLogoutBanner />

          {!authEnabled ? (
            <p className="rpma-aisle-error">Auth is disabled.</p>
          ) : (
            <form onSubmit={onSubmit} className="rpma-aisle-row">
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
              <button type="submit" className="rpma-aisle-go" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
              {error ? <p className="rpma-aisle-error">{error}</p> : null}
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
}
.rpma-aisle-logo {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -58%);
  width: min(52vw, 560px);
  height: auto;
  pointer-events: none;
  background: transparent;
}
.rpma-aisle-stage {
  position: relative;
  z-index: 2;
  min-height: 100dvh;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1.2rem 1.2rem 8vh;
}
.rpma-aisle-card {
  width: min(100%, 40rem);
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
}
.rpma-aisle-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: center;
  gap: 0.7rem 0.85rem;
}
.rpma-aisle-row label {
  display: grid;
  gap: 0.22rem;
  flex: 1 1 11rem;
  min-width: 11rem;
  max-width: 16rem;
}
.rpma-aisle-card label > span {
  font-size: 0.78rem;
  font-weight: 700;
  color: #1a2730;
}
.rpma-aisle-card input {
  width: 100%;
  box-sizing: border-box;
  min-height: 38px;
  padding: 0.4rem 0.55rem;
  border: 1px solid #c5ced6;
  background: rgba(255,255,255,0.92);
  color: #12202c;
  font-size: 0.88rem;
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
  margin-top: 0;
  min-height: 38px;
  min-width: 7.2rem;
  padding: 0 1rem;
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
  flex: 1 0 100%;
  text-align: center;
  margin: 0;
  padding: 0.5rem 0.6rem;
  background: rgba(155, 44, 44, 0.1);
  color: #9b2c2c;
  font-size: 0.82rem;
}
`;
