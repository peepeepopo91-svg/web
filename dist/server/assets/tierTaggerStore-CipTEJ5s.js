import { useState, useEffect } from "react";
import { m as markDirty } from "./syncStore-C_ozCmAO.js";
const KEY = "bn_admin_tier_tagger";
const DEFAULT_TIER_TAGGER = {
  badge: "Official Blue Tiers Mod",
  titlePrefix: "Blue Tier",
  titleAccent: "Tagger",
  subtitle: "See every player's Blue Tiers rank directly above their nametag — in real time, on any server.",
  downloadLabel: "Download Now",
  downloadUrl: "https://modrinth.com",
  secondaryLabel: "View Rankings",
  secondaryUrl: "/rankings",
  nametagImageUrl: "/tagger-nametag.png",
  nametagCaption: "Tier above nametag",
  nametagSubcaption: "Visible on any multiplayer server",
  profileImageUrl: "/tagger-profile.webp",
  profileCaption: "In-game player profile",
  profileSubcaption: "Full tier breakdown per gamemode",
  featuresEyebrow: "What's Included",
  featuresHeading: "Everything You Need",
  features: [
    { id: "f1", icon: "🏷️", title: "Live Tier Labels", desc: "Displays Blue Tiers directly above nametags — instantly readable while in combat." },
    { id: "f2", icon: "📋", title: "Full Ranking System", desc: "Supports every gamemode ranking in the Blue Tiers system, shown at a glance." },
    { id: "f3", icon: "⚡", title: "Auto-Fetch", desc: "Automatically pulls the latest tier data so you never play with stale rankings." },
    { id: "f4", icon: "👤", title: "In-Game Player Profile", desc: "View any player's full Blue Tiers profile, region, and points without leaving Minecraft." },
    { id: "f5", icon: "🎨", title: "Lightweight & Clean", desc: "Zero performance overhead. Designed to blend with any texture pack or UI layout." },
    { id: "f6", icon: "🌐", title: "Universal Compatibility", desc: "Client-side Fabric mod — works on any multiplayer server without server-side setup." }
  ],
  stepsEyebrow: "Setup",
  stepsHeading: "Up in 3 Steps",
  steps: [
    { id: "s1", n: "01", title: "Install Fabric Loader", desc: "Download and run the Fabric installer for your Minecraft version from fabricmc.net." },
    { id: "s2", n: "02", title: "Drop the Mod In", desc: "Place the Blue Tier Tagger .jar into your .minecraft/mods folder." },
    { id: "s3", n: "03", title: "Launch Minecraft", desc: "Select the Fabric profile in your launcher and launch. Tiers appear automatically." }
  ],
  ctaHeading: "Ready to Install?",
  ctaBody: "Download Blue Tier Tagger and start seeing every player's rank in-game. Requires Fabric Loader.",
  ctaButtonLabel: "Download Blue Tier Tagger",
  ctaButtonUrl: "https://modrinth.com",
  ctaNote: "Free forever · Fabric mod · Client-side only",
  aboutTitle: "About Blue Tiers",
  aboutBody: "Blue Tiers is a competitive Minecraft PvP ranking platform designed to provide accurate, reliable player rankings across multiple gamemodes. Compete against other players, climb the leaderboards, and showcase your skill — now visible directly in-game with Blue Tier Tagger.",
  aboutCredit: "Made with 💙 by Blue Network",
  releaseCountdownEnabled: false,
  releaseDate: "",
  countdownHeading: "Coming Soon",
  countdownSubtext: "Blue Tier Tagger is almost here. Stay tuned."
};
function safeGet(key) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}
function safeSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
  }
}
function getTierTaggerConfig() {
  const stored = safeGet(KEY);
  return stored ? { ...DEFAULT_TIER_TAGGER, ...stored } : { ...DEFAULT_TIER_TAGGER };
}
function saveTierTaggerConfig(config, opts) {
  safeSet(KEY, config);
  if (!opts?.silent) markDirty("tier-tagger");
}
function useTierTaggerConfig(serverData) {
  const [cfg, setCfg] = useState(() => ({
    ...DEFAULT_TIER_TAGGER,
    ...serverData ?? {}
  }));
  useEffect(() => {
    const stored = safeGet(KEY);
    if (stored) {
      setCfg({ ...DEFAULT_TIER_TAGGER, ...serverData ?? {}, ...stored });
    }
  }, []);
  return cfg;
}
export {
  DEFAULT_TIER_TAGGER as D,
  getTierTaggerConfig as g,
  saveTierTaggerConfig as s,
  useTierTaggerConfig as u
};
