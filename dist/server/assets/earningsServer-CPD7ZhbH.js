import { c as createSsrRpc } from "./router-D8sMuNrU.js";
import { z } from "zod";
import { c as createServerFn } from "../server.js";
const getAdsConfig = createServerFn({
  method: "GET"
}).handler(createSsrRpc("bda408528402cc40c10ebae8493c87594338b18499c43e313ba941d2dbe69a11"));
const saveAdsConfig = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  config: z.any()
})).handler(createSsrRpc("ac20a71becbdda8d50045e7cd69812d4b36660e495aa3e5565c52bee80ce1c2c"));
const trackAdEvent = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  event: z.enum(["impression", "completion", "skip"]),
  page: z.string().optional(),
  hour: z.number().min(0).max(23).optional(),
  variant: z.enum(["a", "b"]).optional()
})).handler(createSsrRpc("b0c00df0a524fbcbcb6649f9d21d35dfc5c5a86052acdf811868ad7ef65bca01"));
const resetAdsStats = createServerFn({
  method: "POST"
}).handler(createSsrRpc("4686f50ccdd8c60ab286dab4566eb7e066b6d3b40524984dd33539e3367c0731"));
const resetAbTestStats = createServerFn({
  method: "POST"
}).handler(createSsrRpc("12e6c496b1979f52eba7acbe480303b046baf912f403dbadfebc89909068cf38"));
createServerFn({
  method: "POST"
}).inputValidator(z.object({
  linkId: z.string()
})).handler(createSsrRpc("980d3172af72490d422146cc9600d8514eb552afb1145e580053adbf108d5921"));
const addPayoutRecord = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  amount: z.number(),
  method: z.string(),
  notes: z.string().optional()
})).handler(createSsrRpc("219ae3114e4607a45fea223c75104d53c4de8791d58d9d06662d94490676a3b2"));
createServerFn({
  method: "GET"
}).handler(createSsrRpc("70ee23244a1cf7dcbbb4c2b3d194f1c659076ba93fded5d65385deab0c9c3d0a"));
export {
  resetAbTestStats as a,
  addPayoutRecord as b,
  getAdsConfig as g,
  resetAdsStats as r,
  saveAdsConfig as s,
  trackAdEvent as t
};
