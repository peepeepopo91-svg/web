import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { z } from "zod";
import { mkdirSync, writeFileSync, renameSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
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
const DATA_DIR = resolve("data");
const GROWTH_FILE = "growth.json";
const SESSION_TIMEOUT_MS = 2 * 60 * 1e3;
if (!globalThis.__growthSessions) globalThis.__growthSessions = /* @__PURE__ */ new Map();
if (!globalThis.__growthTodaySessions) globalThis.__growthTodaySessions = /* @__PURE__ */ new Set();
if (!globalThis.__growthTodayKey) globalThis.__growthTodayKey = "";
if (!("__growthCache" in globalThis)) globalThis.__growthCache = null;
if (!("__growthWriteTimer" in globalThis)) globalThis.__growthWriteTimer = null;
function todayKey() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function checkDayRollover() {
  const key = todayKey();
  if (key !== globalThis.__growthTodayKey) {
    globalThis.__growthTodayKey = key;
    globalThis.__growthTodaySessions = /* @__PURE__ */ new Set();
  }
}
function emptyDay() {
  return {
    pageViews: 0,
    uniqueSessions: 0,
    pages: {},
    referrers: {},
    devices: {},
    browsers: {},
    os: {},
    peakConcurrent: 0
  };
}
function inc(obj, key) {
  obj[key] = (obj[key] ?? 0) + 1;
}
function readGrowthFromDisk() {
  try {
    return JSON.parse(readFileSync(resolve(DATA_DIR, GROWTH_FILE), "utf8"));
  } catch {
    return {
      startedAt: Date.now(),
      peakConcurrentEver: 0,
      dailyStats: {}
    };
  }
}
function getGrowth() {
  if (globalThis.__growthCache) return globalThis.__growthCache;
  globalThis.__growthCache = readGrowthFromDisk();
  return globalThis.__growthCache;
}
function scheduleWrite(data) {
  globalThis.__growthCache = data;
  if (globalThis.__growthWriteTimer) return;
  globalThis.__growthWriteTimer = setTimeout(() => {
    globalThis.__growthWriteTimer = null;
    if (globalThis.__growthCache) {
      try {
        mkdirSync(DATA_DIR, {
          recursive: true
        });
        const target = resolve(DATA_DIR, GROWTH_FILE);
        const tmp = target + ".tmp";
        writeFileSync(tmp, JSON.stringify(globalThis.__growthCache, null, 2), "utf8");
        renameSync(tmp, target);
      } catch {
      }
    }
  }, 3e3);
}
function cleanSessions() {
  const cutoff = Date.now() - SESSION_TIMEOUT_MS;
  for (const [id, ts] of globalThis.__growthSessions) {
    if (ts < cutoff) globalThis.__growthSessions.delete(id);
  }
  return globalThis.__growthSessions.size;
}
function parseDevice(ua) {
  if (/ipad|tablet/i.test(ua)) return "Tablet";
  if (/mobile|android|iphone/i.test(ua)) return "Mobile";
  return "Desktop";
}
function parseBrowser(ua) {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\//i.test(ua)) return "Opera";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
}
function parseOS(ua) {
  if (/windows/i.test(ua)) return "Windows";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad/i.test(ua)) return "iOS";
  if (/mac os x/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}
function parseSource(ref) {
  if (!ref || ref === "direct" || ref === "") return "Direct";
  if (/discord/i.test(ref)) return "Discord";
  if (/google/i.test(ref)) return "Google";
  if (/bing/i.test(ref)) return "Bing";
  if (/youtube/i.test(ref)) return "YouTube";
  if (/twitter|x\.com/i.test(ref)) return "Twitter/X";
  if (/reddit/i.test(ref)) return "Reddit";
  return "Referral";
}
const recordPageView_createServerFn_handler = createServerRpc({
  id: "95844de006e2c9e2d7e983992605c64a3bd53c2c2493a031f1201548f14295ca",
  name: "recordPageView",
  filename: "src/server/growthServer.ts"
}, (opts) => recordPageView.__executeServer(opts));
const recordPageView = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  sessionId: z.string().max(64),
  page: z.string().max(256),
  referrer: z.string().max(512),
  ua: z.string().max(512),
  isNewSession: z.boolean()
})).handler(recordPageView_createServerFn_handler, ({
  data
}) => {
  checkDayRollover();
  const key = globalThis.__growthTodayKey;
  globalThis.__growthSessions.set(data.sessionId, Date.now());
  const concurrent = cleanSessions();
  const isNewToday = !globalThis.__growthTodaySessions.has(data.sessionId);
  if (isNewToday) globalThis.__growthTodaySessions.add(data.sessionId);
  const growth = getGrowth();
  if (!growth.dailyStats[key]) growth.dailyStats[key] = emptyDay();
  const day = growth.dailyStats[key];
  day.pageViews++;
  if (isNewToday) day.uniqueSessions++;
  const pagePath = data.page.split("?")[0].slice(0, 80) || "/";
  inc(day.pages, pagePath);
  inc(day.referrers, parseSource(data.referrer));
  inc(day.devices, parseDevice(data.ua));
  inc(day.browsers, parseBrowser(data.ua));
  inc(day.os, parseOS(data.ua));
  if (concurrent > day.peakConcurrent) day.peakConcurrent = concurrent;
  if (concurrent > growth.peakConcurrentEver) growth.peakConcurrentEver = concurrent;
  scheduleWrite(growth);
  return {
    concurrent
  };
});
const heartbeatSession_createServerFn_handler = createServerRpc({
  id: "23540e98c4b6ee3b45af87467ac670e6c58fe789d85b5a414633bff74fdfe852",
  name: "heartbeatSession",
  filename: "src/server/growthServer.ts"
}, (opts) => heartbeatSession.__executeServer(opts));
const heartbeatSession = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  sessionId: z.string().max(64)
})).handler(heartbeatSession_createServerFn_handler, ({
  data
}) => {
  checkDayRollover();
  const key = globalThis.__growthTodayKey;
  globalThis.__growthSessions.set(data.sessionId, Date.now());
  const concurrent = cleanSessions();
  const growth = getGrowth();
  if (!growth.dailyStats[key]) growth.dailyStats[key] = emptyDay();
  const day = growth.dailyStats[key];
  if (concurrent > day.peakConcurrent || concurrent > growth.peakConcurrentEver) {
    if (concurrent > day.peakConcurrent) day.peakConcurrent = concurrent;
    if (concurrent > growth.peakConcurrentEver) growth.peakConcurrentEver = concurrent;
    scheduleWrite(growth);
  }
  return {
    concurrent
  };
});
const getGrowthStats_createServerFn_handler = createServerRpc({
  id: "ac8e1029c9877c230f6e80aedc0bb5bb727246e5f9989f4b559a55dccfe8a0ad",
  name: "getGrowthStats",
  filename: "src/server/growthServer.ts"
}, (opts) => getGrowthStats.__executeServer(opts));
const getGrowthStats = createServerFn({
  method: "GET"
}).handler(getGrowthStats_createServerFn_handler, () => {
  checkDayRollover();
  const growth = getGrowth();
  const concurrent = cleanSessions();
  const todaySessions = globalThis.__growthTodaySessions.size;
  return {
    growth,
    concurrent,
    todaySessions
  };
});
export {
  getGrowthStats_createServerFn_handler,
  heartbeatSession_createServerFn_handler,
  recordPageView_createServerFn_handler
};
