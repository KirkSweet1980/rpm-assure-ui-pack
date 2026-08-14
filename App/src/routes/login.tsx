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

const LOGIN_BUILD = "split-assurance-20260814";
const DC_VIDEO = "/brand/login-datacenter.mp4?v=20260814c";
const DC_STILL = "/brand/login-datacenter.jpg?v=20260814c";

const WATERMARKS = ["clarity", "evidence", "source of truth", "assurance"] as const;

type Mark = {
  text: string;
  top: number;
  left: number;
  rot: number;
  size: number;
  opacity: number;
};

function scatterMarks(): Mark[] {
  const bands = [
    { top: [7, 18], left: [5, 22] },
    { top: [28, 42], left: [32, 52] },
    { top: [52, 64], left: [6, 24] },
    { top: [74, 86], left: [24, 48] },
  ];
  return WATERMARKS.map((text, i) => {
    const b = bands[i];
    const long = text.length > 10;
    return {
      text,
      top: b.top[0] + Math.random() * (b.top[1] - b.top[0]),
      left: b.left[0] + Math.random() * (b.left[1] - b.left[0]),
      rot: -16 + Math.random() * 32,
      size: long ? 1.15 + Math.random() * 0.45 : 1.85 + Math.random() * 1.15,
      opacity: 0.16 + Math.random() * 0.14,
    };
  });
}

function LoginPage() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [marks] = useState(scatterMarks);
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

      <section className={"rpma-dc-left" + (videoOn ? " is-live" : "")} aria-hidden="true">
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
        {marks.map((m) => (
          <span
            key={m.text}
            className="rpma-dc-mark"
            style={{
              top: `${m.top}%`,
              left: `${m.left}%`,
              transform: `rotate(${m.rot}deg)`,
              fontSize: `${m.size}rem`,
              opacity: m.opacity,
            }}
          >
            {m.text}
          </span>
        ))}
      </section>

      <aside className="rpma-dc-right">
        <div className="rpma-dc-right-inner">
          <h1 className="rpma-dc-word">RPM Assure</h1>
          <p className="rpma-dc-tag">- Assurance Delivered -</p>

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
        <p className="rpma-dc-foot">Powered by RPM Resources</p>
      </aside>
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
  --field: var(--color-field, #eef2f6);
  position: relative; isolation: isolate;
  min-height: 100dvh; width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(22rem, 26.5rem);
  overflow: hidden;
  background: #071018;
  color: #e8eef4;
  font-family: Inter, system-ui, sans-serif;
}
.rpma-dc-left {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  background: #071018;
}
.rpma-dc-vid, .rpma-dc-still {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover; object-position: center 45%;
}
.rpma-dc-still { z-index: 1; }
.rpma-dc-vid { z-index: 2; opacity: 0; transition: opacity 400ms ease; }
.rpma-dc-left.is-live .rpma-dc-vid { opacity: 1; }
.rpma-dc-left.is-live .rpma-dc-still { opacity: 0; }
.rpma-dc-vignette {
  position: absolute; inset: 0; z-index: 3; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(7,16,24,0.18) 0%, transparent 28%, rgba(7,16,24,0.42) 100%),
    linear-gradient(180deg, rgba(7,16,24,0.22) 0%, transparent 30%, rgba(7,16,24,0.5) 100%);
}
.rpma-dc-mark {
  position: absolute;
  z-index: 4;
  margin: 0;
  max-width: 70%;
  color: #fff;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 0.95;
  text-transform: lowercase;
  white-space: nowrap;
  pointer-events: none;
  text-shadow: 0 2px 18px rgba(7,16,24,0.35);
  user-select: none;
}
.rpma-dc-right {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100dvh;
  padding: 2.4rem 2.15rem 3.4rem;
  background: #f4f7fa;
  color: var(--ink);
  box-shadow: -18px 0 40px rgba(7,16,24,0.18);
}
.rpma-dc-right-inner { width: 100%; max-width: 22rem; margin: 0 auto; }
.rpma-dc-word {
  margin: 0 0 0.45rem;
  text-align: center;
  font-size: clamp(1.85rem, 3.4vw, 2.45rem);
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1;
  color: transparent;
  background: linear-gradient(90deg, var(--slate) 0%, var(--teal) 46%, var(--lime) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.rpma-dc-tag {
  margin: 0 0 1.35rem;
  text-align: center;
  font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: #5a8a28;
}
.rpma-dc-form { display: flex; flex-direction: column; gap: 0.72rem; }
.rpma-dc-field span { display: block; margin-bottom: 0.24rem; font-size: 12px; font-weight: 600; color: var(--muted); }
.rpma-dc-wrap { position: relative; display: flex; align-items: center; }
.rpma-dc-wrap > svg { position: absolute; left: 0.75rem; color: #7b93a6; pointer-events: none; }
.rpma-dc-wrap input {
  width: 100%; box-sizing: border-box;
  padding: 0.68rem 2.5rem 0.68rem 2.3rem;
  border-radius: 0.6rem;
  border: 1px solid #d5dde6;
  background: var(--field);
  color: var(--ink); font-size: 14px; outline: none;
}
.rpma-dc-wrap input::placeholder { color: #8aa0b3; }
.rpma-dc-wrap input:-webkit-autofill,
.rpma-dc-wrap input:-webkit-autofill:hover,
.rpma-dc-wrap input:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--ink);
  transition: background-color 9999s ease-out 0s;
  box-shadow: 0 0 0 1000px var(--field) inset;
}
.rpma-dc-wrap input:focus {
  border-color: var(--teal);
  box-shadow: 0 0 0 3px rgba(27,184,166,0.18);
}
.rpma-dc-eye {
  position: absolute; right: 0.5rem; border: 0; background: transparent;
  color: #6b8496; cursor: pointer; padding: 0.35rem; display: inline-flex;
  min-width: 40px; min-height: 40px; align-items: center; justify-content: center;
}
.rpma-dc-error {
  margin: 0; padding: 0.5rem 0.65rem; border-radius: 0.5rem;
  border: 1px solid rgba(209,75,75,0.35); background: #fff4f4;
  color: #9b2c2c; font-size: 13px;
}
.rpma-dc-submit {
  margin-top: 0.15rem; width: 100%; padding: 0.74rem 1rem; border: 0; border-radius: 0.6rem;
  background: linear-gradient(90deg, var(--slate) 0%, var(--teal) 48%, var(--lime) 100%);
  color: #fff;
  font-size: 15px; font-weight: 700; cursor: pointer;
  box-shadow: 0 8px 18px rgba(27,184,166,0.22);
  transition: filter 150ms ease-out, transform 150ms ease-out;
}
.rpma-dc-submit:hover:not(:disabled) { filter: brightness(1.06); }
.rpma-dc-submit:active:not(:disabled) { transform: scale(0.97); }
.rpma-dc-submit:disabled { opacity: 0.65; cursor: wait; }
.rpma-dc-foot {
  position: absolute; bottom: 0.85rem; left: 0; right: 0;
  margin: 0; text-align: center; font-size: 0.72rem;
  color: #7a8c9a;
}
@media (max-width: 860px) {
  .rpma-dc {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(34vh, 38vh) 1fr;
  }
  .rpma-dc-left { min-height: 34vh; }
  .rpma-dc-right {
    min-height: auto;
    padding: 1.6rem 1.25rem 3.2rem;
    box-shadow: 0 -12px 28px rgba(7,16,24,0.16);
  }
  .rpma-dc-mark { font-size: 1.1rem !important; }
}
@media (prefers-reduced-motion: reduce) {
  .rpma-dc-vid { display: none; }
  .rpma-dc-left.is-live .rpma-dc-still { opacity: 1; }
}
`;
