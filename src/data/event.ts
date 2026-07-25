export interface EventConfig {
  // ── Identity ────────────────────────────────────────────────────────────────
  title: string
  subtitle: string
  description?: string
  eventType?: 'pvp' | 'community' | 'update' | 'seasonal' | 'custom'
  customTypeLabel?: string
  // ── Scheduling ──────────────────────────────────────────────────────────────
  registrationEnds: string
  eventStartDate?: string
  eventEndDate?: string
  // ── CTA Buttons ─────────────────────────────────────────────────────────────
  buttonText: string
  buttonLink: string
  closedButtonText: string
  // ── Details ─────────────────────────────────────────────────────────────────
  prizePool?: string
  maxParticipants?: number
  currentParticipants?: number
  streamLink?: string
  rulesText?: string
  organizerName?: string
  // ── Display ─────────────────────────────────────────────────────────────────
  visible?: boolean
  bannerStyle?: 'default' | 'gold' | 'red' | 'green' | 'purple' | 'orange'
  pinned?: boolean
}

export const EVENT: EventConfig = {
  title: "Blue Network PvP World Cup",
  subtitle: "Registrations are now open!",
  description: "",
  eventType: "pvp",
  registrationEnds: "2026-07-22T23:59:59Z",
  eventStartDate: "",
  eventEndDate: "",
  buttonText: "Participate Now!",
  buttonLink: "https://discord.gg/DmEPAb3NFU",
  closedButtonText: "Registrations Closed",
  prizePool: "",
  maxParticipants: 0,
  currentParticipants: 0,
  streamLink: "",
  rulesText: "",
  organizerName: "",
  visible: true,
  bannerStyle: "default",
  pinned: false,
}
