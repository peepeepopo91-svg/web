// ─── Tournament Server Functions ──────────────────────────────────────────────
// All writes are server-authoritative, atomically persisted, SSE-broadcast,
// and scheduled for GitHub backup.

import { createServerFn }                       from '@tanstack/react-start'
import { getRequestIP }                         from '@tanstack/react-start/server'
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs'
import { resolve }                              from 'node:path'
import { z }                                    from 'zod'
import { broadcastTournamentUpdate }            from './sseRegistry'
import { scheduleTournamentBackup }             from './miningBackup'
import type {
  Tournament, TournamentsFile, Team, Match, Announcement,
  BracketRound, Prize,
} from '../data/tournament'
import { DEFAULT_RULES, DEFAULT_PRIZES }        from '../data/tournament'

const DATA_DIR = resolve('data')
const FILE     = 'tournaments.json'

// ─── File I/O ─────────────────────────────────────────────────────────────────

function readData(): TournamentsFile {
  try {
    return JSON.parse(readFileSync(resolve(DATA_DIR, FILE), 'utf8')) as TournamentsFile
  } catch {
    return { tournaments: [], activeTournamentId: null }
  }
}

function writeData(data: TournamentsFile): void {
  mkdirSync(DATA_DIR, { recursive: true })
  const content = JSON.stringify(data, null, 2)
  const target  = resolve(DATA_DIR, FILE)
  const tmp     = `${target}.tmp`
  writeFileSync(tmp, content, 'utf8')
  renameSync(tmp, target)
  broadcastTournamentUpdate()
  scheduleTournamentBackup()
}

function findTournament(data: TournamentsFile, id: string): Tournament | undefined {
  return data.tournaments.find(t => t.id === id)
}

function uid(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

// ─── GET: load all tournament data ───────────────────────────────────────────

export const getTournamentData = createServerFn({ method: 'GET' })
  .handler((): TournamentsFile => readData())

// ─── POST: create tournament ──────────────────────────────────────────────────

const TournamentInputSchema = z.object({
  name:                 z.string().min(1).max(100),
  description:          z.string().max(1000).default(''),
  banner:               z.string().max(500).default(''),
  status:               z.enum(['upcoming','registration_open','registration_closed','live','completed','archived']),
  gamemode:             z.string().max(50).default(''),
  serverIp:             z.string().max(100).default(''),
  maxTeamSize:          z.number().int().min(1).max(50).default(2),
  minTeamSize:          z.number().int().min(1).max(50).default(2),
  requireCaptain:       z.boolean().default(true),
  registrationDeadline: z.number().nullable().default(null),
  startDate:            z.number().nullable().default(null),
  prizePool:            z.string().max(200).default(''),
})

export const createTournament = createServerFn({ method: 'POST' })
  .inputValidator(TournamentInputSchema)
  .handler(async ({ data }): Promise<{ success: boolean; tournament?: Tournament; error?: string }> => {
    const file = readData()
    const now  = Date.now()
    const tournament: Tournament = {
      id:                   uid(),
      name:                 data.name,
      description:          data.description,
      banner:               data.banner,
      status:               data.status,
      gamemode:             data.gamemode,
      serverIp:             data.serverIp,
      maxTeamSize:          data.maxTeamSize,
      minTeamSize:          data.minTeamSize,
      requireCaptain:       data.requireCaptain,
      registrationDeadline: data.registrationDeadline,
      startDate:            data.startDate,
      prizePool:            data.prizePool,
      prizes:               DEFAULT_PRIZES,
      rules:                DEFAULT_RULES,
      bracket:              null,
      teams:                [],
      matches:              [],
      announcements:        [],
      createdAt:            now,
      updatedAt:            now,
    }
    file.tournaments.unshift(tournament)
    writeData(file)
    return { success: true, tournament }
  })

// ─── POST: update tournament ──────────────────────────────────────────────────

export const updateTournament = createServerFn({ method: 'POST' })
  .inputValidator(TournamentInputSchema.extend({ id: z.string().min(1) }))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const file = readData()
    const t    = findTournament(file, data.id)
    if (!t) return { success: false, error: 'Tournament not found' }
    Object.assign(t, {
      name: data.name, description: data.description, banner: data.banner,
      status: data.status, gamemode: data.gamemode, serverIp: data.serverIp,
      maxTeamSize: data.maxTeamSize, minTeamSize: data.minTeamSize,
      registrationDeadline: data.registrationDeadline, startDate: data.startDate,
      prizePool: data.prizePool, updatedAt: Date.now(),
    })
    writeData(file)
    return { success: true }
  })

// ─── POST: delete tournament ──────────────────────────────────────────────────

export const deleteTournament = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const file = readData()
    const idx  = file.tournaments.findIndex(t => t.id === data.id)
    if (idx === -1) return { success: false, error: 'Not found' }
    file.tournaments.splice(idx, 1)
    if (file.activeTournamentId === data.id) file.activeTournamentId = null
    writeData(file)
    return { success: true }
  })

// ─── POST: set active tournament ─────────────────────────────────────────────

export const setActiveTournament = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().nullable() }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const file = readData()
    file.activeTournamentId = data.id
    writeData(file)
    return { success: true }
  })

// ─── POST: archive tournament ─────────────────────────────────────────────────

export const archiveTournament = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const file = readData()
    const t    = findTournament(file, data.id)
    if (!t) return { success: false, error: 'Not found' }
    t.status    = 'archived'
    t.updatedAt = Date.now()
    if (file.activeTournamentId === data.id) file.activeTournamentId = null
    writeData(file)
    return { success: true }
  })

// ─── POST: register team ──────────────────────────────────────────────────────

export const registerTeam = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    tournamentId: z.string().min(1),
    teamName:     z.string().min(1).max(50),
    captain:      z.string().max(50).default(''),
    players:      z.array(z.string().min(1).max(50)).max(50).default([]),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; team?: Team; error?: string }> => {
    const file = readData()
    const t    = findTournament(file, data.tournamentId)
    if (!t) return { success: false, error: 'Tournament not found' }
    if (t.status !== 'registration_open') return { success: false, error: 'Registration is not open' }

    const now = Date.now()
    if (t.registrationDeadline && now > t.registrationDeadline) {
      return { success: false, error: 'Registration deadline has passed' }
    }

    // ── Captain requirement check ─────────────────────────────────────────────
    const needsCaptain = t.requireCaptain !== false
    if (needsCaptain && !data.captain.trim()) {
      return { success: false, error: 'Captain name is required for this tournament' }
    }

    // ── IP rate limit: max 3 registrations per IP ─────────────────────────────
    const ip = getRequestIP({ xForwardedFor: true }) ?? 'unknown'
    if (ip !== 'unknown') {
      const fromThisIp = t.teams.filter(
        team => team.registrationIp === ip && team.status !== 'rejected',
      ).length
      if (fromThisIp >= 3) {
        return { success: false, error: 'Maximum of 3 team registrations per IP address has been reached.' }
      }
    }

    const captain    = data.captain.trim()
    const allPlayers = captain
      ? [captain, ...data.players.filter(p => p !== captain)]
      : data.players.filter(Boolean)
    if (allPlayers.length < t.minTeamSize) {
      return { success: false, error: `Minimum team size is ${t.minTeamSize}` }
    }
    if (allPlayers.length > t.maxTeamSize) {
      return { success: false, error: `Maximum team size is ${t.maxTeamSize}` }
    }

    // Check for duplicate team name
    const nameLower = data.teamName.toLowerCase()
    if (t.teams.some(team => team.name.toLowerCase() === nameLower && team.status !== 'rejected')) {
      return { success: false, error: 'A team with this name is already registered' }
    }

    // Check for duplicate players
    const registeredPlayers = t.teams
      .filter(team => team.status !== 'rejected')
      .flatMap(team => team.players.map(p => p.toLowerCase()))
    const duplicate = allPlayers.find(p => registeredPlayers.includes(p.toLowerCase()))
    if (duplicate) {
      return { success: false, error: `Player "${duplicate}" is already registered in another team` }
    }

    const team: Team = {
      id:             uid(),
      name:           data.teamName,
      captain:        captain,
      players:        allPlayers,
      status:         'pending',
      registeredAt:   now,
      notes:          '',
      registrationIp: ip,
    }
    t.teams.push(team)
    t.updatedAt = now
    writeData(file)
    return { success: true, team }
  })

// ─── POST: update team status (admin) ────────────────────────────────────────

export const updateTeamStatus = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    tournamentId: z.string().min(1),
    teamId:       z.string().min(1),
    status:       z.enum(['pending','approved','rejected','eliminated','disqualified']),
    notes:        z.string().max(500).default(''),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const file = readData()
    const t    = findTournament(file, data.tournamentId)
    if (!t) return { success: false, error: 'Tournament not found' }
    const team = t.teams.find(team => team.id === data.teamId)
    if (!team) return { success: false, error: 'Team not found' }
    team.status  = data.status
    team.notes   = data.notes
    t.updatedAt  = Date.now()
    writeData(file)
    return { success: true }
  })

// ─── POST: edit team (admin) ──────────────────────────────────────────────────

export const editTeam = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    tournamentId: z.string().min(1),
    teamId:       z.string().min(1),
    name:         z.string().min(1).max(50),
    captain:      z.string().max(50).default(''),
    players:      z.array(z.string().min(1).max(50)).max(50).default([]),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const file = readData()
    const t    = findTournament(file, data.tournamentId)
    if (!t) return { success: false, error: 'Tournament not found' }
    const team = t.teams.find(team => team.id === data.teamId)
    if (!team) return { success: false, error: 'Team not found' }
    team.name    = data.name
    team.captain = data.captain.trim()
    team.players = data.players
    t.updatedAt  = Date.now()
    writeData(file)
    return { success: true }
  })

// ─── POST: remove team (admin) ────────────────────────────────────────────────

export const removeTeam = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tournamentId: z.string().min(1), teamId: z.string().min(1) }))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const file = readData()
    const t    = findTournament(file, data.tournamentId)
    if (!t) return { success: false, error: 'Tournament not found' }
    const idx  = t.teams.findIndex(team => team.id === data.teamId)
    if (idx === -1) return { success: false, error: 'Team not found' }
    t.teams.splice(idx, 1)
    t.updatedAt = Date.now()
    writeData(file)
    return { success: true }
  })

// ─── POST: generate bracket (admin) ──────────────────────────────────────────

export const generateBracket = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    tournamentId: z.string().min(1),
    type:         z.enum(['single_elimination', 'double_elimination']),
    shuffle:      z.boolean().default(true),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const file = readData()
    const t    = findTournament(file, data.tournamentId)
    if (!t) return { success: false, error: 'Tournament not found' }

    const approved = t.teams.filter(team => team.status === 'approved')
    if (approved.length < 2) return { success: false, error: 'Need at least 2 approved teams' }

    // Shuffle teams if requested
    const teams = data.shuffle
      ? [...approved].sort(() => Math.random() - 0.5)
      : [...approved]

    // Pad to next power of 2 — extra slots stay empty (TBD)
    const n = nextPow2(teams.length)

    // Generate matches
    const rounds: BracketRound[] = []
    const matches: Match[]       = []
    let matchNumber = 1

    const roundNames = buildRoundNames(n)

    for (let r = 0; r < Math.log2(n); r++) {
      const roundMatchIds: string[] = []
      const pairs = n / Math.pow(2, r + 1)

      for (let p = 0; p < pairs; p++) {
        const matchId = uid()
        let team1Id: string | null = null
        let team2Id: string | null = null

        if (r === 0) {
          // Fill sequentially — missing slots stay null (shown as TBD)
          team1Id = teams[p * 2]?.id     ?? null
          team2Id = teams[p * 2 + 1]?.id ?? null
        }

        const match: Match = {
          id:           matchId,
          round:        r,
          matchNumber:  matchNumber++,
          bracketSide:  r === Math.log2(n) - 1 ? 'finals' : 'winners',
          team1Id,
          team2Id,
          score1:       0,
          score2:       0,
          winnerId:     null,
          status:       r === 0 ? 'scheduled' : 'pending',
          scheduledAt:  null,
          completedAt:  null,
          arena:        '',
          gamemode:     t.gamemode,
          referee:      '',
          notes:        '',
          replayLink:   '',
        }
        matches.push(match)
        roundMatchIds.push(matchId)
      }
      rounds.push({ name: roundNames[r] || `Round ${r + 1}`, matchIds: roundMatchIds })
    }

    t.bracket  = { type: data.type, rounds }
    t.matches  = matches
    t.updatedAt = Date.now()
    writeData(file)
    return { success: true }
  })

function nextPow2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}


function buildRoundNames(n: number): string[] {
  const rounds = Math.log2(n)
  const names: string[] = []
  for (let i = 0; i < rounds; i++) {
    const remaining = n / Math.pow(2, i + 1)
    if (remaining === 1) names.push('Finals')
    else if (remaining === 2) names.push('Semi-Finals')
    else if (remaining === 4) names.push('Quarter-Finals')
    else names.push(`Round of ${remaining * 2}`)
  }
  return names
}

// ─── POST: update bracket slot (edit which teams play each other) ─────────────

export const updateBracketSlot = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    tournamentId: z.string().min(1),
    matchId:      z.string().min(1),
    team1Id:      z.string().nullable().default(null),
    team2Id:      z.string().nullable().default(null),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const file  = readData()
    const t     = findTournament(file, data.tournamentId)
    if (!t) return { success: false, error: 'Tournament not found' }
    const match = t.matches.find(m => m.id === data.matchId)
    if (!match) return { success: false, error: 'Match not found' }

    const changed = match.team1Id !== data.team1Id || match.team2Id !== data.team2Id
    match.team1Id = data.team1Id
    match.team2Id = data.team2Id

    // Reset result whenever the matchup changes
    if (changed) {
      match.score1   = 0
      match.score2   = 0
      match.winnerId = null
    }

    // Auto-update status
    if (match.team1Id && match.team2Id && match.status === 'pending') {
      match.status = 'scheduled'
    }
    if ((!match.team1Id || !match.team2Id) && match.status === 'scheduled') {
      match.status = 'pending'
    }

    t.updatedAt = Date.now()
    writeData(file)
    return { success: true }
  })

// ─── POST: update match (admin) ───────────────────────────────────────────────

export const updateMatch = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    tournamentId: z.string().min(1),
    matchId:      z.string().min(1),
    score1:       z.number().int().min(0).default(0),
    score2:       z.number().int().min(0).default(0),
    winnerId:     z.string().nullable().default(null),
    status:       z.enum(['pending','scheduled','live','completed']),
    scheduledAt:  z.number().nullable().default(null),
    arena:        z.string().max(100).default(''),
    gamemode:     z.string().max(50).default(''),
    referee:      z.string().max(50).default(''),
    notes:        z.string().max(500).default(''),
    replayLink:   z.string().max(500).default(''),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const file = readData()
    const t    = findTournament(file, data.tournamentId)
    if (!t) return { success: false, error: 'Tournament not found' }
    const match = t.matches.find(m => m.id === data.matchId)
    if (!match) return { success: false, error: 'Match not found' }

    match.score1      = data.score1
    match.score2      = data.score2
    match.winnerId    = data.winnerId
    match.status      = data.status
    match.scheduledAt = data.scheduledAt
    match.arena       = data.arena
    match.gamemode    = data.gamemode
    match.referee     = data.referee
    match.notes       = data.notes
    match.replayLink  = data.replayLink

    if (data.status === 'completed' && !match.completedAt) {
      match.completedAt = Date.now()
    }
    if (data.status !== 'completed') {
      match.completedAt = null
    }

    // Auto-advance winner in bracket
    if (data.winnerId && t.bracket) {
      advanceWinner(t, match, data.winnerId)
    }

    t.updatedAt = Date.now()
    writeData(file)
    return { success: true }
  })

function advanceWinner(t: Tournament, completedMatch: Match, winnerId: string): void {
  if (!t.bracket) return
  const { rounds } = t.bracket

  for (let r = 0; r < rounds.length - 1; r++) {
    const round = rounds[r]
    const idx   = round.matchIds.indexOf(completedMatch.id)
    if (idx === -1) continue

    const nextRound    = rounds[r + 1]
    const nextMatchIdx = Math.floor(idx / 2)
    const nextMatchId  = nextRound?.matchIds[nextMatchIdx]
    if (!nextMatchId) continue

    const nextMatch = t.matches.find(m => m.id === nextMatchId)
    if (!nextMatch) continue

    if (idx % 2 === 0) {
      nextMatch.team1Id = winnerId
    } else {
      nextMatch.team2Id = winnerId
    }

    // If both slots filled, move to scheduled
    if (nextMatch.team1Id && nextMatch.team2Id && nextMatch.status === 'pending') {
      nextMatch.status = 'scheduled'
    }
    break
  }
}

// ─── POST: update prizes (admin) ──────────────────────────────────────────────

export const updatePrizes = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    tournamentId: z.string().min(1),
    prizes:       z.array(z.object({
      placement: z.number().int().min(1),
      label:     z.string().max(100),
      rewards:   z.array(z.object({
        type:   z.enum(['coins','gems','rank','crate_keys','custom']),
        label:  z.string().max(100),
        amount: z.string().max(100),
      })),
    })),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const file = readData()
    const t    = findTournament(file, data.tournamentId)
    if (!t) return { success: false, error: 'Not found' }
    t.prizes    = data.prizes as Prize[]
    t.updatedAt = Date.now()
    writeData(file)
    return { success: true }
  })

// ─── POST: update rules (admin) ───────────────────────────────────────────────

export const updateRules = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    tournamentId:         z.string().min(1),
    allowedMods:          z.array(z.string()),
    allowedClients:       z.array(z.string()),
    bannedMods:           z.array(z.string()),
    replayRequirements:   z.string().max(1000),
    disconnectRules:      z.string().max(1000),
    staffDecisions:       z.string().max(1000),
    custom:               z.array(z.string()),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const file = readData()
    const t    = findTournament(file, data.tournamentId)
    if (!t) return { success: false, error: 'Not found' }
    t.rules = {
      allowedMods:        data.allowedMods,
      allowedClients:     data.allowedClients,
      bannedMods:         data.bannedMods,
      replayRequirements: data.replayRequirements,
      disconnectRules:    data.disconnectRules,
      staffDecisions:     data.staffDecisions,
      custom:             data.custom,
    }
    t.updatedAt = Date.now()
    writeData(file)
    return { success: true }
  })

// ─── POST: add announcement (admin) ──────────────────────────────────────────

export const addAnnouncement = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    tournamentId: z.string().min(1),
    title:        z.string().min(1).max(200),
    body:         z.string().max(2000).default(''),
    type:         z.enum(['info','warning','success']).default('info'),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const file = readData()
    const t    = findTournament(file, data.tournamentId)
    if (!t) return { success: false, error: 'Not found' }
    const ann: Announcement = {
      id:        uid(),
      title:     data.title,
      body:      data.body,
      type:      data.type,
      createdAt: Date.now(),
    }
    t.announcements.unshift(ann)
    t.updatedAt = Date.now()
    writeData(file)
    return { success: true }
  })

// ─── POST: delete announcement (admin) ────────────────────────────────────────

export const deleteAnnouncement = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tournamentId: z.string().min(1), announcementId: z.string().min(1) }))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const file = readData()
    const t    = findTournament(file, data.tournamentId)
    if (!t) return { success: false, error: 'Not found' }
    const idx  = t.announcements.findIndex(a => a.id === data.announcementId)
    if (idx === -1) return { success: false, error: 'Not found' }
    t.announcements.splice(idx, 1)
    t.updatedAt = Date.now()
    writeData(file)
    return { success: true }
  })

// ─── POST: add team manually (admin bypass) ──────────────────────────────────

export const addTeamManually = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    tournamentId: z.string().min(1),
    teamName:     z.string().min(1).max(50),
    captain:      z.string().max(50).default(''),
    players:      z.array(z.string().min(1).max(50)).max(50).default([]),
    status:       z.enum(['pending','approved','rejected','eliminated','disqualified']).default('approved'),
    notes:        z.string().max(500).default(''),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; team?: Team; error?: string }> => {
    const file = readData()
    const t    = findTournament(file, data.tournamentId)
    if (!t) return { success: false, error: 'Tournament not found' }

    const captain    = data.captain.trim()
    const allPlayers = captain
      ? [captain, ...data.players.filter(p => p !== captain)]
      : data.players.filter(Boolean)

    const nameLower = data.teamName.toLowerCase()
    if (t.teams.some(team => team.name.toLowerCase() === nameLower && team.status !== 'rejected')) {
      return { success: false, error: 'A team with this name already exists' }
    }

    const now  = Date.now()
    const team: Team = {
      id:           uid(),
      name:         data.teamName,
      captain:      captain,
      players:      allPlayers,
      status:       data.status,
      registeredAt: now,
      notes:        data.notes,
    }
    t.teams.push(team)
    t.updatedAt = now
    writeData(file)
    return { success: true, team }
  })

// ─── POST: bulk update team statuses (admin) ──────────────────────────────────

export const bulkUpdateTeamStatus = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    tournamentId: z.string().min(1),
    teamIds:      z.array(z.string().min(1)),
    status:       z.enum(['pending','approved','rejected','eliminated','disqualified']),
    notes:        z.string().max(500).default(''),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; updated: number; error?: string }> => {
    const file = readData()
    const t    = findTournament(file, data.tournamentId)
    if (!t) return { success: false, updated: 0, error: 'Tournament not found' }
    let updated = 0
    for (const teamId of data.teamIds) {
      const team = t.teams.find(tm => tm.id === teamId)
      if (team) { team.status = data.status; team.notes = data.notes; updated++ }
    }
    t.updatedAt = Date.now()
    writeData(file)
    return { success: true, updated }
  })

// ─── POST: update bracket display settings (admin) ───────────────────────────

export const updateBracketDisplay = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    tournamentId: z.string().min(1),
    theme:        z.enum(['esports', 'blue', 'neon', 'championship', 'minimal']),
    scaleMode:    z.enum(['auto', 'manual']),
    manualScale:  z.number().min(0.3).max(2.0),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const file = readData()
    const t    = findTournament(file, data.tournamentId)
    if (!t) return { success: false, error: 'Tournament not found' }
    t.bracketDisplay = { theme: data.theme, scaleMode: data.scaleMode, manualScale: data.manualScale }
    t.updatedAt = Date.now()
    writeData(file)
    return { success: true }
  })

// ─── POST: duplicate tournament (admin) ──────────────────────────────────────

export const duplicateTournament = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }): Promise<{ success: boolean; tournament?: Tournament; error?: string }> => {
    const file = readData()
    const src  = findTournament(file, data.id)
    if (!src) return { success: false, error: 'Not found' }
    const now  = Date.now()
    const copy: Tournament = {
      ...JSON.parse(JSON.stringify(src)),
      id:                   uid(),
      name:                 `${src.name} (Copy)`,
      status:               'upcoming',
      teams:                [],
      matches:              [],
      bracket:              null,
      announcements:        [],
      registrationDeadline: null,
      startDate:            null,
      createdAt:            now,
      updatedAt:            now,
    }
    file.tournaments.unshift(copy)
    writeData(file)
    return { success: true, tournament: copy }
  })
