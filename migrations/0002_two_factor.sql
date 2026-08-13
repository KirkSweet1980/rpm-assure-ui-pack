-- Better Auth two-factor (TOTP) tables/columns
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS "twoFactor" (
  "id" text NOT NULL PRIMARY KEY,
  "secret" text NOT NULL,
  "backupCodes" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "verified" boolean DEFAULT true,
  "failedVerificationCount" integer DEFAULT 0,
  "lockedUntil" timestamptz
);

CREATE INDEX IF NOT EXISTS "twoFactor_userId_idx" ON "twoFactor" ("userId");
CREATE INDEX IF NOT EXISTS "twoFactor_secret_idx" ON "twoFactor" ("secret");
