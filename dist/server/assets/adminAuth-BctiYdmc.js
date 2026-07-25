import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { load, dump } from "js-yaml";
import { z } from "zod";
import { scrypt, timingSafeEqual, createHmac, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { c as createServerFn, a as getRequestIP$1 } from "../server.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
const scryptAsync = promisify(scrypt);
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1e3;
const SESSION_TTL_MS = 8 * 60 * 60 * 1e3;
const rateLimitStore = /* @__PURE__ */ new Map();
function checkRateLimit(ip, _maxAttempts = MAX_ATTEMPTS, _lockoutMs = LOCKOUT_MS) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry) return {
    blocked: false,
    remainingMs: 0,
    attempts: 0
  };
  if (entry.lockedUntil > now) return {
    blocked: true,
    remainingMs: entry.lockedUntil - now,
    attempts: entry.count
  };
  if (entry.lockedUntil > 0) rateLimitStore.delete(ip);
  return {
    blocked: false,
    remainingMs: 0,
    attempts: entry.count
  };
}
function recordFailure(ip, maxAttempts = MAX_ATTEMPTS, lockoutMs = LOCKOUT_MS) {
  const entry = rateLimitStore.get(ip) ?? {
    count: 0
  };
  const count = entry.count + 1;
  rateLimitStore.set(ip, {
    count,
    lockedUntil: count >= maxAttempts ? Date.now() + lockoutMs : 0
  });
  return count;
}
function clearFailures(ip) {
  rateLimitStore.delete(ip);
}
async function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(plain, salt, 64);
  return `scrypt:${salt}:${hash.toString("hex")}`;
}
async function verifyPassword(stored, input) {
  if (stored.startsWith("scrypt:")) {
    const parts = stored.split(":");
    if (parts.length !== 3) return false;
    const [, salt, hashHex] = parts;
    const inputHash = await scryptAsync(input, salt, 64);
    const storedHash = Buffer.from(hashHex, "hex");
    if (inputHash.length !== storedHash.length) return false;
    return timingSafeEqual(inputHash, storedHash);
  }
  const a = Buffer.alloc(256, 0);
  a.write(stored);
  const b = Buffer.alloc(256, 0);
  b.write(input);
  return timingSafeEqual(a, b) && stored === input;
}
function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET env var is not set");
  return s;
}
function signSession(username, loginAt) {
  return createHmac("sha256", getSecret()).update(`${username}:${loginAt}`).digest("hex");
}
const DEFAULT_SETTINGS = {
  maxAttempts: 5,
  lockoutMinutes: 15,
  sessionHours: 8
};
const AdminSchema = z.object({
  admin: z.object({
    username: z.string(),
    password1: z.string(),
    password2: z.string(),
    // Any session token whose loginAt < sessionInvalidBefore is rejected.
    // Bumped on every credential update to force re-authentication.
    sessionInvalidBefore: z.number().optional().default(0)
  }),
  // Runtime-configurable security settings (optional — defaults apply if absent)
  settings: z.object({
    maxAttempts: z.number().int().min(1).max(50).optional().default(DEFAULT_SETTINGS.maxAttempts),
    lockoutMinutes: z.number().int().min(1).max(1440).optional().default(DEFAULT_SETTINGS.lockoutMinutes),
    sessionHours: z.number().int().min(1).max(168).optional().default(DEFAULT_SETTINGS.sessionHours)
  }).optional().default(DEFAULT_SETTINGS)
});
function loadAdminCredentials() {
  const filePath = resolve(process.cwd(), "admin.yml");
  const raw = readFileSync(filePath, "utf8");
  return AdminSchema.parse(load(raw));
}
function getSettings(cfg) {
  return {
    maxAttempts: cfg.settings?.maxAttempts ?? DEFAULT_SETTINGS.maxAttempts,
    lockoutMinutes: cfg.settings?.lockoutMinutes ?? DEFAULT_SETTINGS.lockoutMinutes,
    sessionHours: cfg.settings?.sessionHours ?? DEFAULT_SETTINGS.sessionHours
  };
}
function writeAdminCredentials(data) {
  const {
    settings,
    ...admin
  } = data;
  const filePath = resolve(process.cwd(), "admin.yml");
  writeFileSync(filePath, dump({
    admin,
    ...settings ? {
      settings
    } : {}
  }), "utf8");
}
async function upgradePasswords(username, p1Plain, p2Plain) {
  try {
    const [h1, h2] = await Promise.all([hashPassword(p1Plain), hashPassword(p2Plain)]);
    let sib = 0;
    try {
      sib = loadAdminCredentials().admin.sessionInvalidBefore ?? 0;
    } catch {
    }
    writeAdminCredentials({
      username,
      password1: h1,
      password2: h2,
      sessionInvalidBefore: sib
    });
    console.log("[adminAuth] Passwords upgraded to scrypt hashes");
  } catch (e) {
    console.error("[adminAuth] Password upgrade failed:", e);
  }
}
const validateAdminCredentials_createServerFn_handler = createServerRpc({
  id: "1cd5592b008228410e370e8fdc87f51b9cbd66cb105cb8bbc964ab8ddb0ce73d",
  name: "validateAdminCredentials",
  filename: "src/server/adminAuth.ts"
}, (opts) => validateAdminCredentials.__executeServer(opts));
const validateAdminCredentials = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  password1: z.string(),
  password2: z.string()
})).handler(validateAdminCredentials_createServerFn_handler, async ({
  data
}) => {
  const ip = getRequestIP$1({
    xForwardedFor: true
  }) ?? "unknown";
  const rl = checkRateLimit(ip);
  if (rl.blocked) {
    const mins = Math.ceil(rl.remainingMs / 6e4);
    return {
      valid: false,
      error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`
    };
  }
  let cfg;
  try {
    cfg = loadAdminCredentials();
  } catch (err) {
    console.error("[adminAuth] Failed to load admin.yml:", err);
    return {
      valid: false,
      error: "Admin auth unavailable"
    };
  }
  const {
    admin
  } = cfg;
  const uA = Buffer.alloc(256, 0);
  uA.write(admin.username);
  const uB = Buffer.alloc(256, 0);
  uB.write(data.username.trim());
  const usernameOk = timingSafeEqual(uA, uB) && admin.username === data.username.trim();
  const [p1Ok, p2Ok] = await Promise.all([verifyPassword(admin.password1, data.password1), verifyPassword(admin.password2, data.password2)]);
  if (!usernameOk || !p1Ok || !p2Ok) {
    const s = getSettings(cfg);
    const lockoutMs = s.lockoutMinutes * 6e4;
    const failCount = recordFailure(ip, s.maxAttempts, lockoutMs);
    const remaining = s.maxAttempts - failCount;
    const hint = remaining > 0 ? ` (${remaining} attempt${remaining === 1 ? "" : "s"} remaining)` : ` — account locked for ${s.lockoutMinutes} minute${s.lockoutMinutes === 1 ? "" : "s"}`;
    return {
      valid: false,
      error: `Invalid credentials${hint}`
    };
  }
  clearFailures(ip);
  if (!admin.password1.startsWith("scrypt:") || !admin.password2.startsWith("scrypt:")) {
    void upgradePasswords(admin.username, data.password1, data.password2);
  }
  const loginAt = Date.now();
  let token;
  try {
    token = signSession(admin.username, loginAt);
  } catch {
    return {
      valid: false,
      error: "Auth misconfigured — SESSION_SECRET is missing"
    };
  }
  return {
    valid: true,
    username: admin.username,
    loginAt,
    token
  };
});
const updateAdminCredentials_createServerFn_handler = createServerRpc({
  id: "b2b86fe6fd8b463e98d6022be0964a22100e08fd0fa5abddcd5b4d4a2073f07b",
  name: "updateAdminCredentials",
  filename: "src/server/adminAuth.ts"
}, (opts) => updateAdminCredentials.__executeServer(opts));
const updateAdminCredentials = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  // Caller must supply current password1 to authorize any change
  currentPassword1: z.string(),
  currentPassword2: z.string(),
  // What to change — all optional
  newUsername: z.string().optional(),
  newPassword1: z.string().optional(),
  newPassword2: z.string().optional()
})).handler(updateAdminCredentials_createServerFn_handler, async ({
  data
}) => {
  const ip = getRequestIP$1({
    xForwardedFor: true
  }) ?? "unknown";
  const rl = checkRateLimit(ip);
  if (rl.blocked) {
    const mins = Math.ceil(rl.remainingMs / 6e4);
    return {
      ok: false,
      error: `Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`
    };
  }
  let cfg;
  try {
    cfg = loadAdminCredentials();
  } catch {
    return {
      ok: false,
      error: "Failed to read admin.yml"
    };
  }
  const {
    admin
  } = cfg;
  const [p1Ok, p2Ok] = await Promise.all([verifyPassword(admin.password1, data.currentPassword1), verifyPassword(admin.password2, data.currentPassword2)]);
  if (!p1Ok || !p2Ok) {
    recordFailure(ip);
    return {
      ok: false,
      error: "Current passwords are incorrect"
    };
  }
  clearFailures(ip);
  const newUsername = data.newUsername?.trim() || admin.username;
  const newPlain1 = data.newPassword1?.trim();
  const newPlain2 = data.newPassword2?.trim();
  if (newUsername.length < 3) return {
    ok: false,
    error: "Username must be at least 3 characters"
  };
  if (newPlain1 !== void 0 && newPlain1.length < 8) return {
    ok: false,
    error: "Password 1 must be at least 8 characters"
  };
  if (newPlain2 !== void 0 && newPlain2.length < 8) return {
    ok: false,
    error: "Password 2 must be at least 8 characters"
  };
  if (newPlain1 && newPlain2 && newPlain1 === newPlain2) return {
    ok: false,
    error: "Password 1 and Password 2 must be different from each other"
  };
  const [h1, h2] = await Promise.all([newPlain1 ? hashPassword(newPlain1) : Promise.resolve(admin.password1), newPlain2 ? hashPassword(newPlain2) : Promise.resolve(admin.password2)]);
  const sessionInvalidBefore = Date.now();
  try {
    writeAdminCredentials({
      username: newUsername,
      password1: h1,
      password2: h2,
      sessionInvalidBefore
    });
  } catch {
    return {
      ok: false,
      error: "Failed to write admin.yml"
    };
  }
  const changed = [];
  if (newUsername !== admin.username) changed.push("username");
  if (newPlain1) changed.push("password1");
  if (newPlain2) changed.push("password2");
  return {
    ok: true,
    changed,
    newUsername
  };
});
const getAdminInfo_createServerFn_handler = createServerRpc({
  id: "8f49f79f5fe4a79ccddd2d4dd7efef06292b39379b7852b6f90ae7e540a52fee",
  name: "getAdminInfo",
  filename: "src/server/adminAuth.ts"
}, (opts) => getAdminInfo.__executeServer(opts));
const getAdminInfo = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  token: z.string(),
  username: z.string(),
  loginAt: z.number()
})).handler(getAdminInfo_createServerFn_handler, async ({
  data
}) => {
  if (Date.now() - data.loginAt > SESSION_TTL_MS) return {
    ok: false,
    error: "Session expired"
  };
  let expected;
  try {
    expected = signSession(data.username, data.loginAt);
  } catch {
    return {
      ok: false,
      error: "Misconfigured"
    };
  }
  try {
    const a = Buffer.from(data.token, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return {
      ok: false,
      error: "Invalid token"
    };
  } catch {
    return {
      ok: false,
      error: "Bad token"
    };
  }
  let cfg;
  try {
    cfg = loadAdminCredentials();
  } catch {
    return {
      ok: false,
      error: "Cannot read admin.yml"
    };
  }
  return {
    ok: true,
    username: cfg.admin.username,
    password1Hashed: cfg.admin.password1.startsWith("scrypt:"),
    password2Hashed: cfg.admin.password2.startsWith("scrypt:")
  };
});
const getAdminRateLimitStatus_createServerFn_handler = createServerRpc({
  id: "582bae66d7219feca5ea4c219bd137246a4185778085ad86bee663fa90efcf28",
  name: "getAdminRateLimitStatus",
  filename: "src/server/adminAuth.ts"
}, (opts) => getAdminRateLimitStatus.__executeServer(opts));
const getAdminRateLimitStatus = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  token: z.string(),
  username: z.string(),
  loginAt: z.number()
})).handler(getAdminRateLimitStatus_createServerFn_handler, async ({
  data
}) => {
  if (Date.now() - data.loginAt > SESSION_TTL_MS) return {
    ok: false
  };
  try {
    const exp = signSession(data.username, data.loginAt);
    const a = Buffer.from(data.token, "hex");
    const b = Buffer.from(exp, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return {
      ok: false
    };
  } catch {
    return {
      ok: false
    };
  }
  const ip = getRequestIP$1({
    xForwardedFor: true
  }) ?? "unknown";
  let cfg;
  try {
    cfg = loadAdminCredentials();
  } catch {
    return {
      ok: false
    };
  }
  const s = getSettings(cfg);
  const rl = checkRateLimit(ip, s.maxAttempts, s.lockoutMinutes * 6e4);
  return {
    ok: true,
    ip,
    attempts: rl.attempts,
    maxAttempts: s.maxAttempts,
    blocked: rl.blocked,
    remainingMs: rl.remainingMs,
    lockedUntilTs: rl.blocked ? Date.now() + rl.remainingMs : 0
  };
});
const getSecuritySettings_createServerFn_handler = createServerRpc({
  id: "5c143bedfa44b6fe18afd1d9304214d0d1f8ad09af7bd391cc59c10d3e063669",
  name: "getSecuritySettings",
  filename: "src/server/adminAuth.ts"
}, (opts) => getSecuritySettings.__executeServer(opts));
const getSecuritySettings = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  token: z.string(),
  username: z.string(),
  loginAt: z.number()
})).handler(getSecuritySettings_createServerFn_handler, async ({
  data
}) => {
  if (Date.now() - data.loginAt > SESSION_TTL_MS) return {
    ok: false
  };
  try {
    const exp = signSession(data.username, data.loginAt);
    const a = Buffer.from(data.token, "hex");
    const b = Buffer.from(exp, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return {
      ok: false
    };
  } catch {
    return {
      ok: false
    };
  }
  let cfg;
  try {
    cfg = loadAdminCredentials();
  } catch {
    return {
      ok: false
    };
  }
  const s = getSettings(cfg);
  return {
    ok: true,
    settings: s
  };
});
const updateSecuritySettings_createServerFn_handler = createServerRpc({
  id: "ea0bbd2a4a7952e60896601906054e383855e4526e3770615fef1a49e29515fe",
  name: "updateSecuritySettings",
  filename: "src/server/adminAuth.ts"
}, (opts) => updateSecuritySettings.__executeServer(opts));
const updateSecuritySettings = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  currentPassword1: z.string(),
  currentPassword2: z.string(),
  settings: z.object({
    maxAttempts: z.number().int().min(1).max(50),
    lockoutMinutes: z.number().int().min(1).max(1440),
    sessionHours: z.number().int().min(1).max(168)
  })
})).handler(updateSecuritySettings_createServerFn_handler, async ({
  data
}) => {
  const ip = getRequestIP$1({
    xForwardedFor: true
  }) ?? "unknown";
  const rl = checkRateLimit(ip);
  if (rl.blocked) {
    const mins = Math.ceil(rl.remainingMs / 6e4);
    return {
      ok: false,
      error: `Rate limited. Try again in ${mins}m.`
    };
  }
  let cfg;
  try {
    cfg = loadAdminCredentials();
  } catch {
    return {
      ok: false,
      error: "Cannot read admin.yml"
    };
  }
  const [p1Ok, p2Ok] = await Promise.all([verifyPassword(cfg.admin.password1, data.currentPassword1), verifyPassword(cfg.admin.password2, data.currentPassword2)]);
  if (!p1Ok || !p2Ok) {
    recordFailure(ip);
    return {
      ok: false,
      error: "Current passwords are incorrect"
    };
  }
  clearFailures(ip);
  try {
    writeAdminCredentials({
      username: cfg.admin.username,
      password1: cfg.admin.password1,
      password2: cfg.admin.password2,
      sessionInvalidBefore: cfg.admin.sessionInvalidBefore ?? 0,
      settings: data.settings
    });
  } catch {
    return {
      ok: false,
      error: "Failed to write admin.yml"
    };
  }
  return {
    ok: true,
    settings: data.settings
  };
});
const checkAdminToken_createServerFn_handler = createServerRpc({
  id: "53c321d975df4a591bbd4a2e7e8381e368580bccea0f3accc62ac1e31636fb4e",
  name: "checkAdminToken",
  filename: "src/server/adminAuth.ts"
}, (opts) => checkAdminToken.__executeServer(opts));
const checkAdminToken = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  loginAt: z.number(),
  token: z.string()
})).handler(checkAdminToken_createServerFn_handler, async ({
  data
}) => {
  let expected;
  try {
    expected = signSession(data.username, data.loginAt);
  } catch {
    return {
      valid: false,
      reason: "Auth misconfigured — SESSION_SECRET is missing"
    };
  }
  try {
    const a = Buffer.from(data.token, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return {
        valid: false,
        reason: "Invalid session token"
      };
    }
  } catch {
    return {
      valid: false,
      reason: "Malformed session token"
    };
  }
  let cfg;
  try {
    cfg = loadAdminCredentials();
  } catch {
    return {
      valid: false,
      reason: "Cannot verify session against current credentials"
    };
  }
  const sessionTTL_ms = getSettings(cfg).sessionHours * 60 * 60 * 1e3;
  if (Date.now() - data.loginAt > sessionTTL_ms) {
    return {
      valid: false,
      reason: "Session expired — please log in again"
    };
  }
  const sib = cfg.admin.sessionInvalidBefore ?? 0;
  if (sib > 0 && data.loginAt < sib) {
    return {
      valid: false,
      reason: "Credentials were rotated — please log in again"
    };
  }
  return {
    valid: true
  };
});
export {
  checkAdminToken_createServerFn_handler,
  getAdminInfo_createServerFn_handler,
  getAdminRateLimitStatus_createServerFn_handler,
  getSecuritySettings_createServerFn_handler,
  updateAdminCredentials_createServerFn_handler,
  updateSecuritySettings_createServerFn_handler,
  validateAdminCredentials_createServerFn_handler
};
