import { c as createSsrRpc } from "./router-D8sMuNrU.js";
import { z } from "zod";
import { c as createServerFn } from "../server.js";
const CATEGORY_LABELS = {
  all: "All Items",
  ranks: "Ranks",
  "crate-keys": "Crate Keys",
  "amethyst-tools": "Amethyst Tools"
};
const CATEGORY_ICONS = {
  all: "🏪",
  ranks: "👑",
  "crate-keys": "🗝️",
  "amethyst-tools": "🔮"
};
const RARITY_NAMES = {
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Epic",
  5: "Legendary",
  6: "Mythic"
};
const RARITY_COLORS = {
  1: "#9ca3af",
  // gray
  2: "#4ade80",
  // green
  3: "#60a5fa",
  // blue
  4: "#a855f7",
  // purple
  5: "#f59e0b",
  // amber
  6: "#f97316"
  // orange-red
};
const STATUS_LABELS = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected"
};
const STATUS_COLORS = {
  pending: "#f59e0b",
  processing: "#3b82f6",
  completed: "#22c55e",
  cancelled: "#6b7280",
  rejected: "#ef4444"
};
const getShopItems = createServerFn({
  method: "GET"
}).handler(createSsrRpc("62bb95e491f70187696af701a08661091cd73ae081ddd6e137bc93b3795769bd"));
const purchaseItem = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string().min(1),
  itemId: z.string().min(1),
  quantity: z.number().int().min(1).max(99)
})).handler(createSsrRpc("ec026d36d4ffcb51ac6d6e7a02f5d1118db749d23ae9d41aa9e810d1e639d6d0"));
const getMyPurchases = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string().min(1)
})).handler(createSsrRpc("59b03fa8204d5c21025a37a43302a6d23470656a41f93cc4c007688c5327b67b"));
const adminGetAllPurchases = createServerFn({
  method: "GET"
}).handler(createSsrRpc("69f2ce1e7c6571bdd7a19ee26738a2ae2fbba51ad19bdf612c2529bf7a56c68f"));
const adminUpdatePurchase = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  purchaseId: z.string(),
  status: z.enum(["pending", "processing", "completed", "cancelled", "rejected"]),
  staffNotes: z.string().nullable().optional(),
  playerNotes: z.string().nullable().optional()
})).handler(createSsrRpc("53ec1b36518c94a244d87a9692c1b6cb1944d6a5eff3b7b69e7216d04b7c5883"));
const adminGetShopItems = createServerFn({
  method: "GET"
}).handler(createSsrRpc("ff23368b6f4fcee6548aab800aec16a97e7734b0dc8d2714034e5b260202fe56"));
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
})).handler(createSsrRpc("f9be758d9b42678d51decbe54fe1fd07045e4803ea4ce96286e8884d8315aec0"));
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
})).handler(createSsrRpc("635af3f2c52461751a47a6e7f5805fb8fb68776cedf3e6be49ddea69249f08a5"));
const adminDeleteShopItem = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  id: z.string()
})).handler(createSsrRpc("3be3696d67cafcd1287434777f69c2da8eaf6a606c0dc566e20e220c1794c05f"));
const adminGetShopStats = createServerFn({
  method: "GET"
}).handler(createSsrRpc("379bd47bb2ec7133dfe6837534062a9ac9f2fe7576ce4a638ebe43f05546b4ff"));
export {
  CATEGORY_LABELS as C,
  RARITY_NAMES as R,
  STATUS_LABELS as S,
  RARITY_COLORS as a,
  STATUS_COLORS as b,
  getMyPurchases as c,
  CATEGORY_ICONS as d,
  adminGetAllPurchases as e,
  adminGetShopItems as f,
  getShopItems as g,
  adminGetShopStats as h,
  adminUpdatePurchase as i,
  adminAddShopItem as j,
  adminUpdateShopItem as k,
  adminDeleteShopItem as l,
  purchaseItem as p
};
