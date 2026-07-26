import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { load, dump } from "js-yaml";
import { g as getRepoStatus, m as markAlreadyCommitted, a as getBackupStatus, s as setBackupEnabled, b as setDebounceMs, f as flushBackupNow } from "./miningBackup-BQ-7nMGz.js";
import { r as resolveTokenSource, p as persistToken, e as eraseToken } from "./tokenStore-BIPGdV9D.js";
import { c as createServerFn } from "../server.js";
import "node:crypto";
import "node:child_process";
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
const DATA_DIR = resolve(process.cwd(), "data");
const OWNER = "peepeepopo91-svg";
const REPO = "rupa";
const BRANCH = "main";
const BASE = "https://api.github.com";
const CONFLICT_RE = /^(<{7}|={7}|>{7})/m;
const RANK_KEYS = ["mace", "sword", "axe", "uhc", "nethpot", "diapot", "crystal"];
const VALID_TIERS = /* @__PURE__ */ new Set(["HT1", "LT1", "HT2", "LT2", "HT3", "LT3", "HT4", "LT4", "HT5", "LT5", "None", "NONE", "none"]);
const VALID_REGIONS = /* @__PURE__ */ new Set(["North America", "South America", "Europe", "Asia", "Oceania", "Africa", "Middle East"]);
function normalizePlayer(p) {
  const name = typeof p?.name === "string" ? p.name.trim() : "";
  const rawHead = typeof p?.head === "string" ? p.head.trim() : "";
  const head = rawHead || `https://mc-heads.net/avatar/${encodeURIComponent(name)}`;
  const region = VALID_REGIONS.has(p?.region) ? p.region : "North America";
  const ranks = {};
  for (const [key, rawVal] of Object.entries(p?.ranks ?? {})) {
    if (typeof rawVal !== "string" || !VALID_TIERS.has(rawVal)) continue;
    ranks[key] = rawVal.toUpperCase() === "NONE" ? "NONE" : rawVal;
  }
  for (const key of RANK_KEYS) {
    const val = p?.ranks?.[key];
    if (typeof val === "string" && VALID_TIERS.has(val) && val.toUpperCase() !== "NONE") {
      ranks[key] = val;
    } else {
      ranks[key] = "NONE";
    }
  }
  return {
    name,
    head,
    region,
    ranks
  };
}
function deduplicateAndSort(players) {
  const seen = /* @__PURE__ */ new Map();
  for (const p of players) {
    const key = p.name.toLowerCase();
    if (!seen.has(key)) seen.set(key, p);
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}
function findDuplicateNames(players) {
  const names = players.map((p) => String(p?.name ?? "").toLowerCase());
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  return [...new Set(dupes)];
}
function readJson(file) {
  try {
    return JSON.parse(readFileSync(resolve(DATA_DIR, file), "utf8"));
  } catch {
    return null;
  }
}
function readRaw(file) {
  try {
    return readFileSync(resolve(DATA_DIR, file), "utf8");
  } catch {
    return null;
  }
}
function atomicWriteJson(file, data) {
  mkdirSync(DATA_DIR, {
    recursive: true
  });
  const content = JSON.stringify(data, null, 2);
  JSON.parse(content);
  const target = resolve(DATA_DIR, file);
  const tmp = `${target}.tmp`;
  writeFileSync(tmp, content, "utf8");
  JSON.parse(readFileSync(tmp, "utf8"));
  renameSync(tmp, target);
  return content;
}
const loadAllData_createServerFn_handler = createServerRpc({
  id: "fb2978d20fe1134bdea5fda77c3454ab7fe06d6f8f25ce5810087b934cbf6d9d",
  name: "loadAllData",
  filename: "src/server/dataFiles.ts"
}, (opts) => loadAllData.__executeServer(opts));
const loadAllData = createServerFn({
  method: "GET"
}).handler(loadAllData_createServerFn_handler, async () => {
  return {
    players: readJson("players.json"),
    gamemodes: readJson("gamemodes.json"),
    content: readJson("content.json"),
    event: readJson("event.json"),
    economy: readJson("economy.json"),
    homepage: readJson("homepage.json"),
    tierTagger: readJson("tier-tagger.json")
  };
});
const FILE_MAP = {
  players: {
    file: "players.json",
    repoPath: "data/players.json"
  },
  gamemodes: {
    file: "gamemodes.json",
    repoPath: "data/gamemodes.json"
  },
  content: {
    file: "content.json",
    repoPath: "data/content.json"
  },
  event: {
    file: "event.json",
    repoPath: "data/event.json"
  },
  economy: {
    file: "economy.json",
    repoPath: "data/economy.json"
  },
  homepage: {
    file: "homepage.json",
    repoPath: "data/homepage.json"
  },
  "tier-tagger": {
    file: "tier-tagger.json",
    repoPath: "data/tier-tagger.json"
  }
};
const flushStoresToDisk_createServerFn_handler = createServerRpc({
  id: "122baba04c16401cfafde375ba7ad6643336700c3ea9139163e16817a4f8ac87",
  name: "flushStoresToDisk",
  filename: "src/server/dataFiles.ts"
}, (opts) => flushStoresToDisk.__executeServer(opts));
const flushStoresToDisk = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  sections: z.array(z.object({
    section: z.enum(["players", "gamemodes", "content", "event", "economy", "homepage", "tier-tagger"]),
    jsonData: z.string()
  }))
})).handler(flushStoresToDisk_createServerFn_handler, async ({
  data: {
    sections
  }
}) => {
  const written = [];
  for (const {
    section,
    jsonData
  } of sections) {
    if (CONFLICT_RE.test(jsonData)) {
      throw new Error(`CONFLICT_ERROR: Merge conflict markers found in ${section}`);
    }
    let parsed;
    try {
      parsed = JSON.parse(jsonData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`VALIDATE_ERROR: Invalid JSON in ${section} — ${msg}`);
    }
    if (section === "players" && Array.isArray(parsed)) {
      parsed = deduplicateAndSort(parsed.map(normalizePlayer));
    }
    const {
      file
    } = FILE_MAP[section];
    atomicWriteJson(file, parsed);
    written.push(file);
  }
  for (const file of written) {
    const verify = readJson(file);
    if (verify === null) {
      throw new Error(`WRITE_ERROR: Disk-write verification failed for ${file}`);
    }
  }
  return {
    success: true,
    written
  };
});
function buildGHHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}
async function ghFetch(token, path, opts) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: buildGHHeaders(token)
  });
  const body = await res.text();
  if (!res.ok) {
    let msg = body;
    try {
      msg = JSON.parse(body).message ?? body;
    } catch {
    }
    if (res.status === 401 || res.status === 403) throw new Error(`AUTH_ERROR: ${msg}`);
    if (res.status === 404 && path.includes("/repos/")) throw new Error(`REPO_ERROR: Repository not found — ${msg}`);
    if (path.includes("/git/blobs")) throw new Error(`BLOB_ERROR: ${msg}`);
    if (path.includes("/git/trees")) throw new Error(`TREE_ERROR: ${msg}`);
    if (path.includes("/git/commits") && opts?.method === "POST") throw new Error(`COMMIT_ERROR: ${msg}`);
    if (path.includes("/git/refs/heads") && opts?.method === "PATCH") {
      throw new Error(`REF_ERROR[${res.status}]: ${msg}`);
    }
    if (path.includes("/git/refs") || path.includes("/git/commits") && !opts?.method) {
      throw new Error(`SHA_ERROR: ${msg}`);
    }
    throw new Error(`UPLOAD_ERROR: GitHub API ${res.status}: ${msg}`);
  }
  return JSON.parse(body);
}
async function fetchRemoteFile(token, repoPath) {
  try {
    const res = await fetch(`${BASE}/repos/${OWNER}/${REPO}/contents/${repoPath}?ref=${BRANCH}`, {
      headers: buildGHHeaders(token)
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.content) return null;
    return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
  } catch {
    return null;
  }
}
const fetchRepoStatus_createServerFn_handler = createServerRpc({
  id: "0f21d5fdd8f8b02ab92db2f5563ffd9b0553c088bf6063ab1d5342805db5aa83",
  name: "fetchRepoStatus",
  filename: "src/server/dataFiles.ts"
}, (opts) => fetchRepoStatus.__executeServer(opts));
const fetchRepoStatus = createServerFn({
  method: "GET"
}).handler(fetchRepoStatus_createServerFn_handler, async () => {
  return getRepoStatus();
});
const validateAllData_createServerFn_handler = createServerRpc({
  id: "f091b0a50c4636f6d4743812dc2225adc39a83cc84df7f264588bcf750d92a5b",
  name: "validateAllData",
  filename: "src/server/dataFiles.ts"
}, (opts) => validateAllData.__executeServer(opts));
const validateAllData = createServerFn({
  method: "GET"
}).handler(validateAllData_createServerFn_handler, async () => {
  const results = [];
  for (const [section, {
    file
  }] of Object.entries(FILE_MAP)) {
    const raw = readRaw(file);
    if (raw === null) {
      results.push({
        file,
        section,
        jsonValid: false,
        hasMergeConflicts: false,
        error: "File not found or unreadable"
      });
      continue;
    }
    const hasMergeConflicts = CONFLICT_RE.test(raw);
    if (hasMergeConflicts) {
      results.push({
        file,
        section,
        jsonValid: false,
        hasMergeConflicts: true,
        error: "Merge conflict markers detected"
      });
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      results.push({
        file,
        section,
        jsonValid: false,
        hasMergeConflicts: false,
        error: `Invalid JSON: ${e}`
      });
      continue;
    }
    if (section !== "players") {
      results.push({
        file,
        section,
        jsonValid: true,
        hasMergeConflicts: false
      });
      continue;
    }
    if (!Array.isArray(parsed)) {
      results.push({
        file,
        section,
        jsonValid: false,
        hasMergeConflicts: false,
        error: "players.json is not an array"
      });
      continue;
    }
    const players = parsed;
    const duplicates = findDuplicateNames(players);
    const missingFields = players.filter((p) => !p?.name || !p?.head || !p?.region || !p?.ranks).map((p) => p?.name || "(unnamed)");
    const missingRegions = players.filter((p) => !VALID_REGIONS.has(p?.region)).map((p) => p?.name || "(unnamed)");
    const invalidRanks = players.filter((p) => p?.ranks && RANK_KEYS.some((k) => {
      const v = p.ranks[k];
      return typeof v === "string" && !VALID_TIERS.has(v);
    })).map((p) => p?.name || "(unnamed)");
    results.push({
      file,
      section,
      jsonValid: true,
      hasMergeConflicts: false,
      playerCount: players.length,
      duplicates,
      missingFields,
      missingRegions,
      invalidRanks
    });
  }
  const _resolved = resolveTokenSource();
  const hasGitHubToken = !!_resolved;
  let repoReachable = false;
  let branchExists = false;
  if (_resolved) {
    try {
      const repoRes = await fetch(`${BASE}/repos/${OWNER}/${REPO}`, {
        headers: buildGHHeaders(_resolved.token)
      });
      repoReachable = repoRes.ok;
      if (repoReachable) {
        const branchRes = await fetch(`${BASE}/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
          headers: buildGHHeaders(_resolved.token)
        });
        branchExists = branchRes.ok;
      }
    } catch {
    }
  }
  const totalIssues = results.reduce((sum, r) => {
    let n = 0;
    if (!r.jsonValid) n++;
    if (r.hasMergeConflicts) n++;
    if (r.duplicates?.length) n += r.duplicates.length;
    if (r.missingFields?.length) n += r.missingFields.length;
    if (r.missingRegions?.length) n += r.missingRegions.length;
    if (r.invalidRanks?.length) n += r.invalidRanks.length;
    return sum + n;
  }, 0);
  return {
    files: results,
    hasGitHubToken,
    repoReachable,
    branchExists,
    totalIssues
  };
});
const checkGitHubConnection_createServerFn_handler = createServerRpc({
  id: "d84fa3675279ea0e17dad40462b2750bb2e4b616c1839fd9e9bb25478a5244e2",
  name: "checkGitHubConnection",
  filename: "src/server/dataFiles.ts"
}, (opts) => checkGitHubConnection.__executeServer(opts));
const checkGitHubConnection = createServerFn({
  method: "GET"
}).handler(checkGitHubConnection_createServerFn_handler, async () => {
  const token = resolveTokenSource()?.token ?? null;
  const out = {
    tokenExists: !!token,
    apiAccessible: false,
    repoExists: false,
    branchExists: false,
    writePermission: false,
    username: null,
    rateLimit: null
  };
  if (!token) return out;
  try {
    const userRes = await fetch(`${BASE}/user`, {
      headers: buildGHHeaders(token)
    });
    if (userRes.ok) {
      out.apiAccessible = true;
      const user = await userRes.json();
      out.username = user.login;
      const rem = Number(userRes.headers.get("x-ratelimit-remaining") ?? "-1");
      const lim = Number(userRes.headers.get("x-ratelimit-limit") ?? "-1");
      if (rem >= 0) out.rateLimit = {
        remaining: rem,
        limit: lim
      };
    }
  } catch {
  }
  try {
    const repoRes = await fetch(`${BASE}/repos/${OWNER}/${REPO}`, {
      headers: buildGHHeaders(token)
    });
    if (repoRes.ok) {
      out.repoExists = true;
      const repo = await repoRes.json();
      out.writePermission = repo.permissions?.push ?? false;
    }
  } catch {
  }
  if (out.repoExists) {
    try {
      const brRes = await fetch(`${BASE}/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
        headers: buildGHHeaders(token)
      });
      out.branchExists = brRes.ok;
    } catch {
    }
  }
  return out;
});
const getTokenInfo_createServerFn_handler = createServerRpc({
  id: "0968b9e500194cfc5a1fddeda76061dfcfe12f83a9d08509cdd9df86c7aca7c9",
  name: "getTokenInfo",
  filename: "src/server/dataFiles.ts"
}, (opts) => getTokenInfo.__executeServer(opts));
const getTokenInfo = createServerFn({
  method: "GET"
}).handler(getTokenInfo_createServerFn_handler, async () => {
  const resolved = resolveTokenSource();
  const blank = {
    configured: false,
    source: null,
    maskedToken: null,
    valid: false,
    invalid: false,
    username: null,
    avatarUrl: null,
    name: null,
    scopes: null,
    hasRepoScope: false,
    rateLimit: null
  };
  if (!resolved) return blank;
  const {
    token,
    source
  } = resolved;
  const masked = `${token.slice(0, 6)}…${token.slice(-4)}`;
  try {
    const res = await fetch(`${BASE}/user`, {
      headers: buildGHHeaders(token)
    });
    if (!res.ok) {
      return {
        ...blank,
        configured: true,
        source,
        maskedToken: masked,
        invalid: true
      };
    }
    const user = await res.json();
    const scopes = res.headers.get("x-oauth-scopes") ?? null;
    const rem = Number(res.headers.get("x-ratelimit-remaining") ?? "-1");
    const lim = Number(res.headers.get("x-ratelimit-limit") ?? "-1");
    const hasRepoScope = (scopes ?? "").split(",").map((s) => s.trim()).some((s) => s === "repo" || s === "public_repo");
    return {
      configured: true,
      source,
      maskedToken: masked,
      valid: true,
      invalid: false,
      username: user.login,
      avatarUrl: user.avatar_url,
      name: user.name ?? null,
      scopes,
      hasRepoScope,
      rateLimit: rem >= 0 ? {
        remaining: rem,
        limit: lim
      } : null
    };
  } catch {
    return {
      ...blank,
      configured: true,
      source,
      maskedToken: masked
    };
  }
});
const testGitHubToken_createServerFn_handler = createServerRpc({
  id: "2abf3e9a8c1b7b7a11f8de5823636e8c40964237c69abf25ad72f518545fdcdd",
  name: "testGitHubToken",
  filename: "src/server/dataFiles.ts"
}, (opts) => testGitHubToken.__executeServer(opts));
const testGitHubToken = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  token: z.string().min(1)
})).handler(testGitHubToken_createServerFn_handler, async ({
  data
}) => {
  const token = data.token.trim();
  const blank = {
    valid: false,
    error: null,
    username: null,
    avatarUrl: null,
    name: null,
    scopes: null,
    hasRepoScope: false,
    rateLimit: null
  };
  try {
    const res = await fetch(`${BASE}/user`, {
      headers: buildGHHeaders(token)
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let msg = `GitHub rejected the token (HTTP ${res.status})`;
      try {
        msg = JSON.parse(body).message ?? msg;
      } catch {
      }
      return {
        ...blank,
        error: msg
      };
    }
    const user = await res.json();
    const scopes = res.headers.get("x-oauth-scopes") ?? null;
    const rem = Number(res.headers.get("x-ratelimit-remaining") ?? "-1");
    const lim = Number(res.headers.get("x-ratelimit-limit") ?? "-1");
    const hasRepoScope = (scopes ?? "").split(",").map((s) => s.trim()).some((s) => s === "repo" || s === "public_repo");
    return {
      valid: true,
      error: null,
      username: user.login,
      avatarUrl: user.avatar_url,
      name: user.name ?? null,
      scopes,
      hasRepoScope,
      rateLimit: rem >= 0 ? {
        remaining: rem,
        limit: lim
      } : null
    };
  } catch (e) {
    return {
      ...blank,
      error: e instanceof Error ? e.message : "Network error"
    };
  }
});
const saveGitHubToken_createServerFn_handler = createServerRpc({
  id: "1f7579febd4fab86592a3e93539f3f565f9671b1c540b25d737c8e8bff462a95",
  name: "saveGitHubToken",
  filename: "src/server/dataFiles.ts"
}, (opts) => saveGitHubToken.__executeServer(opts));
const saveGitHubToken = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  token: z.string().min(1)
})).handler(saveGitHubToken_createServerFn_handler, async ({
  data
}) => {
  persistToken(data.token.trim());
  return {
    success: true
  };
});
const clearGitHubToken_createServerFn_handler = createServerRpc({
  id: "10ecc1d9c6f957038b8e29917d4a89402354e0da002cf941902f2aaad6df7a58",
  name: "clearGitHubToken",
  filename: "src/server/dataFiles.ts"
}, (opts) => clearGitHubToken.__executeServer(opts));
const clearGitHubToken = createServerFn({
  method: "POST"
}).handler(clearGitHubToken_createServerFn_handler, async () => {
  const wasInFile = eraseToken();
  return {
    success: true,
    wasInFile
  };
});
const fetchCommitHistory_createServerFn_handler = createServerRpc({
  id: "73ea4a3c38df80c388f7c8b4ef3cad8833eefa1ea9accb2cd6242733cab06d2f",
  name: "fetchCommitHistory",
  filename: "src/server/dataFiles.ts"
}, (opts) => fetchCommitHistory.__executeServer(opts));
const fetchCommitHistory = createServerFn({
  method: "GET"
}).handler(fetchCommitHistory_createServerFn_handler, async () => {
  const token = resolveTokenSource()?.token;
  if (!token) throw new Error("AUTH_ERROR: GITHUB_TOKEN not configured");
  const list = await ghFetch(token, `/repos/${OWNER}/${REPO}/commits?sha=${BRANCH}&per_page=30`);
  return list.map((c) => ({
    sha: c.sha,
    shortSha: c.sha.slice(0, 7),
    message: c.commit.message.split("\n")[0],
    date: c.commit.author.date,
    author: c.commit.author.name
  }));
});
const restoreToCommit_createServerFn_handler = createServerRpc({
  id: "791f5fb5291d52d6022c2fdeba15d0eb794ed38b4d702cfc3068a4ed7403776c",
  name: "restoreToCommit",
  filename: "src/server/dataFiles.ts"
}, (opts) => restoreToCommit.__executeServer(opts));
const restoreToCommit = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  sha: z.string().min(7),
  message: z.string().optional()
})).handler(restoreToCommit_createServerFn_handler, async ({
  data
}) => {
  const token = resolveTokenSource()?.token;
  if (!token) throw new Error("AUTH_ERROR: GITHUB_TOKEN not configured");
  const targetCommit = await ghFetch(token, `/repos/${OWNER}/${REPO}/git/commits/${data.sha}`);
  const targetTreeSha = targetCommit.tree.sha;
  const ref = await ghFetch(token, `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`);
  const headSha = ref.object.sha;
  const message = data.message ?? `Revert to ${data.sha.slice(0, 7)}`;
  const newCommit = await ghFetch(token, `/repos/${OWNER}/${REPO}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: targetTreeSha,
      parents: [headSha]
    })
  });
  await ghFetch(token, `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({
      sha: newCommit.sha
    })
  });
  return {
    success: true,
    sha: newCommit.sha,
    shortSha: newCommit.sha.slice(0, 7)
  };
});
const getGitDiagnostics_createServerFn_handler = createServerRpc({
  id: "336f16e34d562f78275aa7a3cc022fe8ca0edac416f1900768a9c6ffb285a4af",
  name: "getGitDiagnostics",
  filename: "src/server/dataFiles.ts"
}, (opts) => getGitDiagnostics.__executeServer(opts));
const getGitDiagnostics = createServerFn({
  method: "GET"
}).handler(getGitDiagnostics_createServerFn_handler, async () => {
  const {
    spawnSync
  } = await import("node:child_process");
  const cwd = process.cwd();
  const ghToken = resolveTokenSource()?.token ?? "";
  const gitEnv = {
    ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== void 0)),
    GIT_TERMINAL_PROMPT: "0",
    GIT_ASKPASS: "echo"
  };
  function git(...args) {
    const r = spawnSync("git", args, {
      cwd,
      encoding: "utf8",
      timeout: 15e3,
      env: gitEnv
    });
    return {
      out: (r.stdout ?? "").trim(),
      err: (r.stderr ?? "").trim(),
      ok: (r.status ?? 1) === 0
    };
  }
  const gitCheck = git("--version");
  if (!gitCheck.ok) {
    return {
      branch: "unknown",
      headSha: "???????",
      ahead: 0,
      behind: 0,
      isDiverged: false,
      modified: 0,
      untracked: 0,
      deleted: 0,
      totalPending: 0,
      statusLines: [],
      jsonChecks: [],
      gitError: "git not available in this environment"
    };
  }
  const originalUrl = git("remote", "get-url", "origin").out;
  if (ghToken && originalUrl.startsWith("https://github.com/")) {
    const authUrl = originalUrl.replace("https://github.com/", `https://x-access-token:${ghToken}@github.com/`);
    git("remote", "set-url", "origin", authUrl);
  }
  let fetchError;
  const fetchRes = git("fetch", "origin", "--quiet");
  if (!fetchRes.ok && fetchRes.err) fetchError = fetchRes.err.slice(0, 200);
  if (ghToken && originalUrl.startsWith("https://github.com/")) {
    git("remote", "set-url", "origin", originalUrl);
  }
  const branch = git("rev-parse", "--abbrev-ref", "HEAD").out || "main";
  const headSha = (git("rev-parse", "HEAD").out || "???????").slice(0, 7);
  const aheadN = parseInt(git("rev-list", "--count", "origin/main..HEAD").out) || 0;
  const behindN = parseInt(git("rev-list", "--count", "HEAD..origin/main").out) || 0;
  const statusRes = git("status", "--porcelain");
  const lines = statusRes.out ? statusRes.out.split("\n").filter(Boolean) : [];
  const modified = lines.filter((l) => !l.startsWith("??") && (l[0] === "M" || l[1] === "M")).length;
  const untracked = lines.filter((l) => l.startsWith("??")).length;
  const deleted = lines.filter((l) => l[0] === "D" || l[1] === "D").length;
  const jsonChecks = Object.values(FILE_MAP).map(({
    file
  }) => {
    const raw = readRaw(file);
    if (!raw) return {
      file,
      ok: false,
      error: "File not found"
    };
    if (CONFLICT_RE.test(raw)) return {
      file,
      ok: false,
      error: "Contains conflict markers (<<<<<<< / =======)"
    };
    try {
      JSON.parse(raw);
      return {
        file,
        ok: true
      };
    } catch (e) {
      return {
        file,
        ok: false,
        error: String(e).slice(0, 100)
      };
    }
  });
  return {
    branch,
    headSha,
    ahead: aheadN,
    behind: behindN,
    isDiverged: aheadN > 0 && behindN > 0,
    modified,
    untracked,
    deleted,
    totalPending: lines.length,
    statusLines: lines.slice(0, 30),
    jsonChecks,
    ...fetchError ? {
      fetchError
    } : {}
  };
});
const fixGitDivergence_createServerFn_handler = createServerRpc({
  id: "caaa9e2b5c5ad43cde33788c51c45fa7f3c1baa017e74bc1d8e096b2dd152807",
  name: "fixGitDivergence",
  filename: "src/server/dataFiles.ts"
}, (opts) => fixGitDivergence.__executeServer(opts));
const fixGitDivergence = createServerFn({
  method: "POST"
}).handler(fixGitDivergence_createServerFn_handler, async () => {
  const {
    spawnSync
  } = await import("node:child_process");
  const {
    existsSync
  } = await import("node:fs");
  const cwd = process.cwd();
  const logs = [];
  const ghToken = resolveTokenSource()?.token ?? "";
  if (!ghToken) {
    return {
      success: false,
      action: "error",
      logs: ["✗ GITHUB_TOKEN is not set — cannot authenticate git push. Set it via the Token Management panel or as a Replit Secret."],
      ahead: 0,
      behind: 0
    };
  }
  const env = {
    ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== void 0)),
    GIT_EDITOR: "true",
    GIT_MERGE_AUTOEDIT: "no",
    GIT_TERMINAL_PROMPT: "0",
    // ← prevents git from hanging on auth prompt
    GIT_ASKPASS: "echo",
    // ← returns empty string for any credential query
    EDITOR: "true",
    VISUAL: "true"
  };
  function git(...args) {
    const r = spawnSync("git", args, {
      cwd,
      encoding: "utf8",
      timeout: 6e4,
      env
    });
    return {
      out: (r.stdout ?? "").trim(),
      err: (r.stderr ?? "").trim(),
      ok: (r.status ?? 1) === 0
    };
  }
  function isRebasing() {
    return existsSync(resolve(cwd, ".git", "rebase-merge")) || existsSync(resolve(cwd, ".git", "rebase-apply"));
  }
  const originalUrl = git("remote", "get-url", "origin").out;
  let authenticatedUrl = originalUrl;
  if (originalUrl.startsWith("https://github.com/")) {
    authenticatedUrl = originalUrl.replace("https://github.com/", `https://x-access-token:${ghToken}@github.com/`);
    git("remote", "set-url", "origin", authenticatedUrl);
    logs.push("✓ GitHub token injected into remote URL");
  } else if (originalUrl.includes("github.com") && !originalUrl.includes("@")) {
    authenticatedUrl = originalUrl.replace("github.com", `x-access-token:${ghToken}@github.com`);
    git("remote", "set-url", "origin", authenticatedUrl);
    logs.push("✓ GitHub token injected into remote URL");
  } else {
    logs.push(`Remote URL: ${originalUrl} — token not injected (non-HTTPS or already has credentials)`);
  }
  function restoreRemoteUrl() {
    if (authenticatedUrl !== originalUrl) {
      git("remote", "set-url", "origin", originalUrl);
    }
  }
  if (!git("config", "user.email").out) {
    git("config", "user.email", "admin@bluetiers.app");
    git("config", "user.name", "Blue Tiers Admin");
  }
  logs.push("→ git fetch origin");
  const fetchRes = git("fetch", "origin");
  logs.push(fetchRes.ok ? "✓ Fetched origin/main" : `Fetch warning: ${fetchRes.err.slice(0, 200)}`);
  const ahead0 = parseInt(git("rev-list", "--count", "origin/main..HEAD").out) || 0;
  const behind0 = parseInt(git("rev-list", "--count", "HEAD..origin/main").out) || 0;
  logs.push(`Branch is ${ahead0} commit(s) ahead, ${behind0} commit(s) behind origin/main`);
  const statusRes = git("status", "--porcelain");
  if (statusRes.out) {
    logs.push(`→ git add -A && git commit  (${statusRes.out.split("\n").filter(Boolean).length} files)`);
    git("add", "-A");
    const commitRes = git("commit", "-m", `[admin] Auto-commit local changes before divergence fix (${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)})`);
    logs.push(commitRes.ok ? "✓ Committed local changes" : `Commit: ${commitRes.err.slice(0, 120)}`);
  } else {
    logs.push("Working tree clean — no uncommitted changes");
  }
  const ahead = parseInt(git("rev-list", "--count", "origin/main..HEAD").out) || 0;
  const behind = parseInt(git("rev-list", "--count", "HEAD..origin/main").out) || 0;
  if (behind === 0) {
    if (ahead === 0) {
      restoreRemoteUrl();
      logs.push("Repository already synchronized — nothing to push.");
      return {
        success: true,
        action: "none",
        logs,
        ahead,
        behind
      };
    }
    logs.push(`→ git push origin main  (${ahead} commit(s) ahead)`);
    const push2 = git("push", "origin", "main");
    if (push2.ok) {
      restoreRemoteUrl();
      markAlreadyCommitted();
      logs.push("✓ Push successful");
      return {
        success: true,
        action: "push-only",
        logs,
        ahead,
        behind
      };
    }
    logs.push(`Push failed (${push2.err.slice(0, 120)}) — retrying with --force-with-lease`);
    const pushF2 = git("push", "--force-with-lease", "origin", "main");
    restoreRemoteUrl();
    if (pushF2.ok) markAlreadyCommitted();
    logs.push(pushF2.ok ? "✓ Push successful (force-with-lease)" : `✗ Push failed: ${pushF2.err.slice(0, 300)}`);
    return {
      success: pushF2.ok,
      action: "push-force",
      logs,
      ahead,
      behind
    };
  }
  logs.push(`→ git rebase -X theirs origin/main  (absorbing ${behind} remote commit(s))`);
  logs.push("  Note: data/*.json conflicts will be resolved by keeping the remote version.");
  const rebaseRes = git("rebase", "-X", "theirs", "origin/main");
  if (!rebaseRes.ok && isRebasing()) {
    logs.push(`Rebase hit a conflict — force-resolving remaining steps (prefer remote)…`);
    let maxSteps = 30;
    while (isRebasing() && maxSteps-- > 0) {
      git("checkout", "--theirs", ".");
      git("add", "-A");
      const cont = git("rebase", "--continue");
      if (cont.ok || !isRebasing()) break;
      if (cont.err.includes("nothing to commit")) {
        git("rebase", "--skip");
      }
    }
    if (isRebasing()) {
      git("rebase", "--abort");
      restoreRemoteUrl();
      logs.push("✗ Rebase could not be completed automatically. Aborted.");
      logs.push('  Tip: Use "Fix Divergence" to sync local to remote,');
      logs.push("  then re-apply your changes through the admin panel.");
      return {
        success: false,
        action: "error",
        logs,
        ahead,
        behind
      };
    }
    logs.push("✓ All conflicts resolved — rebase complete");
  } else if (rebaseRes.ok) {
    logs.push("✓ Rebase completed cleanly (no conflicts)");
  } else if (!isRebasing()) {
    logs.push(`Rebase note: ${rebaseRes.err.slice(0, 120)}`);
  }
  const aheadFinal = parseInt(git("rev-list", "--count", "origin/main..HEAD").out) || 0;
  const behindFinal = parseInt(git("rev-list", "--count", "HEAD..origin/main").out) || 0;
  logs.push(`→ git push origin main  (now ${aheadFinal} ahead, ${behindFinal} behind)`);
  const push = git("push", "origin", "main");
  if (push.ok) {
    restoreRemoteUrl();
    markAlreadyCommitted();
    logs.push("✓ Push successful — repository fully synchronized");
    return {
      success: true,
      action: "rebase-push",
      logs,
      ahead: aheadFinal,
      behind: behindFinal
    };
  }
  logs.push(`Push rejected (${push.err.slice(0, 120)}) — retrying with --force-with-lease`);
  const pushF = git("push", "--force-with-lease", "origin", "main");
  restoreRemoteUrl();
  if (pushF.ok) markAlreadyCommitted();
  logs.push(pushF.ok ? "✓ Push successful (force-with-lease) — repository synchronized" : `✗ Push failed: ${pushF.err.slice(0, 300)}`);
  return {
    success: pushF.ok,
    action: pushF.ok ? "rebase-push" : "error",
    logs,
    ahead: aheadFinal,
    behind: behindFinal
  };
});
const backupMiningData_createServerFn_handler = createServerRpc({
  id: "d100192c84dbdf2c323ec92fe16f12f83d269027f1a297e59ca03eef4c8e8d09",
  name: "backupMiningData",
  filename: "src/server/dataFiles.ts"
}, (opts) => backupMiningData.__executeServer(opts));
const backupMiningData = createServerFn({
  method: "POST"
}).handler(backupMiningData_createServerFn_handler, async () => {
  const {
    spawnSync
  } = await import("node:child_process");
  const cwd = process.cwd();
  const logs = [];
  const MINING_FILES = ["data/mining-users.json", "data/mining-community.json"];
  const ghToken = resolveTokenSource()?.token ?? "";
  if (!ghToken) {
    return {
      success: false,
      alreadyBackedUp: false,
      logs: ["✗ GITHUB_TOKEN is not set — cannot push. Set it via the Token Management panel or as a Replit Secret."],
      filesCommitted: []
    };
  }
  const env = {
    ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== void 0)),
    GIT_EDITOR: "true",
    GIT_MERGE_AUTOEDIT: "no",
    GIT_TERMINAL_PROMPT: "0",
    GIT_ASKPASS: "echo",
    EDITOR: "true",
    VISUAL: "true"
  };
  function git(...args) {
    const r = spawnSync("git", args, {
      cwd,
      encoding: "utf8",
      timeout: 6e4,
      env
    });
    return {
      out: (r.stdout ?? "").trim(),
      err: (r.stderr ?? "").trim(),
      ok: (r.status ?? 1) === 0
    };
  }
  const originalUrl = git("remote", "get-url", "origin").out;
  let authenticatedUrl = originalUrl;
  if (originalUrl.startsWith("https://github.com/")) {
    authenticatedUrl = originalUrl.replace("https://github.com/", `https://x-access-token:${ghToken}@github.com/`);
    git("remote", "set-url", "origin", authenticatedUrl);
  }
  function restoreUrl() {
    if (authenticatedUrl !== originalUrl) git("remote", "set-url", "origin", originalUrl);
  }
  if (!git("config", "user.email").out) {
    git("config", "user.email", "admin@bluetiers.app");
    git("config", "user.name", "Blue Tiers Admin");
  }
  const statusOut = git("status", "--porcelain", "--", ...MINING_FILES).out;
  const changedFiles = statusOut.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => l.slice(3).trim());
  logs.push(`→ Checking mining data files…`);
  if (changedFiles.length === 0) {
    restoreUrl();
    logs.push("✓ No changes detected — mining data is already backed up.");
    return {
      success: true,
      alreadyBackedUp: true,
      logs,
      filesCommitted: []
    };
  }
  logs.push(`  ${changedFiles.length} file(s) have changes:`);
  changedFiles.forEach((f) => logs.push(`  · ${f}`));
  const addRes = git("add", "--", ...MINING_FILES);
  if (!addRes.ok) {
    restoreUrl();
    logs.push(`✗ git add failed: ${addRes.err.slice(0, 200)}`);
    return {
      success: false,
      alreadyBackedUp: false,
      logs,
      filesCommitted: []
    };
  }
  logs.push(`✓ Staged: ${MINING_FILES.join(", ")}`);
  const messages = ["Backup mining data", "Backup mining progress", "Mining data snapshot"];
  const commitMsg = messages[Math.floor(Date.now() / 1e3) % messages.length];
  const fullMsg = `${commitMsg} (${(/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace("T", " ")} UTC)`;
  const commitRes = git("commit", "-m", fullMsg);
  if (!commitRes.ok) {
    restoreUrl();
    const nothing = commitRes.err.includes("nothing to commit") || commitRes.out.includes("nothing to commit");
    if (nothing) {
      logs.push("✓ Nothing new to commit — mining data is already backed up.");
      return {
        success: true,
        alreadyBackedUp: true,
        logs,
        filesCommitted: []
      };
    }
    logs.push(`✗ Commit failed: ${commitRes.err.slice(0, 300)}`);
    return {
      success: false,
      alreadyBackedUp: false,
      logs,
      filesCommitted: []
    };
  }
  logs.push(`✓ Committed: "${fullMsg}"`);
  logs.push("→ git fetch origin");
  const fetchRes = git("fetch", "origin");
  if (!fetchRes.ok) logs.push(`  Fetch warning: ${fetchRes.err.slice(0, 120)}`);
  const behind = parseInt(git("rev-list", "--count", "HEAD..origin/main").out) || 0;
  if (behind > 0) {
    logs.push(`  ${behind} remote commit(s) detected — rebasing before push…`);
    const rebaseRes = git("rebase", "-X", "theirs", "origin/main");
    if (!rebaseRes.ok) {
      git("rebase", "--abort");
      restoreUrl();
      logs.push('✗ Rebase failed — push aborted. Try "Fix Divergence" in Git Diagnostics first.');
      return {
        success: false,
        alreadyBackedUp: false,
        logs,
        filesCommitted: changedFiles
      };
    }
    logs.push("✓ Rebase completed cleanly");
  }
  logs.push("→ git push origin main");
  const pushRes = git("push", "origin", "main");
  restoreUrl();
  if (pushRes.ok) {
    logs.push("✓ Push successful — mining data backed up to GitHub.");
    return {
      success: true,
      alreadyBackedUp: false,
      logs,
      filesCommitted: changedFiles
    };
  }
  logs.push(`  Push rejected (${pushRes.err.slice(0, 80)}) — retrying with --force-with-lease`);
  const pushF = git("push", "--force-with-lease", "origin", "main");
  if (pushF.ok) {
    logs.push("✓ Push successful (force-with-lease) — mining data backed up to GitHub.");
    return {
      success: true,
      alreadyBackedUp: false,
      logs,
      filesCommitted: changedFiles
    };
  }
  logs.push(`✗ Push failed: ${pushF.err.slice(0, 300)}`);
  return {
    success: false,
    alreadyBackedUp: false,
    logs,
    filesCommitted: changedFiles
  };
});
const fetchSyncHistory_createServerFn_handler = createServerRpc({
  id: "2e6f0c521503f8024b01a97c2dd6e90b2082c3432492d548bb47ca64a739e11c",
  name: "fetchSyncHistory",
  filename: "src/server/dataFiles.ts"
}, (opts) => fetchSyncHistory.__executeServer(opts));
const fetchSyncHistory = createServerFn({
  method: "GET"
}).handler(fetchSyncHistory_createServerFn_handler, async () => {
  return readJson("sync-history.json") ?? [];
});
const addSyncHistoryEntry_createServerFn_handler = createServerRpc({
  id: "ab83cb7f457836d6f74c694d5cfeadda8b1f3d4efb517cdda82dc99dd72f810d",
  name: "addSyncHistoryEntry",
  filename: "src/server/dataFiles.ts"
}, (opts) => addSyncHistoryEntry.__executeServer(opts));
const addSyncHistoryEntry = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  commitHash: z.string(),
  commitMessage: z.string(),
  filesChanged: z.array(z.string()),
  status: z.enum(["success", "failed"]),
  durationMs: z.number()
})).handler(addSyncHistoryEntry_createServerFn_handler, async ({
  data
}) => {
  const history = readJson("sync-history.json") ?? [];
  const entry = {
    id: Date.now().toString(),
    date: (/* @__PURE__ */ new Date()).toISOString(),
    ...data
  };
  const trimmed = [entry, ...history].slice(0, 100);
  atomicWriteJson("sync-history.json", trimmed);
  return entry;
});
const compareLocalToRemote_createServerFn_handler = createServerRpc({
  id: "56cb769110f118349cdf266ed2c7834cb8154bfed52328cd3c8ed51d80b5ab91",
  name: "compareLocalToRemote",
  filename: "src/server/dataFiles.ts"
}, (opts) => compareLocalToRemote.__executeServer(opts));
const compareLocalToRemote = createServerFn({
  method: "GET"
}).handler(compareLocalToRemote_createServerFn_handler, async () => {
  const token = resolveTokenSource()?.token;
  if (!token) throw new Error("AUTH_ERROR: GITHUB_TOKEN not configured");
  const results = [];
  for (const [section, {
    file,
    repoPath
  }] of Object.entries(FILE_MAP)) {
    const localRaw = readRaw(file);
    const remoteRaw = await fetchRemoteFile(token, repoPath);
    const localNorm = localRaw ? JSON.stringify(JSON.parse(localRaw)) : null;
    const remoteNorm = remoteRaw ? JSON.stringify(JSON.parse(remoteRaw)) : null;
    results.push({
      section,
      file,
      repoPath,
      localBytes: localRaw?.length ?? 0,
      remoteBytes: remoteRaw?.length ?? 0,
      isSame: localNorm === remoteNorm,
      localExists: localRaw !== null,
      remoteExists: remoteRaw !== null
    });
  }
  return results;
});
const pullRemoteFiles_createServerFn_handler = createServerRpc({
  id: "e821b6439e82f7d8bfbe6b1b0d983c1f3e9be135a8c03517106cd7d1e6087322",
  name: "pullRemoteFiles",
  filename: "src/server/dataFiles.ts"
}, (opts) => pullRemoteFiles.__executeServer(opts));
const pullRemoteFiles = createServerFn({
  method: "POST"
}).handler(pullRemoteFiles_createServerFn_handler, async () => {
  const token = resolveTokenSource()?.token;
  if (!token) throw new Error("AUTH_ERROR: GITHUB_TOKEN not configured");
  const pulled = [];
  for (const [, {
    file,
    repoPath
  }] of Object.entries(FILE_MAP)) {
    const remote = await fetchRemoteFile(token, repoPath);
    if (remote) {
      const parsed = JSON.parse(remote);
      atomicWriteJson(file, parsed);
      pulled.push(file);
    }
  }
  return {
    pulled
  };
});
function deduplicateAndMergePlayers(players) {
  const map = /* @__PURE__ */ new Map();
  for (const p of players) {
    const key = String(p?.name ?? "").trim().toLowerCase();
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, {
        ...p
      });
    } else {
      const existing = map.get(key);
      map.set(key, {
        ...existing,
        ranks: {
          ...existing.ranks ?? {},
          ...p.ranks ?? {}
        }
      });
    }
  }
  return [...map.values()].sort((a, b) => String(a.name).localeCompare(String(b.name))).map(normalizePlayer);
}
function resolveConflictBlocks(raw) {
  let conflictCount = 0;
  const text = raw.replace(/^<{7}[^\n]*\n([\s\S]*?)^={7}[^\n]*\n([\s\S]*?)^>{7}[^\n]*\n?/gm, (_match, ours, theirs) => {
    conflictCount++;
    const oursClean = ours.replace(/\n$/, "");
    const theirsClean = theirs.replace(/\n$/, "");
    if (!oursClean) return theirsClean + "\n";
    if (!theirsClean) return oursClean + "\n";
    const needsComma = !/,\s*$/.test(oursClean);
    return oursClean + (needsComma ? "," : "") + "\n" + theirsClean + "\n";
  });
  return {
    text,
    conflictCount
  };
}
function fixMissingCommas(input) {
  let fixedCount = 0;
  const lines = input.split("\n");
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.endsWith(",") || trimmed.endsWith("{") || trimmed.endsWith("[")) {
      result.push(line);
      continue;
    }
    let nextTrimmed = "";
    for (let j = i + 1; j < lines.length; j++) {
      const t = lines[j].trim();
      if (t) {
        nextTrimmed = t;
        break;
      }
    }
    const endsWithValue = /["}\d]$/.test(trimmed);
    const nextOpensProperty = nextTrimmed.startsWith('"');
    const nextOpensObject = nextTrimmed.startsWith("{");
    if (endsWithValue && (nextOpensProperty || nextOpensObject)) {
      line = trimmed + ",";
      fixedCount++;
    }
    result.push(line);
  }
  return {
    text: result.join("\n"),
    fixedCount
  };
}
function removeTrailingCommas(input) {
  return input.replace(/,(\s*[}\]])/g, "$1").replace(/,(\s*,)+/g, ",");
}
function repairJsonText(raw) {
  const repairs = [];
  let text = raw;
  const {
    text: afterConflict,
    conflictCount
  } = resolveConflictBlocks(text);
  text = afterConflict;
  if (conflictCount > 0) repairs.push(`Resolved ${conflictCount} Git conflict block(s)`);
  const {
    text: afterCommas,
    fixedCount
  } = fixMissingCommas(text);
  text = afterCommas;
  if (fixedCount > 0) repairs.push(`Added ${fixedCount} missing comma(s)`);
  text = removeTrailingCommas(text);
  let parseAttempts = 0;
  parseAttempts++;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return {
      parsed,
      conflictCount,
      commasFix: fixedCount,
      parseAttempts,
      repairs
    };
  } catch {
  }
  parseAttempts++;
  const {
    text: text2,
    fixedCount: fix2
  } = fixMissingCommas(text);
  text = removeTrailingCommas(text2);
  if (fix2 > 0) repairs.push(`Second comma-fix pass: ${fix2} additional comma(s)`);
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return {
      parsed,
      conflictCount,
      commasFix: fixedCount + fix2,
      parseAttempts,
      repairs
    };
  } catch {
  }
  parseAttempts++;
  const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) {
        repairs.push("Salvaged JSON array structure from partial content");
        return {
          parsed,
          conflictCount,
          commasFix: fixedCount,
          parseAttempts,
          repairs
        };
      }
    } catch {
    }
  }
  let parseError = "Unknown parse error";
  try {
    JSON.parse(text);
  } catch (e) {
    parseError = String(e);
  }
  const lineMatch = parseError.match(/position (\d+)/);
  let lineHint = "";
  if (lineMatch) {
    const pos = parseInt(lineMatch[1]);
    const before = text.slice(0, pos);
    const lineNo = before.split("\n").length;
    lineHint = ` (near line ${lineNo})`;
  }
  throw new Error(`REPAIR_ERROR: Could not repair players.json after ${parseAttempts} parse attempt(s). Parse error: ${parseError}${lineHint}. The file may have structural corruption beyond what auto-repair can fix. A backup was saved before any changes were made.`);
}
const previewRepairPlayers_createServerFn_handler = createServerRpc({
  id: "0a0026775ec41c07ff6fce56a504939f56b9fff933b5e8375d7e1697dbb34629",
  name: "previewRepairPlayers",
  filename: "src/server/dataFiles.ts"
}, (opts) => previewRepairPlayers.__executeServer(opts));
const previewRepairPlayers = createServerFn({
  method: "GET"
}).handler(previewRepairPlayers_createServerFn_handler, async () => {
  let raw;
  try {
    raw = readFileSync(resolve(DATA_DIR, "players.json"), "utf8");
  } catch (e) {
    throw new Error(`REPAIR_ERROR: Cannot read players.json — ${e}`);
  }
  const conflictBlocks = (raw.match(/^<{7}/gm) ?? []).length;
  const {
    text: afterConflict
  } = resolveConflictBlocks(raw);
  const {
    fixedCount: missingCommas
  } = fixMissingCommas(afterConflict);
  let canAutoRepair = false;
  let playerCountBefore = 0;
  let playerCountAfter = 0;
  let parseError;
  let repairs = [];
  let duplicatePlayers = [];
  try {
    const result = repairJsonText(raw);
    repairs = result.repairs;
    const raw2 = result.parsed;
    playerCountBefore = raw2.length;
    const names = raw2.map((p) => String(p?.name ?? "").trim().toLowerCase());
    duplicatePlayers = [...new Set(names.filter((n, i) => n && names.indexOf(n) !== i))];
    const merged = deduplicateAndMergePlayers(raw2);
    playerCountAfter = merged.length;
    canAutoRepair = true;
  } catch (e) {
    parseError = e instanceof Error ? e.message.replace(/^REPAIR_ERROR:\s*/, "") : String(e);
  }
  return {
    conflictBlocks,
    missingCommas,
    duplicatePlayers,
    canAutoRepair,
    playerCountBefore,
    playerCountAfter,
    parseError,
    repairs
  };
});
const repairPlayers_createServerFn_handler = createServerRpc({
  id: "20254cac3591853b5c6524a2d69bd49a61d924ce0dff10ed2eb00eafd3a0e653",
  name: "repairPlayers",
  filename: "src/server/dataFiles.ts"
}, (opts) => repairPlayers.__executeServer(opts));
const repairPlayers = createServerFn({
  method: "POST"
}).handler(repairPlayers_createServerFn_handler, async () => {
  const repairs = [];
  let raw;
  try {
    raw = readFileSync(resolve(DATA_DIR, "players.json"), "utf8");
  } catch (e) {
    throw new Error(`REPAIR_ERROR: Cannot read players.json — ${e}`);
  }
  const backupDir = resolve(DATA_DIR, "backups");
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupFile = `players-before-repair-${timestamp}.json`;
  const backupPath = resolve(backupDir, backupFile);
  let backupSaved = false;
  try {
    mkdirSync(backupDir, {
      recursive: true
    });
    writeFileSync(backupPath, raw, "utf8");
    backupSaved = true;
    repairs.push(`Backup saved: data/backups/${backupFile}`);
  } catch (e) {
    repairs.push(`Warning: Could not create backup — ${e}`);
  }
  let parsed;
  try {
    const result = repairJsonText(raw);
    parsed = result.parsed;
    repairs.push(...result.repairs.filter((r) => !repairs.includes(r)));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(backupSaved ? `${msg} Backup saved at data/backups/${backupFile}.` : msg);
  }
  const before = parsed.length;
  const merged = deduplicateAndMergePlayers(parsed);
  const after = merged.length;
  if (after < before) {
    const removed = before - after;
    repairs.push(`Merged and removed ${removed} duplicate player(s) (ranks combined)`);
  }
  repairs.push(`Normalised schema for all ${after} players (rank keys, region, head URL)`);
  repairs.push(`Sorted ${after} players alphabetically by name`);
  try {
    atomicWriteJson("players.json", merged);
  } catch (e) {
    throw new Error(`REPAIR_ERROR: Failed to write repaired file — ${e}`);
  }
  return {
    success: true,
    repairs,
    playerCount: after,
    removedDuplicates: before - after,
    backupFile: backupSaved ? `data/backups/${backupFile}` : null
  };
});
const CREDS_PATH = resolve(process.cwd(), "credentials.yml");
function readCredsFile() {
  try {
    const raw = readFileSync(CREDS_PATH, "utf8");
    const parsed = load(raw);
    return {
      users: Array.isArray(parsed?.users) ? parsed.users : []
    };
  } catch {
    return {
      users: []
    };
  }
}
function writeCredsFile(data) {
  writeFileSync(CREDS_PATH, dump(data, {
    indent: 2,
    lineWidth: -1,
    noRefs: true
  }), "utf8");
}
const RANK_TIER_ORDER = ["HT5", "LT5", "HT4", "LT4", "HT3", "LT3", "HT2", "LT2", "HT1", "LT1"];
function getBestRank(ranks) {
  if (!ranks) return null;
  for (const t of RANK_TIER_ORDER) {
    if (Object.values(ranks).some((v) => v === t)) return t;
  }
  return null;
}
const savePlayersToTS_createServerFn_handler = createServerRpc({
  id: "eaab76e48da73d8b0c5ebbb20f376cd470bb167cbb8de5b659281ea664f3f0ee",
  name: "savePlayersToTS",
  filename: "src/server/dataFiles.ts"
}, (opts) => savePlayersToTS.__executeServer(opts));
const savePlayersToTS = createServerFn({
  method: "POST"
}).handler(savePlayersToTS_createServerFn_handler, async () => {
  const players = readJson("players.json") ?? [];
  const TS_HEADER = `export interface PlayerRanks {
  [key: string]: string | null | undefined
  mace?: string | null
  sword?: string | null
  crystal?: string | null
  uhc?: string | null
  axe?: string | null
  nethpot?: string | null
  diapot?: string | null
}

export const REGIONS = [
  "North America",
  "South America",
  "Europe",
  "Asia",
  "Oceania",
  "Africa",
  "Middle East",
] as const

export type Region = typeof REGIONS[number]

export interface Player {
  name: string
  head: string
  region: Region
  ranks: PlayerRanks
}
`;
  function playerToTS(p) {
    const rankKeys = ["sword", "axe", "uhc", "crystal", "mace", "nethpot", "diapot"];
    const activeRanks = rankKeys.filter((k) => {
      const v = p.ranks?.[k];
      return v && v !== "NONE";
    });
    const ranksStr = activeRanks.length === 0 ? "{}" : `{
${activeRanks.map((k) => `      ${k}: "${p.ranks[k]}",`).join("\n")}
    }`;
    return `  {
    name: "${p.name}",
    head: "${p.head}",
    region: "${p.region}",
    ranks: ${ranksStr},
  }`;
  }
  const body = players.map(playerToTS).join(",\n");
  const content = `${TS_HEADER}
const players: Player[] = [
${body},
]

export default players
`;
  const tsPath = resolve(process.cwd(), "src", "data", "players.ts");
  writeFileSync(tsPath, content, "utf8");
  return {
    ok: true,
    count: players.length
  };
});
const adminLoadUsers_createServerFn_handler = createServerRpc({
  id: "de6707771acf05f33f3f80de52b00b542ba882a03e38764710467ce74988f0e7",
  name: "adminLoadUsers",
  filename: "src/server/dataFiles.ts"
}, (opts) => adminLoadUsers.__executeServer(opts));
const adminLoadUsers = createServerFn({
  method: "GET"
}).handler(adminLoadUsers_createServerFn_handler, async () => {
  const creds = readCredsFile();
  const players = readJson("players.json") ?? [];
  const mining = readJson("mining-users.json") ?? {};
  const map = /* @__PURE__ */ new Map();
  for (const u of creds.users) {
    const key = u.username.toLowerCase();
    map.set(key, {
      key,
      username: u.username,
      hasCred: true,
      hasPlayer: false,
      hasMining: false,
      role: u.role ?? "user",
      uuid: u.uuid ?? null,
      avatar: null,
      region: null,
      ranks: null,
      topRank: null,
      balance: 0,
      gems: 0,
      totalRigs: 0,
      activeRigs: 0,
      joinDate: null,
      lastSeen: null,
      rewardCount: 0,
      credEnabled: u.enabled !== false,
      miningKey: null
    });
  }
  for (const p of players) {
    const key = String(p.name ?? "").toLowerCase();
    if (!key) continue;
    const ex = map.get(key);
    if (ex) {
      ex.hasPlayer = true;
      ex.avatar = p.head ?? null;
      ex.region = p.region ?? null;
      ex.ranks = p.ranks ?? null;
      ex.topRank = getBestRank(p.ranks);
    } else {
      map.set(key, {
        key,
        username: p.name,
        hasCred: false,
        role: null,
        uuid: null,
        hasPlayer: true,
        avatar: p.head ?? null,
        region: p.region ?? null,
        ranks: p.ranks ?? null,
        topRank: getBestRank(p.ranks),
        hasMining: false,
        balance: 0,
        gems: 0,
        totalRigs: 0,
        activeRigs: 0,
        joinDate: null,
        lastSeen: null,
        rewardCount: 0,
        credEnabled: null,
        miningKey: null
      });
    }
  }
  for (const [mKey, u] of Object.entries(mining)) {
    if (!mKey) continue;
    const rigs = Array.isArray(u.rigs) ? u.rigs : [];
    const ex = map.get(mKey);
    const miningFields = {
      hasMining: true,
      miningKey: mKey,
      balance: typeof u.balance === "number" ? u.balance : 0,
      gems: typeof u.gems === "number" ? u.gems : 0,
      totalRigs: rigs.length,
      activeRigs: rigs.filter((r) => r.status === "mining").length,
      joinDate: typeof u.createdAt === "number" ? u.createdAt : null,
      lastSeen: typeof u.lastCheckedAt === "number" ? u.lastCheckedAt : null,
      rewardCount: Array.isArray(u.rewardHistory) ? u.rewardHistory.length : 0
    };
    if (ex) {
      Object.assign(ex, miningFields);
    } else {
      map.set(mKey, {
        key: mKey,
        username: u.username ?? mKey,
        hasCred: false,
        role: null,
        uuid: null,
        hasPlayer: false,
        avatar: null,
        region: null,
        ranks: null,
        topRank: null,
        credEnabled: null,
        ...miningFields
      });
    }
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
});
const adminCreateUser_createServerFn_handler = createServerRpc({
  id: "c58b9d75bcc21687bdb01aa8732acbf31ba9ba509383e0b562d75dd5664ce9f3",
  name: "adminCreateUser",
  filename: "src/server/dataFiles.ts"
}, (opts) => adminCreateUser.__executeServer(opts));
const adminCreateUser = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string().min(1).max(32),
  password: z.string().min(1),
  role: z.string().default("user"),
  addCred: z.boolean(),
  addPlayer: z.boolean(),
  addMining: z.boolean(),
  region: z.string().optional(),
  startingBC: z.number().min(0).optional(),
  startingGems: z.number().min(0).optional()
})).handler(adminCreateUser_createServerFn_handler, async ({
  data
}) => {
  const key = data.username.toLowerCase();
  const creds = readCredsFile();
  const players = readJson("players.json") ?? [];
  const mining = readJson("mining-users.json") ?? {};
  const conflicts = [];
  if (data.addCred && creds.users.some((u) => u.username.toLowerCase() === key)) conflicts.push("credentials");
  if (data.addPlayer && players.some((p) => String(p.name ?? "").toLowerCase() === key)) conflicts.push("player profiles");
  if (data.addMining && mining[key]) conflicts.push("mining accounts");
  if (conflicts.length > 0) throw new Error(`DUPLICATE: "${data.username}" already exists in: ${conflicts.join(", ")}`);
  const {
    randomUUID
  } = await import("node:crypto");
  const uuid = randomUUID();
  if (data.addCred) {
    creds.users.push({
      username: data.username,
      password: data.password,
      role: data.role,
      uuid
    });
    writeCredsFile(creds);
  }
  if (data.addPlayer) {
    players.push({
      name: data.username,
      head: `https://mc-heads.net/avatar/${encodeURIComponent(data.username)}`,
      region: data.region ?? "North America",
      ranks: {
        mace: "NONE",
        sword: "NONE",
        axe: "NONE",
        uhc: "NONE",
        nethpot: "NONE",
        diapot: "NONE",
        crystal: "NONE"
      }
    });
    atomicWriteJson("players.json", deduplicateAndSort(players.map(normalizePlayer)));
  }
  if (data.addMining) {
    const now = Date.now();
    mining[key] = {
      username: data.username,
      createdAt: now,
      lastCheckedAt: now,
      balance: data.startingBC ?? 0,
      gems: data.startingGems ?? 0,
      rigs: [],
      rewardHistory: [],
      exchangeUsedToday: 0,
      exchangeResetAt: now
    };
    atomicWriteJson("mining-users.json", mining);
  }
  return {
    success: true,
    uuid
  };
});
const adminUpdateUserPlayer_createServerFn_handler = createServerRpc({
  id: "6d81718f1d6afbe57ef5e2a5807d8f527818d2b133218776c76788af33e21e3a",
  name: "adminUpdateUserPlayer",
  filename: "src/server/dataFiles.ts"
}, (opts) => adminUpdateUserPlayer.__executeServer(opts));
const adminUpdateUserPlayer = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  region: z.string().optional(),
  head: z.string().optional(),
  ranks: z.record(z.string(), z.string()).optional(),
  create: z.boolean().optional()
})).handler(adminUpdateUserPlayer_createServerFn_handler, async ({
  data
}) => {
  const key = data.username.toLowerCase();
  const players = readJson("players.json") ?? [];
  const idx = players.findIndex((p) => String(p.name ?? "").toLowerCase() === key);
  let created = false;
  if (idx === -1) {
    if (!data.create) throw new Error(`Player profile not found for "${data.username}"`);
    players.push({
      name: data.username,
      head: data.head ?? `https://mc-heads.net/avatar/${encodeURIComponent(data.username)}`,
      region: data.region ?? "North America",
      ranks: data.ranks ?? {
        mace: "NONE",
        sword: "NONE",
        axe: "NONE",
        uhc: "NONE",
        nethpot: "NONE",
        diapot: "NONE",
        crystal: "NONE"
      }
    });
    created = true;
  } else {
    if (data.region !== void 0) players[idx].region = data.region;
    if (data.head !== void 0) players[idx].head = data.head;
    if (data.ranks !== void 0) players[idx].ranks = {
      ...players[idx].ranks,
      ...data.ranks
    };
  }
  atomicWriteJson("players.json", deduplicateAndSort(players.map(normalizePlayer)));
  return {
    success: true,
    created
  };
});
const adminUpdateUserCred_createServerFn_handler = createServerRpc({
  id: "1e2c7ac3337193608c8b38cf66939454d885804b0cc0371e0dbe7f26e4c25c3d",
  name: "adminUpdateUserCred",
  filename: "src/server/dataFiles.ts"
}, (opts) => adminUpdateUserCred.__executeServer(opts));
const adminUpdateUserCred = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  newPassword: z.string().min(1).optional(),
  role: z.string().optional(),
  enabled: z.boolean().optional()
})).handler(adminUpdateUserCred_createServerFn_handler, async ({
  data
}) => {
  const key = data.username.toLowerCase();
  const creds = readCredsFile();
  const idx = creds.users.findIndex((u) => u.username.toLowerCase() === key);
  if (idx === -1) throw new Error(`Credential account not found for "${data.username}"`);
  if (data.newPassword !== void 0) creds.users[idx].password = data.newPassword;
  if (data.role !== void 0) creds.users[idx].role = data.role;
  if (data.enabled !== void 0) creds.users[idx].enabled = data.enabled;
  writeCredsFile(creds);
  return {
    success: true
  };
});
const adminUpdateUserMining_createServerFn_handler = createServerRpc({
  id: "9a7797558969ec6ab39b9a0a106453ff24fd40e5d8dfb39d46da89655e270655",
  name: "adminUpdateUserMining",
  filename: "src/server/dataFiles.ts"
}, (opts) => adminUpdateUserMining.__executeServer(opts));
const adminUpdateUserMining = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  balance: z.number().min(0).optional(),
  gems: z.number().min(0).optional(),
  create: z.boolean().optional(),
  startingBC: z.number().min(0).optional(),
  startingGems: z.number().min(0).optional()
})).handler(adminUpdateUserMining_createServerFn_handler, async ({
  data
}) => {
  const key = data.username.toLowerCase();
  const mining = readJson("mining-users.json") ?? {};
  let created = false;
  if (!mining[key]) {
    if (!data.create) throw new Error(`Mining account not found for "${data.username}"`);
    const now = Date.now();
    mining[key] = {
      username: data.username,
      createdAt: now,
      lastCheckedAt: now,
      balance: data.startingBC ?? 0,
      gems: data.startingGems ?? 0,
      rigs: [],
      rewardHistory: [],
      exchangeUsedToday: 0,
      exchangeResetAt: now
    };
    created = true;
  } else {
    if (data.balance !== void 0) mining[key].balance = data.balance;
    if (data.gems !== void 0) mining[key].gems = data.gems;
  }
  atomicWriteJson("mining-users.json", mining);
  return {
    success: true,
    created
  };
});
const adminCreateMiningForPlayer_createServerFn_handler = createServerRpc({
  id: "a3482b5d0e0b8bbb058a12f6893630a221cea2ebe0c186f48ef2b6917f1280fd",
  name: "adminCreateMiningForPlayer",
  filename: "src/server/dataFiles.ts"
}, (opts) => adminCreateMiningForPlayer.__executeServer(opts));
const adminCreateMiningForPlayer = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  playerName: z.string().min(1),
  // existing name in players.json — becomes the mining/login username
  password: z.string().min(1),
  startingBC: z.number().min(0).optional(),
  startingGems: z.number().min(0).optional()
})).handler(adminCreateMiningForPlayer_createServerFn_handler, async ({
  data
}) => {
  const key = data.playerName.toLowerCase();
  const players = readJson("players.json") ?? [];
  const mining = readJson("mining-users.json") ?? {};
  const creds = readCredsFile();
  if (!players.some((p) => String(p.name ?? "").toLowerCase() === key)) {
    throw new Error(`Player "${data.playerName}" not found in the tier list`);
  }
  if (mining[key]) throw new Error(`DUPLICATE: Mining account for "${data.playerName}" already exists`);
  if (creds.users.some((u) => u.username.toLowerCase() === key)) {
    throw new Error(`DUPLICATE: Login account for "${data.playerName}" already exists`);
  }
  const {
    randomUUID
  } = await import("node:crypto");
  const uuid = randomUUID();
  const now = Date.now();
  creds.users.push({
    username: data.playerName,
    password: data.password,
    role: "user",
    uuid
  });
  writeCredsFile(creds);
  mining[key] = {
    username: data.playerName,
    createdAt: now,
    lastCheckedAt: now,
    balance: data.startingBC ?? 0,
    gems: data.startingGems ?? 0,
    rigs: [],
    rewardHistory: [],
    exchangeUsedToday: 0,
    exchangeResetAt: now
  };
  atomicWriteJson("mining-users.json", mining);
  return {
    success: true,
    uuid
  };
});
const adminRenameMiningUser_createServerFn_handler = createServerRpc({
  id: "36c54b2f321d22e3b47f5348ed255687dce04bd1f85a6b0eefe85e5c44a93110",
  name: "adminRenameMiningUser",
  filename: "src/server/dataFiles.ts"
}, (opts) => adminRenameMiningUser.__executeServer(opts));
const adminRenameMiningUser = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  currentUsername: z.string().min(1),
  newUsername: z.string().min(1).max(32)
})).handler(adminRenameMiningUser_createServerFn_handler, async ({
  data
}) => {
  const oldKey = data.currentUsername.toLowerCase();
  const newKey = data.newUsername.toLowerCase();
  if (oldKey === newKey) return {
    success: true,
    renamedPlayer: false,
    renamedCred: false
  };
  const mining = readJson("mining-users.json") ?? {};
  const creds = readCredsFile();
  const players = readJson("players.json") ?? [];
  if (!mining[oldKey]) throw new Error(`Mining account "${data.currentUsername}" not found`);
  if (mining[newKey]) throw new Error(`DUPLICATE: Mining account "${data.newUsername}" already exists`);
  if (creds.users.some((u) => u.username.toLowerCase() === newKey)) {
    throw new Error(`DUPLICATE: Login account "${data.newUsername}" already exists`);
  }
  if (players.some((p) => String(p.name ?? "").toLowerCase() === newKey)) {
    throw new Error(`DUPLICATE: Player profile "${data.newUsername}" already exists`);
  }
  mining[newKey] = {
    ...mining[oldKey],
    username: data.newUsername
  };
  delete mining[oldKey];
  atomicWriteJson("mining-users.json", mining);
  let renamedCred = false;
  const credIdx = creds.users.findIndex((u) => u.username.toLowerCase() === oldKey);
  if (credIdx !== -1) {
    creds.users[credIdx].username = data.newUsername;
    writeCredsFile(creds);
    renamedCred = true;
  }
  let renamedPlayer = false;
  const playerIdx = players.findIndex((p) => String(p.name ?? "").toLowerCase() === oldKey);
  if (playerIdx !== -1) {
    players[playerIdx] = normalizePlayer({
      ...players[playerIdx],
      name: data.newUsername
    });
    atomicWriteJson("players.json", deduplicateAndSort(players.map(normalizePlayer)));
    renamedPlayer = true;
  }
  return {
    success: true,
    renamedPlayer,
    renamedCred
  };
});
const adminDeleteUser_createServerFn_handler = createServerRpc({
  id: "8b1f9c1b45467a38c696fe005b4d5b65163dc553d2104f6804f0494aa848fdbf",
  name: "adminDeleteUser",
  filename: "src/server/dataFiles.ts"
}, (opts) => adminDeleteUser.__executeServer(opts));
const adminDeleteUser = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  deleteCred: z.boolean(),
  deletePlayer: z.boolean(),
  deleteMining: z.boolean()
})).handler(adminDeleteUser_createServerFn_handler, async ({
  data
}) => {
  const key = data.username.toLowerCase();
  const removed = [];
  if (data.deleteCred) {
    const creds = readCredsFile();
    const before = creds.users.length;
    creds.users = creds.users.filter((u) => u.username.toLowerCase() !== key);
    if (creds.users.length < before) {
      writeCredsFile(creds);
      removed.push("login account");
    }
  }
  if (data.deletePlayer) {
    let players = readJson("players.json") ?? [];
    const before = players.length;
    players = players.filter((p) => String(p.name ?? "").toLowerCase() !== key);
    if (players.length < before) {
      atomicWriteJson("players.json", deduplicateAndSort(players.map(normalizePlayer)));
      removed.push("player profile");
    }
  }
  if (data.deleteMining) {
    const mining = readJson("mining-users.json") ?? {};
    if (mining[key]) {
      delete mining[key];
      atomicWriteJson("mining-users.json", mining);
      removed.push("mining account");
    }
  }
  return {
    success: true,
    removed
  };
});
const adminBulkDeleteUsers_createServerFn_handler = createServerRpc({
  id: "fd27b53ba645f057b63ba6c3fc845d86f9fc2e67ee93bfe4e2467486c46afc01",
  name: "adminBulkDeleteUsers",
  filename: "src/server/dataFiles.ts"
}, (opts) => adminBulkDeleteUsers.__executeServer(opts));
const adminBulkDeleteUsers = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  usernames: z.array(z.string()),
  deleteCred: z.boolean(),
  deletePlayer: z.boolean(),
  deleteMining: z.boolean()
})).handler(adminBulkDeleteUsers_createServerFn_handler, async ({
  data
}) => {
  const keys = new Set(data.usernames.map((u) => u.toLowerCase()));
  if (data.deleteCred) {
    const creds = readCredsFile();
    creds.users = creds.users.filter((u) => !keys.has(u.username.toLowerCase()));
    writeCredsFile(creds);
  }
  if (data.deletePlayer) {
    let players = readJson("players.json") ?? [];
    players = players.filter((p) => !keys.has(String(p.name ?? "").toLowerCase()));
    atomicWriteJson("players.json", deduplicateAndSort(players.map(normalizePlayer)));
  }
  if (data.deleteMining) {
    const mining = readJson("mining-users.json") ?? {};
    for (const key of keys) delete mining[key];
    atomicWriteJson("mining-users.json", mining);
  }
  return {
    success: true,
    count: data.usernames.length
  };
});
const getBackupStatusFn_createServerFn_handler = createServerRpc({
  id: "8a8b336fe65eb1a2e8629b73f2badc985dd6ab823a0e411b3e9c3d6120c51a0f",
  name: "getBackupStatusFn",
  filename: "src/server/dataFiles.ts"
}, (opts) => getBackupStatusFn.__executeServer(opts));
const getBackupStatusFn = createServerFn({
  method: "GET"
}).handler(getBackupStatusFn_createServerFn_handler, async () => {
  return getBackupStatus();
});
const setAutoBackupEnabled_createServerFn_handler = createServerRpc({
  id: "ea6082cc957e00016cbedcb2b7376e9e76f2cdc47857ea2b79a07a6f695a1a9e",
  name: "setAutoBackupEnabled",
  filename: "src/server/dataFiles.ts"
}, (opts) => setAutoBackupEnabled.__executeServer(opts));
const setAutoBackupEnabled = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  enabled: z.boolean()
})).handler(setAutoBackupEnabled_createServerFn_handler, async ({
  data
}) => {
  setBackupEnabled(data.enabled);
  return getBackupStatus();
});
const setBackupDebounce_createServerFn_handler = createServerRpc({
  id: "2deb2e018fcfe19b7588e8378bbb22d97eeae36e030c9b7892bfd951502a31a3",
  name: "setBackupDebounce",
  filename: "src/server/dataFiles.ts"
}, (opts) => setBackupDebounce.__executeServer(opts));
const setBackupDebounce = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  ms: z.number().int().min(5e3).max(18e5)
})).handler(setBackupDebounce_createServerFn_handler, async ({
  data
}) => {
  setDebounceMs(data.ms);
  return getBackupStatus();
});
const triggerBackupNow_createServerFn_handler = createServerRpc({
  id: "2e5a86306780c713e09960b6674d29e921669e575d347e82484fd839a21fa174",
  name: "triggerBackupNow",
  filename: "src/server/dataFiles.ts"
}, (opts) => triggerBackupNow.__executeServer(opts));
const triggerBackupNow = createServerFn({
  method: "POST"
}).handler(triggerBackupNow_createServerFn_handler, async () => {
  const before = getBackupStatus();
  await flushBackupNow();
  const status = getBackupStatus();
  if (status.lastBackupError) {
    return {
      ok: false,
      message: `Backup failed: ${status.lastBackupError}`,
      status
    };
  }
  if (status.totalBackups > before.totalBackups) {
    return {
      ok: true,
      message: status.lastBackupMessage ?? "Backup committed",
      status
    };
  }
  return {
    ok: true,
    message: "No changes — data unchanged since last commit",
    status
  };
});
export {
  addSyncHistoryEntry_createServerFn_handler,
  adminBulkDeleteUsers_createServerFn_handler,
  adminCreateMiningForPlayer_createServerFn_handler,
  adminCreateUser_createServerFn_handler,
  adminDeleteUser_createServerFn_handler,
  adminLoadUsers_createServerFn_handler,
  adminRenameMiningUser_createServerFn_handler,
  adminUpdateUserCred_createServerFn_handler,
  adminUpdateUserMining_createServerFn_handler,
  adminUpdateUserPlayer_createServerFn_handler,
  backupMiningData_createServerFn_handler,
  checkGitHubConnection_createServerFn_handler,
  clearGitHubToken_createServerFn_handler,
  compareLocalToRemote_createServerFn_handler,
  fetchCommitHistory_createServerFn_handler,
  fetchRepoStatus_createServerFn_handler,
  fetchSyncHistory_createServerFn_handler,
  fixGitDivergence_createServerFn_handler,
  flushStoresToDisk_createServerFn_handler,
  getBackupStatusFn_createServerFn_handler,
  getGitDiagnostics_createServerFn_handler,
  getTokenInfo_createServerFn_handler,
  loadAllData_createServerFn_handler,
  previewRepairPlayers_createServerFn_handler,
  pullRemoteFiles_createServerFn_handler,
  repairPlayers_createServerFn_handler,
  restoreToCommit_createServerFn_handler,
  saveGitHubToken_createServerFn_handler,
  savePlayersToTS_createServerFn_handler,
  setAutoBackupEnabled_createServerFn_handler,
  setBackupDebounce_createServerFn_handler,
  testGitHubToken_createServerFn_handler,
  triggerBackupNow_createServerFn_handler,
  validateAllData_createServerFn_handler
};
