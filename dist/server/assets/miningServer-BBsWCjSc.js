import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { z } from "zod";
import { readFileSync, mkdirSync, writeFileSync, renameSync } from "fs";
import { resolve } from "path";
import { load } from "js-yaml";
import { n as normalizeUser, c as catchUpUser, b as buyRig, R as RIG_TIERS, M as MINING_CONSTANTS } from "./miningStore-vSM2TBEv.js";
import { a as broadcastMiningUpdate } from "./sseRegistry-CCzaVd18.js";
import { d as scheduleBackup } from "./miningBackup-BQ-7nMGz.js";
import { c as createServerFn } from "../server.js";
import "./syncStore-C_ozCmAO.js";
import "react";
import "node:fs";
import "node:path";
import "node:crypto";
import "node:child_process";
import "./tokenStore-BIPGdV9D.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
const DATA_DIR = resolve("data");
function readJson(file) {
  try {
    return JSON.parse(readFileSync(resolve(DATA_DIR, file), "utf8"));
  } catch {
    return null;
  }
}
function atomicWrite(file, data) {
  mkdirSync(DATA_DIR, {
    recursive: true
  });
  const content = JSON.stringify(data, null, 2);
  const target = resolve(DATA_DIR, file);
  const tmp = `${target}.tmp`;
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, target);
}
function loadMiningUsers() {
  return readJson("mining-users.json") ?? {};
}
function loadCredentialedUsernames() {
  try {
    const raw = readFileSync(resolve(process.cwd(), "credentials.yml"), "utf8");
    const parsed = load(raw);
    return new Set((parsed?.users ?? []).map((u) => u.username.toLowerCase()));
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function loadCommunityState() {
  const saved = readJson("mining-community.json");
  if (saved) return saved;
  const initial = {
    blockNumber: 1,
    startedAt: Date.now(),
    lastSolvedAt: Date.now() - MINING_CONSTANTS.BLOCK_INTERVAL_MS,
    totalSolved: 0
  };
  atomicWrite("mining-community.json", initial);
  return initial;
}
const getServerNow_createServerFn_handler = createServerRpc({
  id: "9c403a0b1baaa9eb01522526a02467b0bbe7366ce94755351c706515263f9ab1",
  name: "getServerNow",
  filename: "src/server/miningServer.ts"
}, (opts) => getServerNow.__executeServer(opts));
const getServerNow = createServerFn({
  method: "GET"
}).handler(getServerNow_createServerFn_handler, () => ({
  now: Date.now()
}));
const serverCatchUp_createServerFn_handler = createServerRpc({
  id: "ccdb6274a919b4e64faac8870a35fdd9f2379e43902fbc073e763702f8e0edb1",
  name: "serverCatchUp",
  filename: "src/server/miningServer.ts"
}, (opts) => serverCatchUp.__executeServer(opts));
const serverCatchUp = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  seedUser: z.any().optional()
})).handler(serverCatchUp_createServerFn_handler, async ({
  data
}) => {
  const serverNow = Date.now();
  const key = data.username.toLowerCase();
  const users = loadMiningUsers();
  const community = loadCommunityState();
  const economy = readJson("economy.json") ?? {};
  const rawUser = users[key] ?? data.seedUser ?? null;
  if (!rawUser) return {
    user: null,
    community,
    serverNow
  };
  const stored = normalizeUser({
    ...rawUser
  }, serverNow);
  const {
    user: updatedUser,
    community: updatedCommunity
  } = catchUpUser(stored, serverNow, {
    community,
    overrides: economy
  });
  users[key] = updatedUser;
  atomicWrite("mining-users.json", users);
  atomicWrite("mining-community.json", updatedCommunity);
  broadcastMiningUpdate();
  scheduleBackup();
  return {
    user: updatedUser,
    community: updatedCommunity,
    serverNow
  };
});
const saveMiningUser_createServerFn_handler = createServerRpc({
  id: "8de7a5ffa64cbe7de66496bd09cd405c8c5bbd016fc0db22792f19363f0ae2c2",
  name: "saveMiningUser",
  filename: "src/server/miningServer.ts"
}, (opts) => saveMiningUser.__executeServer(opts));
const saveMiningUser = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  user: z.any()
})).handler(saveMiningUser_createServerFn_handler, async ({
  data
}) => {
  const user = normalizeUser({
    ...data.user
  }, Date.now());
  const users = loadMiningUsers();
  users[user.username.toLowerCase()] = user;
  atomicWrite("mining-users.json", users);
  broadcastMiningUpdate();
  scheduleBackup();
  return {
    ok: true
  };
});
const purchaseRigServer_createServerFn_handler = createServerRpc({
  id: "14b07c567f9b8c57ebeb2b5013958353bbec125f63a72006a299b990f8a3e5cc",
  name: "purchaseRigServer",
  filename: "src/server/miningServer.ts"
}, (opts) => purchaseRigServer.__executeServer(opts));
const purchaseRigServer = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  tierId: z.string()
})).handler(purchaseRigServer_createServerFn_handler, async ({
  data
}) => {
  const users = loadMiningUsers();
  const rawUser = users[data.username.toLowerCase()];
  if (!rawUser) return {
    user: null,
    error: "User not found on server."
  };
  const user = normalizeUser({
    ...rawUser
  }, Date.now());
  const result = buyRig(user, data.tierId);
  if (result.error) return {
    user,
    error: result.error
  };
  users[data.username.toLowerCase()] = result.user;
  atomicWrite("mining-users.json", users);
  broadcastMiningUpdate();
  scheduleBackup();
  return {
    user: result.user
  };
});
const getDashboardStats_createServerFn_handler = createServerRpc({
  id: "c20eeae52f63782258860f6bf9cdedb36bd505958dfd8199abe8bbed955e893c",
  name: "getDashboardStats",
  filename: "src/server/miningServer.ts"
}, (opts) => getDashboardStats.__executeServer(opts));
const getDashboardStats = createServerFn({
  method: "GET"
}).handler(getDashboardStats_createServerFn_handler, async () => {
  const users = loadMiningUsers();
  const community = loadCommunityState();
  const economy = readJson("economy.json") ?? {};
  return {
    users,
    community,
    economy
  };
});
const getAllMiningUsers_createServerFn_handler = createServerRpc({
  id: "450e0a26a740dcd825927e9bc6d268f76e8a10fd98c7ba9b681fe818d0b5015b",
  name: "getAllMiningUsers",
  filename: "src/server/miningServer.ts"
}, (opts) => getAllMiningUsers.__executeServer(opts));
const getAllMiningUsers = createServerFn({
  method: "GET"
}).handler(getAllMiningUsers_createServerFn_handler, async () => {
  return loadMiningUsers();
});
const adminUpdateMiningUser_createServerFn_handler = createServerRpc({
  id: "8e3d970b0a3780ca5ee670f87b0ba84cb45748760c3b1b1be58131158580b660",
  name: "adminUpdateMiningUser",
  filename: "src/server/miningServer.ts"
}, (opts) => adminUpdateMiningUser.__executeServer(opts));
const adminUpdateMiningUser = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  user: z.any()
})).handler(adminUpdateMiningUser_createServerFn_handler, async ({
  data
}) => {
  const user = data.user;
  const users = loadMiningUsers();
  users[user.username.toLowerCase()] = user;
  atomicWrite("mining-users.json", users);
  broadcastMiningUpdate();
  scheduleBackup();
  return {
    ok: true
  };
});
const getLeaderboard_createServerFn_handler = createServerRpc({
  id: "7fa8b3cbd5fc8f402a586f9817e3556e666bae0870bfdf16a35ee35117771bb1",
  name: "getLeaderboard",
  filename: "src/server/miningServer.ts"
}, (opts) => getLeaderboard.__executeServer(opts));
const getLeaderboard = createServerFn({
  method: "GET"
}).handler(getLeaderboard_createServerFn_handler, async () => {
  const users = loadMiningUsers();
  const credUsernames = loadCredentialedUsernames();
  const realUsers = Object.values(users).filter((u) => credUsernames.has(u.username.toLowerCase()));
  const entries = realUsers.map((user) => {
    const activeRigs = user.rigs.filter((r) => r.status === "mining");
    const miningPower = activeRigs.reduce((sum, r) => {
      const tier = RIG_TIERS.find((t) => t.id === r.tierId);
      return sum + (tier?.hashrate ?? 0);
    }, 0);
    const blockRewards = user.rewardHistory.reduce((sum, r) => sum + r.amount, 0);
    return {
      rank: 0,
      // filled below
      username: user.username,
      balance: Math.floor(user.balance),
      gems: Math.floor(user.gems ?? 0),
      totalRigs: user.rigs.length,
      activeRigs: activeRigs.length,
      miningPower,
      blockRewards
    };
  });
  entries.sort((a, b) => b.balance - a.balance || b.blockRewards - a.blockRewards);
  entries.forEach((e, i) => {
    e.rank = i + 1;
  });
  return entries.slice(0, 10);
});
const adminDeleteMiningUser_createServerFn_handler = createServerRpc({
  id: "2a08d77084734e5724f0b7c889d954a908a3bb05d5c0b96eecc2c94776f3daa7",
  name: "adminDeleteMiningUser",
  filename: "src/server/miningServer.ts"
}, (opts) => adminDeleteMiningUser.__executeServer(opts));
const adminDeleteMiningUser = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string()
})).handler(adminDeleteMiningUser_createServerFn_handler, async ({
  data
}) => {
  const users = loadMiningUsers();
  delete users[data.username.toLowerCase()];
  atomicWrite("mining-users.json", users);
  broadcastMiningUpdate();
  scheduleBackup();
  return {
    ok: true
  };
});
const renewMiningSession_createServerFn_handler = createServerRpc({
  id: "6628a45ae47f2a27610f23af9286c0955b21bcb8e8625b097bfda5976b23544c",
  name: "renewMiningSession",
  filename: "src/server/miningServer.ts"
}, (opts) => renewMiningSession.__executeServer(opts));
const renewMiningSession = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string()
})).handler(renewMiningSession_createServerFn_handler, async ({
  data
}) => {
  const serverNow = Date.now();
  const key = data.username.toLowerCase();
  const users = loadMiningUsers();
  const community = loadCommunityState();
  const economy = readJson("economy.json") ?? {};
  const rawUser = users[key];
  if (!rawUser) return {
    user: null,
    community,
    serverNow,
    error: "User not found"
  };
  const stored = normalizeUser({
    ...rawUser
  }, serverNow);
  const {
    user: caughtUp,
    community: updatedCommunity
  } = catchUpUser(stored, serverNow, {
    community,
    overrides: economy
  });
  const renewed = {
    ...caughtUp,
    miningExpiresAt: serverNow + MINING_CONSTANTS.RENEWAL_DURATION_MS,
    miningRenewedAt: serverNow
  };
  users[key] = renewed;
  atomicWrite("mining-users.json", users);
  atomicWrite("mining-community.json", updatedCommunity);
  broadcastMiningUpdate();
  scheduleBackup();
  return {
    user: renewed,
    community: updatedCommunity,
    serverNow
  };
});
const adminRenewMining_createServerFn_handler = createServerRpc({
  id: "5fed49ccff1da12a3cf2c454c8f9abb2c8689d155564610245c1506d3223ee3c",
  name: "adminRenewMining",
  filename: "src/server/miningServer.ts"
}, (opts) => adminRenewMining.__executeServer(opts));
const adminRenewMining = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string()
})).handler(adminRenewMining_createServerFn_handler, async ({
  data
}) => {
  const serverNow = Date.now();
  const key = data.username.toLowerCase();
  const users = loadMiningUsers();
  const user = users[key];
  if (!user) return {
    ok: false,
    error: "User not found"
  };
  users[key] = {
    ...user,
    miningExpiresAt: serverNow + MINING_CONSTANTS.RENEWAL_DURATION_MS,
    miningRenewedAt: serverNow
  };
  atomicWrite("mining-users.json", users);
  broadcastMiningUpdate();
  scheduleBackup();
  return {
    ok: true
  };
});
const adminAdjustRenewal_createServerFn_handler = createServerRpc({
  id: "2aaed4fef1df9d23420ad780edcf7203ac4c445653015df9af9b0178f0277ddc",
  name: "adminAdjustRenewal",
  filename: "src/server/miningServer.ts"
}, (opts) => adminAdjustRenewal.__executeServer(opts));
const adminAdjustRenewal = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  deltaMs: z.number()
})).handler(adminAdjustRenewal_createServerFn_handler, async ({
  data
}) => {
  const serverNow = Date.now();
  const key = data.username.toLowerCase();
  const users = loadMiningUsers();
  const user = users[key];
  if (!user) return {
    ok: false,
    error: "User not found"
  };
  const currentExpiry = user.miningExpiresAt ?? serverNow;
  const newExpiry = Math.max(serverNow, currentExpiry + data.deltaMs);
  users[key] = {
    ...user,
    miningExpiresAt: newExpiry
  };
  atomicWrite("mining-users.json", users);
  broadcastMiningUpdate();
  scheduleBackup();
  return {
    ok: true
  };
});
const DEFAULT_ACCESS_CONFIG = {
  buttonLabel: "New player? How to get access",
  sectionTitle: "How to get your mining credentials",
  steps: ["Join the Blue Network Discord using the button below.", "Head to the #mining section of the server.", "Open a request-credential ticket — a staff member will create your account."],
  discordUrl: "https://discord.gg/DmEPAb3NFU",
  discordButtonLabel: "Join Discord to Request Access"
};
const getMiningAccessConfig_createServerFn_handler = createServerRpc({
  id: "b1882853617708282b340efc40fa7c2fcb1a1b9291b064abb9d264fe8108c8e0",
  name: "getMiningAccessConfig",
  filename: "src/server/miningServer.ts"
}, (opts) => getMiningAccessConfig.__executeServer(opts));
const getMiningAccessConfig = createServerFn({
  method: "GET"
}).handler(getMiningAccessConfig_createServerFn_handler, () => {
  return readJson("mining-access.json") ?? DEFAULT_ACCESS_CONFIG;
});
const saveMiningAccessConfig_createServerFn_handler = createServerRpc({
  id: "969c202e4a472980b0f4181e8627c80dac3f0e7c33e0fb14b22edc02324dd4b9",
  name: "saveMiningAccessConfig",
  filename: "src/server/miningServer.ts"
}, (opts) => saveMiningAccessConfig.__executeServer(opts));
const saveMiningAccessConfig = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  buttonLabel: z.string().min(1).max(120),
  sectionTitle: z.string().min(1).max(120),
  steps: z.array(z.string().max(400)).min(1).max(20),
  discordUrl: z.string().max(300),
  discordButtonLabel: z.string().min(1).max(100)
})).handler(saveMiningAccessConfig_createServerFn_handler, ({
  data
}) => {
  atomicWrite("mining-access.json", data);
  scheduleBackup();
  return {
    ok: true
  };
});
const adminResetRenewal_createServerFn_handler = createServerRpc({
  id: "8d5f143a680dcec8b626745cb47685992d8086e2e59ff3b07c97174e40abdbd4",
  name: "adminResetRenewal",
  filename: "src/server/miningServer.ts"
}, (opts) => adminResetRenewal.__executeServer(opts));
const adminResetRenewal = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string()
})).handler(adminResetRenewal_createServerFn_handler, async ({
  data
}) => {
  const key = data.username.toLowerCase();
  const users = loadMiningUsers();
  const user = users[key];
  if (!user) return {
    ok: false,
    error: "User not found"
  };
  users[key] = {
    ...user,
    miningExpiresAt: null,
    miningRenewedAt: null
  };
  atomicWrite("mining-users.json", users);
  broadcastMiningUpdate();
  scheduleBackup();
  return {
    ok: true
  };
});
export {
  adminAdjustRenewal_createServerFn_handler,
  adminDeleteMiningUser_createServerFn_handler,
  adminRenewMining_createServerFn_handler,
  adminResetRenewal_createServerFn_handler,
  adminUpdateMiningUser_createServerFn_handler,
  getAllMiningUsers_createServerFn_handler,
  getDashboardStats_createServerFn_handler,
  getLeaderboard_createServerFn_handler,
  getMiningAccessConfig_createServerFn_handler,
  getServerNow_createServerFn_handler,
  purchaseRigServer_createServerFn_handler,
  renewMiningSession_createServerFn_handler,
  saveMiningAccessConfig_createServerFn_handler,
  saveMiningUser_createServerFn_handler,
  serverCatchUp_createServerFn_handler
};
