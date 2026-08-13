import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { KeyRound, Save, Shield, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHead } from "@/components/ui/card";
import {
  applySslConfig,
  clearSslCertificate,
  fetchSslSettings,
  saveSslSettings,
  uploadSslCertificate,
} from "@/lib/settings/settings-api";
import { DEFAULT_SSL, type SslConfig } from "@/lib/settings/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/ssl")({
  component: SslSettingsPage,
});

function SslSettingsPage() {
  const [ssl, setSsl] = useState<SslConfig>({ ...DEFAULT_SSL });
  const [status, setStatus] = useState<{
    certPresent: boolean;
    keyPresent: boolean;
    certBytes: number;
    keyBytes: number;
    localCertPath: string;
    localKeyPath: string;
    deployCertPath: string;
    caddyfilePath: string;
    caddyfilePresent: boolean;
  } | null>(null);
  const [caddyPreview, setCaddyPreview] = useState("");
  const [certPem, setCertPem] = useState("");
  const [keyPem, setKeyPem] = useState("");
  const [certFileName, setCertFileName] = useState("");
  const [keyFileName, setKeyFileName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const b = await fetchSslSettings();
    setSsl({ ...DEFAULT_SSL, ...b.ssl });
    setStatus(b.status);
    setCaddyPreview(b.caddyPreview || "");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await saveSslSettings({ data: { ssl } });
      setSsl({ ...DEFAULT_SSL, ...r.ssl });
      setCaddyPreview(r.caddyPreview || "");
      setMsg("SSL settings saved (not applied to Caddy yet).");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onUpload() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await uploadSslCertificate({
        data: {
          certPem,
          keyPem,
          certFileName: certFileName || undefined,
          keyFileName: keyFileName || undefined,
        },
      });
      if (!r.ok) {
        setMsg("Upload failed: " + (("error" in r && r.error) || "unknown"));
        return;
      }
      setStatus(r.status);
      setSsl({ ...DEFAULT_SSL, ...r.ssl });
      setCaddyPreview(r.caddyPreview || "");
      setCertPem("");
      setKeyPem("");
      setMsg(
        "Certificate and key stored. Mode set to Custom. Click Apply Caddyfile, then restart Caddy.",
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onClearCert() {
    if (!confirm("Remove stored certificate and private key from the app host?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await clearSslCertificate();
      setStatus(r.status);
      setSsl({ ...DEFAULT_SSL, ...r.ssl });
      setMsg("Certificate files cleared.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onApply() {
    setBusy(true);
    setMsg(null);
    try {
      await saveSslSettings({ data: { ssl } });
      const r = await applySslConfig({ data: { ssl } });
      if (!r.ok) {
        setMsg("Apply failed: " + (r.error || "unknown"));
        setCaddyPreview(r.preview || r.caddyfile || "");
        return;
      }
      setStatus(r.status);
      setCaddyPreview(r.preview || r.caddyfile || "");
      const authNote = r.auth?.message ? ` · ${r.auth.message}` : "";
      setMsg(
        `Caddyfile written to ${r.caddyPath}.${authNote} Restart Caddy and the app if auth URLs changed.`,
      );
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => reject(new Error("Could not read file"));
      fr.readAsText(file);
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHead className="flex flex-wrap items-center gap-2">
          <Shield className="h-4 w-4 text-accent" />
          SSL / HTTPS
        </CardHead>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted">
            Configure public <strong>HTTPS only</strong> for this host (TCP <strong>443</strong>).
            Port <strong>80 is not used</strong>. Caddy terminates TLS and proxies to the app.
            Choose <strong>Let's Encrypt</strong> (TLS-ALPN on 443) or upload your{" "}
            <strong>own certificate</strong> (PEM fullchain + private key).
          </p>

          <div className="rounded-xl border border-border bg-bg/40 p-3 text-[12px] text-muted">
            <p className="font-semibold text-fg">Go-live checklist — assure.rpmresources.co.za</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>DNS A-record points to this server's public IP</li>
              <li>Firewall / NSG allows inbound TCP <strong>443</strong> only (not 80)</li>
              <li>App listening on 127.0.0.1:8081 (or the port below)</li>
              <li>Mode = Let's Encrypt, hostname = assure.rpmresources.co.za → Save → Apply Caddyfile</li>
              <li>Run install scripts on the host (Administrator) if Caddy is not installed yet</li>
              <li>Open https://assure.rpmresources.co.za and sign in</li>
            </ol>
            <p className="mt-2 text-[11px] text-subtle">
              Host scripts: C:\RPM-Assure\deploy\Preflight-SSL.ps1 then Install-SSL-All.ps1
              (from SSL pack). After HTTPS works, restart Node so auth cookies use the HTTPS URL.
            </p>
          </div>

          {msg ? (
            <div
              className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                msg.toLowerCase().includes("fail")
                  ? "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100"
                  : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
              )}
            >
              {msg}
            </div>
          ) : null}

          <fieldset className="space-y-2">
            <legend className="text-xs font-bold uppercase tracking-wide text-muted">
              Mode
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["letsencrypt", "Let's Encrypt", "Free auto cert on TCP 443 only (TLS-ALPN; no port 80)"],
                  ["custom", "Own certificate", "Upload PEM cert + private key (HTTPS only)"],
                  ["disabled", "Disabled", "No Caddy HTTPS block"],
                ] as const
              ).map(([mode, label, hint]) => (
                <label
                  key={mode}
                  className={cn(
                    "cursor-pointer rounded-xl border p-3 text-sm transition",
                    ssl.mode === mode
                      ? "border-accent bg-accent-soft shadow-sm"
                      : "border-border bg-surface hover:border-accent/40",
                  )}
                >
                  <input
                    type="radio"
                    className="mr-2"
                    name="ssl-mode"
                    checked={ssl.mode === mode}
                    onChange={() => setSsl((s) => ({ ...s, mode }))}
                  />
                  <span className="font-semibold text-fg">{label}</span>
                  <span className="mt-1 block text-[11px] text-muted">{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-muted">Public hostname</span>
              <input
                className="field"
                value={ssl.hostname}
                placeholder="assure.rpmresources.co.za"
                onChange={(e) => setSsl((s) => ({ ...s, hostname: e.target.value }))}
              />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-muted">
                Let's Encrypt email (optional)
              </span>
              <input
                className="field"
                type="email"
                value={ssl.letsEncryptEmail}
                placeholder="ops@rpmresources.co.za"
                onChange={(e) => setSsl((s) => ({ ...s, letsEncryptEmail: e.target.value }))}
              />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-muted">App host (upstream)</span>
              <input
                className="field"
                value={ssl.appHost}
                onChange={(e) => setSsl((s) => ({ ...s, appHost: e.target.value }))}
              />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-muted">App port</span>
              <input
                className="field"
                type="number"
                min={1}
                max={65535}
                value={ssl.appPort}
                onChange={(e) =>
                  setSsl((s) => ({ ...s, appPort: Number(e.target.value) || 8081 }))
                }
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ssl.hsts}
                onChange={(e) => setSsl((s) => ({ ...s, hsts: e.target.checked }))}
              />
              HSTS header
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ssl.patchAuthUrls}
                onChange={(e) => setSsl((s) => ({ ...s, patchAuthUrls: e.target.checked }))}
              />
              Patch auth URLs to https://hostname on Apply
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void onSave()}>
              <Save className="mr-1.5 h-4 w-4" />
              Save settings
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void onApply()}
            >
              <Shield className="mr-1.5 h-4 w-4" />
              Apply Caddyfile
            </Button>
          </div>

          {ssl.lastAppliedAt ? (
            <p className="text-[11px] text-muted">
              Last applied: {new Date(ssl.lastAppliedAt).toLocaleString("en-ZA")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHead className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-accent" />
          Own certificate (PEM)
        </CardHead>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted">
            Upload <strong>full chain</strong> (certificate + intermediates) and the matching{" "}
            <strong>private key</strong> as PEM text. PFX/P12 is not accepted here — convert first:
            <code className="mx-1 rounded bg-surface-2 px-1">
              openssl pkcs12 -in site.pfx -out fullchain.pem -clcerts -nokeys
            </code>
            and
            <code className="mx-1 rounded bg-surface-2 px-1">
              openssl pkcs12 -in site.pfx -out privkey.pem -nocerts -nodes
            </code>
            . Keys are stored only on the app host and never shown again.
          </p>

          <div className="rounded-lg border border-border bg-surface-2/50 px-3 py-2 text-xs text-muted">
            <p className="font-semibold text-fg">On disk</p>
            {status ? (
              <ul className="mt-1 space-y-0.5">
                <li>
                  Certificate:{" "}
                  {status.certPresent
                    ? `present (${status.certBytes} bytes)`
                    : "missing"}
                  {ssl.certFileName ? ` · ${ssl.certFileName}` : ""}
                </li>
                <li>
                  Private key:{" "}
                  {status.keyPresent ? `present (${status.keyBytes} bytes)` : "missing"}
                  {ssl.keyFileName ? ` · ${ssl.keyFileName}` : ""}
                </li>
                <li className="truncate" title={status.localCertPath}>
                  Path: {status.localCertPath}
                </li>
                <li className="truncate" title={status.deployCertPath}>
                  Caddy path: {status.deployCertPath}
                </li>
              </ul>
            ) : (
              <p>Loading…</p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Certificate file (.pem / .crt)
              </label>
              <input
                type="file"
                accept=".pem,.crt,.cer,.txt"
                className="mb-2 block w-full text-xs"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setCertFileName(f.name);
                  void readFileAsText(f).then(setCertPem).catch((err) => setMsg(String(err)));
                }}
              />
              <textarea
                className="field min-h-[140px] font-mono text-[11px]"
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                value={certPem}
                onChange={(e) => setCertPem(e.target.value)}
                spellCheck={false}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Private key file (.pem / .key)
              </label>
              <input
                type="file"
                accept=".pem,.key,.txt"
                className="mb-2 block w-full text-xs"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setKeyFileName(f.name);
                  void readFileAsText(f).then(setKeyPem).catch((err) => setMsg(String(err)));
                }}
              />
              <textarea
                className="field min-h-[140px] font-mono text-[11px]"
                placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                value={keyPem}
                onChange={(e) => setKeyPem(e.target.value)}
                spellCheck={false}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy || !certPem.trim() || !keyPem.trim()}
              onClick={() => void onUpload()}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              Upload certificate
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || !(status?.certPresent || status?.keyPresent)}
              onClick={() => void onClearCert()}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Clear stored cert
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHead>Caddyfile preview</CardHead>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted">
            Written to{" "}
            <code className="rounded bg-surface-2 px-1">
              {status?.caddyfilePath || "C:\\RPM-Assure\\deploy\\Caddyfile"}
            </code>{" "}
            when you click Apply. Then restart Caddy:
          </p>
          <pre className="overflow-x-auto rounded-lg border border-border bg-nav p-3 text-[11px] text-nav-fg">
{`# After Apply Caddyfile:
caddy validate --config C:\\RPM-Assure\\deploy\\Caddyfile
# Restart service or task:
#   nssm restart RPMAssure-Caddy
#   OR  schtasks /Run /TN RPMAssure-Caddy-OnStart
#   OR  caddy reload --config C:\\RPM-Assure\\deploy\\Caddyfile`}
          </pre>
          <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-[11px] text-fg whitespace-pre-wrap">
            {caddyPreview || "Save or change mode to preview…"}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
