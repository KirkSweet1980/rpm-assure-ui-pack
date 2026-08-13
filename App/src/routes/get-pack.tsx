import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/get-pack")({
  component: GetPackPage,
});

function GetPackPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-fg">RPM Assure deploy pack</h1>
      <p className="mt-2 text-sm text-muted">
        Download the ZIP, extract it on the app server, then run the install script as Administrator.
      </p>
      <a
        href="/downloads/RPMAssure-Full-UI.zip"
        download="RPMAssure-Full-UI.zip"
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-[#263544] px-6 py-3 font-semibold text-white no-underline"
      >
        Download RPMAssure-Full-UI.zip
      </a>
      <p className="mt-4">
        <a href="/downloads/Install-RpmAssure-Full-UI.ps1" download className="text-sm text-accent">
          Or download the .ps1 only
        </a>
      </p>
      <pre className="mt-8 overflow-auto rounded-lg bg-[#1d2630] p-4 text-left text-[12px] text-[#e8eef6]">
{`Expand-Archive -LiteralPath $env:USERPROFILE\\Downloads\\RPMAssure-Full-UI.zip -DestinationPath C:\\RPM-Assure\\deploy\\Full-UI -Force
powershell -NoProfile -ExecutionPolicy Bypass -File C:\\RPM-Assure\\deploy\\Full-UI\\RPMAssure-Full-UI\\Install-RpmAssure-Full-UI.ps1`}
      </pre>
    </main>
  );
}
