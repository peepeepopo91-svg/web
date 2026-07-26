import { c as createSsrRpc } from "./router-4Yeb1nX_.js";
import { z } from "zod";
import { c as createServerFn } from "../server.js";
const getEconomyConfig = createServerFn({
  method: "GET"
}).handler(createSsrRpc("09ab9a99c03428f041005f7ff3c91460b1fdb4575960c02120a4e5ff70f520da"));
createServerFn({
  method: "GET"
}).handler(createSsrRpc("9c403a0b1baaa9eb01522526a02467b0bbe7366ce94755351c706515263f9ab1"));
const serverCatchUp = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  seedUser: z.any().optional()
})).handler(createSsrRpc("ccdb6274a919b4e64faac8870a35fdd9f2379e43902fbc073e763702f8e0edb1"));
const saveMiningUser = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  user: z.any()
})).handler(createSsrRpc("8de7a5ffa64cbe7de66496bd09cd405c8c5bbd016fc0db22792f19363f0ae2c2"));
const purchaseRigServer = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  tierId: z.string()
})).handler(createSsrRpc("14b07c567f9b8c57ebeb2b5013958353bbec125f63a72006a299b990f8a3e5cc"));
const getDashboardStats = createServerFn({
  method: "GET"
}).handler(createSsrRpc("c20eeae52f63782258860f6bf9cdedb36bd505958dfd8199abe8bbed955e893c"));
const getAllMiningUsers = createServerFn({
  method: "GET"
}).handler(createSsrRpc("450e0a26a740dcd825927e9bc6d268f76e8a10fd98c7ba9b681fe818d0b5015b"));
const adminUpdateMiningUser = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  user: z.any()
})).handler(createSsrRpc("8e3d970b0a3780ca5ee670f87b0ba84cb45748760c3b1b1be58131158580b660"));
const getLeaderboard = createServerFn({
  method: "GET"
}).handler(createSsrRpc("7fa8b3cbd5fc8f402a586f9817e3556e666bae0870bfdf16a35ee35117771bb1"));
createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string()
})).handler(createSsrRpc("2a08d77084734e5724f0b7c889d954a908a3bb05d5c0b96eecc2c94776f3daa7"));
const renewMiningSession = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string()
})).handler(createSsrRpc("6628a45ae47f2a27610f23af9286c0955b21bcb8e8625b097bfda5976b23544c"));
const adminRenewMining = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string()
})).handler(createSsrRpc("5fed49ccff1da12a3cf2c454c8f9abb2c8689d155564610245c1506d3223ee3c"));
const adminAdjustRenewal = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  deltaMs: z.number()
})).handler(createSsrRpc("2aaed4fef1df9d23420ad780edcf7203ac4c445653015df9af9b0178f0277ddc"));
const getMiningAccessConfig = createServerFn({
  method: "GET"
}).handler(createSsrRpc("b1882853617708282b340efc40fa7c2fcb1a1b9291b064abb9d264fe8108c8e0"));
const saveMiningAccessConfig = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  buttonLabel: z.string().min(1).max(120),
  sectionTitle: z.string().min(1).max(120),
  steps: z.array(z.string().max(400)).min(1).max(20),
  discordUrl: z.string().max(300),
  discordButtonLabel: z.string().min(1).max(100)
})).handler(createSsrRpc("969c202e4a472980b0f4181e8627c80dac3f0e7c33e0fb14b22edc02324dd4b9"));
const adminResetRenewal = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string()
})).handler(createSsrRpc("8d5f143a680dcec8b626745cb47685992d8086e2e59ff3b07c97174e40abdbd4"));
export {
  getLeaderboard as a,
  serverCatchUp as b,
  getEconomyConfig as c,
  getDashboardStats as d,
  getAllMiningUsers as e,
  adminRenewMining as f,
  getMiningAccessConfig as g,
  adminResetRenewal as h,
  adminAdjustRenewal as i,
  saveMiningAccessConfig as j,
  adminUpdateMiningUser as k,
  purchaseRigServer as p,
  renewMiningSession as r,
  saveMiningUser as s
};
