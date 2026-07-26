import { resolveGitHubToken } from "./tokenStore-Dpx2yaa_.js";
import { readRepoConfig } from "./repoConfigUtil-DmRyhrlE.js";
import "node:fs";
import "node:path";
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
  const { owner, repo, branch } = readRepoConfig();
  const ref = await ghFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`);
  const headSha = ref.object.sha;
  const headCommit = await ghFetch(`/repos/${owner}/${repo}/git/commits/${headSha}`);
  const baseTreeSha = headCommit.tree.sha;
  const blobs = await Promise.all(
    files.map(
      (f) => ghFetch(`/repos/${owner}/${repo}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content: f.content, encoding: "utf-8" })
      })
    )
  );
  const newTree = await ghFetch(`/repos/${owner}/${repo}/git/trees`, {
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
  const newCommit = await ghFetch(`/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: newTree.sha, parents: [headSha] })
  });
  await ghFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommit.sha })
  });
  return { sha: newCommit.sha };
}
async function getRepoStatus() {
  const { owner, repo, branch } = readRepoConfig();
  try {
    const data = await ghFetch(`/repos/${owner}/${repo}/commits/${branch}`);
    return {
      connected: true,
      branch,
      owner,
      repo,
      latestCommit: {
        message: data.commit.message,
        sha: data.sha.slice(0, 7),
        date: data.commit.author.date
      }
    };
  } catch {
    return { connected: false, branch, owner, repo, latestCommit: null };
  }
}
export {
  commitFiles,
  getRepoStatus
};
