import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { z } from "zod";
import { mkdirSync, writeFileSync, renameSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { c as broadcastShopUpdate, a as broadcastMiningUpdate } from "./sseRegistry-CCzaVd18.js";
import { d as scheduleBackup } from "./miningBackup-BQ-7nMGz.js";
import { c as createServerFn } from "../server.js";
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
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
const DATA_DIR = resolve("data");
const purchaseInProgress = /* @__PURE__ */ new Set();
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
function loadShopItems() {
  return readJson("shop-items.json") ?? [];
}
function loadPurchases() {
  return readJson("shop-purchases.json") ?? {
    purchases: []
  };
}
function loadMiningUsers() {
  return readJson("mining-users.json") ?? {};
}
function saveMiningUsers(users) {
  atomicWrite("mining-users.json", users);
}
function savePurchases(data) {
  atomicWrite("shop-purchases.json", data);
}
function generatePurchaseId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "BT-";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
const getShopItems_createServerFn_handler = createServerRpc({
  id: "62bb95e491f70187696af701a08661091cd73ae081ddd6e137bc93b3795769bd",
  name: "getShopItems",
  filename: "src/server/shopServer.ts"
}, (opts) => getShopItems.__executeServer(opts));
const getShopItems = createServerFn({
  method: "GET"
}).handler(getShopItems_createServerFn_handler, () => {
  return loadShopItems().filter((item) => item.enabled);
});
const purchaseItem_createServerFn_handler = createServerRpc({
  id: "ec026d36d4ffcb51ac6d6e7a02f5d1118db749d23ae9d41aa9e810d1e639d6d0",
  name: "purchaseItem",
  filename: "src/server/shopServer.ts"
}, (opts) => purchaseItem.__executeServer(opts));
const purchaseItem = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string().min(1),
  itemId: z.string().min(1),
  quantity: z.number().int().min(1).max(99)
})).handler(purchaseItem_createServerFn_handler, async ({
  data
}) => {
  const {
    username,
    itemId,
    quantity
  } = data;
  const key = username.toLowerCase();
  if (purchaseInProgress.has(key)) {
    return {
      success: false,
      error: "A purchase is already in progress. Please wait."
    };
  }
  purchaseInProgress.add(key);
  try {
    const items = loadShopItems();
    const item = items.find((i) => i.id === itemId && i.enabled);
    if (!item) {
      return {
        success: false,
        error: "Item not found or unavailable."
      };
    }
    const totalCost = item.price * quantity;
    const users = loadMiningUsers();
    const user = users[key];
    if (!user) {
      return {
        success: false,
        error: "Account not found. Please log in to the mining panel first."
      };
    }
    const gems = typeof user.gems === "number" && isFinite(user.gems) ? user.gems : 0;
    if (gems < totalCost) {
      return {
        success: false,
        error: `Not enough Gems. You have ${Math.floor(gems).toLocaleString()} ✦ but need ${totalCost.toLocaleString()} ✦.`
      };
    }
    if (item.purchaseLimit !== null) {
      const purchases = loadPurchases();
      const userPurchaseCount = purchases.purchases.filter((p) => p.username.toLowerCase() === key && p.itemId === itemId && p.status !== "cancelled" && p.status !== "rejected").length;
      if (userPurchaseCount >= item.purchaseLimit) {
        return {
          success: false,
          error: `You have reached the purchase limit for ${item.name}.`
        };
      }
    }
    const newGems = gems - totalCost;
    users[key] = {
      ...user,
      gems: newGems
    };
    saveMiningUsers(users);
    const now = Date.now();
    const purchase = {
      id: generatePurchaseId(),
      username: user.username,
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      quantity,
      price: item.price,
      totalCost,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      staffNotes: null,
      playerNotes: null,
      refunded: false,
      refundedAt: null
    };
    const purchasesFile = loadPurchases();
    purchasesFile.purchases.unshift(purchase);
    savePurchases(purchasesFile);
    broadcastShopUpdate();
    broadcastMiningUpdate();
    scheduleBackup();
    return {
      success: true,
      purchase
    };
  } finally {
    purchaseInProgress.delete(key);
  }
});
const getMyPurchases_createServerFn_handler = createServerRpc({
  id: "59b03fa8204d5c21025a37a43302a6d23470656a41f93cc4c007688c5327b67b",
  name: "getMyPurchases",
  filename: "src/server/shopServer.ts"
}, (opts) => getMyPurchases.__executeServer(opts));
const getMyPurchases = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string().min(1)
})).handler(getMyPurchases_createServerFn_handler, ({
  data
}) => {
  const key = data.username.toLowerCase();
  const {
    purchases
  } = loadPurchases();
  return purchases.filter((p) => p.username.toLowerCase() === key).sort((a, b) => b.createdAt - a.createdAt);
});
const adminGetAllPurchases_createServerFn_handler = createServerRpc({
  id: "69f2ce1e7c6571bdd7a19ee26738a2ae2fbba51ad19bdf612c2529bf7a56c68f",
  name: "adminGetAllPurchases",
  filename: "src/server/shopServer.ts"
}, (opts) => adminGetAllPurchases.__executeServer(opts));
const adminGetAllPurchases = createServerFn({
  method: "GET"
}).handler(adminGetAllPurchases_createServerFn_handler, () => {
  return loadPurchases().purchases.sort((a, b) => b.createdAt - a.createdAt);
});
const adminUpdatePurchase_createServerFn_handler = createServerRpc({
  id: "53ec1b36518c94a244d87a9692c1b6cb1944d6a5eff3b7b69e7216d04b7c5883",
  name: "adminUpdatePurchase",
  filename: "src/server/shopServer.ts"
}, (opts) => adminUpdatePurchase.__executeServer(opts));
const adminUpdatePurchase = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  purchaseId: z.string(),
  status: z.enum(["pending", "processing", "completed", "cancelled", "rejected"]),
  staffNotes: z.string().nullable().optional(),
  playerNotes: z.string().nullable().optional()
})).handler(adminUpdatePurchase_createServerFn_handler, async ({
  data
}) => {
  const file = loadPurchases();
  const idx = file.purchases.findIndex((p) => p.id === data.purchaseId);
  if (idx === -1) {
    return {
      success: false,
      error: "Purchase not found."
    };
  }
  const purchase = {
    ...file.purchases[idx]
  };
  const prevStatus = purchase.status;
  const now = Date.now();
  const shouldRefund = (data.status === "cancelled" || data.status === "rejected") && !purchase.refunded && prevStatus !== "cancelled" && prevStatus !== "rejected";
  if (shouldRefund) {
    const users = loadMiningUsers();
    const key = purchase.username.toLowerCase();
    if (users[key]) {
      const currentGems = typeof users[key].gems === "number" && isFinite(users[key].gems) ? users[key].gems : 0;
      users[key] = {
        ...users[key],
        gems: currentGems + purchase.totalCost
      };
      saveMiningUsers(users);
    }
    purchase.refunded = true;
    purchase.refundedAt = now;
  }
  purchase.status = data.status;
  purchase.updatedAt = now;
  if (data.status === "completed") purchase.completedAt = now;
  if (data.staffNotes !== void 0) purchase.staffNotes = data.staffNotes;
  if (data.playerNotes !== void 0) purchase.playerNotes = data.playerNotes;
  file.purchases[idx] = purchase;
  savePurchases(file);
  broadcastShopUpdate();
  if (shouldRefund) broadcastMiningUpdate();
  scheduleBackup();
  return {
    success: true,
    purchase
  };
});
const adminGetShopItems_createServerFn_handler = createServerRpc({
  id: "ff23368b6f4fcee6548aab800aec16a97e7734b0dc8d2714034e5b260202fe56",
  name: "adminGetShopItems",
  filename: "src/server/shopServer.ts"
}, (opts) => adminGetShopItems.__executeServer(opts));
const adminGetShopItems = createServerFn({
  method: "GET"
}).handler(adminGetShopItems_createServerFn_handler, () => loadShopItems());
const adminUpdateShopItem_createServerFn_handler = createServerRpc({
  id: "f9be758d9b42678d51decbe54fe1fd07045e4803ea4ce96286e8884d8315aec0",
  name: "adminUpdateShopItem",
  filename: "src/server/shopServer.ts"
}, (opts) => adminUpdateShopItem.__executeServer(opts));
const adminUpdateShopItem = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().int().min(1).optional(),
  icon: z.string().optional(),
  enabled: z.boolean().optional(),
  featured: z.boolean().optional(),
  purchaseLimit: z.number().int().min(1).nullable().optional(),
  stock: z.number().int().min(0).nullable().optional()
})).handler(adminUpdateShopItem_createServerFn_handler, ({
  data
}) => {
  const items = loadShopItems();
  const idx = items.findIndex((i) => i.id === data.id);
  if (idx === -1) return {
    success: false,
    error: "Item not found."
  };
  const {
    id: _id,
    ...updates
  } = data;
  items[idx] = {
    ...items[idx],
    ...updates
  };
  atomicWrite("shop-items.json", items);
  return {
    success: true
  };
});
const adminAddShopItem_createServerFn_handler = createServerRpc({
  id: "635af3f2c52461751a47a6e7f5805fb8fb68776cedf3e6be49ddea69249f08a5",
  name: "adminAddShopItem",
  filename: "src/server/shopServer.ts"
}, (opts) => adminAddShopItem.__executeServer(opts));
const adminAddShopItem = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  id: z.string().min(1),
  category: z.enum(["ranks", "crate-keys", "amethyst-tools"]),
  name: z.string().min(1),
  description: z.string(),
  price: z.number().int().min(1),
  rarity: z.number().int().min(1).max(6),
  icon: z.string(),
  enabled: z.boolean(),
  featured: z.boolean(),
  purchaseLimit: z.number().int().min(1).nullable(),
  stock: z.number().int().min(0).nullable()
})).handler(adminAddShopItem_createServerFn_handler, ({
  data
}) => {
  const items = loadShopItems();
  if (items.some((i) => i.id === data.id)) {
    return {
      success: false,
      error: "An item with this ID already exists."
    };
  }
  items.push(data);
  atomicWrite("shop-items.json", items);
  return {
    success: true
  };
});
const adminDeleteShopItem_createServerFn_handler = createServerRpc({
  id: "3be3696d67cafcd1287434777f69c2da8eaf6a606c0dc566e20e220c1794c05f",
  name: "adminDeleteShopItem",
  filename: "src/server/shopServer.ts"
}, (opts) => adminDeleteShopItem.__executeServer(opts));
const adminDeleteShopItem = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  id: z.string()
})).handler(adminDeleteShopItem_createServerFn_handler, ({
  data
}) => {
  const items = loadShopItems();
  const filtered = items.filter((i) => i.id !== data.id);
  if (filtered.length === items.length) {
    return {
      success: false,
      error: "Item not found."
    };
  }
  atomicWrite("shop-items.json", filtered);
  return {
    success: true
  };
});
const adminGetShopStats_createServerFn_handler = createServerRpc({
  id: "379bd47bb2ec7133dfe6837534062a9ac9f2fe7576ce4a638ebe43f05546b4ff",
  name: "adminGetShopStats",
  filename: "src/server/shopServer.ts"
}, (opts) => adminGetShopStats.__executeServer(opts));
const adminGetShopStats = createServerFn({
  method: "GET"
}).handler(adminGetShopStats_createServerFn_handler, () => {
  const {
    purchases
  } = loadPurchases();
  const total = purchases.length;
  const pending = purchases.filter((p) => p.status === "pending").length;
  const processing = purchases.filter((p) => p.status === "processing").length;
  const completed = purchases.filter((p) => p.status === "completed").length;
  const cancelled = purchases.filter((p) => p.status === "cancelled").length;
  const rejected = purchases.filter((p) => p.status === "rejected").length;
  const totalGemsSpent = purchases.filter((p) => !p.refunded).reduce((sum, p) => sum + p.totalCost, 0);
  const recentPurchases = purchases.slice(0, 10);
  const itemMap = /* @__PURE__ */ new Map();
  for (const p of purchases.filter((p2) => !p2.refunded)) {
    const cur = itemMap.get(p.itemName) ?? {
      count: 0,
      gemsSpent: 0
    };
    itemMap.set(p.itemName, {
      count: cur.count + p.quantity,
      gemsSpent: cur.gemsSpent + p.totalCost
    });
  }
  const topItems = [...itemMap.entries()].map(([itemName, v]) => ({
    itemName,
    ...v
  })).sort((a, b) => b.count - a.count).slice(0, 10);
  const buyerMap = /* @__PURE__ */ new Map();
  for (const p of purchases.filter((p2) => !p2.refunded)) {
    const cur = buyerMap.get(p.username) ?? {
      count: 0,
      gemsSpent: 0
    };
    buyerMap.set(p.username, {
      count: cur.count + 1,
      gemsSpent: cur.gemsSpent + p.totalCost
    });
  }
  const topBuyers = [...buyerMap.entries()].map(([username, v]) => ({
    username,
    ...v
  })).sort((a, b) => b.gemsSpent - a.gemsSpent).slice(0, 10);
  return {
    total,
    pending,
    processing,
    completed,
    cancelled,
    rejected,
    totalGemsSpent,
    recentPurchases,
    topItems,
    topBuyers
  };
});
export {
  adminAddShopItem_createServerFn_handler,
  adminDeleteShopItem_createServerFn_handler,
  adminGetAllPurchases_createServerFn_handler,
  adminGetShopItems_createServerFn_handler,
  adminGetShopStats_createServerFn_handler,
  adminUpdatePurchase_createServerFn_handler,
  adminUpdateShopItem_createServerFn_handler,
  getMyPurchases_createServerFn_handler,
  getShopItems_createServerFn_handler,
  purchaseItem_createServerFn_handler
};
