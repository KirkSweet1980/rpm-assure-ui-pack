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

const LOGIN_BUILD = "glass-boardroom-20260814";
const DC_STILL = "/brand/login-boardroom.jpg?v=20260814j";
const LOGO = "/brand/rpm-resources-logo.jpg";

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
        <div className="rpma-gl-art">
          <img className="rpma-gl-still" src={DC_STILL} alt="" />
          <div className="rpma-gl-marks">
            <span className="m-clarity">clarity</span>
            <span className="m-evidence">evidence</span>
            <span className="m-sot">source of truth</span>
            <span className="m-assurance">assurance</span>
          </div>
        </div>
        <div className="rpma-gl-wash" />
      </div>

      <main className="rpma-gl-stage">
        <section className="rpma-gl-card">
          <div className="rpma-gl-sheen" aria-hidden="true" />
          <img className="rpma-gl-logo" src={LOGO} alt="RPM Resources" />
          <h1 className="rpma-gl-word">RPM Assure</h1>
          <p className="rpma-gl-tag">Assurance Delivered</p>

          <IdleLogoutBanner />

          {!authEnabled ? (
            <p className="rpma-gl-error">Auth is disabled.</p>
          ) : (
            <form className="rpma-gl-form" onSubmit={onSubmit}>
              <label className="rpma-gl-field">
                <span>Username</span>
                <span className="rpma-gl-wrap">
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
              <label className="rpma-gl-field">
                <span>Password</span>
                <span className="rpma-gl-wrap">
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
                    className="rpma-gl-eye"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </label>
              {error ? <p className="rpma-gl-error">{error}</p> : null}
              <button type="submit" className="rpma-gl-submit" disabled={busy}>
                {busy ? "Signing in..." : "Sign in"}
              </button>
            </form>
          )}

          <p className="rpma-gl-foot">Powered by RPM Resources</p>
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
  --ink: var(--color-brand-ink);
  --glass: rgba(248, 252, 255, 0.38);
  --glass-edge: rgba(255, 255, 255, 0.62);
  --well: rgba(255, 255, 255, 0.52);
  position: relative;
  isolation: isolate;
  min-height: 100dvh;
  width: 100%;
  overflow: hidden;
  background: #9aa8b4;
  color: var(--ink);
  font-family: Inter, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.rpma-gl-scene {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}
.rpma-gl-art {
  position: absolute;
  left: 42%;
  top: 28%;
  width: max(100%, calc(100dvh * 1568 / 1045));
  height: max(100%, calc(100% * 1045 / 1568));
  transform: translate(-42%, -28%);
}
.rpma-gl-still {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  display: block;
}
.rpma-gl-marks {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.rpma-gl-marks span {
  position: absolute;
  margin: 0;
  color: #102436;
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1;
  text-transform: lowercase;
  text-align: center;
  white-space: nowrap;
  opacity: 0.32;
  user-select: none;
  transform: translate(-50%, -50%);
}
.m-clarity { left: 37.5%; top: 16.5%; font-size: clamp(1.45rem, 2.6vw, 2.2rem); }
.m-evidence { left: 62.5%; top: 16.5%; font-size: clamp(1.45rem, 2.6vw, 2.2rem); }
.m-sot { left: 37.5%; top: 36.5%; font-size: clamp(0.82rem, 1.2vw, 1.08rem); }
.m-assurance { left: 62.5%; top: 36.5%; font-size: clamp(1.3rem, 2.2vw, 1.9rem); }
.rpma-gl-wash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(90% 80% at 78% 48%, rgba(12, 28, 44, 0.18) 0%, transparent 58%),
    linear-gradient(90deg, rgba(255,255,255,0.04) 0%, transparent 38%, rgba(12, 28, 44, 0.22) 100%),
    linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 30%, rgba(12, 22, 34, 0.18) 100%);
}
.rpma-gl-stage {
  position: relative;
  z-index: 2;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 2.4rem 4.5vw 2.4rem 1.5rem;
}
.rpma-gl-card {
  position: relative;
  width: min(100%, 24.5rem);
  padding: 1.85rem 1.7rem 1.25rem;
  border-radius: 1.45rem;
  background: var(--glass);
  border: 1px solid var(--glass-edge);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.55) inset,
    0 18px 50px rgba(11, 26, 58, 0.22),
    0 2px 8px rgba(11, 26, 58, 0.08);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
  overflow: hidden;
}
.rpma-gl-sheen {
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, var(--slate) 0%, var(--teal) 48%, var(--lime) 100%);
  opacity: 0.95;
}
.rpma-gl-logo {
  display: block;
  width: auto;
  height: 1.85rem;
  margin: 0.2rem auto 0.7rem;
  object-fit: contain;
  mix-blend-mode: multiply;
}
.rpma-gl-word {
  margin: 0 0 0.28rem;
  text-align: center;
  font-size: clamp(1.7rem, 3vw, 2.15rem);
  font-weight: 800;
  letter-spacing: 0.01em;
  line-height: 1;
  text-wrap: balance;
  color: transparent;
  background: linear-gradient(90deg, var(--slate) 0%, var(--teal) 46%, var(--lime) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.rpma-gl-tag {
  margin: 0 0 1.25rem;
  text-align: center;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #3f6a22;
}
.rpma-gl-form { display: flex; flex-direction: column; gap: 0.78rem; }
.rpma-gl-field span {
  display: block;
  margin-bottom: 0.28rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #355068;
}
.rpma-gl-wrap { position: relative; display: flex; align-items: center; }
.rpma-gl-wrap > svg {
  position: absolute;
  left: 0.8rem;
  color: #5d7a90;
  pointer-events: none;
}
.rpma-gl-wrap input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.74rem 2.55rem 0.74rem 2.35rem;
  border: 0;
  border-radius: 0.78rem;
  background: var(--well);
  color: var(--ink);
  font-size: 0.92rem;
  outline: none;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.55) inset,
    0 1px 2px rgba(11, 26, 58, 0.06);
  transition: box-shadow 160ms ease-out, background 160ms ease-out;
}
.rpma-gl-wrap input::placeholder { color: #7d96aa; }
.rpma-gl-wrap input:-webkit-autofill,
.rpma-gl-wrap input:-webkit-autofill:hover,
.rpma-gl-wrap input:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--ink);
  transition: background-color 9999s ease-out 0s;
  box-shadow: 0 0 0 1000px var(--well) inset;
}
.rpma-gl-wrap input:focus {
  background: rgba(255,255,255,0.72);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--teal) 55%, white) inset,
    0 0 0 4px color-mix(in srgb, var(--teal) 18%, transparent);
}
.rpma-gl-eye {
  position: absolute;
  right: 0.35rem;
  border: 0;
  background: transparent;
  color: #5d7a90;
  cursor: pointer;
  padding: 0.35rem;
  display: inline-flex;
  min-width: 40px;
  min-height: 40px;
  align-items: center;
  justify-content: center;
}
.rpma-gl-error {
  margin: 0;
  padding: 0.55rem 0.7rem;
  border-radius: 0.7rem;
  background: rgba(255, 236, 236, 0.78);
  color: #9b2c2c;
  font-size: 0.8rem;
  box-shadow: 0 0 0 1px rgba(209, 75, 75, 0.28) inset;
}
.rpma-gl-submit {
  margin-top: 0.2rem;
  width: 100%;
  min-height: 46px;
  padding: 0.78rem 1rem;
  border: 0;
  border-radius: 0.85rem;
  background: linear-gradient(90deg, var(--slate) 0%, var(--teal) 48%, var(--lime) 100%);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(27, 184, 166, 0.28);
  transition: filter 160ms ease-out, transform 160ms ease-out;
}
.rpma-gl-submit:hover:not(:disabled) { filter: brightness(1.06); }
.rpma-gl-submit:active:not(:disabled) { transform: scale(0.98); }
.rpma-gl-submit:disabled { opacity: 0.65; cursor: wait; }
.rpma-gl-foot {
  margin: 1.15rem 0 0;
  text-align: center;
  font-size: 0.7rem;
  color: #4d6578;
}
@media (max-width: 860px) {
  .rpma-gl-stage {
    align-items: flex-end;
    justify-content: center;
    padding: 0 0.9rem 0.9rem;
  }
  .rpma-gl-card {
    width: 100%;
    border-radius: 1.25rem;
    background: rgba(248, 252, 255, 0.58);
  }
  .m-clarity, .m-evidence, .m-sot, .m-assurance { opacity: 0.22; }
}
@media (prefers-reduced-motion: reduce) {
  .rpma-gl-wrap input, .rpma-gl-submit { transition: none; }
}
`;
