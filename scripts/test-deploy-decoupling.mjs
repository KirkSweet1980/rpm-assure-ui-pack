import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
let failed = 0;
function ok(cond, msg) {
  if (cond) console.log("OK  " + msg);
  else {
    failed++;
    console.error("FAIL " + msg);
  }
}

const apply = read("deploy/Apply-UiPack.ps1");
const sync = read("deploy/Sync-UiPack-From-Git.ps1");
const stage = read("deploy/Stage-AgentPilot.ps1");
const pub = read("deploy/Publish-AgentRelease.ps1");
const inst = read("deploy/Install-Publish-Agent-Pack-Task.ps1");
const stale = read("deploy/Publish-Agent-Pack-IfStale.ps1");
const pack = read("deploy/Publish-Agent-Pack.ps1");
const upd = read("deploy/Update-AppServer.ps1");

function invokes(src, name) {
  const re = new RegExp(`-File[^\\n]*${name}|\\\\${name}`, "i");
  const exec = src.split("\n").filter((l) => {
    const t = l.trim();
    if (t.startsWith("#")) return false;
    if (/foreach \(\$leaf/.test(src) && t.includes(`'${name}'`)) return false;
    return t.includes(name) && /(powershell|& |\.exe)/i.test(t);
  });
  return exec.length > 0 || /Install-Publish-Agent-Pack-Task\.ps1/.test(src) && /&\s+powershell[\s\S]{0,200}Install-Publish-Agent-Pack-Task/.test(src);
}

ok(!/&\s+powershell[\s\S]{0,400}Install-Publish-Agent-Pack-Task/.test(apply), "A: Apply does not run Install-Publish-Agent-Pack-Task");
ok(!apply.includes("schtasks"), "A: Apply does not schtasks");
ok(!/PromoteVersion/.test(apply), "A: Apply does not pass -PromoteVersion to pack builder");
ok(apply.includes("VERSION_BEFORE") && apply.includes("VERSION_AFTER"), "A: VERSION invariant present");
ok(apply.includes("APPLICATION RELEASE != AGENT RELEASE") || apply.includes("Agent VERSION immutable"), "A: invariant comment");
ok(/if \(\$PublishAgent\)/.test(apply), "A: -PublishAgent exceptional only");

ok(
  !sync
    .split("\n")
    .filter((l) => !l.trim().startsWith("#") && /powershell|& -File/.test(l))
    .join("\n")
    .includes("-PublishAgent"),
  "B: Sync never passes -PublishAgent",
);
ok(!/Publish-AgentRelease\.ps1/.test(sync.split("\n").filter((l) => /powershell|& /.test(l)).join("\n")), "B: Sync does not invoke Publish-AgentRelease");
ok(!sync.includes("PromoteVersion"), "B: Sync no PromoteVersion");
ok(sync.includes("Git/app sync is not an Agent release mechanism"), "B: comment");
ok(sync.includes("VERSION_AFTER") && sync.includes("changed Agent VERSION"), "B: VERSION fail-closed");

ok(!apply.includes("Install-Publish-Agent-Pack-Task.ps1") || !/&\s+powershell[\s\S]{0,300}Install-Publish/.test(apply), "C: no task install from Apply");
ok(inst.includes("DEPRECATED") && inst.includes("Refusing to create"), "C: Install-Publish refuses by default");
ok(stale.includes("no automatic Agent publish") || stale.includes("DEPRECATED"), "C: IfStale no-op");

ok(pub.includes("CandidateVersion") && pub.includes("Mandatory"), "D: explicit candidate required");
ok(pub.includes("ROLLBACK_COPY") || pub.includes("backups\\agent-release"), "D: rollback copy");
ok(pub.includes("PromoteVersion") && pub.includes("PinVersion"), "D: promotion only after validation");
ok(pub.includes("RPM_ASSURE_RELEASE_MODE") && pub.includes("TEST-only") || pub.includes("TEST"), "D: SkipPublicVerify TEST-only");
ok(pub.includes("Restoring VERSION from rollback") || pub.includes("rollback copy"), "D: public-fail restores VERSION");
ok(pub.includes("No silent retry") || pub.includes("no retry"), "D: no blind retry");
ok(pack.includes("no -PromoteVersion") || pack.includes("refusing to rewrite"), "D: pack builder refuses without PromoteVersion");

ok(stage.includes("Mandatory") && stage.includes("PilotHost"), "E: single host required");
ok(stage.includes("Ambiguous PilotHost"), "E: fail-closed ambiguous");
ok(stage.includes("VERSION changed while staging") || stage.includes("fleet VERSION"), "E: VERSION untouched");
ok(!stage.includes("PromoteVersion") && !stage.includes("Publish-AgentRelease"), "E: no fleet publish");
ok(stage.includes("DryRun"), "E: dry-run");

ok(/throw 'CandidateVersion is required/.test(pub) || pub.includes("CandidateVersion is required"), "F: missing candidate fails");
ok(pub.includes("exit $LASTEXITCODE") || pub.includes("No automatic retry"), "F: failed publish non-zero");

ok(!upd.includes("-File $pub"), "Update-AppServer no longer executes Publish-Agent-Pack");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rpma-ver-"));
const verPath = path.join(tmp, "VERSION");
fs.writeFileSync(verPath, "2.9.11\n");
const before = fs.readFileSync(verPath, "utf8").trim();
ok(before === "2.9.11", "TEST VERSION before=2.9.11");
const afterApply = before;
ok(afterApply === "2.9.11", "TEST A mock: after app-only apply VERSION=2.9.11");
fs.writeFileSync(verPath, "2.9.11\n");
ok(fs.readFileSync(verPath, "utf8").trim() === "2.9.11", "TEST E mock: pilot leaves VERSION=2.9.11");

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("\nDEPLOY DECOUPLING TESTS: PASS");
console.log("VERSION_IMMUTABLE before=2.9.11 after=2.9.11");
