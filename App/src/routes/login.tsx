import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { IdleLogoutBanner } from "@/lib/auth/idle-logout";
import { normalizeLoginIdentifier } from "@/lib/auth/root-admin";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const LOGIN_BUILD = "dc-play-20260814";
const DC_VIDEO = "/brand/login-datacenter.mp4?v=20260814b";
const DC_STILL = "/brand/login-datacenter.jpg?v=20260814b";

function LoginPage() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const vidRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isPending && user) {
      void navigate({ to: "/" });
    }
  }, [isPending, user, navigate]);

  useEffect(() => {
    const v = vidRef.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    const play = () => {
      void v.play().then(() => setVideoOn(true)).catch(() => setVideoOn(false));
    };
    const onPlaying = () => setVideoOn(true);
    const onFail = () => setVideoOn(false);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("canplay", play);
    v.addEventListener("error", onFail);
    play();
    return () => {
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("canplay", play);
      v.removeEventListener("error", onFail);
    };
  }, []);

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
    <div className="rpma-dc" data-login-build={LOGIN_BUILD}>
      <style>{DC_CSS}</style>

      <div className={"rpma-dc-stage" + (videoOn ? " is-live" : "")} aria-hidden="true">
        <img className="rpma-dc-still" src={DC_STILL} alt="" />
        <video
          ref={vidRef}
          className="rpma-dc-vid"
          poster={DC_STILL}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src={DC_VIDEO} type="video/mp4" />
        </video>
        <div className="rpma-dc-vignette" />
      </div>

      <div className="rpma-dc-center">
        <h1 className="rpma-dc-word">RPM Assure</h1>

        <div className="rpma-dc-card">
          <p className="rpma-dc-tag">- Single Source of Truth -</p>
          <IdleLogoutBanner />

          {!authEnabled ? (
            <p className="rpma-dc-error">Auth is disabled.</p>
          ) : (
            <form className="rpma-dc-form" onSubmit={onSubmit}>
              <label className="rpma-dc-field">
                <span>Username</span>
                <span className="rpma-dc-wrap">
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
              <label className="rpma-dc-field">
                <span>Password</span>
                <span className="rpma-dc-wrap">
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
                    className="rpma-dc-eye"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </label>
              {error ? <p className="rpma-dc-error">{error}</p> : null}
              <button type="submit" className="rpma-dc-submit" disabled={busy}>
                {busy ? "Signing in..." : "Sign in"}
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="rpma-dc-foot">Powered by RPM Resources</p>
    </div>
  );
}

const DC_CSS = `
.rpma-dc {
  --teal: var(--color-brand-teal);
  --lime: var(--color-brand-lime);
  --slate: var(--color-brand-slate);
  --ink: var(--color-brand-ink);
  --muted: #4a657c;
  position: relative; isolation: isolate;
  min-height: 100dvh; width: 100%;
  overflow: hidden;
  background: #071018;
  color: #e8eef4;
  font-family: Inter, system-ui, sans-serif;
}
.rpma-dc-stage { position: absolute; inset: 0; z-index: 0; }
.rpma-dc-vid, .rpma-dc-still {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover; object-position: center 45%;
}
.rpma-dc-still { z-index: 1; }
.rpma-dc-vid { z-index: 2; opacity: 0; transition: opacity 400ms ease; }
.rpma-dc-stage.is-live .rpma-dc-vid { opacity: 1; }
.rpma-dc-stage.is-live .rpma-dc-still { opacity: 0; }
.rpma-dc-vignette {
  position: absolute; inset: 0; z-index: 3; pointer-events: none;
  background:
    radial-gradient(ellipse 42% 38% at 50% 38%, rgba(255,255,255,0.18) 0%, transparent 70%),
    linear-gradient(180deg, rgba(7,16,24,0.18) 0%, transparent 28%, rgba(7,16,24,0.55) 100%);
}
.rpma-dc-center {
  position: relative; z-index: 4;
  min-height: 100dvh;
  display: flex; flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: clamp(6.5vh, 16vh, 18vh) 1.25rem 3rem;
}
.rpma-dc-word {
  margin: 0 0 clamp(1.1rem, 3.5vh, 2rem);
  text-align: center;
  font-size: clamp(2.4rem, 6.4vw, 4.6rem);
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1;
  color: transparent;
  background: linear-gradient(90deg, var(--slate) 0%, var(--teal) 46%, var(--lime) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 18px rgba(255,255,255,0.75)) drop-shadow(0 0 28px rgba(27,184,166,0.35));
}
.rpma-dc-card {
  width: min(100%, 24rem);
  padding: 1.2rem 1.35rem 1.2rem;
  border-radius: 1.05rem;
  background: rgba(255,255,255,0.94);
  color: var(--ink);
  border: 1px solid rgba(255,255,255,0.55);
  box-shadow: 0 24px 56px rgba(7,16,24,0.32);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.rpma-dc-tag {
  margin: 0 0 0.85rem;
  text-align: center;
  font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: #5a8a28;
}
.rpma-dc-form { display: flex; flex-direction: column; gap: 0.68rem; }
.rpma-dc-field span { display: block; margin-bottom: 0.24rem; font-size: 12px; font-weight: 600; color: var(--muted); }
.rpma-dc-wrap { position: relative; display: flex; align-items: center; }
.rpma-dc-wrap > svg { position: absolute; left: 0.75rem; color: #7b93a6; pointer-events: none; }
.rpma-dc-wrap input {
  width: 100%; box-sizing: border-box;
  padding: 0.68rem 2.5rem 0.68rem 2.3rem;
  border-radius: 0.6rem;
  border: 1px solid #d5dde6;
  background: var(--color-field);
  color: var(--ink); font-size: 14px; outline: none;
}
.rpma-dc-wrap input::placeholder { color: #8aa0b3; }
.rpma-dc-wrap input:-webkit-autofill,
.rpma-dc-wrap input:-webkit-autofill:hover,
.rpma-dc-wrap input:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--ink);
  transition: background-color 9999s ease-out 0s;
  box-shadow: 0 0 0 1000px var(--color-field) inset;
}
.rpma-dc-wrap input:focus {
  border-color: var(--teal);
  box-shadow: 0 0 0 3px rgba(27,184,166,0.18);
}
.rpma-dc-eye {
  position: absolute; right: 0.5rem; border: 0; background: transparent;
  color: #6b8496; cursor: pointer; padding: 0.35rem; display: inline-flex;
}
.rpma-dc-error {
  margin: 0; padding: 0.5rem 0.65rem; border-radius: 0.5rem;
  border: 1px solid rgba(209,75,75,0.35); background: #fff4f4;
  color: #9b2c2c; font-size: 13px;
}
.rpma-dc-submit {
  margin-top: 0.05rem; width: 100%; padding: 0.74rem 1rem; border: 0; border-radius: 0.6rem;
  background: linear-gradient(90deg, var(--slate) 0%, var(--teal) 48%, var(--lime) 100%);
  color: #fff;
  font-size: 15px; font-weight: 700; cursor: pointer;
  box-shadow: 0 8px 18px rgba(27,184,166,0.28);
  transition: filter 150ms ease-out, transform 150ms ease-out;
}
.rpma-dc-submit:hover:not(:disabled) { filter: brightness(1.06); }
.rpma-dc-submit:active:not(:disabled) { transform: scale(0.97); }
.rpma-dc-submit:disabled { opacity: 0.65; cursor: wait; }
.rpma-dc-foot {
  position: absolute; bottom: 0.7rem; left: 0; right: 0; z-index: 4;
  margin: 0; text-align: center; font-size: 0.72rem;
  color: rgba(255,255,255,0.72);
  text-shadow: 0 1px 8px rgba(7,16,24,0.55);
}
@media (prefers-reduced-motion: reduce) {
  .rpma-dc-vid { display: none; }
  .rpma-dc-stage.is-live .rpma-dc-still { opacity: 1; }
}
`;
