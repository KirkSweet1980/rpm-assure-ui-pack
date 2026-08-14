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

const LOGIN_BUILD = "boardroom-20260814";
const DC_STILL = "/brand/login-boardroom.jpg?v=20260814d";

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
    { top: [8, 16], left: [6, 18] },
    { top: [30, 40], left: [28, 46] },
    { top: [54, 64], left: [5, 18] },
    { top: [76, 86], left: [22, 42] },
  ];
  return WATERMARKS.map((text, i) => {
    const b = bands[i];
    const long = text.length > 10;
    return {
      text,
      top: b.top[0] + Math.random() * (b.top[1] - b.top[0]),
      left: b.left[0] + Math.random() * (b.left[1] - b.left[0]),
      rot: -12 + Math.random() * 24,
      size: long ? 1.25 + Math.random() * 0.4 : 2.05 + Math.random() * 0.85,
      opacity: 0.18 + Math.random() * 0.1,
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
  const [marks, setMarks] = useState<Mark[]>([]);

  useEffect(() => {
    setMarks(scatterMarks());
  }, []);

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
    <div className="rpma-dc" data-login-build={LOGIN_BUILD}>
      <style>{DC_CSS}</style>

      <section className="rpma-dc-left" aria-hidden="true">
        <img className="rpma-dc-still" src={DC_STILL} alt="" />
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
  grid-template-columns: minmax(0, 1.5fr) minmax(22rem, 26.5rem);
  overflow: hidden;
  background: #dfe6ee;
  color: #e8eef4;
  font-family: Inter, system-ui, sans-serif;
}
.rpma-dc-left {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  background: #cfd8e2;
}
.rpma-dc-still {
  position: absolute; inset: -4%;
  width: 108%; height: 108%;
  object-fit: cover; object-position: 42% 55%;
  animation: rpma-kb 28s ease-in-out infinite alternate;
}
@keyframes rpma-kb {
  from { transform: scale(1) translate3d(0, 0, 0); }
  to { transform: scale(1.08) translate3d(-1.6%, -1.2%, 0); }
}
.rpma-dc-vignette {
  position: absolute; inset: 0; z-index: 3; pointer-events: none;
  background:
    linear-gradient(90deg, transparent 0%, transparent 72%, rgba(244,247,250,0.55) 100%),
    linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 28%, rgba(20,32,44,0.12) 100%);
}
.rpma-dc-mark {
  position: absolute;
  z-index: 4;
  margin: 0;
  max-width: 72%;
  color: #163044;
  font-weight: 800;
  letter-spacing: 0.03em;
  line-height: 0.95;
  text-transform: lowercase;
  white-space: nowrap;
  pointer-events: none;
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
  box-shadow: -16px 0 36px rgba(20,32,44,0.12);
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
    grid-template-rows: minmax(30vh, 34vh) 1fr;
  }
  .rpma-dc-left { min-height: 30vh; }
  .rpma-dc-right {
    min-height: auto;
    padding: 1.6rem 1.25rem 3.2rem;
    box-shadow: 0 -12px 28px rgba(20,32,44,0.1);
  }
  .rpma-dc-mark { font-size: 1.05rem !important; }
}
@media (prefers-reduced-motion: reduce) {
  .rpma-dc-still { animation: none; }
}
`;
