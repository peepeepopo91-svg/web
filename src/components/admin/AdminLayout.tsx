import { useState } from 'react'
import type { AdminSection } from '../../routes/admin'
import type { AdminSession } from '../../store/adminStore'
import { Dashboard }       from './Dashboard'
import { TierListManager } from './TierListManager'
import { GamemodeManager } from './GamemodeManager'
import { MiningManager }   from './MiningManager'
import { EconomyManager }  from './EconomyManager'
import { UserManager }     from './UserManager'
import { ActivityLogs }    from './ActivityLogs'
import { GitHubSyncCenter } from './GitHubSyncCenter'
import { RepoHistoryManager } from './RepoHistoryManager'
import { ShopManager }         from './ShopManager'
import { CredentialsManager }  from './CredentialsManager'
import { TournamentManager }   from './TournamentManager'
import { EarningsManager }     from './EarningsManager'
import { PublishManager }      from './PublishManager'
import { SiteGrowth }          from './SiteGrowth'
import { HomepageManager }     from './HomepageManager'
import { TierTaggerManager }   from './TierTaggerManager'
import { useSyncState }    from '../../store/syncStore'

interface Props {
  session: AdminSession
  section: AdminSection
  setSection: (s: AdminSection) => void
  onLogout: () => void
}

const NAV_ITEMS: { id: AdminSection; label: string; icon: string; desc: string }[] = [
  { id: 'dashboard',   label: 'Dashboard',     icon: '🏠', desc: 'Overview & stats' },
  { id: 'tier-list',   label: 'Tier List',     icon: '📋', desc: 'Manage players' },
  { id: 'gamemodes',   label: 'Gamemodes',     icon: '🎮', desc: 'Edit gamemodes' },
  { id: 'mining-mgmt', label: 'Mining',        icon: '⛏️', desc: 'Manage miners' },
  { id: 'economy',     label: 'Economy',       icon: '💰', desc: 'Edit constants' },
  { id: 'users',       label: 'Users',         icon: '👥', desc: 'Manage accounts' },
  { id: 'shop-mgmt',      label: 'Shop',          icon: '🛒', desc: 'Manage purchases'  },
  { id: 'tournament-mgmt', label: 'Tournaments',  icon: '🏆', desc: 'Manage tournaments' },
  { id: 'site-growth',  label: 'Site Growth',   icon: '📈', desc: 'Analytics dashboard' },
  { id: 'earnings',     label: 'Earnings',      icon: '💹', desc: 'Ads & monetisation' },
  { id: 'publish',      label: 'Publish',       icon: '🚀', desc: 'SEO & Google' },
  { id: 'home',             label: 'Homepage',    icon: '🎨', desc: 'Homepage CMS' },
  { id: 'tier-tagger-mgmt', label: 'Tier Tagger', icon: '🏷️', desc: 'Edit Tier Tagger page' },
  { id: 'logs',            label: 'Activity Logs', icon: '📊', desc: 'Audit trail'        },
  { id: 'repo-history', label: 'Repo History',  icon: '🕓', desc: 'Reset history' },
  { id: 'credentials',  label: 'Credentials',   icon: '🔐', desc: 'Manage admin auth' },
  { id: 'github-sync',  label: 'GitHub Sync',   icon: '☁️',  desc: 'Sync Center' },
]

const SECTION_TITLES: Record<AdminSection, { title: string; subtitle: string }> = {
  'dashboard':   { title: 'Dashboard',          subtitle: 'Overview of Blue Tiers activity' },
  'tier-list':   { title: 'Tier List Manager',  subtitle: 'Add, edit, and remove ranked players' },
  'gamemodes':   { title: 'Gamemode Manager',   subtitle: 'Configure PvP gamemodes and icons' },
  'mining-mgmt': { title: 'Mining Manager',     subtitle: 'Manage user rigs and balances' },
  'economy':     { title: 'Economy Settings',   subtitle: 'Adjust exchange rates and mining rewards' },
  'users':       { title: 'User Manager',       subtitle: 'Full player management — accounts, profiles, and mining data' },
  'shop-mgmt':       { title: 'Shop Management',       subtitle: 'Manage purchases, prices, refunds, and delivery' },
  'tournament-mgmt': { title: 'Tournament Management', subtitle: 'Create tournaments, manage teams, brackets, matches, prizes and announcements' },
  'logs':            { title: 'Activity Logs',         subtitle: 'Full audit trail of all admin actions' },
  'github-sync':  { title: 'GitHub Sync Center',         subtitle: 'Professional synchronization dashboard — push, validate, rollback' },
  'repo-history': { title: 'Repository History Management', subtitle: 'Reset commit history while preserving all project files' },
  'site-growth':  { title: 'Site Growth',              subtitle: 'Real-time analytics — visitors, users, mining, shop, and growth trends' },
  'earnings':     { title: 'Earnings & Monetisation', subtitle: 'Configure ads, renew-button behaviour, and track revenue' },
  'credentials':  { title: 'Credentials Manager',        subtitle: 'Manage admin username and dual-password authentication' },
  'publish':      { title: 'Publish & SEO',              subtitle: 'Google ranking, meta tags, sitemap, analytics, and social previews' },
  'home':             { title: 'Homepage CMS',     subtitle: 'Control every visible element, section, style, and animation on the homepage' },
  'tier-tagger-mgmt': { title: 'Tier Tagger CMS', subtitle: 'Edit every section of the Tier Tagger page — hero, features, steps, download, and about' },
}

function SectionContent({ section, admin, setSection }: { section: AdminSection; admin: string; setSection: (s: AdminSection) => void }) {
  switch (section) {
    case 'dashboard':   return <Dashboard admin={admin} setSection={setSection as (s: string) => void} />
    case 'tier-list':   return <TierListManager admin={admin} />
    case 'gamemodes':   return <GamemodeManager admin={admin} />
    case 'mining-mgmt': return <MiningManager admin={admin} />
    case 'economy':     return <EconomyManager admin={admin} />
    case 'users':       return <UserManager admin={admin} />
    case 'shop-mgmt':       return <ShopManager admin={admin} />
    case 'tournament-mgmt': return <TournamentManager admin={admin} />
    case 'logs':            return <ActivityLogs admin={admin} />
    case 'github-sync':  return <GitHubSyncCenter admin={admin} />
    case 'repo-history': return <RepoHistoryManager admin={admin} />
    case 'credentials':  return <CredentialsManager admin={admin} />
    case 'site-growth':  return <SiteGrowth admin={admin} />
    case 'earnings':     return <EarningsManager admin={admin} />
    case 'publish':      return <PublishManager admin={admin} />
    case 'home':             return <HomepageManager admin={admin} />
    case 'tier-tagger-mgmt': return <TierTaggerManager admin={admin} />
  }
}

export function AdminLayout({ session, section, setSection, onLogout }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const sync = useSyncState()
  const { title, subtitle } = SECTION_TITLES[section]

  return (
    <div className="min-h-screen bg-[#0B0F17] flex">

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-60 bg-[#070B12] border-r border-white/5 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-sm">
            🛡️
          </div>
          <div>
            <p className="font-['Space_Grotesk'] font-bold text-sm text-white">Blue Tiers</p>
            <p className="text-[9px] text-gray-600 uppercase tracking-widest">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => { setSection(item.id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                section === item.id
                  ? 'bg-[#00BFFF]/12 border border-[#00BFFF]/20 text-[#00BFFF]'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/3 border border-transparent'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-tight">{item.label}</p>
                <p className="text-[9px] text-gray-700 leading-tight mt-0.5">{item.desc}</p>
              </div>
              {/* Dirty badge on GitHub Sync nav item */}
              {item.id === 'github-sync' && sync.isDirty && section !== 'github-sync' && (
                <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0 animate-pulse" />
              )}
              {section === item.id && (
                <div className="w-1 h-4 rounded-full bg-[#00BFFF] shadow-[0_0_6px_rgba(0,191,255,0.8)] shrink-0" />
              )}
            </button>
          ))}
        </nav>

        {/* Admin info + logout */}
        <div className="p-4 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-7 h-7 rounded-lg bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-xs font-black text-[#00BFFF]">
              {session.username[0].toUpperCase()}
            </div>
            <div>
              <p className="text-white text-xs font-bold">{session.username}</p>
              <p className="text-gray-700 text-[9px]">Administrator</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full py-2 rounded-lg text-xs text-gray-500 hover:text-red-400 border border-white/5 hover:border-red-500/20 hover:bg-red-500/5 transition-all"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-[#0B0F17]/90 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
          >
            ☰
          </button>
          <div>
            <h1 className="font-['Space_Grotesk'] font-bold text-white text-lg leading-tight">{title}</h1>
            <p className="text-gray-600 text-xs">{subtitle}</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Unsaved changes badge */}
            {sync.isDirty && (
              <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                Unsaved Changes
              </span>
            )}

            {/* Online / all saved indicator */}
            {!sync.isDirty && (
              <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                All Saved
              </span>
            )}
          </div>
        </header>

        {/* Section content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <SectionContent section={section} admin={session.username} setSection={setSection} />
        </main>
      </div>
    </div>
  )
}
