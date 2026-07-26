import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { z } from "zod";
import { c as createServerFn } from "../server.js";
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
const getRepoConfig_createServerFn_handler = createServerRpc({
  id: "366933ed2bfec58fd843c43f9104a5c104f9c27f0070e31c5ac7d87afe0d782c",
  name: "getRepoConfig",
  filename: "src/server/repoConfig.ts"
}, (opts) => getRepoConfig.__executeServer(opts));
const getRepoConfig = createServerFn({
  method: "GET"
}).handler(getRepoConfig_createServerFn_handler, async () => {
  const {
    readRepoConfig
  } = await import("./repoConfigUtil-DmRyhrlE.js");
  return readRepoConfig();
});
const saveRepoConfig_createServerFn_handler = createServerRpc({
  id: "28720afcbb2c4be11836629e64818bc128d67e54b523e5ee61191e032f500666",
  name: "saveRepoConfig",
  filename: "src/server/repoConfig.ts"
}, (opts) => saveRepoConfig.__executeServer(opts));
const saveRepoConfig = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().min(1)
})).handler(saveRepoConfig_createServerFn_handler, async ({
  data
}) => {
  const {
    writeRepoConfig
  } = await import("./repoConfigUtil-DmRyhrlE.js");
  const config = {
    owner: data.owner.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, ""),
    repo: data.repo.trim().replace(/\.git$/, ""),
    branch: data.branch.trim()
  };
  writeRepoConfig(config);
  return {
    success: true,
    config
  };
});
const testRepoConnection_createServerFn_handler = createServerRpc({
  id: "db13c0cfa65d6dcf68bb0aa93d8088812b2f6365487355669cbdf1b29070882c",
  name: "testRepoConnection",
  filename: "src/server/repoConfig.ts"
}, (opts) => testRepoConnection.__executeServer(opts));
const testRepoConnection = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().min(1)
})).handler(testRepoConnection_createServerFn_handler, async ({
  data
}) => {
  const {
    resolveTokenSource
  } = await import("./tokenStore-Dpx2yaa_.js");
  const token = resolveTokenSource()?.token;
  const out = {
    repoExists: false,
    branchExists: false,
    writePermission: false,
    repoFullName: null,
    defaultBranch: null,
    error: null
  };
  if (!token) {
    out.error = "No GitHub token configured";
    return out;
  }
  const BASE = "https://api.github.com";
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  try {
    const repoRes = await fetch(`${BASE}/repos/${data.owner}/${data.repo}`, {
      headers
    });
    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        out.error = `Repository ${data.owner}/${data.repo} not found or you don't have access`;
      } else if (repoRes.status === 401 || repoRes.status === 403) {
        out.error = `Authentication failed (HTTP ${repoRes.status}) — check your token`;
      } else {
        out.error = `GitHub API error: HTTP ${repoRes.status}`;
      }
      return out;
    }
    out.repoExists = true;
    const repoData = await repoRes.json();
    out.repoFullName = repoData.full_name;
    out.defaultBranch = repoData.default_branch;
    out.writePermission = repoData.permissions?.push ?? false;
    const branchRes = await fetch(`${BASE}/repos/${data.owner}/${data.repo}/git/refs/heads/${data.branch}`, {
      headers
    });
    out.branchExists = branchRes.ok;
    if (!branchRes.ok) {
      out.error = `Branch '${data.branch}' not found — repo default branch is '${repoData.default_branch}'`;
    }
  } catch (e) {
    out.error = e instanceof Error ? e.message : "Network error";
  }
  return out;
});
export {
  getRepoConfig_createServerFn_handler,
  saveRepoConfig_createServerFn_handler,
  testRepoConnection_createServerFn_handler
};
