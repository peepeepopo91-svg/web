import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { commitFiles } from "./github-CKcpqj8A.js";
const DATA_DIR = resolve("data");
const MAX_RETRIES = 5;
const MINING_FILES = [
  { local: "mining-users.json", repo: "data/mining-users.json" },
  { local: "mining-community.json", repo: "data/mining-community.json" },
  { local: "shop-purchases.json", repo: "data/shop-purchases.json" },
  { local: "shop-items.json", repo: "data/shop-items.json" }
];
const TOURNAMENT_FILES = [
  { local: "tournaments.json", repo: "data/tournaments.json" }
];
let debounceMs = 45e3;
let debounceTimer = null;
let timerScheduledAt = null;
let timerFiresAt = null;
let lastCommittedHash = null;
let lastBackupAt = null;
let lastBackupMessage = null;
let lastBackupError = null;
let isRunning = false;
let retryCount = 0;
let totalBackups = 0;
let pendingRetryTimer = null;
let backupEnabled = true;
function readFile(name) {
  try {
    return readFileSync(resolve(DATA_DIR, name), "utf8");
  } catch {
    return "";
  }
}
function fileBytes(name) {
  try {
    return statSync(resolve(DATA_DIR, name)).size;
  } catch {
    return 0;
  }
}
function syncLocalHead() {
  const cwd = process.cwd();
  const opts = { cwd, encoding: "utf8", timeout: 15e3 };
  spawnSync("git", ["fetch", "origin", "--quiet"], opts);
  spawnSync("git", ["reset", "--mixed", "origin/main"], opts);
}
function contentHash() {
  return createHash("sha256").update(MINING_FILES.map((f) => readFile(f.local)).join("\0")).digest("hex");
}
function shortHash(content) {
  return createHash("sha256").update(content || "").digest("hex").slice(0, 8);
}
async function runBackup() {
  if (isRunning) return;
  const hash = contentHash();
  if (hash === lastCommittedHash) return;
  const files = MINING_FILES.map((f) => ({ path: f.repo, content: readFile(f.local) })).filter((f) => f.content.length > 0);
  if (files.length === 0) return;
  isRunning = true;
  const msg = `[auto] Mining data backup ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace("T", " ")} UTC`;
  try {
    await commitFiles(files, msg);
    lastCommittedHash = hash;
    lastBackupAt = Date.now();
    lastBackupMessage = msg;
    lastBackupError = null;
    retryCount = 0;
    totalBackups += 1;
    syncLocalHead();
  } catch (e) {
    lastBackupError = e instanceof Error ? e.message : String(e);
    retryCount = Math.min(retryCount + 1, MAX_RETRIES);
    if (retryCount <= MAX_RETRIES) {
      const delay = Math.min(3e4 * retryCount, 3e5);
      if (pendingRetryTimer) clearTimeout(pendingRetryTimer);
      pendingRetryTimer = setTimeout(async () => {
        pendingRetryTimer = null;
        await runBackup();
      }, delay);
    }
  } finally {
    isRunning = false;
  }
}
let tournamentDebounceTimer = null;
async function runTournamentBackup() {
  const files = TOURNAMENT_FILES.map((f) => ({ path: f.repo, content: readFile(f.local) })).filter((f) => f.content.length > 0);
  if (files.length === 0) return;
  try {
    await commitFiles(files, `[auto] Tournament data backup ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace("T", " ")} UTC`);
    syncLocalHead();
  } catch {
  }
}
function scheduleTournamentBackup() {
  if (!backupEnabled) return;
  if (tournamentDebounceTimer) clearTimeout(tournamentDebounceTimer);
  tournamentDebounceTimer = setTimeout(async () => {
    tournamentDebounceTimer = null;
    await runTournamentBackup();
  }, debounceMs);
}
function scheduleBackup() {
  if (!backupEnabled) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  timerScheduledAt = Date.now();
  timerFiresAt = timerScheduledAt + debounceMs;
  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    timerScheduledAt = null;
    timerFiresAt = null;
    await runBackup();
  }, debounceMs);
}
function setBackupEnabled(enabled) {
  backupEnabled = enabled;
  if (!enabled && debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
    timerScheduledAt = null;
    timerFiresAt = null;
  }
}
function setDebounceMs(ms) {
  debounceMs = Math.max(5e3, Math.min(ms, 30 * 6e4));
}
function markAlreadyCommitted() {
  lastCommittedHash = contentHash();
}
async function flushBackupNow() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
    timerScheduledAt = null;
    timerFiresAt = null;
  }
  if (pendingRetryTimer) {
    clearTimeout(pendingRetryTimer);
    pendingRetryTimer = null;
  }
  await runBackup();
}
function getBackupStatus() {
  return {
    enabled: backupEnabled,
    debounceMs,
    hasPendingTimer: debounceTimer !== null,
    timerScheduledAt,
    timerFiresAt,
    isRunning,
    lastBackupAt,
    lastBackupMessage,
    lastBackupError,
    retryCount,
    totalBackups,
    hasRetryPending: pendingRetryTimer !== null,
    files: MINING_FILES.map((f) => {
      const content = readFile(f.local);
      return {
        name: f.local,
        repo: f.repo,
        bytes: fileBytes(f.local),
        exists: content.length > 0,
        hash: shortHash(content)
      };
    })
  };
}
if (typeof process !== "undefined") {
  const shutdown = async (signal) => {
    try {
      await flushBackupNow();
    } catch {
    }
    process.exit(signal === "SIGINT" ? 130 : 0);
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}
export {
  setDebounceMs as a,
  scheduleTournamentBackup as b,
  scheduleBackup as c,
  flushBackupNow as f,
  getBackupStatus as g,
  markAlreadyCommitted as m,
  setBackupEnabled as s
};
