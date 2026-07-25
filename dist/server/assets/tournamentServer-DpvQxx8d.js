import { c as createSsrRpc } from "./router-D-1D0-Hz.js";
import { z } from "zod";
import { c as createServerFn } from "../server.js";
const getTournamentData = createServerFn({
  method: "GET"
}).handler(createSsrRpc("9f3c31e88fa1dee173ea06b9582248fd7ee4180a9a0b7963633607284a9e0d9f"));
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
const createTournament = createServerFn({
  method: "POST"
}).inputValidator(TournamentInputSchema).handler(createSsrRpc("dbced905a634ef7c5bb2a83b2634a776cca737f979e54211edd66306e2568768"));
const updateTournament = createServerFn({
  method: "POST"
}).inputValidator(TournamentInputSchema.extend({
  id: z.string().min(1)
})).handler(createSsrRpc("121f9159a4d0e4bfcabdfc34526c81d2267baf979f42ff893cc77d96685c5450"));
const deleteTournament = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  id: z.string().min(1)
})).handler(createSsrRpc("bc8e2f55893ff25b7a20ffb276b5353f2f509f03e7951ad10b9ac3a760e7067f"));
const setActiveTournament = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  id: z.string().nullable()
})).handler(createSsrRpc("8bde410c414b4bdd05289d750f4a36586b78a106a52e17079ca6db8772ff081e"));
const archiveTournament = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  id: z.string().min(1)
})).handler(createSsrRpc("cfef4f6f62c7ffd16bec0f981079bd01e4e58a67cf057297a6d296085a12dc3b"));
const registerTeam = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  teamName: z.string().min(1).max(50),
  captain: z.string().max(50).default(""),
  players: z.array(z.string().min(1).max(50)).max(50).default([])
})).handler(createSsrRpc("0945cb194bd5b5e925113942c2b7d3ed8fae8117a84c35d407c21835be8da21d"));
const updateTeamStatus = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  teamId: z.string().min(1),
  status: z.enum(["pending", "approved", "rejected", "eliminated", "disqualified"]),
  notes: z.string().max(500).default("")
})).handler(createSsrRpc("f9e96b9a78bbbfcc1a4ed07f2eba5da3f735e1b70a2d1ea221b4c58dbdb3797c"));
createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1).max(50),
  captain: z.string().max(50).default(""),
  players: z.array(z.string().min(1).max(50)).max(50).default([])
})).handler(createSsrRpc("1a36faa8c7def6c71b5dad9a54f35ad328430bc15d8e4aca601503882a15687b"));
const removeTeam = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  teamId: z.string().min(1)
})).handler(createSsrRpc("afda6fd326aea53beacfb00c64a2b9bdc14a7bb746d3e4f80be750669e2d99f8"));
const generateBracket = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  type: z.enum(["single_elimination", "double_elimination"]),
  shuffle: z.boolean().default(true)
})).handler(createSsrRpc("c646772e903b0407b4dcf204f01727e0e0397269ed3db5dccfcff50d62fccea1"));
const updateBracketSlot = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
  team1Id: z.string().nullable().default(null),
  team2Id: z.string().nullable().default(null)
})).handler(createSsrRpc("ec7de07a550e8200978e62a7ce4ad1ce08e46d47ff16a43af5b8c9d15545d2e6"));
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
})).handler(createSsrRpc("d075749bf4618bcaacc0b4ac11770dc6eb95dbfda90f3452bbdff782e2d04b0c"));
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
})).handler(createSsrRpc("4e7af7ac57eea41a6b1e106318978ab1f1892e6fd452adcd0e9bf904835f9191"));
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
})).handler(createSsrRpc("01ea8263bb9459ad19b5cf0ab1ddad64bc72d0c40bfd096d921c5fd5193acb85"));
const addAnnouncement = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().max(2e3).default(""),
  type: z.enum(["info", "warning", "success"]).default("info")
})).handler(createSsrRpc("a8a8e23241efb177deb2aba1bf9731779101003bcbbbb7eb9b128aa87053603d"));
const deleteAnnouncement = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  announcementId: z.string().min(1)
})).handler(createSsrRpc("1c5e5efbd37fd52be1153577b0bc84b56e1aadeaaa601d4f3595b4959d434c11"));
const addTeamManually = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  teamName: z.string().min(1).max(50),
  captain: z.string().max(50).default(""),
  players: z.array(z.string().min(1).max(50)).max(50).default([]),
  status: z.enum(["pending", "approved", "rejected", "eliminated", "disqualified"]).default("approved"),
  notes: z.string().max(500).default("")
})).handler(createSsrRpc("46b286e4121041827fc40d3932de1ba673080275db62fb867e894f445293b167"));
const bulkUpdateTeamStatus = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  teamIds: z.array(z.string().min(1)),
  status: z.enum(["pending", "approved", "rejected", "eliminated", "disqualified"]),
  notes: z.string().max(500).default("")
})).handler(createSsrRpc("253cfb485fcf38e4b64688a9536fa7551fe3288c55ccf22c137d68f2a7ab25de"));
const updateBracketDisplay = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  tournamentId: z.string().min(1),
  theme: z.enum(["esports", "blue", "neon", "championship", "minimal"]),
  scaleMode: z.enum(["auto", "manual"]),
  manualScale: z.number().min(0.3).max(2)
})).handler(createSsrRpc("456bc51f6eac31f5f053da10c44d76ebf164ee4d1f2aa17e88b8fa4a1a837a9f"));
const duplicateTournament = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  id: z.string().min(1)
})).handler(createSsrRpc("446a7969c758ce6a016dbd6cd9017c550127a4cec446e100a8dc380f723ebc00"));
export {
  generateBracket as a,
  updateBracketSlot as b,
  updateMatch as c,
  updateTournament as d,
  createTournament as e,
  duplicateTournament as f,
  getTournamentData as g,
  archiveTournament as h,
  deleteTournament as i,
  bulkUpdateTeamStatus as j,
  updateTeamStatus as k,
  removeTeam as l,
  updatePrizes as m,
  updateRules as n,
  addAnnouncement as o,
  deleteAnnouncement as p,
  addTeamManually as q,
  registerTeam as r,
  setActiveTournament as s,
  updateBracketDisplay as u
};
