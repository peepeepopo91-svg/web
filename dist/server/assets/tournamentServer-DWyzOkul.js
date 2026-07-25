import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { b as broadcastTournamentUpdate } from "./sseRegistry-CCzaVd18.js";
import { c as scheduleTournamentBackup } from "./miningBackup-BQ-7nMGz.js";
import { D as DEFAULT_RULES, a as DEFAULT_PRIZES } from "./tournament-BY9twqTI.js";
import { c as createServerFn, a as getRequestIP$1 } from "../server.js";
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
const FILE = "tournaments.json";
function readData() {
  try {
    return JSON.parse(readFileSync(resolve(DATA_DIR, FILE), "utf8"));
  } catch {
    return {
      tournaments: [],
      activeTournamentId: null
    };
  }
}
function writeData(data) {
  mkdirSync(DATA_DIR, {
    recursive: true
  });
  const content = JSON.stringify(data, null, 2);
  const target = resolve(DATA_DIR, FILE);
  const tmp = `${target}.tmp`;
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, target);
  broadcastTournamentUpdate();
  scheduleTournamentBackup();
}
function findTournament(data, id) {
  return data.tournaments.find((t) => t.id === id);
}
function uid() {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
const getTournamentData_createServerFn_handler = createServerRpc({
  id: "9f3c31e88fa1dee173ea06b9582248fd7ee4180a9a0b7963633607284a9e0d9f",
  name: "getTournamentData",
  filename: "src/server/tournamentServer.ts"
}, (opts) => getTournamentData.__executeServer(opts));
const getTournamentData = createServerFn({
  method: "GET"
}).handler(getTournamentData_createServerFn_handler, () => readData());
const TournamentInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1e3).default(""),
  banner: z.string().max(500).default(""),
  status: z.enum(["upcoming", "registration_open", "registration_closed", "live", "completed", "archived"]),
  gamemode: z.string().max(50).default(""),
  serverIp: z.string().max(100).default(""),
  maxTeamSize: z.number().int().min(1).max(50).default(2),
  minTeamSize: z.number().int().min(1).max(50).default(2),
  requireCaptain: z.boolean().default(true),
  registrationDeadline: z.number().nullable().default(null),
  startDate: z.number().nullable().default(null),
  prizePool: z.string().max(200).default("")
});
const createTournament_createServerFn_handler = createServerRpc({
  id: "dbced905a634ef7c5bb2a83b2634a776cca737f979e54211edd66306e2568768",
  name: "createTournament",
  filename: "src/server/tournamentServer.ts"
}, (opts) => createTournament.__executeServer(opts));
const createTournament = createServerFn({
  method: "POST"
}).inputValidator(TournamentInputSchema).handler(createTournament_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const now = Date.now();
  const tournament = {
    id: uid(),
    name: data.name,
    description: data.description,
    banner: data.banner,
    status: data.status,
    gamemode: data.gamemode,
    serverIp: data.serverIp,
    maxTeamSize: data.maxTeamSize,
    minTeamSize: data.minTeamSize,
    requireCaptain: data.requireCaptain,
    registrationDeadline: data.registrationDeadline,
    startDate: data.startDate,
    prizePool: data.prizePool,
    prizes: DEFAULT_PRIZES,
    rules: DEFAULT_RULES,
    bracket: null,
    teams: [],
    matches: [],
    announcements: [],
    createdAt: now,
    updatedAt: now
  };
  file.tournaments.unshift(tournament);
  writeData(file);
  return {
    success: true,
    tournament
  };
});
const updateTournament_createServerFn_handler = createServerRpc({
  id: "121f9159a4d0e4bfcabdfc34526c81d2267baf979f42ff893cc77d96685c5450",
  name: "updateTournament",
  filename: "src/server/tournamentServer.ts"
}, (opts) => updateTournament.__executeServer(opts));
const updateTournament = createServerFn({
  method: "POST"
}).inputValidator(TournamentInputSchema.extend({
  id: z.string().min(1)
})).handler(updateTournament_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const t = findTournament(file, data.id);
  if (!t) return {
    success: false,
    error: "Tournament not found"
  };
  Object.assign(t, {
    name: data.name,
    description: data.description,
    banner: data.banner,
    status: data.status,
    gamemode: data.gamemode,
    serverIp: data.serverIp,
    maxTeamSize: data.maxTeamSize,
    minTeamSize: data.minTeamSize,
    registrationDeadline: data.registrationDeadline,
    startDate: data.startDate,
    prizePool: data.prizePool,
    updatedAt: Date.now()
  });
  writeData(file);
  return {
    success: true
  };
});
const deleteTournament_createServerFn_handler = createServerRpc({
  id: "bc8e2f55893ff25b7a20ffb276b5353f2f509f03e7951ad10b9ac3a760e7067f",
  name: "deleteTournament",
  filename: "src/server/tournamentServer.ts"
}, (opts) => deleteTournament.__executeServer(opts));
const deleteTournament = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  id: z.string().min(1)
})).handler(deleteTournament_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const idx = file.tournaments.findIndex((t) => t.id === data.id);
  if (idx === -1) return {
    success: false,
    error: "Not found"
  };
  file.tournaments.splice(idx, 1);
  if (file.activeTournamentId === data.id) file.activeTournamentId = null;
  writeData(file);
  return {
    success: true
  };
});
const setActiveTournament_createServerFn_handler = createServerRpc({
  id: "8bde410c414b4bdd05289d750f4a36586b78a106a52e17079ca6db8772ff081e",
  name: "setActiveTournament",
  filename: "src/server/tournamentServer.ts"
}, (opts) => setActiveTournament.__executeServer(opts));
const setActiveTournament = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  id: z.string().nullable()
})).handler(setActiveTournament_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  file.activeTournamentId = data.id;
  writeData(file);
  return {
    success: true
  };
});
const archiveTournament_createServerFn_handler = createServerRpc({
  id: "cfef4f6f62c7ffd16bec0f981079bd01e4e58a67cf057297a6d296085a12dc3b",
  name: "archiveTournament",
  filename: "src/server/tournamentServer.ts"
}, (opts) => archiveTournament.__executeServer(opts));
const archiveTournament = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  id: z.string().min(1)
})).handler(archiveTournament_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const t = findTournament(file, data.id);
  if (!t) return {
    success: false,
    error: "Not found"
  };
  t.status = "archived";
  t.updatedAt = Date.now();
  if (file.activeTournamentId === data.id) file.activeTournamentId = null;
  writeData(file);
  return {
    success: true
  };
});
const registerTeam_createServerFn_handler = createServerRpc({
  id: "0945cb194bd5b5e925113942c2b7d3ed8fae8117a84c35d407c21835be8da21d",
  name: "registerTeam",
  filename: "src/server/tournamentServer.ts"
}, (opts) => registerTeam.__executeServer(opts));
const registerTeam = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  teamName: z.string().min(1).max(50),
  captain: z.string().max(50).default(""),
  players: z.array(z.string().min(1).max(50)).max(50).default([])
})).handler(registerTeam_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const t = findTournament(file, data.tournamentId);
  if (!t) return {
    success: false,
    error: "Tournament not found"
  };
  if (t.status !== "registration_open") return {
    success: false,
    error: "Registration is not open"
  };
  const now = Date.now();
  if (t.registrationDeadline && now > t.registrationDeadline) {
    return {
      success: false,
      error: "Registration deadline has passed"
    };
  }
  const needsCaptain = t.requireCaptain !== false;
  if (needsCaptain && !data.captain.trim()) {
    return {
      success: false,
      error: "Captain name is required for this tournament"
    };
  }
  const ip = getRequestIP$1({
    xForwardedFor: true
  }) ?? "unknown";
  if (ip !== "unknown") {
    const fromThisIp = t.teams.filter((team2) => team2.registrationIp === ip && team2.status !== "rejected").length;
    if (fromThisIp >= 3) {
      return {
        success: false,
        error: "Maximum of 3 team registrations per IP address has been reached."
      };
    }
  }
  const captain = data.captain.trim();
  const allPlayers = captain ? [captain, ...data.players.filter((p) => p !== captain)] : data.players.filter(Boolean);
  if (allPlayers.length < t.minTeamSize) {
    return {
      success: false,
      error: `Minimum team size is ${t.minTeamSize}`
    };
  }
  if (allPlayers.length > t.maxTeamSize) {
    return {
      success: false,
      error: `Maximum team size is ${t.maxTeamSize}`
    };
  }
  const nameLower = data.teamName.toLowerCase();
  if (t.teams.some((team2) => team2.name.toLowerCase() === nameLower && team2.status !== "rejected")) {
    return {
      success: false,
      error: "A team with this name is already registered"
    };
  }
  const registeredPlayers = t.teams.filter((team2) => team2.status !== "rejected").flatMap((team2) => team2.players.map((p) => p.toLowerCase()));
  const duplicate = allPlayers.find((p) => registeredPlayers.includes(p.toLowerCase()));
  if (duplicate) {
    return {
      success: false,
      error: `Player "${duplicate}" is already registered in another team`
    };
  }
  const team = {
    id: uid(),
    name: data.teamName,
    captain,
    players: allPlayers,
    status: "pending",
    registeredAt: now,
    notes: "",
    registrationIp: ip
  };
  t.teams.push(team);
  t.updatedAt = now;
  writeData(file);
  return {
    success: true,
    team
  };
});
const updateTeamStatus_createServerFn_handler = createServerRpc({
  id: "f9e96b9a78bbbfcc1a4ed07f2eba5da3f735e1b70a2d1ea221b4c58dbdb3797c",
  name: "updateTeamStatus",
  filename: "src/server/tournamentServer.ts"
}, (opts) => updateTeamStatus.__executeServer(opts));
const updateTeamStatus = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  teamId: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected", "eliminated", "disqualified"]),
  notes: z.string().max(500).default("")
})).handler(updateTeamStatus_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const t = findTournament(file, data.tournamentId);
  if (!t) return {
    success: false,
    error: "Tournament not found"
  };
  const team = t.teams.find((team2) => team2.id === data.teamId);
  if (!team) return {
    success: false,
    error: "Team not found"
  };
  team.status = data.status;
  team.notes = data.notes;
  t.updatedAt = Date.now();
  writeData(file);
  return {
    success: true
  };
});
const editTeam_createServerFn_handler = createServerRpc({
  id: "1a36faa8c7def6c71b5dad9a54f35ad328430bc15d8e4aca601503882a15687b",
  name: "editTeam",
  filename: "src/server/tournamentServer.ts"
}, (opts) => editTeam.__executeServer(opts));
const editTeam = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1).max(50),
  captain: z.string().max(50).default(""),
  players: z.array(z.string().min(1).max(50)).max(50).default([])
})).handler(editTeam_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const t = findTournament(file, data.tournamentId);
  if (!t) return {
    success: false,
    error: "Tournament not found"
  };
  const team = t.teams.find((team2) => team2.id === data.teamId);
  if (!team) return {
    success: false,
    error: "Team not found"
  };
  team.name = data.name;
  team.captain = data.captain.trim();
  team.players = data.players;
  t.updatedAt = Date.now();
  writeData(file);
  return {
    success: true
  };
});
const removeTeam_createServerFn_handler = createServerRpc({
  id: "afda6fd326aea53beacfb00c64a2b9bdc14a7bb746d3e4f80be750669e2d99f8",
  name: "removeTeam",
  filename: "src/server/tournamentServer.ts"
}, (opts) => removeTeam.__executeServer(opts));
const removeTeam = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  teamId: z.string().min(1)
})).handler(removeTeam_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const t = findTournament(file, data.tournamentId);
  if (!t) return {
    success: false,
    error: "Tournament not found"
  };
  const idx = t.teams.findIndex((team) => team.id === data.teamId);
  if (idx === -1) return {
    success: false,
    error: "Team not found"
  };
  t.teams.splice(idx, 1);
  t.updatedAt = Date.now();
  writeData(file);
  return {
    success: true
  };
});
const generateBracket_createServerFn_handler = createServerRpc({
  id: "c646772e903b0407b4dcf204f01727e0e0397269ed3db5dccfcff50d62fccea1",
  name: "generateBracket",
  filename: "src/server/tournamentServer.ts"
}, (opts) => generateBracket.__executeServer(opts));
const generateBracket = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  type: z.enum(["single_elimination", "double_elimination"]),
  shuffle: z.boolean().default(true)
})).handler(generateBracket_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const t = findTournament(file, data.tournamentId);
  if (!t) return {
    success: false,
    error: "Tournament not found"
  };
  const approved = t.teams.filter((team) => team.status === "approved");
  if (approved.length < 2) return {
    success: false,
    error: "Need at least 2 approved teams"
  };
  const teams = data.shuffle ? [...approved].sort(() => Math.random() - 0.5) : [...approved];
  const n = nextPow2(teams.length);
  const rounds = [];
  const matches = [];
  let matchNumber = 1;
  const roundNames = buildRoundNames(n);
  for (let r = 0; r < Math.log2(n); r++) {
    const roundMatchIds = [];
    const pairs = n / Math.pow(2, r + 1);
    for (let p = 0; p < pairs; p++) {
      const matchId = uid();
      let team1Id = null;
      let team2Id = null;
      if (r === 0) {
        team1Id = teams[p * 2]?.id ?? null;
        team2Id = teams[p * 2 + 1]?.id ?? null;
      }
      const match = {
        id: matchId,
        round: r,
        matchNumber: matchNumber++,
        bracketSide: r === Math.log2(n) - 1 ? "finals" : "winners",
        team1Id,
        team2Id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: r === 0 ? "scheduled" : "pending",
        scheduledAt: null,
        completedAt: null,
        arena: "",
        gamemode: t.gamemode,
        referee: "",
        notes: "",
        replayLink: ""
      };
      matches.push(match);
      roundMatchIds.push(matchId);
    }
    rounds.push({
      name: roundNames[r] || `Round ${r + 1}`,
      matchIds: roundMatchIds
    });
  }
  t.bracket = {
    type: data.type,
    rounds
  };
  t.matches = matches;
  t.updatedAt = Date.now();
  writeData(file);
  return {
    success: true
  };
});
function nextPow2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}
function buildRoundNames(n) {
  const rounds = Math.log2(n);
  const names = [];
  for (let i = 0; i < rounds; i++) {
    const remaining = n / Math.pow(2, i + 1);
    if (remaining === 1) names.push("Finals");
    else if (remaining === 2) names.push("Semi-Finals");
    else if (remaining === 4) names.push("Quarter-Finals");
    else names.push(`Round of ${remaining * 2}`);
  }
  return names;
}
const updateBracketSlot_createServerFn_handler = createServerRpc({
  id: "ec7de07a550e8200978e62a7ce4ad1ce08e46d47ff16a43af5b8c9d15545d2e6",
  name: "updateBracketSlot",
  filename: "src/server/tournamentServer.ts"
}, (opts) => updateBracketSlot.__executeServer(opts));
const updateBracketSlot = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
  team1Id: z.string().nullable().default(null),
  team2Id: z.string().nullable().default(null)
})).handler(updateBracketSlot_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const t = findTournament(file, data.tournamentId);
  if (!t) return {
    success: false,
    error: "Tournament not found"
  };
  const match = t.matches.find((m) => m.id === data.matchId);
  if (!match) return {
    success: false,
    error: "Match not found"
  };
  const changed = match.team1Id !== data.team1Id || match.team2Id !== data.team2Id;
  match.team1Id = data.team1Id;
  match.team2Id = data.team2Id;
  if (changed) {
    match.score1 = 0;
    match.score2 = 0;
    match.winnerId = null;
  }
  if (match.team1Id && match.team2Id && match.status === "pending") {
    match.status = "scheduled";
  }
  if ((!match.team1Id || !match.team2Id) && match.status === "scheduled") {
    match.status = "pending";
  }
  t.updatedAt = Date.now();
  writeData(file);
  return {
    success: true
  };
});
const updateMatch_createServerFn_handler = createServerRpc({
  id: "d075749bf4618bcaacc0b4ac11770dc6eb95dbfda90f3452bbdff782e2d04b0c",
  name: "updateMatch",
  filename: "src/server/tournamentServer.ts"
}, (opts) => updateMatch.__executeServer(opts));
const updateMatch = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
  score1: z.number().int().min(0).default(0),
  score2: z.number().int().min(0).default(0),
  winnerId: z.string().nullable().default(null),
  status: z.enum(["pending", "scheduled", "live", "completed"]),
  scheduledAt: z.number().nullable().default(null),
  arena: z.string().max(100).default(""),
  gamemode: z.string().max(50).default(""),
  referee: z.string().max(50).default(""),
  notes: z.string().max(500).default(""),
  replayLink: z.string().max(500).default("")
})).handler(updateMatch_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const t = findTournament(file, data.tournamentId);
  if (!t) return {
    success: false,
    error: "Tournament not found"
  };
  const match = t.matches.find((m) => m.id === data.matchId);
  if (!match) return {
    success: false,
    error: "Match not found"
  };
  match.score1 = data.score1;
  match.score2 = data.score2;
  match.winnerId = data.winnerId;
  match.status = data.status;
  match.scheduledAt = data.scheduledAt;
  match.arena = data.arena;
  match.gamemode = data.gamemode;
  match.referee = data.referee;
  match.notes = data.notes;
  match.replayLink = data.replayLink;
  if (data.status === "completed" && !match.completedAt) {
    match.completedAt = Date.now();
  }
  if (data.status !== "completed") {
    match.completedAt = null;
  }
  if (data.winnerId && t.bracket) {
    advanceWinner(t, match, data.winnerId);
  }
  t.updatedAt = Date.now();
  writeData(file);
  return {
    success: true
  };
});
function advanceWinner(t, completedMatch, winnerId) {
  if (!t.bracket) return;
  const {
    rounds
  } = t.bracket;
  for (let r = 0; r < rounds.length - 1; r++) {
    const round = rounds[r];
    const idx = round.matchIds.indexOf(completedMatch.id);
    if (idx === -1) continue;
    const nextRound = rounds[r + 1];
    const nextMatchIdx = Math.floor(idx / 2);
    const nextMatchId = nextRound?.matchIds[nextMatchIdx];
    if (!nextMatchId) continue;
    const nextMatch = t.matches.find((m) => m.id === nextMatchId);
    if (!nextMatch) continue;
    if (idx % 2 === 0) {
      nextMatch.team1Id = winnerId;
    } else {
      nextMatch.team2Id = winnerId;
    }
    if (nextMatch.team1Id && nextMatch.team2Id && nextMatch.status === "pending") {
      nextMatch.status = "scheduled";
    }
    break;
  }
}
const updatePrizes_createServerFn_handler = createServerRpc({
  id: "4e7af7ac57eea41a6b1e106318978ab1f1892e6fd452adcd0e9bf904835f9191",
  name: "updatePrizes",
  filename: "src/server/tournamentServer.ts"
}, (opts) => updatePrizes.__executeServer(opts));
const updatePrizes = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  prizes: z.array(z.object({
    placement: z.number().int().min(1),
    label: z.string().max(100),
    rewards: z.array(z.object({
      type: z.enum(["coins", "gems", "rank", "crate_keys", "custom"]),
      label: z.string().max(100),
      amount: z.string().max(100)
    }))
  }))
})).handler(updatePrizes_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const t = findTournament(file, data.tournamentId);
  if (!t) return {
    success: false,
    error: "Not found"
  };
  t.prizes = data.prizes;
  t.updatedAt = Date.now();
  writeData(file);
  return {
    success: true
  };
});
const updateRules_createServerFn_handler = createServerRpc({
  id: "01ea8263bb9459ad19b5cf0ab1ddad64bc72d0c40bfd096d921c5fd5193acb85",
  name: "updateRules",
  filename: "src/server/tournamentServer.ts"
}, (opts) => updateRules.__executeServer(opts));
const updateRules = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  allowedMods: z.array(z.string()),
  allowedClients: z.array(z.string()),
  bannedMods: z.array(z.string()),
  replayRequirements: z.string().max(1e3),
  disconnectRules: z.string().max(1e3),
  staffDecisions: z.string().max(1e3),
  custom: z.array(z.string())
})).handler(updateRules_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const t = findTournament(file, data.tournamentId);
  if (!t) return {
    success: false,
    error: "Not found"
  };
  t.rules = {
    allowedMods: data.allowedMods,
    allowedClients: data.allowedClients,
    bannedMods: data.bannedMods,
    replayRequirements: data.replayRequirements,
    disconnectRules: data.disconnectRules,
    staffDecisions: data.staffDecisions,
    custom: data.custom
  };
  t.updatedAt = Date.now();
  writeData(file);
  return {
    success: true
  };
});
const addAnnouncement_createServerFn_handler = createServerRpc({
  id: "a8a8e23241efb177deb2aba1bf9731779101003bcbbbb7eb9b128aa87053603d",
  name: "addAnnouncement",
  filename: "src/server/tournamentServer.ts"
}, (opts) => addAnnouncement.__executeServer(opts));
const addAnnouncement = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().max(2e3).default(""),
  type: z.enum(["info", "warning", "success"]).default("info")
})).handler(addAnnouncement_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const t = findTournament(file, data.tournamentId);
  if (!t) return {
    success: false,
    error: "Not found"
  };
  const ann = {
    id: uid(),
    title: data.title,
    body: data.body,
    type: data.type,
    createdAt: Date.now()
  };
  t.announcements.unshift(ann);
  t.updatedAt = Date.now();
  writeData(file);
  return {
    success: true
  };
});
const deleteAnnouncement_createServerFn_handler = createServerRpc({
  id: "1c5e5efbd37fd52be1153577b0bc84b56e1aadeaaa601d4f3595b4959d434c11",
  name: "deleteAnnouncement",
  filename: "src/server/tournamentServer.ts"
}, (opts) => deleteAnnouncement.__executeServer(opts));
const deleteAnnouncement = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  announcementId: z.string().min(1)
})).handler(deleteAnnouncement_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const t = findTournament(file, data.tournamentId);
  if (!t) return {
    success: false,
    error: "Not found"
  };
  const idx = t.announcements.findIndex((a) => a.id === data.announcementId);
  if (idx === -1) return {
    success: false,
    error: "Not found"
  };
  t.announcements.splice(idx, 1);
  t.updatedAt = Date.now();
  writeData(file);
  return {
    success: true
  };
});
const addTeamManually_createServerFn_handler = createServerRpc({
  id: "46b286e4121041827fc40d3932de1ba673080275db62fb867e894f445293b167",
  name: "addTeamManually",
  filename: "src/server/tournamentServer.ts"
}, (opts) => addTeamManually.__executeServer(opts));
const addTeamManually = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  teamName: z.string().min(1).max(50),
  captain: z.string().max(50).default(""),
  players: z.array(z.string().min(1).max(50)).max(50).default([]),
  status: z.enum(["pending", "approved", "rejected", "eliminated", "disqualified"]).default("approved"),
  notes: z.string().max(500).default("")
})).handler(addTeamManually_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const t = findTournament(file, data.tournamentId);
  if (!t) return {
    success: false,
    error: "Tournament not found"
  };
  const captain = data.captain.trim();
  const allPlayers = captain ? [captain, ...data.players.filter((p) => p !== captain)] : data.players.filter(Boolean);
  const nameLower = data.teamName.toLowerCase();
  if (t.teams.some((team2) => team2.name.toLowerCase() === nameLower && team2.status !== "rejected")) {
    return {
      success: false,
      error: "A team with this name already exists"
    };
  }
  const now = Date.now();
  const team = {
    id: uid(),
    name: data.teamName,
    captain,
    players: allPlayers,
    status: data.status,
    registeredAt: now,
    notes: data.notes
  };
  t.teams.push(team);
  t.updatedAt = now;
  writeData(file);
  return {
    success: true,
    team
  };
});
const bulkUpdateTeamStatus_createServerFn_handler = createServerRpc({
  id: "253cfb485fcf38e4b64688a9536fa7551fe3288c55ccf22c137d68f2a7ab25de",
  name: "bulkUpdateTeamStatus",
  filename: "src/server/tournamentServer.ts"
}, (opts) => bulkUpdateTeamStatus.__executeServer(opts));
const bulkUpdateTeamStatus = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  teamIds: z.array(z.string().min(1)),
  status: z.enum(["pending", "approved", "rejected", "eliminated", "disqualified"]),
  notes: z.string().max(500).default("")
})).handler(bulkUpdateTeamStatus_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const t = findTournament(file, data.tournamentId);
  if (!t) return {
    success: false,
    updated: 0,
    error: "Tournament not found"
  };
  let updated = 0;
  for (const teamId of data.teamIds) {
    const team = t.teams.find((tm) => tm.id === teamId);
    if (team) {
      team.status = data.status;
      team.notes = data.notes;
      updated++;
    }
  }
  t.updatedAt = Date.now();
  writeData(file);
  return {
    success: true,
    updated
  };
});
const updateBracketDisplay_createServerFn_handler = createServerRpc({
  id: "456bc51f6eac31f5f053da10c44d76ebf164ee4d1f2aa17e88b8fa4a1a837a9f",
  name: "updateBracketDisplay",
  filename: "src/server/tournamentServer.ts"
}, (opts) => updateBracketDisplay.__executeServer(opts));
const updateBracketDisplay = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  theme: z.enum(["esports", "blue", "neon", "championship", "minimal"]),
  scaleMode: z.enum(["auto", "manual"]),
  manualScale: z.number().min(0.3).max(2)
})).handler(updateBracketDisplay_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const t = findTournament(file, data.tournamentId);
  if (!t) return {
    success: false,
    error: "Tournament not found"
  };
  t.bracketDisplay = {
    theme: data.theme,
    scaleMode: data.scaleMode,
    manualScale: data.manualScale
  };
  t.updatedAt = Date.now();
  writeData(file);
  return {
    success: true
  };
});
const duplicateTournament_createServerFn_handler = createServerRpc({
  id: "446a7969c758ce6a016dbd6cd9017c550127a4cec446e100a8dc380f723ebc00",
  name: "duplicateTournament",
  filename: "src/server/tournamentServer.ts"
}, (opts) => duplicateTournament.__executeServer(opts));
const duplicateTournament = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  id: z.string().min(1)
})).handler(duplicateTournament_createServerFn_handler, async ({
  data
}) => {
  const file = readData();
  const src = findTournament(file, data.id);
  if (!src) return {
    success: false,
    error: "Not found"
  };
  const now = Date.now();
  const copy = {
    ...JSON.parse(JSON.stringify(src)),
    id: uid(),
    name: `${src.name} (Copy)`,
    status: "upcoming",
    teams: [],
    matches: [],
    bracket: null,
    announcements: [],
    registrationDeadline: null,
    startDate: null,
    createdAt: now,
    updatedAt: now
  };
  file.tournaments.unshift(copy);
  writeData(file);
  return {
    success: true,
    tournament: copy
  };
});
export {
  addAnnouncement_createServerFn_handler,
  addTeamManually_createServerFn_handler,
  archiveTournament_createServerFn_handler,
  bulkUpdateTeamStatus_createServerFn_handler,
  createTournament_createServerFn_handler,
  deleteAnnouncement_createServerFn_handler,
  deleteTournament_createServerFn_handler,
  duplicateTournament_createServerFn_handler,
  editTeam_createServerFn_handler,
  generateBracket_createServerFn_handler,
  getTournamentData_createServerFn_handler,
  registerTeam_createServerFn_handler,
  removeTeam_createServerFn_handler,
  setActiveTournament_createServerFn_handler,
  updateBracketDisplay_createServerFn_handler,
  updateBracketSlot_createServerFn_handler,
  updateMatch_createServerFn_handler,
  updatePrizes_createServerFn_handler,
  updateRules_createServerFn_handler,
  updateTeamStatus_createServerFn_handler,
  updateTournament_createServerFn_handler
};
