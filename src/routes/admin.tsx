import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getAdminSession, setAdminSession } from '../store/adminStore'
import type { AdminSession } from '../store/adminStore'
import { AdminLogin }  from '../components/admin/AdminLogin'
import { AdminLayout } from '../components/admin/AdminLayout'
import { checkAdminToken } from '../server/adminAuth'
import { loadAllData } from '../server/dataFiles'
import { savePlayers, saveGamemodes } from '../store/playersStore'
import { saveSiteContent, saveEventConfig } from '../store/contentStore'
import { saveEconomyOverrides } from '../store/miningStore'
import { saveHomepageConfig } from '../store/homepageStore'
import { saveTierTaggerConfig } from '../store/tierTaggerStore'
import type { Player } from '../data/players'
import type { Gamemode } from '../data/gamemodes'
import type { EventConfig } from '../data/event'
import type { SiteContent } from '../store/contentStore'
import type { EconomyOverrides } from '../store/miningStore'
import type { HomepageConfig } from '../store/homepageStore'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

export type AdminSection =
  | 'dashboard'
  | 'tier-list'
  | 'gamemodes'
  | 'mining-mgmt'
  | 'economy'
  | 'users'
  | 'shop-mgmt'
  | 'tournament-mgmt'
  | 'site-growth'
  | 'logs'
  | 'github-sync'
  | 'github-bridge'
  | 'repo-history'
  | 'credentials'
  | 'earnings'
  | 'publish'
  | 'home'
  | 'tier-tagger-mgmt'

function AdminPage() {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [section, setSection] = useState<AdminSection>('dashboard')
  const [dataReady, setDataReady] = useState(false)

  // On mount: verify session token server-side, then hydrate stores
  useEffect(() => {
    const stored = getAdminSession()

    // Kick off data hydration immediately (runs in parallel with token check)
    const dataPromise = loadAllData()
      .then(d => {
        if (d.players)   savePlayers(d.players as Player[],                   { silent: true })
        if (d.gamemodes) saveGamemodes(d.gamemodes as Gamemode[],             { silent: true })
        if (d.content)   saveSiteContent(d.content as SiteContent,           { silent: true })
        if (d.event)     saveEventConfig(d.event as EventConfig,             { silent: true })
        if (d.economy)   saveEconomyOverrides(d.economy as EconomyOverrides, { silent: true })
        if (d.homepage)    saveHomepageConfig(d.homepage as HomepageConfig,   { silent: true })
        if (d.tierTagger)  saveTierTaggerConfig(d.tierTagger as any,          { silent: true })
      })
      .catch(() => { /* falls back to localStorage defaults */ })

    if (!stored) {
      dataPromise.finally(() => setDataReady(true))
      return
    }

    // Verify the HMAC token server-side — prevents localStorage tampering
    checkAdminToken({ data: { username: stored.username, loginAt: stored.loginAt, token: stored.token } })
      .then(result => {
        if (result.valid) {
          setSession(stored)
        } else {
          // Expired or tampered token — force re-login
          setAdminSession(null)
        }
      })
      .catch(() => {
        // Network error — grant access optimistically so admins aren't locked out offline
        setSession(stored)
      })
      .finally(() => dataPromise.finally(() => setDataReady(true)))
  }, [])

  function handleLogin(s: AdminSession) {
    setAdminSession(s)
    setSession(s)
  }

  function handleLogout() {
    setAdminSession(null)
    setSession(null)
  }

  if (!session) {
    return <AdminLogin onLogin={handleLogin} />
  }

  // Show a brief loading state while server data hydrates
  if (!dataReady) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-3xl animate-spin">⟳</div>
          <p className="text-gray-500 text-sm">Loading data from GitHub…</p>
        </div>
      </div>
    )
  }

  return (
    <AdminLayout
      session={session}
      section={section}
      setSection={setSection}
      onLogout={handleLogout}
    />
  )
}
