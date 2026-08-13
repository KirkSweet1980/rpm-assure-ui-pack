/**
 * Bootstrap / reset Platform Admin (Better Auth credential + App_User).
 *
 * Password sources (first wins):
 *   1) data/admin-bootstrap.json  { "email", "password", "reset": true }
 *   2) RPM_ASSURE_ADMIN_PASSWORD in process.env / .env.local
 *
 * No password is hardcoded in source.
 */
import { readFileSync, existsSync, unlinkSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { auth } from "./server";
import { getPool, sql as sqlTypes } from "@/lib/data/sql-pool";
import { getDataMode, hasSqlConfig } from "@/lib/data/sql-config";
import { ROOT_ADMIN_EMAIL } from "@/lib/auth/root-admin";

const globalRef = globalThis as typeof globalThis & {
  __rpmaBootstrapAdminPromise__?: Promise<{ ok: boolean; message: string }>;
  __rpmaEnvLocalLoaded__?: boolean;
  __rpmaBootstrapLastOk__?: boolean;
  __rpmaBootstrapLogged__?: string;
};

function logOnce(key: string, msg: string, level: "log" | "warn" = "log"): void {
  if (globalRef.__rpmaBootstrapLogged__ === key) return;
  globalRef.__rpmaBootstrapLogged__ = key;
  if (level === "warn") console.warn(msg);
  else console.log(msg);
}

function truthy(v: string | undefined | boolean | null): boolean {
  if (v === true) return true;
  if (v === false || v == null) return false;
  return ["1", "true", "yes", "on"].includes(String(v).trim().toLowerCase());
}

function stripBom(s: string): string {
  return s.replace(/^\uFEFF/, "").trim();
}

function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Strip BOM from whole file
  const body = text.replace(/^\uFEFF/, "");
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = stripBom(line.slice(0, eq));
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = stripBom(val);
  }
  return out;
}

export function loadAdminEnvFromDisk(force = false): void {
  if (globalRef.__rpmaEnvLocalLoaded__ && !force) return;
  const candidates = [
    join(process.cwd(), ".env.local"),
    join(process.cwd(), ".env"),
    "C:\\RPM-Assure\\App\\.env.local",
    "C:\\RPM-Assure\\App\\.env",
  ];
  for (const p of candidates) {
    try {
      if (!existsSync(p)) continue;
      const map = parseEnvFile(readFileSync(p, "utf8"));
      for (const [k, v] of Object.entries(map)) {
        if (
          k.startsWith("RPM_ASSURE_ADMIN") ||
          k === "RPM_ASSURE_RESET_ADMIN" ||
          process.env[k] === undefined ||
          process.env[k] === ""
        ) {
          process.env[k] = v;
        }
      }
      logOnce("env:" + p, `[bootstrap-admin] loaded env from ${p}`);
    } catch {
      /* ignore */
    }
  }
  globalRef.__rpmaEnvLocalLoaded__ = true;
}

function readBootstrapJson(): {
  email?: string;
  password?: string;
  reset?: boolean;
} | null {
  const candidates = [
    join(process.cwd(), "data", "admin-bootstrap.json"),
    "C:\\RPM-Assure\\App\\data\\admin-bootstrap.json",
  ];
  for (const p of candidates) {
    try {
      if (!existsSync(p)) continue;
      const raw = readFileSync(p, "utf8").replace(/^\uFEFF/, "");
      const j = JSON.parse(raw) as {
        email?: string;
        password?: string;
        reset?: boolean;
      };
      if (j.password) j.password = stripBom(String(j.password));
      if (j.email) j.email = stripBom(String(j.email)).toLowerCase();
      logOnce("json:" + p, `[bootstrap-admin] read ${p}`);
      return j;
    } catch (e) {
      console.warn("[bootstrap-admin] bad json", p, e);
    }
  }
  return null;
}

function clearBootstrapJson(): void {
  for (const p of [
    join(process.cwd(), "data", "admin-bootstrap.json"),
    "C:\\RPM-Assure\\App\\data\\admin-bootstrap.json",
  ]) {
    try {
      if (existsSync(p)) unlinkSync(p);
    } catch {
      /* ignore */
    }
  }
}

function writeStatus(msg: string): void {
  try {
    const dir = join(process.cwd(), "data");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "admin-bootstrap-status.txt"),
      `${new Date().toISOString()} ${msg}\n`,
      "utf8",
    );
  } catch {
    /* ignore */
  }
}

async function upsertAppUserAdmin(email: string, displayName: string) {
  if (!hasSqlConfig() || getDataMode() === "demo") return;
  try {
    const pool = await getPool();
    if (!pool) return;
    await pool.request().query(`
      IF COL_LENGTH(N'dbo.App_User', N'StaffRole') IS NULL
        ALTER TABLE dbo.App_User ADD StaffRole nvarchar(30) NULL;
    `);
    const userName = (email.split("@")[0] || "admin").slice(0, 100);
    await pool
      .request()
      .input("email", sqlTypes.NVarChar(256), email)
      .input("dn", sqlTypes.NVarChar(200), displayName)
      .input("un", sqlTypes.NVarChar(100), userName)
      .query(`
        IF EXISTS (SELECT 1 FROM dbo.App_User WHERE LOWER(Email) = @email)
          UPDATE dbo.App_User
          SET DisplayName = @dn, UserName = @un, StaffRole = N'PlatformAdmin',
              IsPlatformAdmin = 1, IsActive = 1, UpdatedAt = SYSUTCDATETIME()
          WHERE LOWER(Email) = @email;
        ELSE
          INSERT INTO dbo.App_User (UserName, Email, DisplayName, StaffRole, IsPlatformAdmin, IsActive)
          VALUES (@un, @email, @dn, N'PlatformAdmin', 1, 1);
      `);
  } catch (e) {
    console.warn("[bootstrap-admin] App_User sync skipped:", e);
  }
}


async function setCredentialPassword(
  ctx: Awaited<typeof auth.$context>,
  email: string,
  password: string,
  displayName: string,
): Promise<"created" | "reset"> {
  const hash = await ctx.password.hash(password);
  const existing = await ctx.internalAdapter.findUserByEmail(email);
  if (existing?.user) {
    const accounts = await ctx.internalAdapter.findAccounts(existing.user.id);
    const cred = (accounts ?? []).find(
      (a: { providerId?: string }) => a.providerId === "credential",
    );
    if (cred) {
      await ctx.internalAdapter.updatePassword(existing.user.id, hash);
    } else {
      await ctx.internalAdapter.linkAccount({
        userId: existing.user.id,
        providerId: "credential",
        accountId: existing.user.id,
        password: hash,
      });
    }
    await ctx.internalAdapter.updateUser(existing.user.id, { name: displayName });
    return "reset";
  }
  const created = await ctx.internalAdapter.createUser({
    email,
    name: displayName,
    emailVerified: true,
  });
  if (!created?.id) throw new Error("Failed to create auth user " + email);
  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password: hash,
  });
  return "created";
}

async function runBootstrap(): Promise<{ ok: boolean; message: string }> {
  loadAdminEnvFromDisk();
  const file = readBootstrapJson();

  const email = stripBom(
    file?.email ||
      process.env.RPM_ASSURE_ADMIN_EMAIL ||
      ROOT_ADMIN_EMAIL,
  ).toLowerCase();
  const password = stripBom(
    file?.password || process.env.RPM_ASSURE_ADMIN_PASSWORD || "",
  );
  const force =
    truthy(file?.reset) ||
    truthy(process.env.RPM_ASSURE_RESET_ADMIN) ||
    Boolean(file?.password);

  const displayName = "RPM Admin";


  try {
    const ctx = await auth.$context;

    const users = (await ctx.adapter.findMany({ model: "user" })) as Array<{
      id: string;
      email: string;
    }>;
    const count = users?.length ?? 0;
    const existing = await ctx.internalAdapter.findUserByEmail(email);

    // Empty DB + password → always create (ignore stale "already set")
    const emptyDb = count === 0;

    // Already have admin credential and no force → leave alone
    if (!force && !emptyDb && existing?.user) {
      const accounts = await ctx.internalAdapter.findAccounts(existing.user.id);
      const hasPw = (accounts ?? []).some(
        (a: { providerId?: string; password?: string | null }) =>
          a.providerId === "credential" && Boolean(a.password),
      );
      if (hasPw) {
        // Optional: verify env password still works when set (helps diagnose)
        let verifyNote = "";
        if (password.length >= 8) {
          try {
            const cred = (accounts ?? []).find(
              (a: { providerId?: string; password?: string | null }) =>
                a.providerId === "credential" && a.password,
            ) as { password?: string } | undefined;
            if (cred?.password) {
              const match = await ctx.password.verify({
                hash: cred.password,
                password,
              });
              verifyNote = match
                ? " Env password MATCHES stored hash."
                : " Env password does NOT match stored hash — run Fix-Login with reset.";
            }
          } catch {
            /* ignore verify errors */
          }
        }
        const message = `Admin ${email} already set.${verifyNote}`;
        logOnce("admin-ok", "[bootstrap-admin] " + message);
        writeStatus(message);
        globalRef.__rpmaBootstrapLastOk__ = true;
        return { ok: true, message, userCount: count } as {
          ok: boolean;
          message: string;
        };
      }
    }

    if (!force && !emptyDb && count > 0 && !existing?.user) {
      const message = `Auth has ${count} user(s) but not ${email}; force via admin-bootstrap.json with reset:true.`;
      console.log("[bootstrap-admin]", message);
      writeStatus(message);
      globalRef.__rpmaBootstrapLastOk__ = true;
      return { ok: true, message };
    }

    if (!password || password.length < 8) {
      const message =
        count === 0
          ? "No auth users and no password configured. Run Fix-Login.ps1 or set RPM_ASSURE_ADMIN_PASSWORD, then GET /api/bootstrap-admin."
          : "Reset requested but password missing/too short (min 8).";
      console.warn("[bootstrap-admin]", message);
      writeStatus(message);
      globalRef.__rpmaBootstrapLastOk__ = false;
      return { ok: false, message };
    }

    // Always stamp RPMAdmin + legacy rpmroot so either login works
    const emailsToStamp = Array.from(
      new Set(
        [
          email,
          "rpmadmin@rpm.local",
          "rpmroot@rpm.local",
          ROOT_ADMIN_EMAIL,
        ]
          .map((e) => e.toLowerCase())
          .filter(Boolean),
      ),
    );
    const actions: string[] = [];
    for (const em of emailsToStamp) {
      const act = await setCredentialPassword(ctx, em, password, displayName);
      actions.push(`${act}:${em}`);
      await upsertAppUserAdmin(em, displayName);
    }
    // Verify primary email password
    {
      const again = await ctx.internalAdapter.findUserByEmail(email);
      if (again?.user) {
        const accts = await ctx.internalAdapter.findAccounts(again.user.id);
        const cred = (accts ?? []).find(
          (a: { providerId?: string; password?: string | null }) =>
            a.providerId === "credential" && a.password,
        ) as { password?: string } | undefined;
        if (cred?.password) {
          const match = await ctx.password.verify({
            hash: cred.password,
            password,
          });
          if (!match) {
            const message = `Password verify FAILED after write for ${email}`;
            writeStatus(message);
            globalRef.__rpmaBootstrapLastOk__ = false;
            return { ok: false, message };
          }
        }
      }
    }
    const message = `Password set (${actions.join(", ")}). Sign in: RPMAdmin`;
    console.log("[bootstrap-admin]", message);
    writeStatus(message);

    await upsertAppUserAdmin(email, displayName);
    if (file) clearBootstrapJson();

    const finalMsg = `OK — sign in Username: RPMAdmin  Password: (the one you set). Email: ${email}`;
    writeStatus(finalMsg);
    globalRef.__rpmaBootstrapLastOk__ = true;
    return { ok: true, message: finalMsg };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[bootstrap-admin] failed:", e);
    writeStatus("FAIL " + message);
    globalRef.__rpmaBootstrapLastOk__ = false;
    return { ok: false, message };
  }
}

export function ensureBootstrapAdmin(): Promise<{ ok: boolean; message: string }> {
  loadAdminEnvFromDisk();
  const file = readBootstrapJson();
  const force =
    truthy(file?.reset) ||
    truthy(process.env.RPM_ASSURE_RESET_ADMIN) ||
    Boolean(file?.password);

  // Always re-run if last attempt failed, or when force
  if (force || globalRef.__rpmaBootstrapLastOk__ === false) {
    globalRef.__rpmaBootstrapAdminPromise__ = undefined;
  }

  globalRef.__rpmaBootstrapAdminPromise__ ??= runBootstrap().then((r) => {
    if (!r.ok) {
      // Allow next call to retry (do not stick on failure forever)
      globalRef.__rpmaBootstrapAdminPromise__ = undefined;
    }
    return r;
  });
  return globalRef.__rpmaBootstrapAdminPromise__;
}

export async function runAdminBootstrapNow(): Promise<{ ok: boolean; message: string }> {
  globalRef.__rpmaBootstrapAdminPromise__ = undefined;
  globalRef.__rpmaEnvLocalLoaded__ = false;
  globalRef.__rpmaBootstrapLastOk__ = undefined;
  globalRef.__rpmaBootstrapLogged__ = undefined;
  return ensureBootstrapAdmin();
}
