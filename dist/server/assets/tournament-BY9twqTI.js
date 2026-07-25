const STATUS_LABEL = {
  upcoming: "Upcoming",
  registration_open: "Registration Open",
  registration_closed: "Registration Closed",
  live: "Live",
  completed: "Completed",
  archived: "Archived"
};
const STATUS_COLOR = {
  upcoming: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  registration_open: "text-green-400 bg-green-400/10 border-green-400/20",
  registration_closed: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  live: "text-red-400 bg-red-400/10 border-red-400/20",
  completed: "text-gray-400 bg-gray-400/10 border-gray-400/20",
  archived: "text-gray-500 bg-gray-500/10 border-gray-500/20"
};
const MATCH_STATUS_LABEL = {
  pending: "Pending",
  scheduled: "Scheduled",
  live: "Live",
  completed: "Completed",
  bye: "Bye"
};
const DEFAULT_RULES = {
  allowedMods: ["OptiFine", "Lunar Client", "Badlion Client", "Labymod"],
  allowedClients: ["Vanilla", "Forge", "Fabric", "Lunar", "Badlion", "Labymod"],
  bannedMods: ["Reach mods", "Kill aura", "AutoClicker", "X-Ray"],
  replayRequirements: "All players must record their POV. Replays must be submitted within 24 hours of the match.",
  disconnectRules: "A team will be given 5 minutes to reconnect. If unable, the match will be forfeited.",
  staffDecisions: "All staff decisions are final. Any disputes must be raised within 24 hours via Discord.",
  custom: []
};
const DEFAULT_PRIZES = [
  { placement: 1, label: "🥇 First Place", rewards: [{ type: "coins", label: "BlueCoin", amount: "10,000" }] },
  { placement: 2, label: "🥈 Second Place", rewards: [{ type: "coins", label: "BlueCoin", amount: "5,000" }] },
  { placement: 3, label: "🥉 Third Place", rewards: [{ type: "coins", label: "BlueCoin", amount: "2,500" }] }
];
export {
  DEFAULT_RULES as D,
  MATCH_STATUS_LABEL as M,
  STATUS_LABEL as S,
  DEFAULT_PRIZES as a,
  STATUS_COLOR as b
};
