import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { load, dump } from "js-yaml";
import { z } from "zod";
import { scrypt, timingSafeEqual, randomBytes } from "node:crypto";
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
const rateLimitStore = /* @__PURE__ */ new Map();
function checkRateLimit(ip) {
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
function recordFailure(ip) {
  const entry = rateLimitStore.get(ip) ?? {
    count: 0
  };
  const count = entry.count + 1;
  rateLimitStore.set(ip, {
    count,
    lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0
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
const CredentialSchema = z.object({
  users: z.array(z.object({
    username: z.string(),
    password: z.string(),
    role: z.string().optional(),
    uuid: z.string().optional(),
    enabled: z.boolean().optional()
  }))
});
const CREDS_PATH = resolve(process.cwd(), "credentials.yml");
function loadCredentials() {
  const raw = readFileSync(CREDS_PATH, "utf8");
  const parsed = load(raw);
  return CredentialSchema.parse(parsed);
}
async function upgradePassword(username, plain) {
  try {
    const creds = loadCredentials();
    const idx = creds.users.findIndex((u) => u.username.toLowerCase() === username.toLowerCase());
    if (idx === -1) return;
    creds.users[idx].password = await hashPassword(plain);
    writeFileSync(CREDS_PATH, dump(creds), "utf8");
    console.log(`[auth] Password for ${username} upgraded to scrypt hash`);
  } catch (e) {
    console.error("[auth] Password upgrade failed:", e);
  }
}
const validateCredentials_createServerFn_handler = createServerRpc({
  id: "8ebbe34d9c3cf8d74d5c419c61649060ec2211be4f88f412177da3ea729967ce",
  name: "validateCredentials",
  filename: "src/server/auth.ts"
}, (opts) => validateCredentials.__executeServer(opts));
const validateCredentials = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  password: z.string()
})).handler(validateCredentials_createServerFn_handler, async ({
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
  let creds;
  try {
    creds = loadCredentials();
  } catch (err) {
    console.error("[auth] Failed to load credentials.yml:", err);
    return {
      valid: false,
      error: "Auth system unavailable"
    };
  }
  const inputUser = data.username.trim();
  const match = creds.users.find((u) => {
    const a = Buffer.alloc(256, 0);
    a.write(u.username.toLowerCase());
    const b = Buffer.alloc(256, 0);
    b.write(inputUser.toLowerCase());
    return timingSafeEqual(a, b) && u.username.toLowerCase() === inputUser.toLowerCase();
  });
  if (match?.enabled === false) {
    return {
      valid: false,
      error: "This account has been disabled. Contact an administrator."
    };
  }
  const storedPassword = match?.password ?? "scrypt:00000000000000000000000000000000:" + "0".repeat(128);
  const passwordOk = await verifyPassword(storedPassword, data.password.trim());
  if (!match || !passwordOk) {
    const failCount = recordFailure(ip);
    const remaining = MAX_ATTEMPTS - failCount;
    const hint = remaining > 0 ? ` (${remaining} attempt${remaining === 1 ? "" : "s"} remaining)` : ` — account locked for 15 minutes`;
    return {
      valid: false,
      error: `Invalid username or password${hint}`
    };
  }
  clearFailures(ip);
  if (!match.password.startsWith("scrypt:")) {
    void upgradePassword(match.username, data.password.trim());
  }
  return {
    valid: true,
    username: match.username,
    role: match.role ?? "user"
  };
});
export {
  validateCredentials_createServerFn_handler
};
