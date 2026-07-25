import { m as markDirty } from "./syncStore-C_ozCmAO.js";
const RIG_TIERS = [
  {
    id: "starter",
    name: "Starter Pack",
    emoji: "⛏️",
    hashrate: 2,
    cost: 150,
    maxDurability: 1e4,
    lossPerSecond: 1e4 / (5.5 * 24 * 3600),
    color: "text-gray-300",
    borderColor: "border-gray-500/40",
    glowColor: "rgba(156,163,175,0.25)",
    description: "Entry-level hardware. Great for learning the ropes of the mining ecosystem."
  },
  {
    id: "advanced",
    name: "Advanced Rig",
    emoji: "🔧",
    hashrate: 6,
    cost: 400,
    maxDurability: 1e4,
    lossPerSecond: 1e4 / (6 * 24 * 3600),
    color: "text-blue-400",
    borderColor: "border-blue-500/40",
    glowColor: "rgba(96,165,250,0.3)",
    description: "Upgraded thermal management and 3× output. The first real investment."
  },
  {
    id: "pro",
    name: "Pro Miner",
    emoji: "⚡",
    hashrate: 15,
    cost: 900,
    maxDurability: 1e4,
    lossPerSecond: 1e4 / (6.5 * 24 * 3600),
    color: "text-[#00BFFF]",
    borderColor: "border-[#00BFFF]/40",
    glowColor: "rgba(0,191,255,0.3)",
    description: "Professional-grade rig with enhanced power delivery and cooling."
  },
  {
    id: "elite",
    name: "Elite Station",
    emoji: "💠",
    hashrate: 40,
    cost: 2200,
    maxDurability: 1e4,
    lossPerSecond: 1e4 / (7 * 24 * 3600),
    color: "text-purple-400",
    borderColor: "border-purple-500/40",
    glowColor: "rgba(167,139,250,0.35)",
    description: "Enterprise-class station with liquid cooling and redundant power supply."
  },
  {
    id: "quantum",
    name: "Quantum Array",
    emoji: "🔮",
    hashrate: 100,
    cost: 5e3,
    maxDurability: 1e4,
    lossPerSecond: 1e4 / (8 * 24 * 3600),
    color: "text-yellow-400",
    borderColor: "border-yellow-500/40",
    glowColor: "rgba(250,204,21,0.4)",
    description: "State-of-the-art quantum-accelerated array. Unmatched hashrate output."
  }
];
const MINING_CONSTANTS = {
  BLOCK_INTERVAL_MS: 60 * 60 * 1e3,
  // 60 minutes per community block
  BLOCK_REWARD: 500,
  // BlueCoin rewarded per block
  FINDER_BONUS_PCT: 0.25,
  EQUAL_SPLIT_PCT: 0.25,
  HASHRATE_SHARE_PCT: 0.5,
  STARTING_BALANCE: 200,
  // BC given to new accounts
  REPAIR_COST_PCT: 0.35,
  // fraction of rig cost = full repair price
  SELL_MAX_PCT: 0.75,
  // max sell-back at 100% durability
  TICK_INTERVAL_MS: 1e4,
  // UI refresh rate
  RENEWAL_DURATION_MS: 12 * 60 * 60 * 1e3
  // 12-hour mining session
};
const EXCHANGE_CONSTANTS = {
  BASE_RATE: 55,
  // Gems per BC (base)
  MIN_RATE: 40,
  // Gems per BC (worst for user)
  MAX_RATE: 70,
  // Gems per BC (best for user)
  DAILY_TX_LIMIT: 3,
  // max exchange transactions per 24-hour window
  FEE_PCT: 0.02,
  // 2% transaction fee
  FLUCTUATION_PERIOD_MS: 4 * 60 * 60 * 1e3
  // 4-hour price cycle
};
const USERS_KEY = "bn_mining_users";
const COMMUNITY_KEY = "bn_mining_community";
const CURRENT_USER_KEY = "bn_mining_session";
const ADMIN_ECONOMY_KEY = "bn_admin_economy";
function safeGet(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function safeSet(key, value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}
function getEconomyOverrides() {
  return safeGet(ADMIN_ECONOMY_KEY) ?? {};
}
function saveEconomyOverrides(overrides, opts) {
  safeSet(ADMIN_ECONOMY_KEY, overrides);
  if (!opts?.silent) markDirty("economy");
}
function getCommunityState() {
  const saved = safeGet(COMMUNITY_KEY);
  if (saved) return saved;
  const initial = {
    blockNumber: 1,
    startedAt: Date.now(),
    lastSolvedAt: Date.now() - MINING_CONSTANTS.BLOCK_INTERVAL_MS,
    totalSolved: 0
  };
  safeSet(COMMUNITY_KEY, initial);
  return initial;
}
function saveCommunityState(state) {
  safeSet(COMMUNITY_KEY, state);
}
function getAllUsers() {
  return safeGet(USERS_KEY) ?? {};
}
function saveAllUsers(users) {
  safeSet(USERS_KEY, users);
}
function normalizeUser(raw, now) {
  if ("shards" in raw && !("gems" in raw)) {
    raw.gems = raw.shards;
    delete raw.shards;
  }
  if (typeof raw.exchangeUsedToday === "number" && (!Number.isInteger(raw.exchangeUsedToday) || raw.exchangeUsedToday > 100)) {
    raw.exchangeUsedToday = 0;
  }
  if (typeof raw.balance !== "number" || !isFinite(raw.balance)) raw.balance = 0;
  if (typeof raw.gems !== "number" || !isFinite(raw.gems)) raw.gems = 0;
  const expiresRaw = raw.miningExpiresAt;
  if (expiresRaw === null) ;
  else if (typeof expiresRaw === "number" && isFinite(expiresRaw) && expiresRaw > 0) ;
  else {
    raw.miningExpiresAt = now + MINING_CONSTANTS.RENEWAL_DURATION_MS;
    raw.miningRenewedAt = now;
  }
  const renewedRaw = raw.miningRenewedAt;
  if (renewedRaw !== null && !(typeof renewedRaw === "number" && isFinite(renewedRaw) && renewedRaw > 0)) {
    raw.miningRenewedAt = null;
  }
  if (Array.isArray(raw.rigs)) {
    raw.rigs = raw.rigs.map((rig) => {
      const tier = RIG_TIERS.find((t) => t.id === rig.tierId);
      if (!tier) return rig;
      const dur = rig.durability;
      if (dur === null || dur === void 0 || !isFinite(dur) || dur < 0) {
        return { ...rig, durability: tier.maxDurability, status: "idle", miningSince: null };
      }
      if (dur <= 0 && rig.status !== "broken") {
        return { ...rig, durability: 0, status: "broken", miningSince: null };
      }
      return rig;
    });
  }
  return raw;
}
function migrateUser(raw) {
  return normalizeUser(raw, Date.now());
}
function getUser(username) {
  const raw = getAllUsers()[username.toLowerCase()];
  if (!raw) return null;
  return migrateUser(raw);
}
function createUser(username) {
  const ov = getEconomyOverrides();
  const now = Date.now();
  const user = {
    username,
    createdAt: now,
    balance: ov.STARTING_BALANCE ?? MINING_CONSTANTS.STARTING_BALANCE,
    gems: 0,
    rigs: [],
    rewardHistory: [],
    lastCheckedAt: now,
    exchangeUsedToday: 0,
    exchangeResetAt: now + 24 * 60 * 60 * 1e3,
    miningExpiresAt: null,
    // Must renew before earning
    miningRenewedAt: null
  };
  const users = getAllUsers();
  users[username.toLowerCase()] = user;
  saveAllUsers(users);
  return user;
}
function saveUser(user) {
  const users = getAllUsers();
  users[user.username.toLowerCase()] = user;
  saveAllUsers(users);
}
function getCurrentUsername() {
  return safeGet(CURRENT_USER_KEY);
}
function setCurrentUsername(username) {
  if (username) safeSet(CURRENT_USER_KEY, username);
  else try {
    if (typeof window !== "undefined") localStorage.removeItem(CURRENT_USER_KEY);
  } catch {
  }
}
function computeUserBlockReward(userHashrate, totalHashrate, activeMinerCount, isWinner) {
  const ov = getEconomyOverrides();
  const BLOCK_REWARD = ov.BLOCK_REWARD ?? MINING_CONSTANTS.BLOCK_REWARD;
  const FINDER_BONUS_PCT = ov.FINDER_BONUS_PCT ?? MINING_CONSTANTS.FINDER_BONUS_PCT;
  const EQUAL_SPLIT_PCT = ov.EQUAL_SPLIT_PCT ?? MINING_CONSTANTS.EQUAL_SPLIT_PCT;
  const HASHRATE_SHARE_PCT = ov.HASHRATE_SHARE_PCT ?? MINING_CONSTANTS.HASHRATE_SHARE_PCT;
  const finder = BLOCK_REWARD * FINDER_BONUS_PCT;
  const equal = BLOCK_REWARD * EQUAL_SPLIT_PCT / activeMinerCount;
  const hashShare = totalHashrate > 0 ? BLOCK_REWARD * HASHRATE_SHARE_PCT * userHashrate / totalHashrate : 0;
  return Math.round(finder + equal + hashShare);
}
function applyDurabilityLoss(rig, elapsedSeconds) {
  const tier = RIG_TIERS.find((t) => t.id === rig.tierId);
  const newDur = Math.max(0, rig.durability - tier.lossPerSecond * elapsedSeconds);
  const broken = newDur <= 0;
  return {
    ...rig,
    durability: newDur,
    status: broken ? "broken" : rig.status,
    miningSince: broken ? null : rig.miningSince
  };
}
function catchUpUser(user, now, opts) {
  const community = opts?.community ?? getCommunityState();
  const expiresAt = user.miningExpiresAt ?? null;
  const earnUntil = expiresAt === null ? user.lastCheckedAt : Math.min(now, expiresAt);
  const elapsed = Math.max(0, earnUntil - user.lastCheckedAt);
  if (elapsed < 500 && now - user.lastCheckedAt < 500) return { user, community };
  let rigs = user.rigs.map(
    (rig) => rig.status === "mining" ? applyDurabilityLoss(rig, elapsed / 1e3) : rig
  );
  const ov = opts?.overrides ?? getEconomyOverrides();
  const blockIntervalMs = ov.BLOCK_INTERVAL_MS ?? MINING_CONSTANTS.BLOCK_INTERVAL_MS;
  const timeSinceLastBlock = earnUntil - community.lastSolvedAt;
  const blocksPassed = elapsed > 0 ? Math.floor(timeSinceLastBlock / blockIntervalMs) : 0;
  let balance = user.balance;
  const newRewards = [];
  if (blocksPassed > 0) {
    const activeUserRigs = rigs.filter((r) => r.status === "mining");
    if (activeUserRigs.length > 0) {
      const userHashrate = activeUserRigs.reduce((sum, r) => {
        const tier = RIG_TIERS.find((t) => t.id === r.tierId);
        return sum + tier.hashrate;
      }, 0);
      for (let i = 0; i < blocksPassed; i++) {
        const blockNum = community.blockNumber + i;
        const amount = computeUserBlockReward(userHashrate, userHashrate, 1);
        balance += amount;
        newRewards.push({
          blockNumber: blockNum,
          solvedAt: community.lastSolvedAt + (i + 1) * blockIntervalMs,
          amount,
          type: "finder"
        });
      }
    }
  }
  const globalTimeSinceLastBlock = now - community.lastSolvedAt;
  const globalBlocksPassed = Math.floor(globalTimeSinceLastBlock / blockIntervalMs);
  const updatedCommunity = globalBlocksPassed > 0 ? {
    ...community,
    blockNumber: community.blockNumber + globalBlocksPassed,
    lastSolvedAt: community.lastSolvedAt + globalBlocksPassed * blockIntervalMs,
    startedAt: community.lastSolvedAt + globalBlocksPassed * blockIntervalMs,
    totalSolved: community.totalSolved + globalBlocksPassed
  } : community;
  if (!opts?.community && globalBlocksPassed > 0) {
    saveCommunityState(updatedCommunity);
  }
  if (expiresAt !== null && expiresAt <= now) {
    rigs = rigs.map(
      (rig) => rig.status === "mining" ? { ...rig, status: "idle", miningSince: null } : rig
    );
  }
  let exchangeUsedToday = user.exchangeUsedToday;
  let exchangeResetAt = user.exchangeResetAt;
  if (now >= user.exchangeResetAt) {
    exchangeUsedToday = 0;
    exchangeResetAt = now + 24 * 60 * 60 * 1e3;
  }
  return {
    user: {
      ...user,
      rigs,
      balance,
      rewardHistory: [...newRewards.reverse(), ...user.rewardHistory].slice(0, 50),
      lastCheckedAt: now,
      // always advance to real now, not earnUntil
      exchangeUsedToday,
      exchangeResetAt
    },
    community: updatedCommunity
  };
}
const MAX_RIGS = 10;
function buyRig(user, tierId) {
  const tier = RIG_TIERS.find((t) => t.id === tierId);
  if (!tier) return { user, error: "Unknown rig tier" };
  if (user.rigs.length >= MAX_RIGS)
    return { user, error: `You have reached the maximum limit of ${MAX_RIGS} mining rigs.` };
  if (user.balance < tier.cost)
    return { user, error: `Need ${tier.cost} BC — you have ${Math.floor(user.balance)} BC` };
  const rig = {
    id: `${tierId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    tierId,
    name: tier.name,
    durability: tier.maxDurability,
    status: "idle",
    miningSince: null,
    purchasedAt: Date.now()
  };
  return { user: { ...user, balance: user.balance - tier.cost, rigs: [...user.rigs, rig] } };
}
function startMining(user, rigId) {
  return {
    ...user,
    rigs: user.rigs.map(
      (r) => r.id === rigId && r.status === "idle" ? { ...r, status: "mining", miningSince: Date.now() } : r
    )
  };
}
function stopMining(user, rigId) {
  return {
    ...user,
    rigs: user.rigs.map(
      (r) => r.id === rigId && r.status === "mining" ? { ...r, status: "idle", miningSince: null } : r
    )
  };
}
function repairRig(user, rigId) {
  const rig = user.rigs.find((r) => r.id === rigId);
  if (!rig) return { user, error: "Rig not found" };
  const tier = RIG_TIERS.find((t) => t.id === rig.tierId);
  const damage = tier.maxDurability - rig.durability;
  if (damage <= 0) return { user, error: "Rig is already at full durability" };
  const repairCost = Math.ceil(damage / tier.maxDurability * tier.cost * MINING_CONSTANTS.REPAIR_COST_PCT);
  if (user.balance < repairCost)
    return { user, error: `Repair costs ${repairCost} BC — you have ${Math.floor(user.balance)} BC` };
  return {
    user: {
      ...user,
      balance: user.balance - repairCost,
      rigs: user.rigs.map(
        (r) => r.id === rigId ? { ...r, durability: tier.maxDurability, status: "idle", miningSince: null } : r
      )
    }
  };
}
function sellRig(user, rigId) {
  const rig = user.rigs.find((r) => r.id === rigId);
  if (!rig) return { user, salePrice: 0 };
  const tier = RIG_TIERS.find((t) => t.id === rig.tierId);
  const durPct = rig.durability / tier.maxDurability;
  const salePrice = Math.floor(tier.cost * MINING_CONSTANTS.SELL_MAX_PCT * durPct);
  return {
    salePrice,
    user: { ...user, balance: user.balance + salePrice, rigs: user.rigs.filter((r) => r.id !== rigId) }
  };
}
function getExchangeRate(now = Date.now()) {
  const ov = getEconomyOverrides();
  const BASE_RATE = ov.BASE_RATE ?? EXCHANGE_CONSTANTS.BASE_RATE;
  const MIN_RATE = ov.MIN_RATE ?? EXCHANGE_CONSTANTS.MIN_RATE;
  const MAX_RATE = ov.MAX_RATE ?? EXCHANGE_CONSTANTS.MAX_RATE;
  const { FLUCTUATION_PERIOD_MS } = EXCHANGE_CONSTANTS;
  const t = now % FLUCTUATION_PERIOD_MS / FLUCTUATION_PERIOD_MS;
  const wave = Math.sin(2 * Math.PI * t) * 0.65 + Math.sin(2 * Math.PI * t * 2.7 + 1.2) * 0.35;
  const amplitude = (MAX_RATE - MIN_RATE) / 2;
  return Math.round(BASE_RATE + wave * amplitude);
}
function checkDailyLimit(user, now) {
  if (now >= user.exchangeResetAt) {
    return { used: 0, resetAt: now + 24 * 60 * 60 * 1e3 };
  }
  return { used: Math.floor(user.exchangeUsedToday), resetAt: user.exchangeResetAt };
}
function exchangeBCForGems(user, bcAmount, now = Date.now()) {
  const ZERO = { user, gemsGained: 0, feePaid: 0 };
  if (bcAmount <= 0) return { ...ZERO, error: "Amount must be positive" };
  if (user.balance < bcAmount) return { ...ZERO, error: "Insufficient BlueCoin balance" };
  const ov = getEconomyOverrides();
  const dailyLimit = ov.DAILY_TX_LIMIT ?? EXCHANGE_CONSTANTS.DAILY_TX_LIMIT;
  const feePct = ov.FEE_PCT ?? EXCHANGE_CONSTANTS.FEE_PCT;
  const { used, resetAt } = checkDailyLimit(user, now);
  if (used >= dailyLimit)
    return { ...ZERO, error: "You've reached today's exchange limit. Please try again tomorrow." };
  const rate = getExchangeRate(now);
  const gross = bcAmount * rate;
  const fee = gross * feePct;
  const net = gross - fee;
  return {
    gemsGained: net,
    feePaid: fee,
    user: {
      ...user,
      balance: user.balance - bcAmount,
      gems: (user.gems ?? 0) + net,
      exchangeUsedToday: used + 1,
      exchangeResetAt: resetAt
    }
  };
}
function exchangeGemsForBC(user, gemsAmount, now = Date.now()) {
  const ZERO = { user, bcGained: 0, feePaid: 0 };
  if (gemsAmount <= 0) return { ...ZERO, error: "Amount must be positive" };
  if ((user.gems ?? 0) < gemsAmount) return { ...ZERO, error: "Insufficient Gems balance" };
  const ov = getEconomyOverrides();
  const dailyLimit = ov.DAILY_TX_LIMIT ?? EXCHANGE_CONSTANTS.DAILY_TX_LIMIT;
  const feePct = ov.FEE_PCT ?? EXCHANGE_CONSTANTS.FEE_PCT;
  const { used, resetAt } = checkDailyLimit(user, now);
  if (used >= dailyLimit)
    return { ...ZERO, error: "You've reached today's exchange limit. Please try again tomorrow." };
  const rate = getExchangeRate(now);
  const grossBC = gemsAmount / rate;
  const fee = grossBC * feePct;
  const netBC = grossBC - fee;
  return {
    bcGained: netBC,
    feePaid: fee,
    user: {
      ...user,
      gems: (user.gems ?? 0) - gemsAmount,
      balance: user.balance + netBC,
      exchangeUsedToday: used + 1,
      exchangeResetAt: resetAt
    }
  };
}
export {
  EXCHANGE_CONSTANTS as E,
  MINING_CONSTANTS as M,
  RIG_TIERS as R,
  getExchangeRate as a,
  buyRig as b,
  catchUpUser as c,
  getCommunityState as d,
  saveCommunityState as e,
  getUser as f,
  getEconomyOverrides as g,
  createUser as h,
  setCurrentUsername as i,
  startMining as j,
  stopMining as k,
  sellRig as l,
  exchangeBCForGems as m,
  normalizeUser as n,
  exchangeGemsForBC as o,
  getCurrentUsername as p,
  saveEconomyOverrides as q,
  repairRig as r,
  saveUser as s
};
