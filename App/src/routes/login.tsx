import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { IdleLogoutBanner } from "@/lib/auth/idle-logout";
import { normalizeLoginIdentifier } from "@/lib/auth/root-admin";
import { RpmAssureMark } from "@/components/brand/rpm-assure-mark";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const LOGIN_BUILD = "boardroom-hi-20260814";

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

      <div className="rpma-cin-stage" aria-hidden="true">
        <video
          className="rpma-cin-bgvid"
          poster="/brand/ssot-hub.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        >
          <source src="/brand/ssot-hub-loop.mp4" type="video/mp4" />
        </video>
        <img className="rpma-cin-bgstill" src="/brand/ssot-hub.jpg" alt="" />
        <div className="rpma-cin-vignette" />
      </div>

      <div className="rpma-cin-shell">
        <section className="rpma-cin-right">
          <div className="rpma-cin-card">
            <div className="rpma-cin-mark">
              <RpmAssureMark size={84} showWordmark={false} staticMark />
            </div>
            <h1 className="rpma-cin-title">
              <span className="rpma-cin-rpm">RPM </span>
              <span className="rpma-cin-assure">Assure</span>
            </h1>
            <p className="rpma-cin-tag">- Assurance Delivered -</p>

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
  background: #05080c;
  color: #e8eef4;
  font-family: Inter, system-ui, sans-serif;
}
.rpma-cin .rpma-login-sql-bg,
.rpma-cin .rpma-login-page-words,
.rpma-cin .rpma-login-brand-words,
.rpma-cin .rpma-login-fwin,
.rpma-cin .rpma-login-ps-stage,
.rpma-cin .rpma-login-hero-center { display: none !important; }

.rpma-cin-stage { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
.rpma-cin-bgvid, .rpma-cin-bgstill {
  position: absolute; inset: -4%;
  width: 108%; height: 108%;
  object-fit: cover;
  animation: rpmaSsotKen 28s ease-in-out infinite alternate;
}
.rpma-cin-bgvid { z-index: 1; }
.rpma-cin-bgstill { z-index: 0; }
.rpma-cin-vignette {
  position: absolute; inset: 0; z-index: 3; pointer-events: none;
  background:
    linear-gradient(90deg, transparent 0%, rgba(5,8,12,0.12) 55%, rgba(5,8,12,0.55) 100%),
    linear-gradient(180deg, rgba(5,8,12,0.22) 0%, transparent 32%, rgba(5,8,12,0.4) 100%);
}
@keyframes rpmaSsotKen {
  0% { transform: scale(1) translate3d(0,0,0); }
  100% { transform: scale(1.08) translate3d(-1.2%, 0.8%, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .rpma-cin-bgvid { display: none; }
  .rpma-cin-bgstill { animation: none; }
}

.rpma-cin-shell {
  position: relative; z-index: 3; flex: 1;
  display: flex; justify-content: flex-end;
  min-height: 100dvh;
}

.rpma-cin-right {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: clamp(1.5rem, 5vh, 3rem);
}
.rpma-cin-card {
  width: min(100%, 24.5rem);
  aspect-ratio: 1 / 1.08;
  display: flex; flex-direction: column; justify-content: center;
  padding: 1.75rem 1.65rem 1.5rem;
  border-radius: 20px;
  text-align: center;
  background: rgba(255,255,255,0.94);
  border: 1px solid rgba(255,255,255,0.2);
  box-shadow:
    0 32px 72px rgba(0,0,0,0.38),
    0 0 0 1px rgba(27,184,166,0.18);
  backdrop-filter: blur(20px) saturate(1.1);
  -webkit-backdrop-filter: blur(20px) saturate(1.1);
}
.rpma-cin-mark {
  display: flex; justify-content: center;
  filter: drop-shadow(0 10px 16px rgba(27,184,166,0.2));
}
.rpma-cin-title {
  margin: 0.7rem 0 0;
  font-size: clamp(2rem, 3.6vw, 2.55rem);
  font-weight: 800; letter-spacing: -0.03em; line-height: 1.05;
}
.rpma-cin-rpm { color: #0a2f5a; }
.rpma-cin-assure { color: #1bb8a6; }
.rpma-cin-tag {
  margin: 0.5rem 0 1.15rem;
  font-size: 0.72rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: #5a8a28;
}
.rpma-cin-form { display: flex; flex-direction: column; gap: 0.75rem; text-align: left; }
.rpma-cin-field span { display: block; margin-bottom: 0.28rem; font-size: 12px; font-weight: 600; color: #3a556c; }
.rpma-cin-wrap {
  position: relative; display: flex; align-items: center;
}
.rpma-cin-wrap > svg { position: absolute; left: 0.75rem; color: #7b93a6; pointer-events: none; }
.rpma-cin-wrap input {
  width: 100%; box-sizing: border-box;
  padding: 0.7rem 2.5rem 0.7rem 2.3rem;
  border-radius: 0.65rem;
  border: 1px solid #c5d3de;
  background: #fff;
  color: #16324a; font-size: 14px; outline: none;
}
.rpma-cin-wrap input:focus {
  border-color: #1bb8a6;
  box-shadow: 0 0 0 3px rgba(27,184,166,0.18);
}
.rpma-cin-eye {
  position: absolute; right: 0.5rem; border: 0; background: transparent;
  color: #6b8496; cursor: pointer; padding: 0.35rem; display: inline-flex;
}
.rpma-cin-error {
  margin: 0; padding: 0.55rem 0.7rem; border-radius: 0.5rem;
  border: 1px solid rgba(209,75,75,0.35); background: #fff4f4;
  color: #9b2c2c; font-size: 13px;
}
.rpma-cin-submit {
  margin-top: 0.15rem; width: 100%; padding: 0.76rem 1rem; border: 0; border-radius: 0.65rem;
  background: linear-gradient(180deg, #22c9b6 0%, #1bb8a6 55%, #159e8f 100%);
  color: #041016; font-size: 15px; font-weight: 700; cursor: pointer;
  box-shadow: 0 8px 20px rgba(27,184,166,0.28);
  transition: filter 150ms ease-out, transform 150ms ease-out;
}
.rpma-cin-submit:hover:not(:disabled) { filter: brightness(1.05); }
.rpma-cin-submit:active:not(:disabled) { transform: scale(0.96); }
.rpma-cin-submit:disabled { opacity: 0.65; cursor: wait; }
.rpma-cin-foot {
  position: absolute; bottom: 0.85rem; left: 0; right: 0; z-index: 6;
  margin: 0; text-align: center; font-size: 0.75rem;
  color: rgba(232,238,244,0.55); pointer-events: none;
}

@media (max-width: 900px) {
  .rpma-cin-shell { justify-content: center; }
  .rpma-cin-vignette {
    background:
      linear-gradient(180deg, rgba(5,8,12,0.28) 0%, rgba(5,8,12,0.45) 50%, rgba(5,8,12,0.72) 100%);
  }
  .rpma-cin-right { min-height: 100dvh; padding-bottom: 3.2rem; }
  .rpma-cin-card { aspect-ratio: auto; }
}
`;
