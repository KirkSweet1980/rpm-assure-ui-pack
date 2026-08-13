import { useState } from "react";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 21 21" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function BrandIcon({ brand }: { brand: string }) {
  if (brand === "microsoft") return <MicrosoftIcon className="h-5 w-5 shrink-0" />;
  if (brand === "google") return <GoogleIcon className="h-5 w-5 shrink-0" />;
  if (brand === "x") return <XIcon className="h-4 w-4 shrink-0" />;
  return null;
}

export function OAuthProviderButtons({
  className,
  callbackURL = "/",
  layout = "column",
}: {
  className?: string;
  callbackURL?: string;
  layout?: "column" | "stack";
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onProvider(providerId: string) {
    setError(null);
    setBusyId(providerId);
    try {
      await signIn(providerId, {
        callbackURL,
        errorCallbackURL: "/login",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusyId(null);
    }
  }

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Divider — no solid background on label */}
      <div className="flex items-center gap-3" role="separator">
        <div className="h-px flex-1 bg-border/50" />
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">
          Or continue with
        </span>
        <div className="h-px flex-1 bg-border/50" />
      </div>

      <div className={cn("grid gap-2.5", layout === "column" && "grid-cols-1")}>
        {GROK_PROVIDERS.map((p) => (
          <button
            key={p.providerId}
            type="button"
            disabled={busyId !== null}
            onClick={() => void onProvider(p.providerId)}
            className={cn(
              "rpma-focus flex h-11 w-full items-center justify-center gap-2.5 rounded-xl",
              "border border-border/50 bg-transparent px-3 text-sm font-medium text-fg",
              "transition-colors hover:border-accent/40 hover:bg-white/15",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            <BrandIcon brand={p.brand} />
            <span>
              {busyId === p.providerId ? "Redirecting…" : `Continue with ${p.label}`}
            </span>
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg bg-rag-red-bg/80 px-3 py-2 text-xs text-rag-red">{error}</p>
      ) : null}
    </div>
  );
}
