// ─── Tournament Types ──────────────────────────────────────────────────────────

export type TournamentStatus =
  | 'upcoming'
  | 'registration_open'
  | 'registration_closed'
  | 'live'
  | 'completed'
  | 'archived'

export type BracketType = 'single_elimination' | 'double_elimination'
export type MatchStatus = 'pending' | 'scheduled' | 'live' | 'completed' | 'bye'
export type TeamStatus = 'pending' | 'approved' | 'rejected' | 'eliminated' | 'disqualified'
export type AnnouncementType = 'info' | 'warning' | 'success'
export type BracketSide = 'winners' | 'losers' | 'finals' | 'grand_finals'
export type RewardType = 'coins' | 'gems' | 'rank' | 'crate_keys' | 'custom'

export interface Reward {
  type: RewardType
  label: string
  amount: string
}

export interface Prize {
  placement: number
  label: string
  rewards: Reward[]
}

export interface TournamentRules {
  allowedMods: string[]
  allowedClients: string[]
  bannedMods: string[]
  replayRequirements: string
  disconnectRules: string
  staffDecisions: string
  custom: string[]
}

export interface Team {
  id: string
  name: string
  captain: string
  players: string[]
  status: TeamStatus
  registeredAt: number
  notes: string
  registrationIp?: string
}

export interface Match {
  id: string
  round: number
  matchNumber: number
  bracketSide: BracketSide
  team1Id: string | null
  team2Id: string | null
  score1: number
  score2: number
  winnerId: string | null
  status: MatchStatus
  scheduledAt: number | null
  completedAt: number | null
  arena: string
  gamemode: string
  referee: string
  notes: string
  replayLink: string
}

export interface BracketRound {
  name: string
  matchIds: string[]
}

export interface Bracket {
  type: BracketType
  rounds: BracketRound[]
}

export interface Announcement {
  id: string
  title: string
  body: string
  type: AnnouncementType
  createdAt: number
}

export type BracketThemeId = 'esports' | 'blue' | 'neon' | 'championship' | 'minimal'

export interface BracketDisplaySettings {
  theme: BracketThemeId
  scaleMode: 'auto' | 'manual'
  manualScale: number  // 0.3 – 2.0; used when scaleMode === 'manual'
}

export interface Tournament {
  id: string
  name: string
  description: string
  banner: string
  status: TournamentStatus
  gamemode: string
  serverIp: string
  maxTeamSize: number
  minTeamSize: number
  requireCaptain: boolean        // when false, no captain role — all players are equal
  registrationDeadline: number | null
  startDate: number | null
  prizePool: string
  prizes: Prize[]
  rules: TournamentRules
  bracket: Bracket | null
  teams: Team[]
  matches: Match[]
  announcements: Announcement[]
  bracketDisplay?: BracketDisplaySettings
  createdAt: number
  updatedAt: number
}

export interface TournamentsFile {
  tournaments: Tournament[]
  activeTournamentId: string | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<TournamentStatus, string> = {
  upcoming:             'Upcoming',
  registration_open:    'Registration Open',
  registration_closed:  'Registration Closed',
  live:                 'Live',
  completed:            'Completed',
  archived:             'Archived',
}

export const STATUS_COLOR: Record<TournamentStatus, string> = {
  upcoming:            'text-blue-400 bg-blue-400/10 border-blue-400/20',
  registration_open:   'text-green-400 bg-green-400/10 border-green-400/20',
  registration_closed: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  live:                'text-red-400 bg-red-400/10 border-red-400/20',
  completed:           'text-gray-400 bg-gray-400/10 border-gray-400/20',
  archived:            'text-gray-500 bg-gray-500/10 border-gray-500/20',
}

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  pending:   'Pending',
  scheduled: 'Scheduled',
  live:      'Live',
  completed: 'Completed',
  bye:       'Bye',
}

export const DEFAULT_RULES: TournamentRules = {
  allowedMods:         ['OptiFine', 'Lunar Client', 'Badlion Client', 'Labymod'],
  allowedClients:      ['Vanilla', 'Forge', 'Fabric', 'Lunar', 'Badlion', 'Labymod'],
  bannedMods:          ['Reach mods', 'Kill aura', 'AutoClicker', 'X-Ray'],
  replayRequirements:  'All players must record their POV. Replays must be submitted within 24 hours of the match.',
  disconnectRules:     'A team will be given 5 minutes to reconnect. If unable, the match will be forfeited.',
  staffDecisions:      'All staff decisions are final. Any disputes must be raised within 24 hours via Discord.',
  custom:              [],
}

export const DEFAULT_PRIZES: Prize[] = [
  { placement: 1, label: '🥇 First Place',  rewards: [{ type: 'coins', label: 'BlueCoin', amount: '10,000' }] },
  { placement: 2, label: '🥈 Second Place', rewards: [{ type: 'coins', label: 'BlueCoin', amount: '5,000' }]  },
  { placement: 3, label: '🥉 Third Place',  rewards: [{ type: 'coins', label: 'BlueCoin', amount: '2,500' }]  },
]
