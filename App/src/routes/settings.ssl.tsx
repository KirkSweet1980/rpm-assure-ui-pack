import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Save, Shield, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigPageHead } from "@/components/settings/config-page";
import {
  applySslConfig,
  clearSslCertificate,
  fetchSslSettings,
  probeSslReachability,
  saveSslSettings,
  uploadSslCertificate,
} from "@/lib/settings/settings-api";
import { DEFAULT_SSL, type SslConfig } from "@/lib/settings/types";

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
      setMsg("SSL settings saved.");
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
      setMsg("Certificate stored. Apply Caddyfile, then restart Caddy.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onClearCert() {
    if (!confirm("Remove stored certificate and private key?")) return;
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
      setMsg(`Caddyfile written to ${r.caddyPath}.${authNote}`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onProbe() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await probeSslReachability({ data: { hostname: ssl.hostname } });
      setMsg(r.message);
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
    <div className="space-y-6">
      <ConfigPageHead
        kicker="Settings"
        title="SSL / HTTPS"
        icon={Shield}
        actions={
          <>
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void onProbe()}>
              Test public HTTPS
            </Button>
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void onApply()}>
              Apply Caddyfile
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => void onSave()}>
              <Save className="size-3.5" />
              Save
            </Button>
          </>
        }
      />
      {msg ? <p className="text-[12px] text-muted">{msg}</p> : null}

      <section className="rpma-panel overflow-hidden p-0">
        <div className="px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">HTTPS Settings</h2>
          <p className="mt-1 text-[12px] text-muted">
            Public access is <span className="font-semibold">https://hostname</span> on port 443 via Caddy.
            The app itself stays on loopback only — do not publish that port.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="rpma-xls">
            <thead>
              <tr>
                <th>Setting</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Mode</td>
                <td>
                  <select
                    className="border-0 bg-transparent text-[12px] outline-none"
                    value={ssl.mode}
                    onChange={(e) => setSsl((s) => ({ ...s, mode: e.target.value as SslConfig["mode"] }))}
                  >
                    <option value="letsencrypt">Let's Encrypt</option>
                    <option value="custom">Own Certificate</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </td>
              </tr>
              <tr>
                <td>Public Hostname</td>
                <td>
                  <input className="w-full border-0 bg-transparent text-[12px] outline-none" value={ssl.hostname} onChange={(e) => setSsl((s) => ({ ...s, hostname: e.target.value }))} />
                </td>
              </tr>
              <tr>
                <td>Let's Encrypt Email</td>
                <td>
                  <input className="w-full border-0 bg-transparent text-[12px] outline-none" type="email" value={ssl.letsEncryptEmail} onChange={(e) => setSsl((s) => ({ ...s, letsEncryptEmail: e.target.value }))} />
                </td>
              </tr>
              <tr>
                <td>App Host</td>
                <td>
                  <input className="w-full border-0 bg-transparent text-[12px] outline-none" value={ssl.appHost} onChange={(e) => setSsl((s) => ({ ...s, appHost: e.target.value }))} />
                </td>
              </tr>
              <tr>
                <td>App Port</td>
                <td>
                  <input className="w-24 border-0 bg-transparent text-[12px] outline-none" type="number" value={ssl.appPort} onChange={(e) => setSsl((s) => ({ ...s, appPort: Number(e.target.value) || 8081 }))} />
                </td>
              </tr>
              <tr>
                <td>HSTS Header</td>
                <td>
                  <input type="checkbox" checked={ssl.hsts} onChange={(e) => setSsl((s) => ({ ...s, hsts: e.target.checked }))} />
                </td>
              </tr>
              <tr>
                <td>Patch Auth URLs On Apply</td>
                <td>
                  <input type="checkbox" checked={ssl.patchAuthUrls} onChange={(e) => setSsl((s) => ({ ...s, patchAuthUrls: e.target.checked }))} />
                </td>
              </tr>
              <tr>
                <td>Last Applied</td>
                <td>{ssl.lastAppliedAt ? new Date(ssl.lastAppliedAt).toLocaleString("en-ZA") : "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rpma-panel overflow-hidden p-0">
        <div className="flex flex-wrap items-end justify-between gap-2 px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">Own Certificate</h2>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={busy || !certPem.trim() || !keyPem.trim()} onClick={() => void onUpload()}>
              <Upload className="size-3.5" />
              Upload
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={busy || !(status?.certPresent || status?.keyPresent)} onClick={() => void onClearCert()}>
              <Trash2 className="size-3.5" />
              Clear
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="rpma-xls">
            <thead>
              <tr>
                <th>Item</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Certificate</td>
                <td>
                  {status?.certPresent ? `Present (${status.certBytes} bytes)` : "Missing"}
                  {ssl.certFileName ? ` · ${ssl.certFileName}` : ""}
                </td>
              </tr>
              <tr>
                <td>Private Key</td>
                <td>
                  {status?.keyPresent ? `Present (${status.keyBytes} bytes)` : "Missing"}
                  {ssl.keyFileName ? ` · ${ssl.keyFileName}` : ""}
                </td>
              </tr>
              <tr>
                <td>Path</td>
                <td className="font-mono">{status?.localCertPath || "—"}</td>
              </tr>
              <tr>
                <td>Caddy Path</td>
                <td className="font-mono">{status?.deployCertPath || "—"}</td>
              </tr>
              <tr>
                <td>Certificate File</td>
                <td>
                  <input type="file" accept=".pem,.crt,.cer,.txt" className="text-[12px]" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setCertFileName(f.name);
                    void readFileAsText(f).then(setCertPem).catch((err) => setMsg(String(err)));
                  }} />
                </td>
              </tr>
              <tr>
                <td>Private Key File</td>
                <td>
                  <input type="file" accept=".pem,.key,.txt" className="text-[12px]" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setKeyFileName(f.name);
                    void readFileAsText(f).then(setKeyPem).catch((err) => setMsg(String(err)));
                  }} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rpma-panel overflow-hidden p-0">
        <div className="px-4 py-3">
          <h2 className="text-[16px] font-extrabold text-fg">Caddyfile Preview</h2>
        </div>
        <pre className="max-h-72 overflow-auto border-t border-border px-4 py-3 font-mono text-[11px] whitespace-pre-wrap">
          {caddyPreview || "Save or change mode to preview…"}
        </pre>
      </section>
    </div>
  );
}
