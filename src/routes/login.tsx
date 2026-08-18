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

const LOGIN_BUILD = "orb-20260818";
const HERO = "/brand/login-assure.mp4";

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
        <video
          className="rpma-gl-wash"
          src={HERO}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        <div className="rpma-gl-orb">
          <video
            className="rpma-gl-still"
            src={HERO}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        </div>
        <div className="rpma-gl-mark" />
      </div>

      <main className="rpma-gl-stage">
        <section className="rpma-gl-card">
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
  position: relative;
  isolation: isolate;
  min-height: 100dvh;
  width: 100%;
  overflow: hidden;
  background: #02060e;
  color: #f3f7fb;
  font-family: "Segoe UI Variable Text", "Segoe UI", Tahoma, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.rpma-gl-scene {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: #020810;
}
.rpma-gl-wash {
  position: absolute;
  inset: -8%;
  width: 116%;
  height: 116%;
  object-fit: cover;
  filter: blur(42px) saturate(1.2) brightness(0.72);
  transform: scale(1.08);
  pointer-events: none;
}
.rpma-gl-orb {
  position: absolute;
  left: 50%;
  top: 46%;
  width: min(72vmin, 70vh);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  overflow: hidden;
  border: 0;
  outline: 0;
  box-shadow: none;
  background: #020810;
}
.rpma-gl-still {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  display: block;
  border: 0;
}
.rpma-gl-mark {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background-image:
    repeating-linear-gradient(
      -28deg,
      transparent 0,
      transparent 92px,
      rgba(255,255,255,0.045) 92px,
      rgba(255,255,255,0.045) 93px
    );
}
.rpma-gl-mark::before {
  content: "RPM ASSURE";
  position: absolute;
  top: 1.1rem;
  left: 1.2rem;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.28em;
  color: rgba(255,255,255,0.38);
  text-shadow: 0 1px 8px rgba(0,0,0,0.35);
}
.rpma-gl-mark::after {
  content: "RPM ASSURE  ·  ASSURANCE DELIVERED";
  position: absolute;
  right: 1.2rem;
  bottom: 0.85rem;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: rgba(143, 206, 74, 0.55);
}
.rpma-gl-stage {
  position: relative;
  z-index: 2;
  min-height: 100dvh;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 1.2rem 2.4rem;
}
.rpma-gl-card {
  width: min(100%, 38rem);
  padding: 0.85rem 1rem 0.75rem;
  border: 0;
  border-radius: 14px;
  background: transparent;
  box-shadow: none;
  text-align: center;
}
.rpma-gl-tag {
  margin: 0.55rem 0 0;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #8fce4a;
}
.rpma-gl-form {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.65rem;
  align-items: end;
}
.rpma-gl-field { text-align: left; margin: 0; }
.rpma-gl-field span {
  display: block;
  margin-bottom: 0.18rem;
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(243, 247, 251, 0.82);
}
.rpma-gl-wrap { position: relative; display: flex; align-items: center; }
.rpma-gl-wrap > svg {
  position: absolute;
  left: 0.7rem;
  color: rgba(243, 247, 251, 0.72);
  pointer-events: none;
}
.rpma-gl-wrap input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.62rem 2.2rem 0.62rem 2.1rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #f3f7fb;
  font-size: 0.92rem;
  outline: none;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.38) inset;
}
.rpma-gl-wrap input::placeholder { color: rgba(243, 247, 251, 0.48); }
.rpma-gl-wrap input:focus {
  box-shadow: 0 0 0 1px #8fce4a inset;
}
.rpma-gl-error { grid-column: 1 / -1; }
.rpma-gl-submit {
  margin: 0;
  min-height: 42px;
  padding: 0.55rem 1.15rem;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #0f7f86 0%, #1bb8a6 50%, #8fce4a 100%);
  color: #fff;
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.rpma-gl-eye {
  position: absolute;
  right: 0.2rem;
  border: 0;
  background: transparent;
  color: rgba(243, 247, 251, 0.75);
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
@media (max-width: 720px) {
  .rpma-gl-form { grid-template-columns: 1fr; }
  .rpma-gl-stage { padding-bottom: 1.4rem; }
}
`;
