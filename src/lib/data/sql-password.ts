/**
 * Normalize SQL passwords from Settings / .env (quotes, BOM, newlines, smart quotes).
 */
export function cleanSqlPassword(raw: string | undefined | null): string {
  if (raw == null) return "";
  let s = String(raw);

  // BOM / zero-width / bidi junk
  s = s.replace(/^\uFEFF/, "");
  s = s.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "");

  // Normalize newlines and trim
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  // Drop accidental trailing newlines in middle? keep internal spaces
  s = s.replace(/^\n+|\n+$/g, "").trim();

  // Smart quotes → straight
  s = s.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
  s = s.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");

  // Strip one or more layers of matching quotes
  for (let i = 0; i < 3; i++) {
    if (
      (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
      (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
    ) {
      s = s.slice(1, -1).trim();
      continue;
    }
    break;
  }

  return s;
}

export function passwordDiagnostics(raw: string | undefined | null): {
  rawLength: number;
  cleanLength: number;
  hasHash: boolean;
  changedByClean: boolean;
  hint: string;
} {
  const rawS = raw == null ? "" : String(raw);
  const clean = cleanSqlPassword(rawS);
  const changedByClean = clean !== rawS.trim() && clean !== rawS;
  let hint = "";
  if (rawS.length === 21 && clean.length === 19) {
    hint = "Likely extra quotes around the password — cleaned for connect.";
  } else if (rawS.length !== clean.length) {
    hint = `Cleaned password length ${clean.length} (was ${rawS.length}).`;
  } else if (clean.length === 0) {
    hint = "Password empty after clean.";
  }
  return {
    rawLength: rawS.length,
    cleanLength: clean.length,
    hasHash: clean.includes("#"),
    changedByClean,
    hint,
  };
}
