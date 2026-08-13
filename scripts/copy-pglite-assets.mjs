import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcDir = path.join(root, "node_modules", "@electric-sql", "pglite", "dist");
const targets = [
  path.join(root, ".output", "server", "_libs"),
  path.join(root, ".vercel", "output", "functions", "__server.func", "_libs"),
];

if (!fs.existsSync(srcDir)) {
  console.warn("[copy-pglite] source missing:", srcDir);
  process.exit(0);
}

const files = fs
  .readdirSync(srcDir)
  .filter((f) => f.endsWith(".wasm") || f.endsWith(".data"));

for (const dest of targets) {
  const parent = path.dirname(dest);
  if (!fs.existsSync(parent)) continue;
  fs.mkdirSync(dest, { recursive: true });
  for (const f of files) {
    fs.copyFileSync(path.join(srcDir, f), path.join(dest, f));
  }
  console.log(`[copy-pglite] ${files.length} asset(s) -> ${dest}`);
}
