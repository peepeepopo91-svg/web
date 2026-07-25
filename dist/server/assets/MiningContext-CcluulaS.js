import { jsx } from "react/jsx-runtime";
import { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";
import { E as EXCHANGE_CONSTANTS, M as MINING_CONSTANTS, d as getCommunityState, a as getExchangeRate, n as normalizeUser, c as catchUpUser, s as saveUser, e as saveCommunityState, f as getUser, h as createUser, i as setCurrentUsername, b as buyRig, j as startMining, k as stopMining, r as repairRig, l as sellRig, m as exchangeBCForGems, o as exchangeGemsForBC, p as getCurrentUsername } from "./miningStore-vSM2TBEv.js";
import { c as createSsrRpc } from "./router-D-1D0-Hz.js";
import { z } from "zod";
import { c as createServerFn } from "../server.js";
import { s as saveMiningUser, b as serverCatchUp, p as purchaseRigServer, r as renewMiningSession } from "./miningServer-zKCKB2Hj.js";
z.object({
  users: z.array(z.object({
    username: z.string(),
    password: z.string(),
    role: z.string().optional(),
    uuid: z.string().optional(),
    enabled: z.boolean().optional()
  }))
});
const validateCredentials = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  password: z.string()
})).handler(createSsrRpc("8ebbe34d9c3cf8d74d5c419c61649060ec2211be4f88f412177da3ea729967ce"));
const MiningContext = createContext(null);
function MiningProvider({ children }) {
  const [user, setUser] = useState(null);
  const [community, setCommunity] = useState(null);
  const [currentRate, setRate] = useState(EXCHANGE_CONSTANTS.BASE_RATE);
  const [nextBlockIn, setNext] = useState(MINING_CONSTANTS.BLOCK_INTERVAL_MS);
  const [isLoading, setLoading] = useState(true);
  const [miningExpired, setMiningExpired] = useState(false);
  const [toast, setToast] = useState(null);
  const tickRef = useRef(null);
  const toastRef = useRef(null);
  const clockOffset = useRef(0);
  const lastLocalSave = useRef(0);
  const userRef = useRef(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3500);
  }, []);
  const clearToast = useCallback(() => setToast(null), []);
  const serverNow = useCallback(() => Date.now() + clockOffset.current, []);
  function applyServerResult(result) {
    clockOffset.current = result.serverNow - Date.now();
    saveUser(result.user);
    saveCommunityState(result.community);
    setUser(result.user);
    setCommunity(result.community);
    const now = result.serverNow;
    setRate(getExchangeRate(now));
    const elapsed = now - result.community.lastSolvedAt;
    setNext(MINING_CONSTANTS.BLOCK_INTERVAL_MS - elapsed % MINING_CONSTANTS.BLOCK_INTERVAL_MS);
  }
  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }
    async function bootstrap() {
      const username = getCurrentUsername();
      if (username) {
        const localUser = getUser(username);
        try {
          const result = await serverCatchUp({ data: { username, seedUser: localUser } });
          if (result.user) {
            applyServerResult(result);
          } else {
            setCurrentUsername(null);
          }
        } catch {
          if (localUser) {
            const now = Date.now();
            const { user: u, community: c } = catchUpUser(localUser, now);
            saveUser(u);
            setUser(u);
            setCommunity(c);
            setRate(getExchangeRate(now));
            const elapsed = now - c.lastSolvedAt;
            setNext(MINING_CONSTANTS.BLOCK_INTERVAL_MS - elapsed % MINING_CONSTANTS.BLOCK_INTERVAL_MS);
          }
        }
      } else {
        const now = Date.now();
        const comm = getCommunityState();
        setCommunity(comm);
        setRate(getExchangeRate(now));
        const elapsed = now - comm.lastSolvedAt;
        setNext(MINING_CONSTANTS.BLOCK_INTERVAL_MS - elapsed % MINING_CONSTANTS.BLOCK_INTERVAL_MS);
      }
      setLoading(false);
    }
    bootstrap();
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let es = null;
    let reconnectTimer = null;
    let active = true;
    function connect() {
      if (!active) return;
      es = new EventSource("/api/mining-events");
      es.addEventListener("mining_updated", async () => {
        if (Date.now() - lastLocalSave.current < 5e3) return;
        const username = getCurrentUsername();
        if (!username || !userRef.current) return;
        try {
          const result = await serverCatchUp({ data: { username, seedUser: userRef.current } });
          if (result.user) {
            applyServerResult(result);
          }
        } catch {
        }
      });
      es.addEventListener("shop_updated", () => {
        window.dispatchEvent(new CustomEvent("shop_updated"));
      });
      es.onerror = () => {
        es?.close();
        es = null;
        if (active) {
          reconnectTimer = setTimeout(connect, 5e3);
        }
      };
    }
    connect();
    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      const now = serverNow();
      const comm = getCommunityState();
      const elapsed = now - comm.lastSolvedAt;
      setNext(MINING_CONSTANTS.BLOCK_INTERVAL_MS - elapsed % MINING_CONSTANTS.BLOCK_INTERVAL_MS);
      setUser((prev) => {
        if (!prev) return prev;
        const expiresAt = prev.miningExpiresAt ?? null;
        const expired = expiresAt === null || now > expiresAt;
        setMiningExpired(expired);
        return prev;
      });
    }, 1e3);
    return () => clearInterval(id);
  }, [serverNow]);
  useEffect(() => {
    tickRef.current = setInterval(() => {
      const now = serverNow();
      const comm = getCommunityState();
      setRate(getExchangeRate(now));
      setCommunity({ ...comm });
      setUser((prev) => {
        if (!prev) return prev;
        const clean = normalizeUser({ ...prev }, now);
        const { user: updated, community: updatedComm } = catchUpUser(clean, now);
        if (updated.rewardHistory.length > prev.rewardHistory.length) {
          const newest = updated.rewardHistory[0];
          if (newest) showToast(`⛏ Block #${newest.blockNumber}: +${newest.amount} BC earned!`, "success");
        }
        saveUser(updated);
        saveCommunityState(updatedComm);
        queueMicrotask(() => {
          lastLocalSave.current = Date.now();
          saveMiningUser({ data: { user: updated } }).catch(() => {
          });
        });
        return updated;
      });
    }, MINING_CONSTANTS.TICK_INTERVAL_MS);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [showToast, serverNow]);
  const login = useCallback(async (username, password) => {
    const trimmed = username.trim();
    if (!trimmed) return { error: "Username is required" };
    if (!password) return { error: "Password is required" };
    const result = await validateCredentials({ data: { username: trimmed, password } });
    if (!result || !result.valid) return { error: result?.error ?? "Invalid username or password" };
    const canonicalUsername = result.username;
    const isNew = !getUser(canonicalUsername);
    if (isNew) createUser(canonicalUsername);
    const localUser = getUser(canonicalUsername);
    try {
      const catchResult = await serverCatchUp({ data: { username: canonicalUsername, seedUser: localUser } });
      if (catchResult.user) {
        applyServerResult(catchResult);
        setCurrentUsername(canonicalUsername);
        showToast(isNew ? `Welcome to Blue Mining, ${canonicalUsername}! 🎉` : `Welcome back, ${canonicalUsername}!`, "success");
        return {};
      }
    } catch {
    }
    const { user: u } = catchUpUser(localUser, Date.now());
    saveUser(u);
    setCurrentUsername(canonicalUsername);
    setUser(u);
    showToast(isNew ? `Welcome to Blue Mining, ${canonicalUsername}! 🎉` : `Welcome back, ${canonicalUsername}!`, "success");
    return {};
  }, [showToast]);
  const logout = useCallback(() => {
    setCurrentUsername(null);
    setUser(null);
    showToast("Logged out", "info");
  }, [showToast]);
  const purchaseRig = useCallback(async (tierId) => {
    if (!user) return { error: "Not logged in" };
    const precheck = buyRig(user, tierId);
    if (precheck.error) return { error: precheck.error };
    const result = await purchaseRigServer({ data: { username: user.username, tierId } });
    if (result.error) return { error: result.error };
    if (!result.user) return { error: "Server error — please try again." };
    saveUser(result.user);
    setUser(result.user);
    lastLocalSave.current = Date.now();
    showToast(`${result.user.rigs.at(-1)?.name} purchased!`, "success");
    return {};
  }, [user, showToast]);
  const startRig = useCallback((rigId) => {
    if (!user) return;
    const updated = startMining(user, rigId);
    saveUser(updated);
    setUser(updated);
    lastLocalSave.current = Date.now();
    saveMiningUser({ data: { user: updated } }).catch(() => {
    });
  }, [user]);
  const stopRig = useCallback((rigId) => {
    if (!user) return;
    const updated = stopMining(user, rigId);
    saveUser(updated);
    setUser(updated);
    lastLocalSave.current = Date.now();
    saveMiningUser({ data: { user: updated } }).catch(() => {
    });
  }, [user]);
  const startAllRigs = useCallback(() => {
    if (!user) return;
    const updated = user.rigs.filter((r) => r.status === "idle").reduce((acc, r) => startMining(acc, r.id), user);
    saveUser(updated);
    setUser(updated);
    lastLocalSave.current = Date.now();
    saveMiningUser({ data: { user: updated } }).catch(() => {
    });
  }, [user]);
  const stopAllRigs = useCallback(() => {
    if (!user) return;
    const updated = user.rigs.filter((r) => r.status === "mining").reduce((acc, r) => stopMining(acc, r.id), user);
    saveUser(updated);
    setUser(updated);
    lastLocalSave.current = Date.now();
    saveMiningUser({ data: { user: updated } }).catch(() => {
    });
  }, [user]);
  const repairUserRig = useCallback((rigId) => {
    if (!user) return { error: "Not logged in" };
    const result = repairRig(user, rigId);
    if (result.error) return { error: result.error };
    saveUser(result.user);
    setUser(result.user);
    lastLocalSave.current = Date.now();
    saveMiningUser({ data: { user: result.user } }).catch(() => {
    });
    showToast("Rig fully repaired ✓", "success");
    return {};
  }, [user, showToast]);
  const sellUserRig = useCallback((rigId) => {
    if (!user) return { salePrice: 0 };
    const result = sellRig(user, rigId);
    saveUser(result.user);
    setUser(result.user);
    lastLocalSave.current = Date.now();
    saveMiningUser({ data: { user: result.user } }).catch(() => {
    });
    showToast(`Rig sold for ${result.salePrice} BC`, "info");
    return { salePrice: result.salePrice };
  }, [user, showToast]);
  const renewMining = useCallback(async () => {
    if (!user) return { error: "Not logged in" };
    try {
      const result = await renewMiningSession({ data: { username: user.username } });
      if (result.error || !result.user) return { error: result.error ?? "Server error" };
      applyServerResult(result);
      setMiningExpired(false);
      showToast("⛏ Mining renewed — 12 hours active!", "success");
      return {};
    } catch {
      return { error: "Could not reach server — try again." };
    }
  }, [user, showToast]);
  const exchange = useCallback((amount, direction) => {
    if (!user) return { gained: 0, feePaid: 0, error: "Not logged in" };
    if (direction === "bc-to-gems") {
      const result = exchangeBCForGems(user, amount, serverNow());
      if (result.error) return { gained: 0, feePaid: 0, error: result.error };
      saveUser(result.user);
      setUser(result.user);
      lastLocalSave.current = Date.now();
      saveMiningUser({ data: { user: result.user } }).catch(() => {
      });
      showToast(`Exchanged ${amount} BC → ${Math.floor(result.gemsGained).toLocaleString()} 💎 Gems`, "success");
      return { gained: result.gemsGained, feePaid: result.feePaid };
    } else {
      const result = exchangeGemsForBC(user, amount, serverNow());
      if (result.error) return { gained: 0, feePaid: 0, error: result.error };
      saveUser(result.user);
      setUser(result.user);
      lastLocalSave.current = Date.now();
      saveMiningUser({ data: { user: result.user } }).catch(() => {
      });
      showToast(`Exchanged ${amount} 💎 Gems → ${result.bcGained.toFixed(2)} BC`, "success");
      return { gained: result.bcGained, feePaid: result.feePaid };
    }
  }, [user, serverNow, showToast]);
  return /* @__PURE__ */ jsx(MiningContext.Provider, { value: {
    user,
    community,
    currentRate,
    nextBlockIn,
    isLoading,
    miningExpired,
    login,
    logout,
    purchaseRig,
    startRig,
    stopRig,
    startAllRigs,
    stopAllRigs,
    repairUserRig,
    sellUserRig,
    exchange,
    renewMining,
    toast,
    clearToast
  }, children });
}
function useMining() {
  const ctx = useContext(MiningContext);
  if (!ctx) throw new Error("useMining must be used inside <MiningProvider>");
  return ctx;
}
export {
  MiningProvider as M,
  useMining as u
};
