import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { resolveGitHubToken } from "./tokenStore-Dpx2yaa_.js";
import { readRepoConfig } from "./repoConfigUtil-DmRyhrlE.js";
import { c as createServerFn } from "../server.js";
import "node:fs";
import "node:path";
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
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: buildHeaders()
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    throw new Error(`GitHub API ${res.status} on ${path}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}
async function ghFetchRaw(path) {
  return fetch(`${BASE}${path}`, {
    headers: buildHeaders()
  });
}
const getRepoInfo_createServerFn_handler = createServerRpc({
  id: "c6db069f27f7f8f7aa788b0f630ee3e9cdc9b10047ec1783d1514b41bdd96316",
  name: "getRepoInfo",
  filename: "src/server/repoHistory.ts"
}, (opts) => getRepoInfo.__executeServer(opts));
const getRepoInfo = createServerFn({
  method: "GET"
}).handler(getRepoInfo_createServerFn_handler, async () => {
  const token = resolveGitHubToken();
  const {
    owner,
    repo,
    branch
  } = readRepoConfig();
  const base = {
    owner,
    repo,
    branch,
    remoteUrl: `https://github.com/${owner}/${repo}`
  };
  if (!token) {
    return {
      ...base,
      commitCount: 0,
      headSha: "",
      headShort: "",
      lastMessage: "",
      lastDate: "",
      lastAuthor: "",
      treeSha: "",
      authAvailable: false,
      repoAccessible: false
    };
  }
  try {
    const headData = await ghFetch(`/repos/${owner}/${repo}/commits/${branch}`);
    const headSha = headData.sha;
    const treeSha = headData.commit.tree.sha;
    const countRes = await ghFetchRaw(`/repos/${owner}/${repo}/commits?sha=${branch}&per_page=1`);
    let commitCount = 1;
    if (countRes.ok) {
      const link = countRes.headers.get("Link") || "";
      const m = link.match(/[?&]page=(\d+)>; rel="last"/);
      if (m) commitCount = parseInt(m[1], 10);
    }
    const repoData = await ghFetch(`/repos/${owner}/${repo}`);
    return {
      owner,
      repo,
      branch,
      remoteUrl: repoData.html_url ?? `https://github.com/${owner}/${repo}`,
      commitCount,
      headSha,
      headShort: headSha.slice(0, 7),
      lastMessage: headData.commit.message.split("\n")[0],
      lastDate: headData.commit.author.date,
      lastAuthor: headData.commit.author.name,
      treeSha,
      authAvailable: true,
      repoAccessible: true
    };
  } catch (e) {
    return {
      ...base,
      commitCount: 0,
      headSha: "",
      headShort: "",
      lastMessage: "",
      lastDate: "",
      lastAuthor: "",
      treeSha: "",
      authAvailable: true,
      repoAccessible: false,
      errorMessage: e.message
    };
  }
});
const createBackupBranch_createServerFn_handler = createServerRpc({
  id: "e55b1235fdf46314858d060881339fac7151dce5d684eb9dbf8f96d7646daaab",
  name: "createBackupBranch",
  filename: "src/server/repoHistory.ts"
}, (opts) => createBackupBranch.__executeServer(opts));
const createBackupBranch = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(createBackupBranch_createServerFn_handler, async ({
  data
}) => {
  const {
    owner,
    repo,
    branch
  } = readRepoConfig();
  const branchName = `backup-history-${data.timestamp}`;
  try {
    const ref = await ghFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`);
    const sha = ref.object.sha;
    await ghFetch(`/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha
      })
    });
    return {
      success: true,
      branchName,
      sha: sha.slice(0, 7)
    };
  } catch (e) {
    return {
      success: false,
      branchName,
      sha: "",
      error: e.message
    };
  }
});
const performHistoryReset_createServerFn_handler = createServerRpc({
  id: "33c01341ce43cf38613dc6607b963376084f7df1160b49db15f8398db1d1b1d5",
  name: "performHistoryReset",
  filename: "src/server/repoHistory.ts"
}, (opts) => performHistoryReset.__executeServer(opts));
const performHistoryReset = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(performHistoryReset_createServerFn_handler, async ({
  data
}) => {
  const steps = [];
  const {
    owner,
    repo,
    branch
  } = readRepoConfig();
  try {
    const ref = await ghFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`);
    const currentSha = ref.object.sha;
    steps.push({
      id: "verify",
      label: "Repository state verified",
      status: "ok",
      detail: `HEAD: ${currentSha.slice(0, 7)}`
    });
    const headCommit = await ghFetch(`/repos/${owner}/${repo}/git/commits/${currentSha}`);
    const treeSha = headCommit.tree.sha;
    steps.push({
      id: "tree",
      label: "Current file tree captured",
      status: "ok",
      detail: `Tree: ${treeSha.slice(0, 7)}`
    });
    const newCommit = await ghFetch(`/repos/${owner}/${repo}/git/commits`, {
      method: "POST",
      body: JSON.stringify({
        message: data.commitMessage,
        tree: treeSha,
        parents: []
      })
    });
    const newSha = newCommit.sha;
    steps.push({
      id: "commit",
      label: "New initial commit created",
      status: "ok",
      detail: `SHA: ${newSha.slice(0, 7)}`
    });
    await ghFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: "PATCH",
      body: JSON.stringify({
        sha: newSha,
        force: true
      })
    });
    steps.push({
      id: "push",
      label: `Force pushed to ${branch}`,
      status: "ok",
      detail: `${currentSha.slice(0, 7)} → ${newSha.slice(0, 7)}`
    });
    const verifyRef = await ghFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`);
    const verifiedSha = verifyRef.object.sha;
    if (verifiedSha !== newSha) throw new Error(`Verification mismatch: expected ${newSha.slice(0, 7)}, got ${verifiedSha.slice(0, 7)}`);
    steps.push({
      id: "verify2",
      label: "Synchronization verified",
      status: "ok",
      detail: `Remote HEAD: ${verifiedSha.slice(0, 7)}`
    });
    return {
      success: true,
      steps,
      oldCommitCount: data.oldCommitCount,
      newCommitSha: newSha,
      newCommitShort: newSha.slice(0, 7),
      branch,
      backupBranch: data.backupBranchName
    };
  } catch (e) {
    steps.push({
      id: "error",
      label: "Operation failed",
      status: "error",
      detail: e.message
    });
    return {
      success: false,
      steps,
      oldCommitCount: data.oldCommitCount,
      newCommitSha: "",
      newCommitShort: "",
      branch,
      error: e.message
    };
  }
});
export {
  createBackupBranch_createServerFn_handler,
  getRepoInfo_createServerFn_handler,
  performHistoryReset_createServerFn_handler
};
