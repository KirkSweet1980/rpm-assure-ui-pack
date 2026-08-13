/**
 * Production self-host build: Nitro node-server -> .output/server/index.mjs
 * Windows-safe: writes .rpma-nitro-preset flag + sets env vars.
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";

const root = process.cwd();
const flag = path.join(root, ".rpma-nitro-preset");
writeFileSync(flag, "node-server\n", "utf8");

const env = {
  ...process.env,
  RPM_ASSURE_NITRO_PRESET: "node-server",
  NITRO_PRESET: "node-server",
};

console.log("[build-node] preset=node-server");
console.log("[build-node] flag=", flag);

// Prefer local vite binary (avoids npx shell quirks on Windows)
const viteBinWin = path.join(root, "node_modules", "vite", "bin", "vite.js");
const viteBinUnix = path.join(root, "node_modules", ".bin", "vite");
let status = 1;

if (existsSync(viteBinWin)) {
  const r = spawnSync(process.execPath, [viteBinWin, "build"], {
    stdio: "inherit",
    env,
    cwd: root,
    shell: false,
  });
  status = r.status ?? 1;
} else if (existsSync(viteBinUnix)) {
  const r = spawnSync(viteBinUnix, ["build"], {
    stdio: "inherit",
    env,
    cwd: root,
    shell: false,
  });
  status = r.status ?? 1;
} else {
  const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const r = spawnSync(cmd, ["vite", "build"], {
    stdio: "inherit",
    env,
    cwd: root,
    shell: process.platform === "win32",
  });
  status = r.status ?? 1;
}

if (status !== 0) {
  try {
    unlinkSync(flag);
  } catch {
    /* ignore */
  }
  process.exit(status);
}

// copy pglite wasm/data next to server bundle
const srcDir = path.join(root, "node_modules", "@electric-sql", "pglite", "dist");
const targets = [
  path.join(root, ".output", "server", "_libs"),
  path.join(root, ".vercel", "output", "functions", "__server.func", "_libs"),
];
if (existsSync(srcDir)) {
  const files = readdirSync(srcDir).filter(
    (f) => f.endsWith(".wasm") || f.endsWith(".data"),
  );
  for (const dest of targets) {
    if (!existsSync(path.dirname(dest))) continue;
    mkdirSync(dest, { recursive: true });
    for (const f of files) copyFileSync(path.join(srcDir, f), path.join(dest, f));
    console.log(`[build-node] pglite ${files.length} -> ${dest}`);
  }
}

const serverJs = path.join(root, ".output", "server", "index.mjs");
if (!existsSync(serverJs)) {
  console.error("[build-node] ERROR: missing", serverJs);
  console.error("[build-node] Build used wrong nitro preset or failed silently.");
  console.error("[build-node] Check log for: [vite.config] nitro preset = node-server");
  process.exit(1);
}
console.log("[build-node] OK", serverJs);
try {
  unlinkSync(flag);
} catch {
  /* ignore */
}
console.log("[build-node] done");
