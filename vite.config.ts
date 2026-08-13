import { defineConfig, loadEnv, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import path from "node:path";
import fs from "node:fs";

function resolveNitroPreset(): "node-server" | "vercel" {
  // Explicit env wins
  const a = (process.env.RPM_ASSURE_NITRO_PRESET || "").trim().toLowerCase();
  const b = (process.env.NITRO_PRESET || "").trim().toLowerCase();
  if (a === "node-server" || b === "node-server") return "node-server";
  if (a === "vercel" || b === "vercel") return "vercel";
  // Flag file written by build-node.mjs (survives Windows env quirks)
  try {
    const flag = path.join(process.cwd(), ".rpma-nitro-preset");
    if (fs.existsSync(flag)) {
      const v = fs.readFileSync(flag, "utf8").trim().toLowerCase();
      if (v === "node-server") return "node-server";
      if (v === "vercel") return "vercel";
    }
  } catch {
    /* ignore */
  }
  // Vercel CI
  if (process.env.VERCEL === "1") return "vercel";
  // Default for self-host production builds when requested via build:node only
  // (plain `vite build` stays vercel-compatible for platform deploys)
  return "vercel";
}

/** Redirect Node-only SQL drivers to a browser stub in client bundles. */
function mssqlBrowserStubPlugin(): Plugin {
  const stub = path.resolve(import.meta.dirname, "./src/lib/data/mssql-browser-stub.ts");
  const ids = new Set(["mssql", "tedious", "tarn"]);
  return {
    name: "mssql-browser-stub",
    enforce: "pre",
    resolveId(id, _importer, options) {
      if (options?.ssr) return null;
      if (ids.has(id) || id.startsWith("mssql/") || id.startsWith("@azure/")) {
        return stub;
      }
      return null;
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  const nitroPreset = resolveNitroPreset();
  if (command === "build") {
    console.log(`[vite.config] nitro preset = ${nitroPreset}`);
  }

  return {
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,
      allowedHosts: true,
      watch: {
        ignored: ["**/data/**", "**/.env.local"],
      },
    },
    optimizeDeps: {
      exclude: ["mssql", "tedious", "@azure/identity", "tarn"],
    },
    ssr: {
      external: ["mssql", "tedious", "@azure/identity", "tarn"],
    },
    plugins: [
      mssqlBrowserStubPlugin(),
      tailwindcss(),
      tanstackStart(),
      ...(command === "build" ? [nitro({ preset: nitroPreset })] : []),
      viteReact(),
    ],
  };
});
