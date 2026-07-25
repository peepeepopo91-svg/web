import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { a as resolveGitHubToken } from "./tokenStore-BIPGdV9D.js";
const OWNER = "peepeepopo91-svg";
const REPO = "rupa";
const BRANCH = "main";
const BASE = "https://api.github.com";
function getToken() {
  const token = resolveGitHubToken();
  if (!token) throw new Error("GITHUB_TOKEN secret is not configured");
  return token;
}
function buildHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}
async function ghFetch(path, init) {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: buildHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    throw new Error(`GitHub API ${res.status} on ${path}: ${body}`);
  }
  return res.json();
}
async function commitFiles(files, message) {
  if (files.length === 0) throw new Error("commitFiles: no files provided");
  const ref = await ghFetch(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`);
  const headSha = ref.object.sha;
  const headCommit = await ghFetch(`/repos/${OWNER}/${REPO}/git/commits/${headSha}`);
  const baseTreeSha = headCommit.tree.sha;
  const blobs = await Promise.all(
    files.map(
      (f) => ghFetch(`/repos/${OWNER}/${REPO}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content: f.content, encoding: "utf-8" })
      })
    )
  );
  const newTree = await ghFetch(`/repos/${OWNER}/${REPO}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: files.map((f, i) => ({
        path: f.path,
        mode: "100644",
        type: "blob",
        sha: blobs[i].sha
      }))
    })
  });
  const newCommit = await ghFetch(`/repos/${OWNER}/${REPO}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: newTree.sha, parents: [headSha] })
  });
  await ghFetch(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommit.sha })
  });
  return { sha: newCommit.sha };
}
async function getRepoStatus() {
  try {
    const data = await ghFetch(`/repos/${OWNER}/${REPO}/commits/${BRANCH}`);
    return {
      connected: true,
      branch: BRANCH,
      latestCommit: {
        message: data.commit.message,
        sha: data.sha.slice(0, 7),
        date: data.commit.author.date
      }
    };
  } catch {
    return { connected: false, branch: BRANCH, latestCommit: null };
  }
}
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
  getBackupStatus as a,
  setDebounceMs as b,
  scheduleTournamentBackup as c,
  scheduleBackup as d,
  flushBackupNow as f,
  getRepoStatus as g,
  markAlreadyCommitted as m,
  setBackupEnabled as s
};
