import { useState, useEffect } from "react";
let dirtySet = /* @__PURE__ */ new Set();
let isSaving = false;
let saveStatus = "idle";
let saveError = null;
let lastSyncAt = null;
let lastSyncMsg = null;
let listeners = [];
function notify() {
  for (const fn of listeners) fn();
}
function markDirty(section) {
  if (typeof window === "undefined") return;
  dirtySet.add(section);
  notify();
}
function clearDirty() {
  dirtySet.clear();
  notify();
}
function getDirty() {
  return new Set(dirtySet);
}
function isDirty() {
  return dirtySet.size > 0;
}
function setLastSync(at, message) {
  lastSyncAt = at;
  lastSyncMsg = message;
  notify();
}
function snapshot() {
  return {
    dirty: getDirty(),
    isDirty: isDirty(),
    isSaving,
    saveStatus,
    saveError,
    lastSyncAt,
    lastSyncMsg
  };
}
function subscribe(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
function useSyncState() {
  const [state, setState] = useState(snapshot);
  useEffect(() => subscribe(() => setState(snapshot())), []);
  return state;
}
export {
  clearDirty as c,
  getDirty as g,
  markDirty as m,
  setLastSync as s,
  useSyncState as u
};
