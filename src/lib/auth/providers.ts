/**
 * Upstream identity providers for sign-in (via Grok auth broker).
 * Shared by server + client. Button UI lives on /login.
 */
export type GrokProvider = {
  /** This app's local provider id; also the callback path segment. */
  providerId: string;
  /** Upstream hint the broker forwards to (Better Auth social id). */
  idp: string;
  /** Human label for the sign-in button. */
  label: string;
  /** Brand key for button styling */
  brand: "microsoft" | "google" | "x";
};

export const GROK_PROVIDERS: readonly GrokProvider[] = [
  { providerId: "grok-microsoft", idp: "microsoft", label: "Microsoft", brand: "microsoft" },
  { providerId: "grok-google", idp: "google", label: "Google", brand: "google" },
  { providerId: "grok-x", idp: "twitter", label: "X", brand: "x" },
];
